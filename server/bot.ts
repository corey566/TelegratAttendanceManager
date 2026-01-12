// @ts-ignore
import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

// Use proper types for the bot
let bot: TelegramBot | null = null;

export async function getBotUpdates() {
  if (!bot) return [];
  
  // Stop polling if active to avoid 409 Conflict
  const wasPolling = (bot as any).isPolling();
  if (wasPolling) {
    try {
      await bot.stopPolling();
      // Wait a bit for Telegram to register the stop
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.error("Error stopping polling:", e);
    }
  }

  try {
    const processedMessages = new Set<string>();

    const updates = await bot.getUpdates({ limit: 100, timeout: 0, allowed_updates: ["message", "my_chat_member"] });
    
    console.log(`Catching up: found ${updates.length} updates`);

    for (const update of updates) {
      if (update.message) {
        const msg = update.message;
        const msgId = `${msg.chat.id}:${msg.message_id}`;
        
        if (processedMessages.has(msgId)) continue;
        processedMessages.add(msgId);

        const messageDate = new Date(msg.date * 1000);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (messageDate > twentyFourHoursAgo) {
          console.log(`Processing missed message ${msgId} from ${messageDate.toISOString()}: ${msg.text}`);
          await handleMessage(msg);
        }
      }
      if (update.my_chat_member) {
        const chat = update.my_chat_member.chat;
        const chatId = chat.id.toString();
        const existingGroup = await storage.getGroupById(chatId);
        if (!existingGroup) {
          await storage.addGroup({
            chatId: chatId,
            title: chat.title || chat.username || `Chat: ${chatId}`,
            isActive: true
          });
        }
      }
    }
    
    if (updates.length > 0) {
      const lastUpdateId = updates[updates.length - 1].update_id;
      if (Number.isSafeInteger(lastUpdateId)) {
        await bot.getUpdates({ offset: lastUpdateId + 1, limit: 1, timeout: 0 });
      }
    }
    
    return updates;
  } catch (error) {
    console.error("Error catching up on missed updates:", error);
    return [];
  } finally {
    if (wasPolling && bot) {
      try {
        // @ts-ignore
        await bot.startPolling({ interval: 2000, params: { timeout: 10 } });
      } catch (e) {
        console.error("Error restarting polling:", e);
      }
    }
  }
}

async function handleMessage(msg: TelegramBot.Message) {
  if (!msg.chat || !msg.chat.id || !msg.text) return;

  const chatId = msg.chat.id.toString();
  const telegramId = msg.from?.id.toString();
  if (!telegramId) return;

  // Check if it's a command first
  const match = msg.text.match(/^\/(.+)/);
  if (!match) return;

  const rawInput = match[1];
  const command = rawInput.split('@')[0].trim().toLowerCase();
  
  const category = await storage.getBreakCategoryByCommand(command);
  if (!category) return;

  const groupsList = await storage.getGroups();
  const activeGroup = groupsList.find(g => g.chatId === chatId);
  
  // Auto-activate group if it's new during catch-up, or if it's private
  if (!activeGroup) {
    try {
      await storage.addGroup({
        chatId: chatId,
        title: msg.chat.title || msg.from?.username || `Chat: ${chatId}`,
        isActive: true
      });
      console.log(`Auto-added and activated group ${chatId} during command processing`);
    } catch (e) {}
  } else if (!activeGroup.isActive) {
    console.log(`Group ${chatId} is inactive, ignoring command /${command}.`);
    return;
  }

  console.log(`Handling command /${command} for user ${telegramId} at ${new Date(msg.date * 1000).toISOString()}`);
  
  let user = await storage.getUserByTelegramId(telegramId);
  if (!user) {
    user = await storage.createUser({
      telegramId,
      username: msg.from?.username,
      fullName: `${msg.from?.first_name || ""} ${msg.from?.last_name || ""}`.trim(),
      isActive: true,
      isAdmin: false,
      country: "Unknown"
    });
    console.log(`Auto-registered user ${telegramId} during processing`);
  }

  const messageDate = new Date(msg.date * 1000);

  if (command === category.startCommand.toLowerCase()) {
    const activeBreak = await storage.getActiveBreak(user.id);
    if (!activeBreak) {
      await storage.createBreak({
        userId: user.id,
        categoryId: category.id,
        type: category.name,
        startTime: messageDate,
        date: formatInTimeZone(messageDate, 'Asia/Colombo', "yyyy-MM-dd")
      });
      console.log(`Recorded START for user ${user.id} at ${messageDate.toISOString()}`);
      bot?.sendMessage(chatId, `@${msg.from?.username || msg.from?.first_name}, recorded your ${category.name} start at ${formatInTimeZone(messageDate, 'Asia/Colombo', "HH:mm:ss")}.`);
    } else {
      console.log(`User ${user.id} already has an active break ${activeBreak.id}`);
    }
  } else if (command === category.endCommand.toLowerCase()) {
    const activeBreak = await storage.getActiveBreak(user.id);
    if (activeBreak && activeBreak.categoryId === category.id) {
      const duration = Math.round((messageDate.getTime() - activeBreak.startTime.getTime()) / 60000);
      await storage.endBreak(activeBreak.id, messageDate, duration);
      console.log(`Recorded END for user ${user.id} at ${messageDate.toISOString()}, duration ${duration}m`);
      bot?.sendMessage(chatId, `@${msg.from?.username || msg.from?.first_name}, recorded your ${category.name} end at ${formatInTimeZone(messageDate, 'Asia/Colombo', "HH:mm:ss")}. Duration: ${duration}m.`);
    } else {
      console.log(`No active ${category.name} break found for user ${user.id} to end`);
    }
  }
}

export async function setupBot() {
  const settings = await storage.getBotSettings();
  const token = settings?.botToken || process.env.BOT_TOKEN;
  
  if (!token) {
    console.log("BOT_TOKEN is not set in env or database. Telegram bot will not start.");
    return null;
  }

  if (bot) return bot;

  console.log("Starting Telegram bot...");
  bot = new TelegramBot(token, { polling: false });

  bot.on("polling_error", (error: any) => {
    if (error.message.includes("409 Conflict")) {
      console.log("Polling conflict detected. This is likely due to another instance running. The bot will continue to retry.");
    } else {
      console.error("Polling error:", error.message);
    }
  });

  bot.on("message", handleMessage);

  try {
    if (process.env.NODE_ENV === "production" || process.env.BOT_CATCHUP === "true") {
      await getBotUpdates();
      console.log("Catch up completed. Starting polling...");
    }
    // @ts-ignore
    bot.startPolling({ interval: 2000, params: { timeout: 10 } });
  } catch (err) {
    console.error("Failed during catch up, starting polling anyway:", err);
    // @ts-ignore
    bot.startPolling({ interval: 2000, params: { timeout: 10 } });
  }

  const syncCommands = async () => {
    const categories = await storage.getBreakCategories();
    const commands = categories
      .filter(c => c.isActive)
      .flatMap(c => [
        { command: c.startCommand.toLowerCase(), description: `Start ${c.name}` },
        { command: c.endCommand.toLowerCase(), description: `End ${c.name}` }
      ]);
    
    if (bot) {
      try {
        await bot.setMyCommands(commands);
        console.log("Bot commands synced with Telegram:", commands.length, "commands set");
      } catch (error) {
        console.error("Failed to sync bot commands:", error);
      }
    }
  };

  (bot as any).syncCommands = syncCommands;
  syncCommands();

  return bot;
}

export function processUpdate(update: any) {
  if (bot) {
    bot.processUpdate(update);
  }
}
