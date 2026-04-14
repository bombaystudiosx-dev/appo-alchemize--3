import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../create-context';
import { getSurrealDB } from '../../lib/surrealdb';

export const goalsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getSurrealDB();
    const result = await db.query(
      'SELECT * FROM goals WHERE userId = $userId ORDER BY createdAt DESC',
      { userId: ctx.user.id }
    ) as any[];
    
    return result[0] || [];
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      const result = await db.query(
        'SELECT * FROM goals WHERE id = $id AND userId = $userId',
        { id: input.id, userId: ctx.user.id }
      ) as any[];
      
      const items = result[0];
      return items && items.length > 0 ? items[0] : null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        targetDate: z.number().nullable(),
        status: z.string(),
        progress: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      const id = `goals:${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const goal = {
        id,
        userId: ctx.user.id,
        ...input,
        streak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.create('goals', goal);
      return goal;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        targetDate: z.number().nullable(),
        status: z.string(),
        progress: z.number(),
        streak: z.number(),
        bestStreak: z.number(),
        lastCompletedDate: z.number().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      
      await db.query(
        `UPDATE ${input.id} SET 
          title = $title,
          description = $description,
          targetDate = $targetDate,
          status = $status,
          progress = $progress,
          streak = $streak,
          bestStreak = $bestStreak,
          lastCompletedDate = $lastCompletedDate,
          updatedAt = $updatedAt
        WHERE userId = $userId`,
        {
          ...input,
          updatedAt: Date.now(),
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
