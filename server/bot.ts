// @ts-ignore
import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { format } from "date-fns";

// Use proper types for the bot
let bot: TelegramBot | null = null;

export async function getBotUpdates() {
  if (!bot) return [];
  try {
    const updates = await bot.getUpdates({ limit: 100, allowed_updates: ["message", "my_chat_member"] });
    for (const update of updates) {
      if (update.message) {
        await handleMessage(update.message);
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
    return updates;
  } catch (error) {
    console.error("Error fetching updates:", error);
    return [];
  }
}

async function handleMessage(msg: TelegramBot.Message) {
  if (!msg.chat || !msg.chat.id) return;

  const chatId = msg.chat.id.toString();
  const telegramId = msg.from?.id.toString();

  let title = msg.chat.title;
  if (msg.chat.type === "private") {
    title = msg.from?.username || msg.from?.first_name || `User ${telegramId}`;
  }

  const existingGroup = await storage.getGroupById(chatId);
  
  if (!existingGroup) {
    await storage.addGroup({
      chatId: chatId,
      title: title || "Untitled Chat",
      isActive: true
    });
  } else if (title && existingGroup.title !== title) {
    await storage.updateGroup(chatId, { title: title });
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
  bot = new TelegramBot(token, { polling: true });

  bot.on("message", handleMessage);

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

  bot.onText(/\/(.+)/, async (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
    const chatId = msg.chat.id.toString();
    const rawInput = match?.[1] || "";
    const command = rawInput.split('@')[0].trim().toLowerCase();
    
    if (!command) return;

    console.log(`Processing command /${command} (raw: ${rawInput}) from user ${msg.from?.id} in chat ${chatId}`);

    const groupsList = await storage.getGroups();
    const activeGroup = groupsList.find(g => g.chatId === chatId);
    
    if (activeGroup && !activeGroup.isActive) {
      console.log(`Group ${chatId} is inactive, ignoring command /${command}.`);
      return;
    }

    if (!activeGroup) {
      console.log(`Group ${chatId} ("${msg.chat.title || 'Private'}") not found in database.`);
    }

    const telegramId = msg.from?.id.toString();
    if (!telegramId) return;

    const category = await storage.getBreakCategoryByCommand(command);
    if (!category) {
      console.log(`Command /${command} not recognized as a break category.`);
      return;
    }

    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await storage.createUser({
        telegramId,
        username: msg.from?.username,
        fullName: `${msg.from?.first_name || ""} ${msg.from?.last_name || ""}`.trim(),
        isActive: true,
        isAdmin: false,
        country: "Unknown"
      });
      console.log(`Auto-registered new user: ${msg.from?.username || telegramId}`);
    }

    const dbUser = await storage.getUserByTelegramId(telegramId);
    if (!dbUser) return;

    if (command === category.startCommand) {
      const activeBreak = await storage.getActiveBreak(dbUser.id);
      if (activeBreak) {
        bot?.sendMessage(chatId, `@${msg.from?.username || msg.from?.first_name}, you are already on a break!`);
        return;
      }

      await storage.createBreak({
        userId: dbUser.id,
        categoryId: category.id,
        type: category.name,
        startTime: new Date(),
        date: format(new Date(), "yyyy-MM-dd")
      });

      bot?.sendMessage(chatId, `@${msg.from?.username || msg.from?.first_name}, started your ${category.name}. Limit: ${category.duration}m.`);
    } else if (command === category.endCommand) {
      const activeBreak = await storage.getActiveBreak(dbUser.id);
      if (!activeBreak || activeBreak.categoryId !== category.id) {
        bot?.sendMessage(chatId, `@${msg.from?.username || msg.from?.first_name}, you haven't started this break type!`);
        return;
      }

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - activeBreak.startTime.getTime()) / 60000);
      await storage.endBreak(activeBreak.id, endTime, duration);

      let message = `@${msg.from?.username || msg.from?.first_name}, ended your ${category.name}. Duration: ${duration}m.`;
      if (duration > category.duration) {
        message += `\n⚠️ Warning: You exceeded the ${category.duration}m limit by ${duration - category.duration}m!`;
      }
      bot?.sendMessage(chatId, message);
    }
  });

  return bot;
}

export function processUpdate(update: any) {
  if (bot) {
    bot.processUpdate(update);
  }
}
