import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getUserFromToken } from "../lib/auth";

export async function createContext(opts: FetchCreateContextFnOptions) {
  const authHeader = opts.req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  let user = null;
  if (token) {
    user = await getUserFromToken(token);
  }

  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
