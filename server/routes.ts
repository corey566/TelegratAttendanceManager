import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as xlsx from "xlsx";
import { setupBot, processUpdate } from "./bot";
import session from "express-session";
import MemoryStoreFactory from "memorystore";
import cron from "node-cron";
import { format } from "date-fns";

const MemoryStore = MemoryStoreFactory(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === Session Config ===
  app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'dev-secret'
  }));

  // === Auth Middleware ===
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const getAuthorizedUsers = () => {
    const accessUsers = process.env.ACCESS_USERS || "";
    // format: (user:pass),(user2:pass2)
    const matches = accessUsers.matchAll(/\(([^:]+):([^)]+)\)/g);
    const users: Record<string, string> = {};
    for (const match of matches) {
      users[match[1]] = match[2];
    }
    return users;
  };

  // === API Routes ===
  
  app.post(api.users.login.path, (req, res) => {
    const { username, password } = req.body;
    const authorizedUsers = getAuthorizedUsers();
    
    if (authorizedUsers[username] && authorizedUsers[username] === password) {
      req.session.user = { username };
      return res.json({ username });
    }
    res.status(401).json({ message: "Invalid credentials" });
  });

  app.post(api.users.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get(api.users.me.path, (req, res) => {
    if (req.session.user) {
      return res.json(req.session.user);
    }
    res.status(401).json({ message: "Not logged in" });
  });

  app.get(api.users.list.path, requireAuth, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get(api.users.get.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.get(api.breaks.list.path, requireAuth, async (req, res) => {
    const filters: any = {};
    if (req.query.userId) filters.userId = Number(req.query.userId);
    if (req.query.date) filters.date = String(req.query.date);
    const breaks = await storage.getBreaks(filters);
    res.json(breaks);
  });

  app.get(api.breaks.active.path, requireAuth, async (req, res) => {
    const activeBreaks = await storage.getAllActiveBreaks();
    res.json(activeBreaks);
  });

  app.get(api.stats.summary.path, requireAuth, async (req, res) => {
    const breaks = await storage.getBreaks();
    const activeBreaks = await storage.getAllActiveBreaks();
    const users = await storage.getAllUsers();

    const totalDuration = breaks.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    res.json({
      totalBreaks: breaks.length,
      totalDuration,
      activeUsers: users.length,
      onBreak: activeBreaks.length
    });
  });

  app.get(api.export.excel.path, requireAuth, async (req, res) => {
    try {
      const breaks = await storage.getBreaks();
      const data = breaks.map(b => ({
        ID: b.id,
        UserID: b.userId,
        Type: b.type,
        Date: b.date,
        StartTime: b.startTime,
        EndTime: b.endTime,
        DurationMinutes: b.duration
      }));

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, "Breaks");

      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", 'attachment; filename="breaks_report.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Export failed" });
    }
  });

  app.get(api.settings.categories.list.path, requireAuth, async (req, res) => {
    const categories = await storage.getBreakCategories();
    res.json(categories);
  });

  app.post(api.settings.categories.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.settings.categories.create.input.parse(req.body);
      const category = await storage.createBreakCategory(input);
      res.status(201).json(category);
    } catch (err) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  app.delete(api.settings.categories.delete.path, requireAuth, async (req, res) => {
    await storage.deleteBreakCategory(Number(req.params.id));
    res.sendStatus(204);
  });

  // === Telegram Bot Integration ===
  const botInstance = setupBot();
  
  // Cron for notifications
  cron.schedule('* * * * *', async () => {
    const categories = await storage.getBreakCategories();
    const now = format(new Date(), 'HH:mm');
    
    for (const cat of categories) {
      if (cat.notificationTime === now && botInstance) {
        const users = await storage.getAllUsers();
        for (const user of users) {
          try {
            await botInstance.sendMessage(user.telegramId, `⏰ Your ${cat.name} time has started. Please use /${cat.startCommand} to begin.`);
          } catch (e) {
            console.error(`Failed to notify ${user.telegramId}`);
          }
        }
      }
    }
  });
  
  app.post('/api/telegram/webhook', async (req, res) => {
    processUpdate(req.body);
    res.sendStatus(200);
  });

  return httpServer;
}

// Seed function to populate some initial data
async function seedDatabase() {
  const users = await storage.getAllUsers();
  if (users.length === 0) {
    const user = await storage.createUser({
      telegramId: "123456789",
      username: "demo_user",
      fullName: "Demo User",
      email: "demo@example.com",
      timezone: "UTC",
      isAdmin: true,
      isActive: true
    });
    
    // Create some past breaks
    const today = new Date().toISOString().split('T')[0];
    await storage.createBreak({
      userId: user.id,
      type: "break",
      startTime: new Date(Date.now() - 3600000 * 4), // 4 hours ago
      date: today,
    }).then(async (b) => {
      await storage.endBreak(b.id, new Date(Date.now() - 3600000 * 3.8), 12);
    });

    await storage.createBreak({
      userId: user.id,
      type: "lunch",
      startTime: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      date: today,
    }).then(async (b) => {
      await storage.endBreak(b.id, new Date(Date.now() - 3600000 * 1), 60);
    });
  }
}

// Run seed in background
seedDatabase().catch(console.error);
