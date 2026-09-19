import type { AdminAppointmentPage, AdminDashboard, AdminDoctor, SafeProfile, UserRole } from "@nfc/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AdminService } from "../src/admin/types.js";
import { createApp } from "../src/app.js";
import type { VisitNoteService } from "../src/appointments/visit-note-types.js";
import type { ApiEnvironment } from "../src/config/env.js";
import { ApiError } from "../src/http/api-error.js";

const env: ApiEnvironment = { NODE_ENV: "test", PORT: 4000, WEB_ORIGIN: "http://localhost:5173", LOG_LEVEL: "silent", SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value_long_enough" };
const profileId = "00000000-0000-4000-8000-000000000001";
const auth = { Authorization: "Bearer valid" };
const dashboard: AdminDashboard = {
  date: "2026-09-18", timezone: "Asia/Karachi",
  totals: { total: 1, pending: 0, confirmed: 1, completed: 0, noShow: 0, cancelled: 0, rejected: 0 },
  doctors: [{ doctorId: "10000000-0000-4000-8000-000000000001", doctorName: "Dr Test", specialization: "Medicine", total: 1, pending: 0, confirmed: 1, completed: 0, noShow: 0, cancelled: 0, rejected: 0 }],
};
const page: AdminAppointmentPage = {
  page: 1, limit: 20, total: 1, totalPages: 1,
  items: [{ id: "20000000-0000-4000-8000-000000000001", doctor: { id: dashboard.doctors[0]!.doctorId, fullName: "Dr Test", specialization: "Medicine" }, patient: { id: "30000000-0000-4000-8000-000000000001", fullName: "Patient Test", phone: "+92000" }, startAt: "2026-09-18T05:00:00.000Z", endAt: "2026-09-18T05:30:00.000Z", localDate: "2026-09-18", localStartTime: "10:00", localEndTime: "10:30", status: "CONFIRMED", createdAt: "2026-09-17T00:00:00.000Z" }],
};
const doctor:AdminDoctor={id:"10000000-0000-4000-8000-000000000001",profileId:"40000000-0000-4000-8000-000000000001",fullName:"Dr New",email:"doctor-new@example.test",phone:"+923001234567",specialization:"Family Medicine",qualifications:"MBBS",experienceYears:5,consultationLocation:"Room 2",bio:"Experienced family physician.",isActive:true,createdAt:"2026-09-18T00:00:00.000Z"};

function setup(role: UserRole) {
  const profile: SafeProfile = { id: profileId, role, fullName: "Test User", phone: "+92000", dateOfBirth: null, gender: null, isActive: true };
  const service: AdminService = { dashboard: vi.fn(async () => dashboard), appointments: vi.fn(async () => page), listDoctors: vi.fn(async()=>[doctor]), createDoctor:vi.fn(async()=>doctor), setDoctorActive:vi.fn(async(_actor,_id,isActive)=>({...doctor,isActive})) };
  const noteService: VisitNoteService = { createForDoctor: vi.fn(), getForDoctor: vi.fn(), getForPatient: vi.fn() };
  return { service, app: createApp(env, { tokenVerifier: { verify: async () => ({ userId: profileId, email: null }) }, profileRepository: { findById: async () => profile }, adminService: service, visitNoteService: noteService }) };
}

describe("assembled admin routes", () => {
  it("requires authentication", async () => expect((await request(setup("ADMIN").app).get("/api/v1/admin/dashboard")).status).toBe(401));
  it.each(["PATIENT", "DOCTOR"] as const)("returns 403 to %s on every Admin endpoint", async (role) => {
    const app = setup(role).app;
    expect((await request(app).get("/api/v1/admin/dashboard").set(auth)).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/appointments").set(auth)).status).toBe(403);
  });
  it("serves dashboard and appointment oversight only to Admin", async () => {
    const context = setup("ADMIN");
    expect((await request(context.app).get("/api/v1/admin/dashboard").set(auth)).body.data).toEqual(dashboard);
    const response = await request(context.app).get(`/api/v1/admin/appointments?q=Patient&doctorId=${dashboard.doctors[0]!.doctorId}&status=CONFIRMED&date=2026-09-18&page=2&limit=10`).set(auth);
    expect(response.status).toBe(200);
    expect(context.service.appointments).toHaveBeenCalledWith({ q: "Patient", doctorId: dashboard.doctors[0]!.doctorId, status: "CONFIRMED", date: "2026-09-18", page: 2, limit: 10 });
  });
  it.each(["status=UNKNOWN", "date=18-09-2026", "page=0", "limit=101", "doctorId=not-a-uuid"])("rejects invalid filter %s", async (query) => expect((await request(setup("ADMIN").app).get(`/api/v1/admin/appointments?${query}`).set(auth)).status).toBe(400));
  it("returns bounded pagination defaults", async () => {
    const context = setup("ADMIN");
    await request(context.app).get("/api/v1/admin/appointments").set(auth);
    expect(context.service.appointments).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });
  it("never serializes visit-note content and Admin cannot access note endpoints", async () => {
    const context = setup("ADMIN");
    const response = await request(context.app).get("/api/v1/admin/appointments").set(auth);
    expect(JSON.stringify(response.body)).not.toContain("visitNote");
    expect(JSON.stringify(response.body)).not.toContain("private clinical text");
    const appointmentId = page.items[0]!.id;
    expect((await request(context.app).get(`/api/v1/doctor/appointments/${appointmentId}/note`).set(auth)).status).toBe(403);
    expect((await request(context.app).get(`/api/v1/patient/appointments/${appointmentId}/note`).set(auth)).status).toBe(403);
  });
  it("lists Doctors and applies search without exposing clinical notes",async()=>{const context=setup("ADMIN");const response=await request(context.app).get("/api/v1/admin/doctors?q=medicine").set(auth);expect(response.status).toBe(200);expect(context.service.listDoctors).toHaveBeenCalledWith({q:"medicine"});expect(JSON.stringify(response.body)).not.toMatch(/visit.?note|private clinical/i);});
  it.each(["PATIENT","DOCTOR"] as const)("denies %s access to Doctor management",async role=>{const app=setup(role).app;expect((await request(app).get("/api/v1/admin/doctors").set(auth)).status).toBe(403);expect((await request(app).post("/api/v1/admin/doctors").set(auth).send({})).status).toBe(403);expect((await request(app).patch(`/api/v1/admin/doctors/${doctor.id}/status`).set(auth).send({isActive:false})).status).toBe(403);});
  it("invites a Doctor with validated metadata and never accepts a password",async()=>{const context=setup("ADMIN");const input={fullName:doctor.fullName,email:"DOCTOR-NEW@EXAMPLE.TEST",phone:doctor.phone,specialization:doctor.specialization,qualifications:doctor.qualifications,experienceYears:doctor.experienceYears,consultationLocation:doctor.consultationLocation,bio:doctor.bio};const response=await request(context.app).post("/api/v1/admin/doctors").set(auth).send(input);expect(response.status).toBe(201);expect(context.service.createDoctor).toHaveBeenCalledWith(profileId,{...input,email:input.email.toLowerCase()},"http://localhost:5173/auth/set-password");expect(JSON.stringify(response.body)).not.toMatch(/password/i);expect((await request(context.app).post("/api/v1/admin/doctors").set(auth).send({...input,password:"AdminChosenPassword123!"})).status).toBe(400);});
  it("rejects invalid Doctor metadata and malformed status changes",async()=>{const app=setup("ADMIN").app;expect((await request(app).post("/api/v1/admin/doctors").set(auth).send({fullName:"x"})).status).toBe(400);expect((await request(app).patch(`/api/v1/admin/doctors/${doctor.id}/status`).set(auth).send({isActive:"no"})).status).toBe(400);expect((await request(app).patch("/api/v1/admin/doctors/not-a-uuid/status").set(auth).send({isActive:false})).status).toBe(400);});
  it("returns a safe duplicate-email conflict",async()=>{const context=setup("ADMIN");vi.mocked(context.service.createDoctor).mockRejectedValueOnce(new ApiError(409,"DOCTOR_EMAIL_EXISTS","A clinic account already uses this email address."));const response=await request(context.app).post("/api/v1/admin/doctors").set(auth).send({fullName:doctor.fullName,email:doctor.email,phone:doctor.phone,specialization:doctor.specialization,qualifications:doctor.qualifications,experienceYears:doctor.experienceYears,consultationLocation:doctor.consultationLocation,bio:doctor.bio});expect(response.status).toBe(409);expect(response.body.error.code).toBe("DOCTOR_EMAIL_EXISTS");});
  it("activates and deactivates without destructive response data",async()=>{const context=setup("ADMIN");const response=await request(context.app).patch(`/api/v1/admin/doctors/${doctor.id}/status`).set(auth).send({isActive:false});expect(response.status).toBe(200);expect(context.service.setDoctorActive).toHaveBeenCalledWith(profileId,doctor.id,false);expect(response.body.data.isActive).toBe(false);expect(JSON.stringify(response.body)).not.toMatch(/visit.?note/i);});
});
