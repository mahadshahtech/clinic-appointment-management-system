import { z } from "zod";

const optionalEnvironmentValue = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => value === "" ? undefined : value, schema.optional());

const automationEnvironmentSchema = z
  .object({
    EMAIL_DELIVERY_MODE: z.enum(["console", "n8n"]).default("console"),
    N8N_EMAIL_WEBHOOK_URL: optionalEnvironmentValue(z.string().url()),
    N8N_WEBHOOK_SECRET: optionalEnvironmentValue(z.string().min(16)),
    AUTOMATION_TRIGGER_SECRET: optionalEnvironmentValue(z.string().min(32)),
    AUTOMATION_POLL_INTERVAL_MS: z.coerce.number().int().min(10_000).default(60_000),
    AUTOMATION_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(25),
    AUTOMATION_RUN_ONCE: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((value, context) => {
    if (value.EMAIL_DELIVERY_MODE === "n8n" && (!value.N8N_EMAIL_WEBHOOK_URL || !value.N8N_WEBHOOK_SECRET)) {
      context.addIssue({ code: "custom", message: "n8n mode requires N8N_EMAIL_WEBHOOK_URL and N8N_WEBHOOK_SECRET." });
    }
  });

export type AutomationEnvironment = z.infer<typeof automationEnvironmentSchema>;

export function loadAutomationEnvironment(source: NodeJS.ProcessEnv = process.env): AutomationEnvironment {
  return automationEnvironmentSchema.parse(source);
}
