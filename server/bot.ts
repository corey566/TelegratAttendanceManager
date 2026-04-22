// @ts-ignore
import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

let bot: TelegramBot | null = null;

const TZ = "Asia/Colombo";

function safeSend(chatId: string | number, text: string, options?: any) {
  if (!bot) return;
  return bot.sendMessage(chatId, text, options).catch((err: any) => {
    console.error(`Failed to send message to ${chatId}:`, err?.message || err);
  });
}

async function buildBreakKeyboard(userId: number) {
  const categories = await storage.getBreakCategories();
  const activeCategories = categories.filter(c => c.isActive);
  const activeBreak = await storage.getActiveBreak(userId);

  const inline_keyboard = activeCategories.map(cat => {
    const isCurrentActive = activeBreak?.categoryId === cat.id;
    return [
      {
        text: isCurrentActive ? `🔴 End ${cat.name}` : `🟢 Start ${cat.name}`,
        callback_data: isCurrentActive ? `end_${cat.id}` : `start_${cat.id}`,
      },
    ];
  });

  return { inline_keyboard, hasCategories: activeCategories.length > 0, activeBreak };
}

async function ensureUser(from: TelegramBot.User) {
  const telegramId = from.id.toString();
  let user = await storage.getUserByTelegramId(telegramId);
  if (!user) {
    user = await storage.createUser({
      telegramId,
      username: from.username,
      fullName: `${from.first_name || ""} ${from.last_name || ""}`.trim(),
      isActive: true,
      isAdmin: false,
      country: "Unknown",
    });
  }
  return user;
}

async function sendBreakMenu(chatId: string | number, userId: number, headerText?: string) {
  const { inline_keyboard, hasCategories } = await buildBreakKeyboard(userId);
  if (!hasCategories) {
    return safeSend(chatId, "No break categories configured. Please contact your administrator.");
  }
  return safeSend(chatId, headerText || "👇 Tap a button to start or end a break:", {
    reply_markup: { inline_keyboard },
  });
}

export async function getBotUpdates() {
  if (!bot) return [];

  const wasPolling = (bot as any).isPolling();
  if (wasPolling) {
    try {
      await bot.stopPolling();
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
      if (update.callback_query) {
        try {
          await handleCallbackQuery(update.callback_query);
        } catch (e) {
          console.error("Error handling missed callback query:", e);
        }
      }
      if (update.my_chat_member) {
        const chat = update.my_chat_member.chat;
        const chatId = chat.id.toString();
        const existingGroup = await storage.getGroupById(chatId);
        if (!existingGroup) {
          await storage.addGroup({
            chatId,
            title: chat.title || chat.username || `Chat: ${chatId}`,
            isActive: true,
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
  if (!msg.chat || !msg.chat.id || !msg.from) return;

  const chatId = msg.chat.id.toString();
  const isPrivate = msg.chat.type === "private";

  // Track group if it's a group chat
  if (!isPrivate) {
    const existingGroup = await storage.getGroupById(chatId);
    if (!existingGroup) {
      try {
        await storage.addGroup({
          chatId,
          title: msg.chat.title || msg.from.username || `Chat: ${chatId}`,
          isActive: true,
        });
      } catch (e) {}
    } else if (!existingGroup.isActive) {
      return;
    }
  }

  const user = await ensureUser(msg.from);

  // Strip @botname suffix and lowercase
  const rawText = (msg.text || "").trim();
  const normalized = rawText.split("@")[0].trim().toLowerCase();

  // In private chat, ANY message shows the buttons (buttons-first UX).
  // In group chat, only /start, /help, /break, or break-related commands trigger.
  const isMenuTrigger =
    normalized === "/start" ||
    normalized === "/help" ||
    normalized === "/break" ||
    normalized === "break" ||
    normalized === "menu" ||
    normalized === "/menu";

  if (isMenuTrigger || (isPrivate && !normalized.startsWith("/"))) {
    await sendBreakMenu(chatId, user.id, "👋 Welcome to BreakTime! Tap a button below to manage your break:");
    return;
  }

  // Legacy command support (e.g., /tea, /lunch typed in groups)
  const match = rawText.match(/^\/(.+)/);
  if (!match) {
    if (isPrivate) {
      await sendBreakMenu(chatId, user.id);
    }
    return;
  }

  const command = match[1].split("@")[0].trim().toLowerCase();
  const category = await storage.getBreakCategoryByCommand(command);
  if (!category) {
    if (isPrivate) await sendBreakMenu(chatId, user.id);
    return;
  }

  const messageDate = new Date(msg.date * 1000);
  const displayName = msg.from.username ? `@${msg.from.username}` : (msg.from.first_name || "User");

  if (command === category.startCommand.toLowerCase()) {
    const activeBreak = await storage.getActiveBreak(user.id);
    if (activeBreak) {
      await safeSend(chatId, `${displayName}, you already have an active break.`);
      return;
    }
    await storage.createBreak({
      userId: user.id,
      categoryId: category.id,
      type: category.name,
      startTime: messageDate,
      date: formatInTimeZone(messageDate, TZ, "yyyy-MM-dd"),
    });
    await safeSend(chatId, `✅ ${displayName}, ${category.name} started at ${formatInTimeZone(messageDate, TZ, "HH:mm:ss")} (Sri Lanka time).`);
  } else if (command === category.endCommand.toLowerCase()) {
    const activeBreak = await storage.getActiveBreak(user.id);
    if (activeBreak && activeBreak.categoryId === category.id) {
      const duration = Math.round((messageDate.getTime() - activeBreak.startTime.getTime()) / 60000);
      await storage.endBreak(activeBreak.id, messageDate, duration);
      await safeSend(chatId, `✅ ${displayName}, ${category.name} ended at ${formatInTimeZone(messageDate, TZ, "HH:mm:ss")}. Duration: ${duration} min.`);
    } else {
      await safeSend(chatId, `${displayName}, no active ${category.name} found.`);
    }
  }
}

async function handleCallbackQuery(query: TelegramBot.CallbackQuery) {
  if (!query.message || !query.data || !query.from?.id) return;

  const chatId = query.message.chat.id.toString();
  const [action, categoryIdStr] = query.data.split("_");
  const categoryId = parseInt(categoryIdStr);
  if (!Number.isFinite(categoryId)) return;

  const user = await ensureUser(query.from);
  const category = (await storage.getBreakCategories()).find(c => c.id === categoryId);
  if (!category) {
    bot?.answerCallbackQuery(query.id, { text: "Category not found.", show_alert: true }).catch(() => {});
    return;
  }

  const messageDate = new Date();
  const displayName = query.from.username ? `@${query.from.username}` : (query.from.first_name || "User");

  if (action === "start") {
    const activeBreak = await storage.getActiveBreak(user.id);
    if (activeBreak) {
      bot?.answerCallbackQuery(query.id, { text: "You already have an active break!", show_alert: true }).catch(() => {});
    } else {
      await storage.createBreak({
        userId: user.id,
        categoryId: category.id,
        type: category.name,
        startTime: messageDate,
        date: formatInTimeZone(messageDate, TZ, "yyyy-MM-dd"),
      });
      bot?.answerCallbackQuery(query.id, { text: `Started ${category.name}` }).catch(() => {});
      await safeSend(chatId, `✅ ${displayName} started ${category.name} at ${formatInTimeZone(messageDate, TZ, "HH:mm:ss")} (Sri Lanka time).`);
    }
  } else if (action === "end") {
    const activeBreak = await storage.getActiveBreak(user.id);
    if (!activeBreak || activeBreak.categoryId !== category.id) {
      bot?.answerCallbackQuery(query.id, { text: "No active break of this type found.", show_alert: true }).catch(() => {});
    } else {
      const duration = Math.round((messageDate.getTime() - activeBreak.startTime.getTime()) / 60000);
      await storage.endBreak(activeBreak.id, messageDate, duration);
      bot?.answerCallbackQuery(query.id, { text: `Ended ${category.name}. ${duration}m` }).catch(() => {});
      await safeSend(chatId, `✅ ${displayName} ended ${category.name} at ${formatInTimeZone(messageDate, TZ, "HH:mm:ss")}. Duration: ${duration} min.`);
    }
  }

  // Refresh keyboard on the original message
  try {
    const { inline_keyboard } = await buildBreakKeyboard(user.id);
    await bot?.editMessageReplyMarkup(
      { inline_keyboard },
      { chat_id: chatId, message_id: query.message.message_id }
    );
  } catch (e: any) {
    if (!String(e?.message || "").includes("message is not modified")) {
      console.error("Failed to refresh keyboard:", e?.message || e);
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
    if (error.message?.includes("409 Conflict")) {
      console.log("Polling conflict detected (another instance may be running).");
    } else {
      console.error("Polling error:", error.message);
    }
  });

  bot.on("message", (msg: TelegramBot.Message) => {
    handleMessage(msg).catch(err => console.error("handleMessage error:", err));
  });

  bot.on("callback_query", (query: TelegramBot.CallbackQuery) => {
    handleCallbackQuery(query).catch(err => console.error("handleCallbackQuery error:", err));
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

  // Replace the typed-command menu with a single "menu" entry that opens buttons.
  const syncCommands = async () => {
    if (!bot) return;
    try {
      await bot.setMyCommands([
        { command: "menu", description: "Open break menu" },
        { command: "start", description: "Open break menu" },
      ]);
      console.log("Bot command menu set to 'menu' / 'start'.");
    } catch (error) {
      console.error("Failed to sync bot commands:", error);
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

export function getBot() {
  return bot;
}
