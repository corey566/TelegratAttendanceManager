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

    const updates = await bot.getUpdates({ limit: 100, timeout: 0, allowed_updates: ["message", "my_chat_member", "callback_query"] });
    
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
  if (!msg.chat || !msg.chat.id) return;

  const chatId = msg.chat.id.toString();
  const telegramId = msg.from?.id.toString();
  if (!telegramId) return;

  // Handle /start or /help to show the interactive keyboard
  if (msg.text === "/start" || msg.text === "/help" || msg.text?.toLowerCase() === "break" || msg.text?.toLowerCase() === "/break") {
    const categories = await storage.getBreakCategories();
    const activeCategories = categories.filter(c => c.isActive);
    
    if (activeCategories.length === 0) {
      bot?.sendMessage(chatId, "No break categories configured.");
      return;
    }

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
    }

    const activeBreak = await storage.getActiveBreak(user.id);
    const inlineKeyboard = activeCategories.map(cat => {
      const isCurrentActive = activeBreak?.categoryId === cat.id;
      return [
        {
          text: isCurrentActive ? `🔴 End ${cat.name}` : `🟢 Start ${cat.name}`,
          callback_data: isCurrentActive ? `end_${cat.id}` : `start_${cat.id}`
        }
      ];
    });

    bot?.sendMessage(chatId, "Select a break action:", {
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
    return;
  }

  if (!msg.text) return;

  // Check if it's a command first (legacy support)
  const match = msg.text.match(/^\/(.+)/);
  if (!match) return;

  const rawInput = match[1];
  const command = rawInput.split('@')[0].trim().toLowerCase();
  
  const category = await storage.getBreakCategoryByCommand(command);
  if (!category) return;

  const groupsList = await storage.getGroups();
  const activeGroup = groupsList.find(g => g.chatId === chatId);
  
  if (!activeGroup) {
    try {
      await storage.addGroup({
        chatId: chatId,
        title: msg.chat.title || msg.from?.username || `Chat: ${chatId}`,
        isActive: true
      });
    } catch (e) {}
  } else if (!activeGroup.isActive) {
    console.log(`Group ${chatId} is inactive, ignoring command /${command}.`);
    return;
  }

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
      bot?.sendMessage(chatId, `@${msg.from?.username || msg.from?.first_name}, recorded your ${category.name} start at ${formatInTimeZone(messageDate, 'Asia/Colombo', "HH:mm:ss")}.`);
    }
  } else if (command === category.endCommand.toLowerCase()) {
    const activeBreak = await storage.getActiveBreak(user.id);
    if (activeBreak && activeBreak.categoryId === category.id) {
      const duration = Math.round((messageDate.getTime() - activeBreak.startTime.getTime()) / 60000);
      await storage.endBreak(activeBreak.id, messageDate, duration);
      bot?.sendMessage(chatId, `@${msg.from?.username || msg.from?.first_name}, recorded your ${category.name} end at ${formatInTimeZone(messageDate, 'Asia/Colombo', "HH:mm:ss")}. Duration: ${duration}m.`);
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

  bot.on("callback_query", async (query: TelegramBot.CallbackQuery) => {
    if (!query.message || !query.data || !query.from.id) return;
    
    const chatId = query.message.chat.id.toString();
    const telegramId = query.from.id.toString();
    const [action, categoryIdStr] = query.data.split("_");
    const categoryId = parseInt(categoryIdStr);
    
    let user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      user = await storage.createUser({
        telegramId,
        username: query.from.username,
        fullName: `${query.from.first_name || ""} ${query.from.last_name || ""}`.trim(),
        isActive: true,
        isAdmin: false,
        country: "Unknown"
      });
    }

    const category = (await storage.getBreakCategories()).find(c => c.id === categoryId);
    if (!category) return;

    const messageDate = new Date();

    if (action === "start") {
      const activeBreak = await storage.getActiveBreak(user.id);
      if (activeBreak) {
        bot?.answerCallbackQuery(query.id, { text: "You already have an active break!", show_alert: true });
        return;
      }

      await storage.createBreak({
        userId: user.id,
        categoryId: category.id,
        type: category.name,
        startTime: messageDate,
        date: formatInTimeZone(messageDate, 'Asia/Colombo', "yyyy-MM-dd")
      });
      
      bot?.answerCallbackQuery(query.id, { text: `Started ${category.name}` });
    } else if (action === "end") {
      const activeBreak = await storage.getActiveBreak(user.id);
      if (!activeBreak || activeBreak.categoryId !== category.id) {
        bot?.answerCallbackQuery(query.id, { text: "No active break of this type found.", show_alert: true });
        return;
      }

      const duration = Math.round((messageDate.getTime() - activeBreak.startTime.getTime()) / 60000);
      await storage.endBreak(activeBreak.id, messageDate, duration);
      bot?.answerCallbackQuery(query.id, { text: `Ended ${category.name}. Duration: ${duration}m` });
    }

    // Refresh keyboard
    const categories = await storage.getBreakCategories();
    const activeCategories = categories.filter(c => c.isActive);
    const updatedActiveBreak = await storage.getActiveBreak(user.id);
    
    const inlineKeyboard = activeCategories.map(cat => {
      const isCurrentActive = updatedActiveBreak?.categoryId === cat.id;
      return [
        {
          text: isCurrentActive ? `🔴 End ${cat.name}` : `🟢 Start ${cat.name}`,
          callback_data: isCurrentActive ? `end_${cat.id}` : `start_${cat.id}`
        }
      ];
    });

    bot?.editMessageText("Select a break action:", {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  });

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
