import { z } from 'zod';
import { insertReceiptSchema, receipts, receiptAnalysisSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  receipts: {
    list: {
      method: 'GET' as const,
      path: '/api/receipts',
      input: z.object({
        month: z.string().optional(), // YYYY-MM
        year: z.string().optional(),  // YYYY
        category: z.string().optional(),
        search: z.string().optional(),
        startDate: z.string().optional(), // YYYY-MM-DD
        endDate: z.string().optional(),   // YYYY-MM-DD
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof receipts.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/receipts/:id',
      responses: {
        200: z.custom<typeof receipts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/receipts',
      input: insertReceiptSchema,
      responses: {
        201: z.custom<typeof receipts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/receipts/:id',
      input: insertReceiptSchema.partial(),
      responses: {
        200: z.custom<typeof receipts.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/receipts/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    analyze: {
      method: 'POST' as const,
      path: '/api/receipts/analyze',
      input: z.object({
        imageUrl: z.string()
      }),
      responses: {
        200: receiptAnalysisSchema,
        500: errorSchemas.internal
      }
    },
    summary: {
      method: 'GET' as const,
      path: '/api/receipts/summary',
      input: z.object({
        year: z.string().optional() // Defaults to current year if not provided
      }).optional(),
      responses: {
        200: z.object({
          totalExpenses: z.number(),
          monthlyBreakdown: z.array(z.object({
            month: z.string(),
            total: z.number()
          })),
          categoryBreakdown: z.array(z.object({
            category: z.string(),
            total: z.number()
          }))
        })
      }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
