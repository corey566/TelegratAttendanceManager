import { users, breaks, breakCategories, botSettings, telegramGroups, type User, type InsertUser, type Break, type InsertBreak, type BreakCategory, type InsertBreakCategory, type BotSettings, type InsertBotSettings, type TelegramGroup, type InsertTelegramGroup } from "@shared/schema";
import { eq, and, isNull, desc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Break operations
  createBreak(breakRecord: InsertBreak): Promise<Break>;
  endBreak(id: number, endTime: Date, duration: number): Promise<Break>;
  getActiveBreak(userId: number): Promise<Break | undefined>;
  getBreaks(filters?: { userId?: number; date?: string; startDate?: Date; endDate?: Date }): Promise<Break[]>;
  getAllActiveBreaks(): Promise<Break[]>;

  // Category operations
  getBreakCategories(): Promise<BreakCategory[]>;
  getBreakCategoryByCommand(command: string): Promise<BreakCategory | undefined>;
  createBreakCategory(category: InsertBreakCategory): Promise<BreakCategory>;
  deleteBreakCategory(id: number): Promise<void>;

  // Bot Settings
  getBotSettings(): Promise<BotSettings | undefined>;
  updateBotSettings(updates: Partial<BotSettings>): Promise<BotSettings>;
  
  // Telegram Groups
  getGroups(): Promise<TelegramGroup[]>;
  addGroup(group: InsertTelegramGroup): Promise<TelegramGroup>;
  updateGroup(chatId: string, updates: Partial<TelegramGroup>): Promise<TelegramGroup>;
}

export class DatabaseStorage implements IStorage {
  // ... existing methods ...

  async getBotSettings(): Promise<BotSettings | undefined> {
    const [settings] = await db.select().from(botSettings);
    return settings;
  }

  async updateBotSettings(updates: Partial<BotSettings>): Promise<BotSettings> {
    const existing = await this.getBotSettings();
    if (existing) {
      const [updated] = await db.update(botSettings).set(updates).where(eq(botSettings.id, existing.id)).returning();
      return updated;
    } else {
      const [inserted] = await db.insert(botSettings).values(updates as any).returning();
      return inserted;
    }
  }

  async getGroups(): Promise<TelegramGroup[]> {
    return await db.select().from(telegramGroups);
  }

  async addGroup(group: InsertTelegramGroup): Promise<TelegramGroup> {
    const [newGroup] = await db.insert(telegramGroups).values(group).returning();
    return newGroup;
  }

  async updateGroup(chatId: string, updates: Partial<TelegramGroup>): Promise<TelegramGroup> {
    const [updated] = await db.update(telegramGroups).set(updates).where(eq(telegramGroups.chatId, chatId)).returning();
    return updated;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createBreak(breakRecord: InsertBreak): Promise<Break> {
    const [newBreak] = await db.insert(breaks).values(breakRecord).returning();
    return newBreak;
  }

  async endBreak(id: number, endTime: Date, duration: number): Promise<Break> {
    const [updatedBreak] = await db.update(breaks)
      .set({ endTime, duration })
      .where(eq(breaks.id, id))
      .returning();
    return updatedBreak;
  }

  async getActiveBreak(userId: number): Promise<Break | undefined> {
    const [activeBreak] = await db.select()
      .from(breaks)
      .where(and(eq(breaks.userId, userId), isNull(breaks.endTime)));
    return activeBreak;
  }

  async getBreaks(filters?: { userId?: number; date?: string; startDate?: Date; endDate?: Date }): Promise<Break[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(breaks.userId, filters.userId));
    if (filters?.date) conditions.push(eq(breaks.date, filters.date));
    if (filters?.startDate) conditions.push(gte(breaks.startTime, filters.startDate));
    if (filters?.endDate) conditions.push(lte(breaks.startTime, filters.endDate));

    return await db.select()
      .from(breaks)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(breaks.startTime));
  }

  async getAllActiveBreaks(): Promise<Break[]> {
    return await db.select().from(breaks).where(isNull(breaks.endTime));
  }

  async getBreakCategories(): Promise<BreakCategory[]> {
    return await db.select().from(breakCategories);
  }

  async getBreakCategoryByCommand(command: string): Promise<BreakCategory | undefined> {
    const [category] = await db.select()
      .from(breakCategories)
      .where(and(eq(breakCategories.isActive, true), eq(breakCategories.startCommand, command)));
    if (category) return category;

    const [endCategory] = await db.select()
      .from(breakCategories)
      .where(and(eq(breakCategories.isActive, true), eq(breakCategories.endCommand, command)));
    return endCategory;
  }

  async createBreakCategory(category: InsertBreakCategory): Promise<BreakCategory> {
    const [newCategory] = await db.insert(breakCategories).values(category).returning();
    return newCategory;
  }

  async deleteBreakCategory(id: number): Promise<void> {
    await db.delete(breakCategories).where(eq(breakCategories.id, id));
  }
}

export const storage = new DatabaseStorage();
