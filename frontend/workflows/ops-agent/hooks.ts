// frontend/workflows/ops-agent/hooks.ts
import { z } from "zod";
import { defineHook } from "workflow";

/**
 * Hook que representa la "respuesta humana" desde Slack.
 * Lo vamos a resumir con resume() desde un API route.
 */
export const slackApprovalHook = defineHook({
  schema: z.object({
    approved: z.boolean(),
    comment: z.string().optional(),
  }),
});
