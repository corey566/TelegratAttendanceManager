import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as xlsx from "xlsx";
import { setupBot, processUpdate, getBotUpdates } from "./bot";
import { sendMail } from "./mail";
import session from "express-session";
import MemoryStoreFactory from "memorystore";
import cron from "node-cron";
import { format, addMinutes } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";

const MemoryStore = MemoryStoreFactory(session);

declare module 'express-session' {
  interface SessionData {
    user: { username: string };
  }
}

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
    // format: (user,pass),(user2,pass2)
    const matches = Array.from(accessUsers.matchAll(/\(([^,]+),([^)]+)\)/g));
    const users: Record<string, string> = {};
    for (const match of matches) {
      users[match[1]] = match[2];
    }
    return users;
  };

  // === API Routes ===

  // Bot Settings
  app.get("/api/settings/bot", requireAuth, async (req, res) => {
    const settings = await storage.getBotSettings();
    res.json(settings || {});
  });

  app.post("/api/settings/bot", requireAuth, async (req, res) => {
    const settings = await storage.updateBotSettings(req.body);
    
    // Test email if requested
    if (req.body.testEmail) {
      try {
        console.log(`Sending test email to ${req.body.testEmail}...`);
        await sendMail({
          to: req.body.testEmail,
          subject: "BreakTime - SMTP Test",
          text: "If you are receiving this, your SMTP configuration is correct!",
          html: "<h3>BreakTime - SMTP Test</h3><p>If you are receiving this, your SMTP configuration is correct!</p>"
        });
      } catch (e: any) {
        console.error("Test email failed:", e);
        // We don't want to fail the whole settings update if just the test email fails,
        // but we should probably log it well.
      }
    }
    
    res.json(settings);
  });

  // Telegram Groups
  app.get("/api/settings/groups", requireAuth, async (req, res) => {
    const groups = await storage.getGroups();
    res.json(groups);
  });

  app.post("/api/settings/groups", requireAuth, async (req, res) => {
    const group = await storage.addGroup(req.body);
    res.json(group);
  });

  app.patch("/api/settings/groups/:chatId", requireAuth, async (req, res) => {
    const group = await storage.updateGroup(req.params.chatId, req.body);
    res.json(group);
  });

  app.post("/api/settings/groups/sync", requireAuth, async (req, res) => {
    await getBotUpdates();
    const groups = await storage.getGroups();
    res.json(groups);
  });

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

    // Calculate weekly activity
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weeklyActivity = days.map((day, index) => {
      const count = breaks.filter(b => {
        const breakDate = new Date(b.startTime);
        return breakDate.getDay() === index && 
               (now.getTime() - breakDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      }).length;
      return { name: day, breaks: count };
    });

    // Reorder to start from Monday
    const mondayFirst = [...weeklyActivity.slice(1), weeklyActivity[0]];

    res.json({
      totalBreaks: breaks.length,
      totalDuration,
      activeUsers: users.length,
      onBreak: activeBreaks.length,
      weeklyActivity: mondayFirst
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
        StartTime: formatInTimeZone(b.startTime, 'Asia/Colombo', "yyyy-MM-dd HH:mm:ss"),
        EndTime: b.endTime ? formatInTimeZone(b.endTime, 'Asia/Colombo', "yyyy-MM-dd HH:mm:ss") : "Active",
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
  const botInstance = await setupBot();

  // Scheduled Reports logic
  const scheduleReports = async () => {
    const settings = await storage.getBotSettings();
    if (!settings || !settings.reportSchedule || (!settings.reportEmails?.length && !settings.reportTelegramIds?.length)) {
      return;
    }

    console.log(`Setting up scheduled reports with cron: ${settings.reportSchedule}`);
    
    cron.schedule(settings.reportSchedule!, async () => {
      console.log("Running scheduled report generation...");
      try {
        const now = new Date();
        let startDate: Date;
        
        // Logic to determine the period based on common cron patterns
        // Default to last 7 days if it's a weekly-looking cron (contains a day of week or is run once a week)
        const schedule = settings.reportSchedule!;
        if (schedule.split(' ').length >= 5) {
          const parts = schedule.split(' ');
          // If it's something like "0 9 * * 6" (Saturday at 9 AM)
          if (parts[4] !== '*' || parts[2] === '1') {
             startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          } else if (parts[3] !== '*') {
             // Monthly
             startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          } else {
             // Daily
             startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          }
        } else {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const breaks = await storage.getBreaks({ startDate, endDate: now });
        if (breaks.length === 0) {
          console.log("No break data for the report period.");
          return;
        }

        const data = breaks.map(b => ({
          ID: b.id,
          User: b.userId, // Simplified for the report
          Type: b.type,
          Date: b.date,
          StartTime: formatInTimeZone(b.startTime, 'Asia/Colombo', "yyyy-MM-dd HH:mm:ss"),
          EndTime: b.endTime ? formatInTimeZone(b.endTime, 'Asia/Colombo', "yyyy-MM-dd HH:mm:ss") : "Active",
          DurationMinutes: b.duration
        }));

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, "Breaks");
        const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        const filename = `report_${format(startDate, "yyyyMMdd")}_to_${format(now, "yyyyMMdd")}.xlsx`;

        // Send to Telegram
        if (settings.reportTelegramIds && botInstance) {
          for (const tid of settings.reportTelegramIds) {
            try {
              await botInstance.sendDocument(tid, buf, { caption: `📊 Scheduled Break Report (${format(startDate, "MMM d")} - ${format(now, "MMM d")})` }, { filename, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            } catch (e) {
              console.error(`Failed to send scheduled report to Telegram user ${tid}:`, e);
            }
          }
        }

        // Send to Email
        if (settings.reportEmails) {
          for (const email of settings.reportEmails) {
            try {
              await sendMail({
                to: email,
                subject: `BreakTime Scheduled Report: ${format(startDate, "MMM d")} - ${format(now, "MMM d")}`,
                text: `Please find attached the scheduled break report for the period ${format(startDate, "yyyy-MM-dd")} to ${format(now, "yyyy-MM-dd")}.`,
                attachments: [{ filename, content: buf }]
              });
            } catch (e) {
              console.error(`Failed to send scheduled report to email ${email}:`, e);
            }
          }
        }
      } catch (error) {
        console.error("Scheduled report error:", error);
      }
    });
  };

  scheduleReports();
  
  // Cron for notifications
  cron.schedule('* * * * *', async () => {
    const categories = await storage.getBreakCategories();
    const now = new Date();
    
    for (const cat of categories) {
      if (!cat.isActive || !cat.notificationTime) continue;

      // Ensure we are using Sri Lanka time for the alert check
      const timezone = 'Asia/Colombo'; 
      const nowInTz = formatInTimeZone(now, timezone, 'HH:mm');

      if (cat.notificationTime === nowInTz && botInstance) {
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
