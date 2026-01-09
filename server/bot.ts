import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { format } from "date-fns";

let bot: TelegramBot | null = null;

export function setupBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.log("BOT_TOKEN is not set. Telegram bot will not start.");
    return null;
  }

  if (bot) return bot;

  bot = new TelegramBot(token, { polling: true });

  bot.on("message", async (msg) => {
    if (!msg.chat || !msg.chat.id) return;

    // Track groups and private chats automatically
    const chatId = msg.chat.id.toString();
    const existingGroup = await storage.getGroupById(chatId);
    
    if (!existingGroup) {
      await storage.addGroup({
        chatId: chatId,
        title: msg.chat.title || msg.chat.username || `Private: ${msg.from?.first_name || 'User'}`,
        isActive: true
      });
    } else if (msg.chat.title && existingGroup.title !== msg.chat.title) {
      // Update title if it changed (for groups)
      await storage.updateGroup(chatId, { title: msg.chat.title });
    }
  });

  bot.onText(/\/(.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const command = match?.[1];
    if (!command) return;

    // Check if group is active
    const groups = await storage.getGroups();
    const group = groups.find(g => g.chatId === chatId);
    if (group && !group.isActive) return;

    const telegramId = msg.from?.id.toString();
    if (!telegramId) return;

    const category = await storage.getBreakCategoryByCommand(command);
    if (!category) return;

    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      // Auto-register user if not exists
      await storage.createUser({
        telegramId,
        username: msg.from?.username,
        fullName: `${msg.from?.first_name || ""} ${msg.from?.last_name || ""}`.trim(),
        isActive: true
      });
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
