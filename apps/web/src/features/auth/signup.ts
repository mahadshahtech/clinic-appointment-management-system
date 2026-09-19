import type { PatientSignupInput } from "@nfc/contracts";

export function buildPatientSignupOptions(input: PatientSignupInput, emailRedirectTo?: string) {
  return {
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName, phone: input.phone }, ...(emailRedirectTo ? { emailRedirectTo } : {}) },
  } as const;
}
