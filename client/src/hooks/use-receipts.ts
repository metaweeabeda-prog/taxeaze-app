import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type errorSchemas } from "@shared/routes";
import { type InsertReceipt, type Receipt, type ReceiptAnalysis } from "@shared/schema";
import { z } from "zod";

// Helper to log validation errors
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    // For development, we might want to throw, but for resilience, we might return the raw data casted if appropriate
    // throwing so we catch it in the UI error boundary/toast
    throw new Error(`Validation failed for ${label}`);
  }
  return result.data;
}

// GET /api/receipts
export function useReceipts(filters?: { month?: string; year?: string; category?: string; search?: string; userId?: string; startDate?: string; endDate?: string }) {
  const queryKey = [api.receipts.list.path, filters];
  return useQuery({
    queryKey,
    queryFn: async () => {
      let url = api.receipts.list.path;
      if (filters) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch receipts");
      const data = await res.json();
      return parseWithLogging(api.receipts.list.responses[200], data, "receipts.list");
    },
  });
}

// GET /api/receipts/:id
export function useReceipt(id: number) {
  return useQuery({
    queryKey: [api.receipts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.receipts.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch receipt");
      const data = await res.json();
      return parseWithLogging(api.receipts.get.responses[200], data, "receipts.get");
    },
    enabled: !!id,
  });
}

// POST /api/receipts
export function useCreateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receipt: InsertReceipt) => {
      const res = await fetch(api.receipts.create.path, {
        method: api.receipts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receipt),
      });

      if (!res.ok) {
        if (res.status === 400) {
          throw new Error("Invalid receipt data");
        }
        throw new Error("Failed to create receipt");
      }
      return parseWithLogging(api.receipts.create.responses[201], await res.json(), "receipts.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.receipts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.receipts.summary.path] });
    },
  });
}

// PUT /api/receipts/:id
export function useUpdateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertReceipt> }) => {
      const url = buildUrl(api.receipts.update.path, { id });
      const res = await fetch(url, {
        method: api.receipts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Receipt not found");
        throw new Error("Failed to update receipt");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.receipts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.receipts.summary.path] });
    },
  });
}

// DELETE /api/receipts/:id
export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.receipts.delete.path, { id });
      const res = await fetch(url, { method: api.receipts.delete.method });
      if (!res.ok && res.status !== 404) throw new Error("Failed to delete receipt");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.receipts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.receipts.summary.path] });
    },
  });
}

// POST /api/receipts/analyze
export function useAnalyzeReceipt() {
  return useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await fetch(api.receipts.analyze.path, {
        method: api.receipts.analyze.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!res.ok) throw new Error("Failed to analyze receipt");
      return parseWithLogging(api.receipts.analyze.responses[200], await res.json(), "receipts.analyze");
    },
  });
}

// GET /api/receipts/summary
export function useReceiptSummary(year?: string, userId?: string) {
  return useQuery({
    queryKey: [api.receipts.summary.path, year, userId],
    queryFn: async () => {
      let url = api.receipts.summary.path;
      const params = new URLSearchParams();
      if (year) params.append('year', year);
      if (userId) params.append('userId', userId);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data = await res.json();
      return parseWithLogging(api.receipts.summary.responses[200], data, "receipts.summary");
    },
  });
}
