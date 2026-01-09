import { db } from "./db";
import { users, breaks, type User, type InsertUser, type Break, type InsertBreak } from "@shared/schema";
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
}

export const storage = new DatabaseStorage();
