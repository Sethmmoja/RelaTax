import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { initSentry, isSentryEnabled } from "./monitoring/sentry";
import { createQueueDashboardRouter } from "./monitoring/queue-dashboard";
import { basicAuth } from "./monitoring/basic-auth.middleware";

async function bootstrap() {
  initSentry();
  // Only the known first-party frontend may call the API cross-origin —
  // previously `cors: true` reflected and allowed any origin.
  const allowedOrigins = [process.env.APP_URL].filter((url): url is string => !!url);
  const app = await NestFactory.create(AppModule, {
    cors: { origin: allowedOrigins.length ? allowedOrigins : true },
    rawBody: true
  });

  // Behind a reverse proxy, req.ip is the proxy's address unless Express is
  // told how many hops to unwind — which would silently collapse every
  // client into a single rate-limit bucket. Left off by default so a
  // directly-exposed API can't be fooled by a forged X-Forwarded-For.
  const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10);
  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set("trust proxy", trustProxyHops);
  }

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false })
  );
  app.setGlobalPrefix("api/v1", { exclude: ["api/docs"] });

  const config = new DocumentBuilder()
    .setTitle("RelaTax API")
    .setDescription("Single backend powering the RelaTax website, client portal, admin portal, and WhatsApp AI assistant.")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  app.getHttpAdapter().getInstance().use("/admin/queues", basicAuth, createQueueDashboardRouter());

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`RelaTax API listening on port ${port} — docs at /api/docs`);
  // eslint-disable-next-line no-console
  console.log(`Error tracking: ${isSentryEnabled() ? "sentry" : "console only (set SENTRY_DSN to enable)"}`);
}

bootstrap();
