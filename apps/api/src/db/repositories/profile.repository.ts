import type { PatientProfileUpdateInput, SafeProfile } from "@nfc/contracts";
import { eq } from "drizzle-orm";

import type { Database } from "../client.js";
import { profiles } from "../schema/index.js";
import type { ProfileRepository } from "../../auth/types.js";

export function createProfileRepository(database: Database): ProfileRepository {
  return {
    async findById(id): Promise<SafeProfile | null> {
      const [profile] = await database
        .select({
          id: profiles.id,
          role: profiles.role,
          fullName: profiles.fullName,
          phone: profiles.phone,
          dateOfBirth: profiles.dateOfBirth,
          gender: profiles.gender,
          isActive: profiles.isActive,
        })
        .from(profiles)
        .where(eq(profiles.id, id))
        .limit(1);
      return profile ?? null;
    },
    async updatePatient(id: string, input: PatientProfileUpdateInput): Promise<SafeProfile | null> {
      const [profile] = await database
        .update(profiles)
        .set({
          fullName: input.fullName,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender?.trim() || null,
        })
        .where(eq(profiles.id, id))
        .returning({
          id: profiles.id,
          role: profiles.role,
          fullName: profiles.fullName,
          phone: profiles.phone,
          dateOfBirth: profiles.dateOfBirth,
          gender: profiles.gender,
          isActive: profiles.isActive,
        });
      return profile ?? null;
    },
  };
}
