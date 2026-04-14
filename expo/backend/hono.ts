import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { initSurrealDB } from "./lib/surrealdb";

const app = new Hono();

app.use("*", cors());

initSurrealDB().catch((error) => {
  console.error('[Hono] Failed to initialize SurrealDB:', error);
});

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;
