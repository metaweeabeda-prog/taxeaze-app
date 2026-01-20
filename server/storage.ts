import { db } from "./db";
import { receipts, type InsertReceipt, type Receipt } from "@shared/schema";
import { eq, sql, and, gte, lte, like, desc } from "drizzle-orm";

export interface IStorage {
  getReceipts(filters?: { month?: string, year?: string, category?: string, search?: string, userId?: string, startDate?: string, endDate?: string }): Promise<Receipt[]>;
  getReceipt(id: number): Promise<Receipt | undefined>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: number, receipt: Partial<InsertReceipt>): Promise<Receipt | undefined>;
  deleteReceipt(id: number): Promise<void>;
  getReceiptStats(userId?: string, year?: string): Promise<{
    totalExpenses: number;
    totalTax: number;
    monthlyBreakdown: { month: string; total: number; tax: number }[];
    categoryBreakdown: { category: string; total: number; tax: number }[];
    monthlyCategoryBreakdown: { month: string; categories: { category: string; total: number; tax: number }[] }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getReceipts(filters?: { month?: string, year?: string, category?: string, search?: string, userId?: string, startDate?: string, endDate?: string }): Promise<Receipt[]> {
    let conditions = [];

    if (filters?.userId) {
      conditions.push(eq(receipts.userId, filters.userId));
    }

    // Custom date range filter takes priority - handle partial ranges
    if (filters?.startDate || filters?.endDate) {
      if (filters?.startDate) {
        conditions.push(gte(receipts.date, new Date(filters.startDate)));
      }
      if (filters?.endDate) {
        conditions.push(lte(receipts.date, new Date(filters.endDate)));
      }
    } else if (filters?.year) {
      if (filters?.month) {
        // Month filter (YYYY-MM)
        const startOfMonth = new Date(`${filters.year}-${filters.month}-01`);
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
        conditions.push(gte(receipts.date, startOfMonth));
        conditions.push(lte(receipts.date, endOfMonth));
      } else {
        // Year only
        const startOfYear = new Date(`${filters.year}-01-01`);
        const endOfYear = new Date(`${filters.year}-12-31`);
        conditions.push(gte(receipts.date, startOfYear));
        conditions.push(lte(receipts.date, endOfYear));
      }
    }

    if (filters?.category) {
      conditions.push(eq(receipts.category, filters.category));
    }

    if (filters?.search) {
      conditions.push(like(receipts.merchantName, `%${filters.search}%`));
    }

    return await db.select()
      .from(receipts)
      .where(and(...conditions))
      .orderBy(desc(receipts.date));
  }

  async getReceipt(id: number): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
    return receipt;
  }

  async createReceipt(insertReceipt: InsertReceipt): Promise<Receipt> {
    const [receipt] = await db.insert(receipts).values(insertReceipt).returning();
    return receipt;
  }

  async updateReceipt(id: number, updates: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const [receipt] = await db.update(receipts)
      .set(updates)
      .where(eq(receipts.id, id))
      .returning();
    return receipt;
  }

  async deleteReceipt(id: number): Promise<void> {
    await db.delete(receipts).where(eq(receipts.id, id));
  }

  async getReceiptStats(userId?: string, year: string = new Date().getFullYear().toString()): Promise<{
    totalExpenses: number;
    totalTax: number;
    monthlyBreakdown: { month: string; total: number; tax: number }[];
    categoryBreakdown: { category: string; total: number; tax: number }[];
    monthlyCategoryBreakdown: { month: string; categories: { category: string; total: number; tax: number }[] }[];
  }> {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);

    let conditions = [
      gte(receipts.date, startOfYear),
      lte(receipts.date, endOfYear)
    ];

    if (userId) {
      conditions.push(eq(receipts.userId, userId));
    }

    const yearReceipts = await db.select()
      .from(receipts)
      .where(and(...conditions));

    const getTax = (r: Receipt) => r.tax ? Number(r.tax) : Number(r.amount) - Number(r.amount) / 1.05;
    
    const totalExpenses = yearReceipts.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalTax = yearReceipts.reduce((sum, r) => sum + getTax(r), 0);

    // Monthly Breakdown
    const monthlyMap = new Map<string, { total: number; tax: number }>();
    const monthlyCategoryMap = new Map<string, Map<string, { total: number; tax: number }>>();

    for (let i = 0; i < 12; i++) {
      const monthName = new Date(Number(year), i).toLocaleString('default', { month: 'long' });
      monthlyMap.set(monthName, { total: 0, tax: 0 });
      monthlyCategoryMap.set(monthName, new Map());
    }

    yearReceipts.forEach(r => {
      const monthName = r.date.toLocaleString('default', { month: 'long' });
      const current = monthlyMap.get(monthName)!;
      monthlyMap.set(monthName, { 
        total: current.total + Number(r.amount),
        tax: current.tax + getTax(r)
      });
      
      const catMap = monthlyCategoryMap.get(monthName)!;
      const catCurrent = catMap.get(r.category) || { total: 0, tax: 0 };
      catMap.set(r.category, { 
        total: catCurrent.total + Number(r.amount),
        tax: catCurrent.tax + getTax(r)
      });
    });

    const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));
    
    const monthlyCategoryBreakdown = Array.from(monthlyCategoryMap.entries()).map(([month, categoriesMap]) => ({
      month,
      categories: Array.from(categoriesMap.entries()).map(([category, data]) => ({ category, ...data }))
    }));

    // Category Breakdown
    const categoryMap = new Map<string, { total: number; tax: number }>();
    yearReceipts.forEach(r => {
      const current = categoryMap.get(r.category) || { total: 0, tax: 0 };
      categoryMap.set(r.category, { 
        total: current.total + Number(r.amount),
        tax: current.tax + getTax(r)
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({ category, ...data }));

    return {
      totalExpenses,
      totalTax,
      monthlyBreakdown,
      categoryBreakdown,
      monthlyCategoryBreakdown
    };
  }
}

export const storage = new DatabaseStorage();
