import type { SafeProfile,UserRole,VisitNote } from "@nfc/contracts";
import request from "supertest";
import { describe,expect,it,vi } from "vitest";
import { createApp } from "../src/app.js";
import type { VisitNoteService } from "../src/appointments/visit-note-types.js";
import type { ApiEnvironment } from "../src/config/env.js";
const env:ApiEnvironment={NODE_ENV:"test",PORT:4000,WEB_ORIGIN:"http://localhost:5173",LOG_LEVEL:"silent",SUPABASE_URL:"https://example.supabase.co",SUPABASE_PUBLISHABLE_KEY:"sb_publishable_test_value_long_enough"},profileId="00000000-0000-4000-8000-000000000001",appointmentId="20000000-0000-4000-8000-000000000001";
const note:VisitNote={id:"30000000-0000-4000-8000-000000000001",appointmentId,note:"Patient is recovering well.",createdAt:"2030-01-01T00:00:00.000Z"};
function setup(role:UserRole){const profile:SafeProfile={id:profileId,role,fullName:"User",phone:"+92000",dateOfBirth:null,gender:null,isActive:true};const service:VisitNoteService={createForDoctor:vi.fn(async()=>note),getForDoctor:vi.fn(async()=>note),getForPatient:vi.fn(async()=>note)};return {service,app:createApp(env,{tokenVerifier:{verify:async()=>({userId:profileId,email:null})},profileRepository:{findById:async()=>profile},visitNoteService:service})};}const auth={Authorization:"Bearer valid"};
describe("assembled visit-note routes",()=>{
 it("lets a Doctor create and read an appointment-scoped note",async()=>{const c=setup("DOCTOR");expect((await request(c.app).post(`/api/v1/doctor/appointments/${appointmentId}/note`).set(auth).send({note:" Patient is recovering well. "})).status).toBe(201);expect(c.service.createForDoctor).toHaveBeenCalledWith(profileId,appointmentId,{note:"Patient is recovering well."});expect((await request(c.app).get(`/api/v1/doctor/appointments/${appointmentId}/note`).set(auth)).body.data.note).toBe(note.note);});
 it("lets only a Patient use the patient read route",async()=>expect((await request(setup("PATIENT").app).get(`/api/v1/patient/appointments/${appointmentId}/note`).set(auth)).status).toBe(200));
 it.each(["", "   "])("rejects blank note content",async value=>expect((await request(setup("DOCTOR").app).post(`/api/v1/doctor/appointments/${appointmentId}/note`).set(auth).send({note:value})).status).toBe(400));
 it("rejects over-limit and forged fields",async()=>{const app=setup("DOCTOR").app;expect((await request(app).post(`/api/v1/doctor/appointments/${appointmentId}/note`).set(auth).send({note:"x".repeat(2001)})).status).toBe(400);expect((await request(app).post(`/api/v1/doctor/appointments/${appointmentId}/note`).set(auth).send({note:"valid",patientId:profileId})).status).toBe(400);});
 it("denies Admin from both privacy roles",async()=>{const app=setup("ADMIN").app;expect((await request(app).get(`/api/v1/doctor/appointments/${appointmentId}/note`).set(auth)).status).toBe(403);expect((await request(app).get(`/api/v1/patient/appointments/${appointmentId}/note`).set(auth)).status).toBe(403);});
 it("denies Patient note creation",async()=>expect((await request(setup("PATIENT").app).post(`/api/v1/doctor/appointments/${appointmentId}/note`).set(auth).send({note:"invalid"})).status).toBe(403));
});
