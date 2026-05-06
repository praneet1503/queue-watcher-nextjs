// lib/notifier.ts

import axios from "axios";

const REQUEST_TIMEOUT_SECONDS = 10;

/**
 * Send Telegram notification
 */
export async function sendTelegramNotification(
  orderId: string,
  botToken: string,
  chatId: string
): Promise<boolean> {
  if (!botToken || !chatId) {
    console.error("BOT_TOKEN or CHAT_ID not provided");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(
      url,
      {
        chat_id: chatId,
        text: `🚀 Order ${orderId} is no longer in queue. Likely fulfilled.`,
        disable_web_page_preview: true,
      },
      {
        timeout: REQUEST_TIMEOUT_SECONDS * 1000,
      }
    );

    const data = response.data;

    if (response.status !== 200) {
      console.error(`Telegram HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    if (typeof data === "object" && data !== null && !data.ok) {
      console.error(`Telegram API error: ${JSON.stringify(data)}`);
      return false;
    }

    console.log(`Telegram notification sent for order ${orderId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send Telegram notification: ${error}`);
    return false;
  }
}
