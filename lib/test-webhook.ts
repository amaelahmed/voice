/**
 * Test file to verify Telegram webhook signature verification
 * Run with: npx tsx lib/test-webhook.ts
 */

import crypto from "crypto";

function generateWebhookSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return hmac.digest("hex");
}

function verifyTelegramWebhook(body: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha256", "WebAppData");
  hmac.update(body);
  const computed = hmac.digest("hex");
  return computed === signature;
}

// Test callback query payload
const testPayload = {
  update_id: 123456789,
  callback_query: {
    id: "test-callback-id",
    from: {
      id: 123456789,
      is_bot: false,
      first_name: "Test User",
    },
    chat_instance: "test-instance",
    message_id: 1,
    chat_id: 123456789,
    data: "APPROVE|test-match-score-id",
  },
};

const bodyString = JSON.stringify(testPayload);
const signature = generateWebhookSignature(bodyString, "WebAppData");

console.log("Test Telegram Webhook");
console.log("====================\n");
console.log("Payload:", JSON.stringify(testPayload, null, 2));
console.log("\nGenerated Signature:", signature);
console.log("Verification Result:", verifyTelegramWebhook(bodyString, signature));

// Test with invalid signature
console.log("\nTesting with invalid signature:");
console.log(
  "Verification Result:",
  verifyTelegramWebhook(bodyString, "invalid-signature")
);
