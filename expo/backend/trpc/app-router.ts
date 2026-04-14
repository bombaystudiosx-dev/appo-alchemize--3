import { createTRPCRouter } from "./create-context";
import { exampleRouter } from "./routes/example";
import { manifestationsRouter } from "./routes/manifestations";
import { goalsRouter } from "./routes/goals";
import { tasksRouter } from "./routes/tasks";
import { gratitudeRouter } from "./routes/gratitude";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  manifestations: manifestationsRouter,
  goals: goalsRouter,
  tasks: tasksRouter,
  gratitude: gratitudeRouter,
});

export type AppRouter = typeof appRouter;
