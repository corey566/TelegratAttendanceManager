import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  fullName: text("full_name"),
  email: text("email"),
  timezone: text("timezone").default("UTC"),
  country: text("country"),
  isAdmin: boolean("is_admin").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const breakCategories = pgTable("break_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startCommand: text("start_command").notNull().unique(),
  endCommand: text("end_command").notNull().unique(),
  duration: integer("duration").notNull(), // default duration in minutes
  notificationTime: text("notification_time"), // HH:mm format
  country: text("country"), // Country for timezone-aware notifications
  isActive: boolean("is_active").default(true),
});

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  botToken: text("bot_token"),
  reportEmails: text("report_emails").array(), // Emails to receive reports
  reportTelegramIds: text("report_telegram_ids").array(), // Telegram IDs to receive reports
  reportSchedule: text("report_schedule"), // cron format
});

export const telegramGroups = pgTable("telegram_groups", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  title: text("title"),
  isActive: boolean("is_active").default(true),
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({ id: true });
export const insertTelegramGroupSchema = createInsertSchema(telegramGroups).omit({ id: true });

export type BotSettings = typeof botSettings.$inferSelect;
export type TelegramGroup = typeof telegramGroups.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type InsertTelegramGroup = z.infer<typeof insertTelegramGroupSchema>;

export const breaks = pgTable("breaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  categoryId: integer("category_id").references(() => breakCategories.id),
  type: text("type").notNull(), 
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), 
  date: text("date").notNull(), 
});

export const breakCategoriesRelations = relations(breakCategories, ({ many }) => ({
  breaks: many(breaks),
}));

export const breaksRelations = relations(breaks, ({ one }) => ({
  user: one(users, {
    fields: [breaks.userId],
    references: [users.id],
  }),
  category: one(breakCategories, {
    fields: [breaks.categoryId],
    references: [breakCategories.id],
  }),
}));

export const insertBreakCategorySchema = createInsertSchema(breakCategories).omit({ id: true });
export type BreakCategory = typeof breakCategories.$inferSelect;
export type InsertBreakCategory = z.infer<typeof insertBreakCategorySchema>;


export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBreakSchema = createInsertSchema(breaks).omit({ id: true, duration: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Break = typeof breaks.$inferSelect;
export type InsertBreak = z.infer<typeof insertBreakSchema>;
