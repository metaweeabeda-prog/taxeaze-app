import { pgTable, text, serial, integer, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default('user1'), // Basic multi-user support
  imageUrl: text("image_url"), // Made optional for manual entry
  merchantName: text("merchant_name").notNull(),
  date: timestamp("date").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), 
  tax: numeric("tax", { precision: 10, scale: 2 }), // Tax amount (calculated at 5% if not on receipt)
  category: text("category").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({ 
  id: true, 
  createdAt: true 
});

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;

export const categories = [
  "Food & Dining",
  "Travel & Transportation",
  "Lodging",
  "Utilities",
  "Office Supplies",
  "Entertainment",
  "Health & Wellness",
  "Shopping",
  "Other"
] as const;

export const receiptAnalysisSchema = z.object({
  merchantName: z.string(),
  date: z.string().describe("ISO 8601 date string YYYY-MM-DD"),
  amount: z.string(), // We'll parse this to numeric on backend
  tax: z.string().optional(), // Tax amount if listed on receipt
  category: z.enum(categories).or(z.string()),
  description: z.string().optional()
});

export type ReceiptAnalysis = z.infer<typeof receiptAnalysisSchema>;
