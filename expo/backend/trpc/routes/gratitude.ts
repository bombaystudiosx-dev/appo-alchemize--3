import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../create-context';
import { getSurrealDB } from '../../lib/surrealdb';

export const gratitudeRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getSurrealDB();
    const result = await db.query(
      'SELECT * FROM gratitude_entries WHERE userId = $userId ORDER BY entryDate DESC',
      { userId: ctx.user.id }
    ) as any[];
    
    return result[0] || [];
  }),

  getByDate: protectedProcedure
    .input(z.object({ date: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      const result = await db.query(
        'SELECT * FROM gratitude_entries WHERE entryDate = $date AND userId = $userId',
        { date: input.date, userId: ctx.user.id }
      ) as any[];
      
      const items = result[0];
      return items && items.length > 0 ? items[0] : null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        entryDate: z.number(),
        gratitude1: z.string(),
        gratitude2: z.string().nullable(),
        gratitude3: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      const id = `gratitude_entries:${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const entry = {
        id,
        userId: ctx.user.id,
        ...input,
        createdAt: Date.now(),
      };

      await db.create('gratitude_entries', entry);
      return entry;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        gratitude1: z.string(),
        gratitude2: z.string().nullable(),
        gratitude3: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      
      await db.query(
        `UPDATE ${input.id} SET 
          gratitude1 = $gratitude1,
          gratitude2 = $gratitude2,
          gratitude3 = $gratitude3
        WHERE userId = $userId`,
        {
          ...input,
          userId: ctx.user.id,
        }
      );

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      
      await db.query(
        `DELETE ${input.id} WHERE userId = $userId`,
        { userId: ctx.user.id }
      );

      return { success: true };
    }),
});
