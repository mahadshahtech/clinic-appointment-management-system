import { createAdminService } from "./admin/database-service.js";
import { createSupabaseDoctorInviter } from "./admin/supabase-inviter.js";
import { createAppointmentService } from "./appointments/database-service.js";
import { createDoctorAppointmentService } from "./appointments/doctor-database-service.js";
import { createVisitNoteService } from "./appointments/visit-note-database-service.js";
import { loadAutomationEnvironment } from "./automation/config.js";
import { runAutomationCycle } from "./automation/cycle.js";
import { createConsoleDelivery, createN8nDelivery } from "./automation/delivery.js";
import { createAutomationService } from "./automation/service.js";
import { createApp } from "./app.js";
import { createSupabaseTokenVerifier } from "./auth/supabase-token-verifier.js";
import { loadDatabaseEnvironment } from "./config/database-env.js";
import { loadEnvironment } from "./config/env.js";
import { createDatabase } from "./db/client.js";
import { createProfileRepository } from "./db/repositories/profile.repository.js";
import { createSchedulingService } from "./scheduling/database-service.js";

export const environment = loadEnvironment();
if (!environment.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is required for secure Admin Doctor invitations.");

export const database = createDatabase(loadDatabaseEnvironment());
const doctorAppointmentService = createDoctorAppointmentService(database.db);
const automationEnvironment = loadAutomationEnvironment();
const automationDelivery = automationEnvironment.EMAIL_DELIVERY_MODE === "n8n"
  ? createN8nDelivery(automationEnvironment.N8N_EMAIL_WEBHOOK_URL!, automationEnvironment.N8N_WEBHOOK_SECRET!)
  : createConsoleDelivery();
const automationService = createAutomationService(database.db, doctorAppointmentService, automationDelivery, {
  batchSize: automationEnvironment.AUTOMATION_BATCH_SIZE,
});
export const app = createApp(environment, {
  tokenVerifier: createSupabaseTokenVerifier(environment.SUPABASE_URL, environment.SUPABASE_PUBLISHABLE_KEY),
  profileRepository: createProfileRepository(database.db),
  schedulingService: createSchedulingService(database.db),
  appointmentService: createAppointmentService(database.db),
  doctorAppointmentService,
  visitNoteService: createVisitNoteService(database.db),
  adminService: createAdminService(database.db, undefined, createSupabaseDoctorInviter(environment.SUPABASE_URL, environment.SUPABASE_SECRET_KEY, environment.NODE_ENV)),
  ...(automationEnvironment.AUTOMATION_TRIGGER_SECRET
    ? { automation: { triggerSecret: automationEnvironment.AUTOMATION_TRIGGER_SECRET, runCycle: () => runAutomationCycle(automationService) } }
    : {}),
});
