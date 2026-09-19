import { createApp } from "./app.js";
import { createSupabaseTokenVerifier } from "./auth/supabase-token-verifier.js";
import { loadDatabaseEnvironment } from "./config/database-env.js";
import { loadEnvironment } from "./config/env.js";
import { createDatabase } from "./db/client.js";
import { createProfileRepository } from "./db/repositories/profile.repository.js";
import { createSchedulingService } from "./scheduling/database-service.js";
import { createAppointmentService } from "./appointments/database-service.js";
import { createDoctorAppointmentService } from "./appointments/doctor-database-service.js";
import { createVisitNoteService } from "./appointments/visit-note-database-service.js";
import { createAdminService } from "./admin/database-service.js";
import { createSupabaseDoctorInviter } from "./admin/supabase-inviter.js";
import { safeOperationalError } from "./http/safe-error.js";

const environment = loadEnvironment();
if(!environment.SUPABASE_SECRET_KEY)throw new Error("SUPABASE_SECRET_KEY is required for secure Admin Doctor invitations.");
const database = createDatabase(loadDatabaseEnvironment());
const app = createApp(environment, {
  tokenVerifier: createSupabaseTokenVerifier(environment.SUPABASE_URL, environment.SUPABASE_PUBLISHABLE_KEY),
  profileRepository: createProfileRepository(database.db),
  schedulingService: createSchedulingService(database.db),
  appointmentService: createAppointmentService(database.db),
  doctorAppointmentService: createDoctorAppointmentService(database.db),
  visitNoteService:createVisitNoteService(database.db),
  adminService:createAdminService(database.db,undefined,createSupabaseDoctorInviter(environment.SUPABASE_URL,environment.SUPABASE_SECRET_KEY,environment.NODE_ENV)),
});

const server = app.listen(environment.PORT, () => {
  console.info(`NFC API listening on http://localhost:${environment.PORT}`);
});

function shutdown(signal: string) {
  console.info(`${signal} received; closing HTTP server.`);
  server.close(async (error) => {
    await database.close();
    if (error) {
      console.error("HTTP server shutdown failed", safeOperationalError(error));
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
