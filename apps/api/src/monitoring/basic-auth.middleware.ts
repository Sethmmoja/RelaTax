import { NextFunction, Request, Response } from "express";

/** Gates the Bull Board queue dashboard — a separate raw Express router that sits outside Nest's own guards. */
export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const [user, pass] =
    header && header.startsWith("Basic ") ? Buffer.from(header.slice(6), "base64").toString().split(":") : [];

  if (user === process.env.BULL_BOARD_USER && pass === process.env.BULL_BOARD_PASS) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="RelaTax Ops"');
  res.status(401).send("Authentication required");
}
