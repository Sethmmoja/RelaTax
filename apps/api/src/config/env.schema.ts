import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  WHATSAPP_TRANSPORT: z.enum(["mock", "meta"]).default("mock"),
  WHATSAPP_VERIFY_TOKEN: z.string().default("dev-verify-token"),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_APP_SECRET: z.string().optional().default(""),

  QUICKBOOKS_CONNECTOR: z.enum(["mock", "intuit"]).default("mock"),
  QUICKBOOKS_CLIENT_ID: z.string().optional().default(""),
  QUICKBOOKS_CLIENT_SECRET: z.string().optional().default(""),

  CLOUD_DRIVE_CONNECTOR: z.enum(["mock", "google_drive", "dropbox"]).default("mock"),
  CLOUD_DRIVE_CLIENT_ID: z.string().optional().default(""),
  CLOUD_DRIVE_CLIENT_SECRET: z.string().optional().default(""),

  AI_PROVIDER: z.enum(["mock", "anthropic"]).default("mock"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().default("claude-opus-4-8"),

  EMAIL_PROVIDER: z.enum(["mock", "smtp"]).default("mock"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.string().default("587"),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().default("RelaTax <no-reply@relatax.co.ke>"),

  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  SENTRY_DSN: z.string().optional().default(""),

  BULL_BOARD_USER: z.string().default("admin"),
  BULL_BOARD_PASS: z.string().default("change-me"),

  PORT: z
    .string()
    .default("4000")
    .transform((v) => parseInt(v, 10))
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.issues
        .map((i) => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`
    );
  }
  return parsed.data;
}
