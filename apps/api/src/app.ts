import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import type { ApiEnvironment } from "./config/env.js";
import type { ProfileRepository, TokenVerifier } from "./auth/types.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { createAuthRouter } from "./routes/auth.js";
import { createSchedulingRouters } from "./routes/scheduling.js";
import type { SchedulingService } from "./scheduling/types.js";
import type { AppointmentService } from "./appointments/types.js";
import { createPatientAppointmentRouter } from "./routes/appointments.js";
import type { DoctorAppointmentService } from "./appointments/doctor-types.js";
import { createDoctorWorkspaceRouter } from "./routes/doctor-appointments.js";
import type { VisitNoteService } from "./appointments/visit-note-types.js";
import { createVisitNoteRouters } from "./routes/visit-notes.js";
import type { AdminService } from "./admin/types.js";
import { createAdminRouter } from "./routes/admin.js";

export interface AppDependencies {
  tokenVerifier: TokenVerifier;
  profileRepository: ProfileRepository;
  schedulingService?: SchedulingService;
  appointmentService?: AppointmentService;
  doctorAppointmentService?: DoctorAppointmentService;
  visitNoteService?: VisitNoteService;
  adminService?:AdminService;
}

export function createApp(environment: ApiEnvironment, dependencies: AppDependencies) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: environment.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({
    level: environment.LOG_LEVEL,
    redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
  }));

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", createAuthRouter(dependencies.tokenVerifier, dependencies.profileRepository));
  if (dependencies.schedulingService) {
    const schedulingRouters = createSchedulingRouters(dependencies.tokenVerifier, dependencies.profileRepository, dependencies.schedulingService);
    app.use("/api/v1/doctors", schedulingRouters.patient);
    app.use("/api/v1/doctor", schedulingRouters.doctor);
  }
  if (dependencies.appointmentService) app.use("/api/v1/patient/appointments", createPatientAppointmentRouter(dependencies.tokenVerifier, dependencies.profileRepository, dependencies.appointmentService));
  if (dependencies.doctorAppointmentService) app.use("/api/v1/doctor", createDoctorWorkspaceRouter(dependencies.tokenVerifier, dependencies.profileRepository, dependencies.doctorAppointmentService));
  if(dependencies.visitNoteService){const notes=createVisitNoteRouters(dependencies.tokenVerifier,dependencies.profileRepository,dependencies.visitNoteService);app.use("/api/v1/doctor/appointments",notes.doctor);app.use("/api/v1/patient/appointments",notes.patient);}
  if(dependencies.adminService)app.use("/api/v1/admin",createAdminRouter(dependencies.tokenVerifier,dependencies.profileRepository,dependencies.adminService,environment.WEB_ORIGIN));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
