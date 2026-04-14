import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../create-context';
import { getSurrealDB } from '../../lib/surrealdb';

export const tasksRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getSurrealDB();
    const result = await db.query(
      'SELECT * FROM tasks WHERE userId = $userId ORDER BY orderIndex, createdAt DESC',
      { userId: ctx.user.id }
    ) as any[];
    
    return result[0] || [];
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        notes: z.string(),
        dueDate: z.number().nullable(),
        dueTime: z.string().nullable(),
        priority: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      const id = `tasks:${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const task = {
        id,
        userId: ctx.user.id,
        ...input,
        isDone: false,
        order: 0,
        completedDate: null,
        reminderEnabled: false,
        reminderTime: null,
        notificationId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.create('tasks', task);
      return task;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        notes: z.string(),
        isDone: z.boolean(),
        dueDate: z.number().nullable(),
        dueTime: z.string().nullable(),
        priority: z.string().nullable(),
        order: z.number(),
        completedDate: z.number().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getSurrealDB();
      
      await db.query(
        `UPDATE ${input.id} SET 
          title = $title,
          notes = $notes,
          isDone = $isDone,
          dueDate = $dueDate,
          dueTime = $dueTime,
          priority = $priority,
          orderIndex = $order,
          completedDate = $completedDate,
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
