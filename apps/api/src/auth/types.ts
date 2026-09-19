import type { PatientProfileUpdateInput, SafeProfile, UserRole } from "@nfc/contracts";

export interface VerifiedIdentity {
  userId: string;
  email: string | null;
}

export interface TokenVerifier {
  verify(accessToken: string): Promise<VerifiedIdentity>;
}

export interface ProfileRepository {
  findById(id: string): Promise<SafeProfile | null>;
  updatePatient?(id: string, input: PatientProfileUpdateInput): Promise<SafeProfile | null>;
}

export interface AuthenticatedRequestState {
  identity: VerifiedIdentity;
  profile: SafeProfile;
}

export const allRoles: readonly UserRole[] = ["PATIENT", "DOCTOR", "ADMIN"];
