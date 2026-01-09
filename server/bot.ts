import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import { format } from 'date-fns';

// This token should be in environment variables
const token = process.env.BOT_TOKEN;
// Replit URL for webhook
const url = process.env.REPLIT_SLUG ? `https://${process.env.REPLIT_SLUG}.replit.app` : 'http://localhost:5000';

let bot: TelegramBot | null = null;

export function setupBot() {
  if (!token) {
    console.warn("BOT_TOKEN is not set. Telegram bot will not start.");
    return null;
  }

  // Use 'webhook' option if you strictly want webhooks, but for Replit dev, 
  // sometimes polling is easier to debug if the URL isn't public yet.
  // However, the requirement is "NO polling", so we configure for webhook.
  // We will assume the webhook is set manually or via an endpoint.
  bot = new TelegramBot(token, { polling: false }); 

  // Commands
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    const username = msg.from?.username;
    const fullName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ');

    if (!userId) return;

    let user = await storage.getUserByTelegramId(userId);
    if (!user) {
      user = await storage.createUser({
        telegramId: userId,
        username: username || `user_${userId}`,
        fullName: fullName || 'Unknown',
        email: '',
        timezone: 'UTC',
        isActive: true
      });
      bot?.sendMessage(chatId, `Welcome ${fullName}! You are now registered.`);
    } else {
      bot?.sendMessage(chatId, `Welcome back ${fullName}!`);
    }
  });

  bot.onText(/\/(.+)/, async (msg, match) => {
    const command = match?.[1];
    if (['start', 'setemail'].includes(command || '')) return;

    const categories = await storage.getBreakCategories();
    const startCat = categories.find(c => c.startCommand === command);
    const endCat = categories.find(c => c.endCommand === command);

    if (startCat) {
      await handleBreak(msg, startCat.name, 'start', startCat.id);
    } else if (endCat) {
      await handleBreak(msg, endCat.name, 'end', endCat.id);
    }
  });

  console.log('Telegram bot setup complete (Webhook mode).');
  return bot;
}

async function handleBreak(msg: TelegramBot.Message, type: string, action: 'start' | 'end', categoryId?: number) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  if (!telegramId) return;

  const user = await storage.getUserByTelegramId(telegramId);
  if (!user) {
    bot?.sendMessage(chatId, "Please /start to register first.");
    return;
  }

  if (action === 'start') {
    // Check if already on break
    const activeBreak = await storage.getActiveBreak(user.id);
    if (activeBreak) {
      bot?.sendMessage(chatId, `You are already on a ${activeBreak.type} since ${format(new Date(activeBreak.startTime), 'HH:mm')}. End it first.`);
      return;
    }

    await storage.createBreak({
      userId: user.id,
      categoryId: categoryId,
      type,
      startTime: new Date(),
      date: new Date().toISOString().split('T')[0]
    });
    bot?.sendMessage(chatId, `Started ${type} at ${format(new Date(), 'HH:mm')}.`);
  } else {
    // End break
    const activeBreak = await storage.getActiveBreak(user.id);
    if (!activeBreak) {
      bot?.sendMessage(chatId, "You don't have an active break.");
      return;
    }
    
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - new Date(activeBreak.startTime).getTime()) / 60000);
    
    await storage.endBreak(activeBreak.id, endTime, duration);
    bot?.sendMessage(chatId, `Ended ${activeBreak.type} at ${format(endTime, 'HH:mm')}. Duration: ${duration} mins.`);
  }
}

// Function to process webhook updates
export function processUpdate(update: any) {
  if (bot) {
    bot.processUpdate(update);
  }
}
