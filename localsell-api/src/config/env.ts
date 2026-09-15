import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  refreshTokenSecret: required('REFRESH_TOKEN_SECRET'),
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '90d',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
  publicUploadUrl: process.env.PUBLIC_UPLOAD_URL ?? 'http://localhost:4000/uploads',

  // WhatsApp Cloud API — the permanent System User token. Seeded into
  // Configuration.whatsappAccessToken (see prisma/seed-from-config.ts); also read
  // directly here as a runtime fallback so a server can rotate the token via env
  // alone. Non-secret IDs (phone number ID, WABA ID) live on the Configuration row.
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  // Webhook: the string entered as "Verify token" in Meta's webhook config, and
  // the app secret (Meta App → Settings → Basic) used to check X-Hub-Signature-256.
  // Signature verification is skipped when the secret is unset.
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? 'localsell-whatsapp',
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? '',

  // Base URL of the customer web app — used only to build the `return_url`
  // Cashfree sends the customer back to after hosted checkout. Cashfree
  // credentials themselves are NOT here; like Stripe/PayPal they live in the
  // Configuration table, editable from the admin UI.
  webClientUrl: (process.env.WEB_CLIENT_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
};
