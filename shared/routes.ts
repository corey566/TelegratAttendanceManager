import { z } from 'zod';
import { users, breaks } from './schema';

export const api = {
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/users/:id',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  breaks: {
    list: {
      method: 'GET' as const,
      path: '/api/breaks',
      input: z.object({
        userId: z.string().optional(),
        date: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof breaks.$inferSelect>()),
      },
    },
    active: {
      method: 'GET' as const,
      path: '/api/breaks/active',
      responses: {
        200: z.array(z.custom<typeof breaks.$inferSelect>()),
      },
    },
  },
  stats: {
    summary: {
      method: 'GET' as const,
      path: '/api/stats/summary',
      input: z.object({
        period: z.enum(['daily', 'weekly', 'monthly']).optional(),
      }).optional(),
      responses: {
        200: z.object({
          totalBreaks: z.number(),
          totalDuration: z.number(),
          activeUsers: z.number(),
        }),
      },
    }
  },
  export: {
    excel: {
      method: 'GET' as const,
      path: '/api/export/excel',
      responses: {
        200: z.any(),
      },
    }
  }
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
