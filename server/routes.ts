import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as xlsx from "xlsx";
import { setupBot, processUpdate } from "./bot";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === API Routes ===
  
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.get(api.breaks.list.path, async (req, res) => {
    const filters: any = {};
    if (req.query.userId) filters.userId = Number(req.query.userId);
    if (req.query.date) filters.date = String(req.query.date);
    // Add date range handling if needed
    const breaks = await storage.getBreaks(filters);
    res.json(breaks);
  });

  app.get(api.breaks.active.path, async (req, res) => {
    const activeBreaks = await storage.getAllActiveBreaks();
    res.json(activeBreaks);
  });

  app.get(api.stats.summary.path, async (req, res) => {
    // Simple mock summary for now, can be expanded
    const breaks = await storage.getBreaks();
    const activeBreaks = await storage.getAllActiveBreaks();
    const users = await storage.getAllUsers();

    const totalDuration = breaks.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    res.json({
      totalBreaks: breaks.length,
      totalDuration,
      activeUsers: users.length, // Total registered users
      onBreak: activeBreaks.length
    });
  });

  app.get(api.export.excel.path, async (req, res) => {
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

  // === Telegram Bot Integration ===
  setupBot();
  
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
