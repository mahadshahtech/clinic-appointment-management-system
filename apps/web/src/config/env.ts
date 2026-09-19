import { z } from "zod";

const webEnvironmentSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default("http://localhost:4000/api/v1"),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export type WebEnvironment = z.infer<typeof webEnvironmentSchema>;

export function loadWebEnvironment(source: ImportMetaEnv = import.meta.env): WebEnvironment {
  return webEnvironmentSchema.parse(source);
}
