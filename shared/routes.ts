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
    me: {
      method: 'GET' as const,
      path: '/api/me',
      responses: {
        200: z.object({ username: z.string() }),
        401: z.object({ message: z.string() }),
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ username: z.string() }),
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ success: z.boolean() }),
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
  },
  settings: {
    categories: {
      list: {
        method: 'GET' as const,
        path: '/api/settings/categories',
        responses: {
          200: z.array(z.custom<any>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/settings/categories',
        input: z.object({
          name: z.string(),
          startCommand: z.string(),
          endCommand: z.string(),
          duration: z.number(),
          notificationTime: z.string().optional(),
        }),
        responses: {
          201: z.custom<any>(),
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/settings/categories/:id',
        responses: {
          204: z.void(),
        },
      },
    },
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
