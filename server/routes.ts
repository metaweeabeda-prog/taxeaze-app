import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
import { openai } from "./replit_integrations/image/client";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'application/octet-stream'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (file.mimetype.startsWith('image/') || allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Download code zip file
  app.get('/api/download-code', (req, res) => {
    const zipPath = path.join(uploadDir, 'taxeaze-code.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="taxeaze-code.zip"');
      res.sendFile(zipPath);
    } else {
      res.status(404).json({ error: 'Code archive not found' });
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Direct file upload endpoint (replaces presigned URL approach)
  app.post("/api/upload", upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ 
        uploadURL: fileUrl,
        objectPath: fileUrl,
        url: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Register Object Storage Routes (keep for backward compatibility)
  registerObjectStorageRoutes(app);

  const objectStorage = new ObjectStorageService();

  // Receipt Analysis Endpoint
  app.post(api.receipts.analyze.path, async (req, res) => {
    try {
      const { imageUrl } = api.receipts.analyze.input.parse(req.body);
      
      let fileBuffer: Buffer;
      
      // Check if it's a local upload (starts with /uploads/)
      if (imageUrl.startsWith('/uploads/')) {
        const localPath = path.join(uploadDir, imageUrl.replace('/uploads/', ''));
        if (!fs.existsSync(localPath)) {
          return res.status(404).json({ message: "Could not retrieve image for analysis" });
        }
        fileBuffer = fs.readFileSync(localPath);
      } else {
        // Try object storage for backward compatibility
        let objectPath = imageUrl;
        if (imageUrl.startsWith(req.protocol + '://' + req.get('host'))) {
          objectPath = imageUrl.replace(req.protocol + '://' + req.get('host'), '');
        }
        
        try {
          const file = await objectStorage.getObjectEntityFile(objectPath);
          const [buffer] = await file.download();
          fileBuffer = buffer;
        } catch (e) {
          console.error("Error fetching file for analysis:", e);
          return res.status(404).json({ message: "Could not retrieve image for analysis" });
        }
      }

      const base64Image = fileBuffer.toString('base64');
      const ext = imageUrl.split('.').pop()?.toLowerCase() || 'jpeg';
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'heic': 'image/heic',
        'heif': 'image/heif',
      };
      const mimeType = mimeTypes[ext] || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // 2. Call OpenAI Vision
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a receipt analysis assistant. Extract the following details from the receipt image:
            - merchantName: The name of the merchant/store.
            - date: The date of transaction in YYYY-MM-DD format. If not found, use today's date.
            - amount: The TOTAL amount paid (including tax). This is the final amount the customer paid. Return as a string number (e.g. "12.50").
            - tax: The tax amount if listed on the receipt. Return as a string number (e.g. "0.63"). If tax is not visible, return null or omit this field.
            - category: Categorize based on business context. Predict best fit even if not explicit. Categories: "Food & Dining", "Travel & Transportation", "Lodging", "Utilities", "Office Supplies", "Entertainment", "Health & Wellness", "Shopping", "Other".
            - description: A detailed breakdown including line items if visible on the receipt. For example: "Lunch ($15.00), Coffee ($5.00)".
            
            Return ONLY a valid JSON object matching this structure. Do not include markdown formatting.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this receipt." },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content from OpenAI");
      }

      const result = JSON.parse(content);
      res.json(result);

    } catch (err) {
      console.error("Analysis error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input" });
      }
      res.status(500).json({ message: "Failed to analyze receipt" });
    }
  });

  // Create Receipt
  app.post(api.receipts.create.path, async (req, res) => {
    try {
      const data = req.body;
      const receipt = await storage.createReceipt({
        ...data,
        date: new Date(data.date),
        amount: data.amount.toString()
      });
      res.status(201).json(receipt);
    } catch (err: any) {
      console.error("Create receipt error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create receipt", error: err.message });
    }
  });

  // List Receipts
  app.get(api.receipts.list.path, async (req, res) => {
    try {
      const filters = {
        month: typeof req.query.month === 'string' ? req.query.month : undefined,
        year: typeof req.query.year === 'string' ? req.query.year : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
      };
      
      const receiptsList = await storage.getReceipts(filters);
      res.json(receiptsList);
    } catch (err) {
      console.error("List receipts error:", err);
      res.status(500).json({ message: "Failed to list receipts" });
    }
  });

  // Update Receipt
  app.put(api.receipts.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      
      const updates: any = {};
      
      if (data.merchantName !== undefined) updates.merchantName = data.merchantName;
      if (data.category !== undefined) updates.category = data.category;
      if (data.description !== undefined) updates.description = data.description;
      if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl;
      if (data.userId !== undefined) updates.userId = data.userId;
      
      if (data.date) {
        updates.date = new Date(data.date);
      }
      if (data.amount !== undefined) {
        updates.amount = String(data.amount);
      }
      if (data.tax !== undefined) {
        updates.tax = String(data.tax);
      }
      
      const receipt = await storage.updateReceipt(id, updates);
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      res.json(receipt);
    } catch (err: any) {
      console.error("Update receipt error:", err);
      res.status(500).json({ message: "Failed to update receipt" });
    }
  });

  // Delete Receipt
  app.delete(api.receipts.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteReceipt(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete receipt" });
    }
  });

  // Export Receipts to PDF - Accountant-Friendly Tax Report
  app.get("/api/receipts/export-pdf", async (req, res) => {
    try {
      const filters = {
        month: typeof req.query.month === 'string' ? req.query.month : undefined,
        year: typeof req.query.year === 'string' ? req.query.year : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
      };
      
      const receiptsData = await storage.getReceipts(filters);
      const reportYear = filters.year || new Date().getFullYear().toString();
      const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Group receipts by month and category
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      
      type GroupedReceipt = typeof receiptsData[0];
      const groupedByMonth: Record<string, Record<string, GroupedReceipt[]>> = {};
      const categoryTotals: Record<string, { amount: number; tax: number; count: number }> = {};
      
      for (const receipt of receiptsData) {
        const date = new Date(receipt.date);
        const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        const amount = Number(receipt.amount);
        const tax = Number(receipt.tax || (amount - amount / 1.05));
        
        if (!groupedByMonth[monthYear]) {
          groupedByMonth[monthYear] = {};
        }
        if (!groupedByMonth[monthYear][receipt.category]) {
          groupedByMonth[monthYear][receipt.category] = [];
        }
        groupedByMonth[monthYear][receipt.category].push(receipt);
        
        // Track category totals for summary
        if (!categoryTotals[receipt.category]) {
          categoryTotals[receipt.category] = { amount: 0, tax: 0, count: 0 };
        }
        categoryTotals[receipt.category].amount += amount;
        categoryTotals[receipt.category].tax += tax;
        categoryTotals[receipt.category].count++;
      }
      
      // Sort months chronologically (oldest first for accounting)
      const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const dateA = new Date(`${monthA} 1, ${yearA}`);
        const dateB = new Date(`${monthB} 1, ${yearB}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      
      res.setHeader('Content-Disposition', `attachment; filename="Tax-Expense-Report-${reportYear}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      
      doc.pipe(res);
      
      // Calculate totals - amount entered IS the total (including tax)
      const totalAmount = receiptsData.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalTax = receiptsData.reduce((sum, r) => sum + Number(r.tax || (Number(r.amount) - Number(r.amount) / 1.05)), 0);
      const preTaxAmount = totalAmount - totalTax;
      
      // ============ PAGE 1: COVER & SUMMARY ============
      doc.moveDown(2);
      doc.fontSize(28).fillColor('#1e293b').text('EXPENSE REPORT', { align: 'center' });
      doc.fontSize(16).fillColor('#64748b').text(`Tax Year ${reportYear}`, { align: 'center' });
      doc.moveDown(2);
      
      // Report info box
      doc.fontSize(10).fillColor('#64748b');
      doc.text(`Report Generated: ${reportDate}`, { align: 'center' });
      doc.text(`Total Receipts: ${receiptsData.length}`, { align: 'center' });
      doc.moveDown(3);
      
      // Executive Summary Box
      doc.rect(50, doc.y, 512, 120).stroke('#e2e8f0');
      const boxY = doc.y + 15;
      doc.fontSize(14).fillColor('#1e293b').text('EXECUTIVE SUMMARY', 70, boxY);
      doc.moveDown(0.5);
      
      doc.fontSize(11).fillColor('#64748b');
      const summaryStartY = boxY + 25;
      doc.text('Pre-Tax Amount:', 70, summaryStartY);
      doc.text('Sales Tax Included:', 70, summaryStartY + 20);
      doc.text('Total Paid:', 70, summaryStartY + 40);
      doc.text('Number of Transactions:', 70, summaryStartY + 60);
      doc.text('Expense Categories:', 70, summaryStartY + 80);
      
      doc.fontSize(11).fillColor('#1e293b');
      doc.text(`$${preTaxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 280, summaryStartY, { width: 100, align: 'right' });
      doc.text(`$${totalTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 280, summaryStartY + 20, { width: 100, align: 'right' });
      doc.fontSize(12).fillColor('#059669');
      doc.text(`$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 280, summaryStartY + 40, { width: 100, align: 'right' });
      doc.fontSize(11).fillColor('#1e293b');
      doc.text(`${receiptsData.length}`, 280, summaryStartY + 60, { width: 100, align: 'right' });
      doc.text(`${Object.keys(categoryTotals).length}`, 280, summaryStartY + 80, { width: 100, align: 'right' });
      
      doc.y = boxY + 130;
      doc.moveDown(2);
      
      // Category Summary Table
      doc.fontSize(14).fillColor('#1e293b').text('EXPENSE BREAKDOWN BY CATEGORY', 50);
      doc.moveDown(0.5);
      
      // Table header
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#1e293b');
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#64748b');
      const catHeaderY = doc.y;
      doc.text('CATEGORY', 50, catHeaderY, { width: 180 });
      doc.text('COUNT', 230, catHeaderY, { width: 50, align: 'right' });
      doc.text('PRE-TAX', 290, catHeaderY, { width: 80, align: 'right' });
      doc.text('TAX', 380, catHeaderY, { width: 70, align: 'right' });
      doc.text('TOTAL', 460, catHeaderY, { width: 90, align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#e2e8f0');
      doc.moveDown(0.3);
      
      // Category rows sorted by amount descending
      const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1].amount - a[1].amount);
      
      doc.fontSize(9).fillColor('#1e293b');
      for (const [category, data] of sortedCategories) {
        const rowY = doc.y;
        const catPreTax = data.amount - data.tax;
        doc.text(category, 50, rowY, { width: 180 });
        doc.text(data.count.toString(), 230, rowY, { width: 50, align: 'right' });
        doc.text(`$${catPreTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 290, rowY, { width: 80, align: 'right' });
        doc.text(`$${data.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 380, rowY, { width: 70, align: 'right' });
        doc.text(`$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 460, rowY, { width: 90, align: 'right' });
        doc.moveDown(0.7);
      }
      
      // Category totals
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#1e293b');
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#1e293b');
      const totalRowY = doc.y;
      doc.text('TOTAL', 50, totalRowY, { width: 180 });
      doc.text(receiptsData.length.toString(), 230, totalRowY, { width: 50, align: 'right' });
      doc.text(`$${preTaxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 290, totalRowY, { width: 80, align: 'right' });
      doc.text(`$${totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 380, totalRowY, { width: 70, align: 'right' });
      doc.fontSize(11).fillColor('#059669');
      doc.text(`$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 460, totalRowY, { width: 90, align: 'right' });
      doc.moveTo(50, doc.y + 5).lineTo(562, doc.y + 5).stroke('#1e293b');
      
      // ============ PAGE 2+: DETAILED MONTHLY BREAKDOWN ============
      doc.addPage();
      doc.fontSize(16).fillColor('#1e293b').text('DETAILED EXPENSE LEDGER', { align: 'center' });
      doc.fontSize(10).fillColor('#64748b').text('Organized by Month and Category', { align: 'center' });
      doc.moveDown(1.5);
      
      // Render each month
      for (const monthYear of sortedMonths) {
        const categories = groupedByMonth[monthYear];
        
        // Check if we need a new page
        if (doc.y > 620) {
          doc.addPage();
        }
        
        // Month header
        doc.fontSize(14).fillColor('#1e293b').text(monthYear.toUpperCase(), 50);
        doc.moveTo(50, doc.y + 2).lineTo(200, doc.y + 2).stroke('#059669');
        doc.moveDown(0.8);
        
        let monthTotal = 0;
        let monthTax = 0;
        
        // Render each category within the month
        for (const category of Object.keys(categories).sort()) {
          const categoryReceipts = categories[category];
          
          if (doc.y > 680) {
            doc.addPage();
          }
          
          // Category header
          doc.fontSize(11).fillColor('#0284c7').text(category, 60);
          doc.moveDown(0.3);
          
          // Table header
          doc.fontSize(8).fillColor('#64748b');
          const headerY = doc.y;
          doc.text('DATE', 70, headerY, { width: 65 });
          doc.text('VENDOR/MERCHANT', 135, headerY, { width: 170 });
          doc.text('DESCRIPTION', 305, headerY, { width: 100 });
          doc.text('PRE-TAX', 415, headerY, { width: 55, align: 'right' });
          doc.text('TAX', 475, headerY, { width: 40, align: 'right' });
          doc.text('TOTAL', 520, headerY, { width: 50, align: 'right' });
          doc.moveDown(0.4);
          doc.moveTo(70, doc.y).lineTo(562, doc.y).stroke('#e2e8f0');
          doc.moveDown(0.2);
          
          let categoryTotal = 0;
          let categoryTax = 0;
          
          // Receipts in category
          doc.fontSize(8).fillColor('#1e293b');
          for (const receipt of categoryReceipts) {
            if (doc.y > 720) {
              doc.addPage();
            }
            
            const rowY = doc.y;
            const amount = Number(receipt.amount);
            const tax = Number(receipt.tax || (amount - amount / 1.05));
            categoryTotal += amount;
            categoryTax += tax;
            
            const dateStr = new Date(receipt.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            const preTax = amount - tax;
            doc.text(dateStr, 70, rowY, { width: 65, continued: false });
            doc.text(receipt.merchantName.substring(0, 28), 135, rowY, { width: 170, continued: false });
            doc.text((receipt.description || '').substring(0, 18), 305, rowY, { width: 100, continued: false });
            doc.text(`$${preTax.toFixed(2)}`, 415, rowY, { width: 55, align: 'right', continued: false });
            doc.text(`$${tax.toFixed(2)}`, 475, rowY, { width: 40, align: 'right', continued: false });
            doc.text(`$${amount.toFixed(2)}`, 520, rowY, { width: 50, align: 'right', continued: false });
            doc.y = rowY + 12;
          }
          
          // Category subtotal - categoryTotal is already the total (includes tax)
          doc.fontSize(8).fillColor('#64748b');
          const subY = doc.y;
          const categoryPreTax = categoryTotal - categoryTax;
          doc.text(`Subtotal - ${category}:`, 305, subY, { width: 100, align: 'right', continued: false });
          doc.text(`$${categoryPreTax.toFixed(2)}`, 415, subY, { width: 55, align: 'right', continued: false });
          doc.text(`$${categoryTax.toFixed(2)}`, 475, subY, { width: 40, align: 'right', continued: false });
          doc.fillColor('#1e293b').text(`$${categoryTotal.toFixed(2)}`, 520, subY, { width: 50, align: 'right', continued: false });
          doc.y = subY + 16;
          
          monthTotal += categoryTotal;
          monthTax += categoryTax;
        }
        
        // Month subtotal - monthTotal is already the total (includes tax)
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#059669');
        const monthSubY = doc.y + 5;
        const monthPreTax = monthTotal - monthTax;
        doc.fontSize(10).fillColor('#059669');
        doc.text(`${monthYear} TOTAL:`, 305, monthSubY, { width: 100, align: 'right', continued: false });
        doc.text(`$${monthPreTax.toFixed(2)}`, 415, monthSubY, { width: 55, align: 'right', continued: false });
        doc.text(`$${monthTax.toFixed(2)}`, 475, monthSubY, { width: 40, align: 'right', continued: false });
        doc.text(`$${monthTotal.toFixed(2)}`, 520, monthSubY, { width: 50, align: 'right', continued: false });
        doc.y = monthSubY + 25;
      }
      
      // ============ FINAL PAGE: CERTIFICATION ============
      if (doc.y > 500) {
        doc.addPage();
      }
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#1e293b');
      doc.moveDown(1);
      
      // Grand totals box
      doc.fontSize(12).fillColor('#1e293b').text('ANNUAL TOTALS', 50);
      doc.moveDown(0.8);
      
      // Row 1: Total Business Expenses
      const row1Y = doc.y;
      doc.fontSize(10).fillColor('#64748b').text(`Total Business Expenses:`, 70, row1Y);
      doc.fontSize(10).fillColor('#1e293b').text(`$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 350, row1Y, { width: 100, align: 'right' });
      
      // Row 2: Total Sales Tax
      const row2Y = row1Y + 18;
      doc.fontSize(10).fillColor('#64748b').text(`Total Sales Tax Paid:`, 70, row2Y);
      doc.fontSize(10).fillColor('#1e293b').text(`$${totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 350, row2Y, { width: 100, align: 'right' });
      
      // Row 3: Total Paid
      const row3Y = row2Y + 22;
      doc.fontSize(12).fillColor('#1e293b').text(`TOTAL PAID:`, 70, row3Y);
      doc.fontSize(14).fillColor('#059669').text(`$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 350, row3Y, { width: 100, align: 'right' });
      
      doc.y = row3Y + 30;
      
      doc.moveDown(3);
      
      // Certification section
      doc.fontSize(10).fillColor('#64748b');
      doc.text('I certify that the expenses listed in this report are accurate and were incurred for business purposes.', 50);
      doc.moveDown(3);
      
      doc.text('Signature: _________________________________', 50);
      doc.moveDown(1.5);
      doc.text('Date: _________________________________', 50);
      doc.moveDown(1.5);
      doc.text('Print Name: _________________________________', 50);
      
      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#94a3b8');
      doc.text(`Generated by TaXEaze on ${reportDate}`, { align: 'center' });
      doc.text('This document is for tax preparation purposes. Please retain all original receipts.', { align: 'center' });
      
      doc.end();
    } catch (err) {
      console.error("PDF Export error:", err);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  // Export Receipts to Excel - Organized by Month and Category with Filters
  app.get("/api/receipts/export", async (req, res) => {
    try {
      const filters = {
        month: typeof req.query.month === 'string' ? req.query.month : undefined,
        year: typeof req.query.year === 'string' ? req.query.year : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
      };
      
      const receipts = await storage.getReceipts(filters);
      
      const XLSX = await import('xlsx');
      
      // Group receipts by month
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      
      // Create data with Month and Year columns for filtering
      // Note: "amount" is the total paid (including tax)
      const excelData = receipts.map(r => {
        const date = new Date(r.date);
        const total = Number(r.amount);
        const tax = Number(r.tax || (total - total / 1.05));
        const preTax = total - tax;
        
        return {
          'Year': date.getFullYear(),
          'Month': monthNames[date.getMonth()],
          'Month-Year': `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
          'Date': new Date(r.date).toLocaleDateString(),
          'Category': r.category,
          'Merchant': r.merchantName,
          'Pre-Tax': preTax,
          'Tax': tax,
          'Total Paid': total,
          'Notes': r.description || "",
        };
      });
      
      // Sort by date descending
      excelData.sort((a, b) => {
        const dateA = new Date(a.Date);
        const dateB = new Date(b.Date);
        return dateB.getTime() - dateA.getTime();
      });
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 6 },   // Year
        { wch: 12 },  // Month
        { wch: 16 },  // Month-Year
        { wch: 12 },  // Date
        { wch: 20 },  // Category
        { wch: 25 },  // Merchant
        { wch: 10 },  // Pre-Tax
        { wch: 8 },   // Tax
        { wch: 12 },  // Total Paid
        { wch: 30 },  // Notes
      ];
      
      // Enable auto-filter on all columns
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
      
      // Create a summary sheet
      const summaryByMonth: Record<string, { amount: number; tax: number; count: number }> = {};
      const summaryByCategory: Record<string, { amount: number; tax: number; count: number }> = {};
      
      // Build summary using the correct field names (Total Paid is the amount entered)
      for (const row of excelData) {
        const monthKey = row['Month-Year'];
        if (!summaryByMonth[monthKey]) {
          summaryByMonth[monthKey] = { amount: 0, tax: 0, count: 0 };
        }
        summaryByMonth[monthKey].amount += row['Total Paid'];
        summaryByMonth[monthKey].tax += row.Tax;
        summaryByMonth[monthKey].count++;
        
        const catKey = row.Category;
        if (!summaryByCategory[catKey]) {
          summaryByCategory[catKey] = { amount: 0, tax: 0, count: 0 };
        }
        summaryByCategory[catKey].amount += row['Total Paid'];
        summaryByCategory[catKey].tax += row.Tax;
        summaryByCategory[catKey].count++;
      }
      
      // Monthly summary data - amount is Total Paid, so Pre-Tax = amount - tax
      const monthlySummaryData = Object.entries(summaryByMonth).map(([month, data]) => ({
        'Month': month,
        'Receipts': data.count,
        'Pre-Tax': data.amount - data.tax,
        'Tax': data.tax,
        'Total Paid': data.amount,
      }));
      
      const monthlySummarySheet = XLSX.utils.json_to_sheet(monthlySummaryData);
      monthlySummarySheet['!cols'] = [
        { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, monthlySummarySheet, "Monthly Summary");
      
      // Category summary data - amount is Total Paid, so Pre-Tax = amount - tax
      const categorySummaryData = Object.entries(summaryByCategory)
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([category, data]) => ({
          'Category': category,
          'Receipts': data.count,
          'Pre-Tax': data.amount - data.tax,
          'Tax': data.tax,
          'Total Paid': data.amount,
        }));
      
      const categorySummarySheet = XLSX.utils.json_to_sheet(categorySummaryData);
      categorySummarySheet['!cols'] = [
        { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, categorySummarySheet, "Category Summary");
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', `attachment; filename="expenses-${filters.year || 'all'}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ message: "Failed to export receipts" });
    }
  });

  // Summary (Must be defined before Get Receipt if Get Receipt uses a wildcard matching "summary")
  // However, Get Receipt uses :id which matches "summary" string if validation is loose.
  // Express matches in order.
  app.get(api.receipts.summary.path, async (req, res) => {
    try {
      const year = typeof req.query.year === 'string' ? req.query.year : undefined;
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      const stats = await storage.getReceiptStats(userId, year);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to get summary" });
    }
  });

  // Get Receipt
  app.get(api.receipts.get.path, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        // If id is not a number, it might be another route matching :id, pass it on.
        return next();
      }
      const receipt = await storage.getReceipt(id);
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      res.json(receipt);
    } catch (err) {
      res.status(500).json({ message: "Failed to get receipt" });
    }
  });

  // Backup - Export all data as JSON
  app.get("/api/backup", async (req, res) => {
    try {
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      const allReceipts = await storage.getReceipts({ userId });
      
      const backupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        userId: userId || "all",
        receipts: allReceipts
      };
      
      res.setHeader('Content-Disposition', `attachment; filename="taxeaze-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(backupData);
    } catch (err) {
      console.error("Backup error:", err);
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  // Restore - Import data from JSON backup
  app.post("/api/restore", async (req, res) => {
    try {
      const { receipts: importedReceipts, userId } = req.body;
      
      if (!Array.isArray(importedReceipts)) {
        return res.status(400).json({ message: "Invalid backup format" });
      }
      
      let imported = 0;
      let skipped = 0;
      
      for (const receipt of importedReceipts) {
        try {
          // Validate required fields
          if (!receipt.merchantName || !receipt.date || receipt.amount === undefined) {
            skipped++;
            continue;
          }
          
          // Strip database-generated fields (id, createdAt) and create new receipt
          await storage.createReceipt({
            userId: userId || receipt.userId || 'user1',
            imageUrl: receipt.imageUrl || null,
            merchantName: receipt.merchantName,
            date: new Date(receipt.date),
            amount: String(receipt.amount),
            tax: receipt.tax !== undefined && receipt.tax !== null ? String(receipt.tax) : null,
            category: receipt.category || "Other",
            description: receipt.description || null
          });
          imported++;
        } catch (itemErr) {
          console.error("Skipping receipt during restore:", itemErr);
          skipped++;
        }
      }
      
      res.json({ 
        message: `Successfully imported ${imported} receipts${skipped > 0 ? ` (${skipped} skipped)` : ''}` 
      });
    } catch (err) {
      console.error("Restore error:", err);
      res.status(500).json({ message: "Failed to restore backup" });
    }
  });

  return httpServer;
}
