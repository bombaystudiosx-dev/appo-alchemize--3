import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../create-context';
import { createUser, loginUser } from '../../lib/auth';

export const authRouter = createTRPCRouter({
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await createUser(input.email, input.password, input.name);
        return { success: true, user: result };
      } catch (error: any) {
        throw new Error(error.message || 'Signup failed');
      }
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await loginUser(input.email, input.password);
        return { success: true, user: result };
      } catch (error: any) {
        throw new Error(error.message || 'Login failed');
      }
    }),
});
