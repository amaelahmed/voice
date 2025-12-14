import crypto from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API_BASE_URL = "https://api.telegram.org";

interface InlineButton {
  text: string;
  callback_data: string;
}

interface InlineKeyboard {
  inline_keyboard: InlineButton[][];
}

interface SendMessagePayload {
  chat_id: number;
  text: string;
  parse_mode: string;
  reply_markup?: InlineKeyboard;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  keyboard?: InlineKeyboard
) {
  const url = `${API_BASE_URL}/bot${BOT_TOKEN}/sendMessage`;

  const payload: SendMessagePayload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
  };

  if (keyboard) {
    payload.reply_markup = keyboard;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${error.description}`);
  }

  const data = await response.json();
  return data.result;
}

export async function sendJobNotification(
  chatId: number,
  jobTitle: string,
  company: string,
  matchScore: number,
  matchScoreId: string,
  jobUrl?: string,
  location?: string
) {
  const scorePercentage = Math.round(matchScore * 100);

  let text = `<b>New Job Match!</b> 🎯\n\n`;
  text += `<b>${jobTitle}</b>\n`;
  text += `Company: ${company}\n`;
  if (location) {
    text += `Location: ${location}\n`;
  }
  text += `Match Score: ${scorePercentage}%\n`;

  if (jobUrl) {
    text += `\n<a href="${jobUrl}">View Job Description</a>`;
  }

  const keyboard: InlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ Approve",
          callback_data: `APPROVE|${matchScoreId}`,
        },
        {
          text: "⏭️ Skip",
          callback_data: `SKIP|${matchScoreId}`,
        },
      ],
    ],
  };

  return sendTelegramMessage(chatId, text, keyboard);
}

export function generateWebhookSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return hmac.digest("hex");
}
