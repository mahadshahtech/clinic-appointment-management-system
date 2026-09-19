import type { PatientAppointment, SafeProfile, UserRole } from "@nfc/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { AppointmentService } from "../src/appointments/types.js";
import type { ApiEnvironment } from "../src/config/env.js";

const env:ApiEnvironment={NODE_ENV:"test",PORT:4000,WEB_ORIGIN:"http://localhost:5173",LOG_LEVEL:"silent",SUPABASE_URL:"https://example.supabase.co",SUPABASE_PUBLISHABLE_KEY:"sb_publishable_test_value_long_enough"};
const patientId="00000000-0000-4000-8000-000000000001", doctorId="10000000-0000-4000-8000-000000000001", appointmentId="20000000-0000-4000-8000-000000000001";
const item:PatientAppointment={id:appointmentId,doctor:{id:doctorId,fullName:"Dr Test",specialization:"Family Medicine",consultationLocation:"Room 1"},startAt:"2030-01-07T04:00:00.000Z",endAt:"2030-01-07T04:30:00.000Z",localDate:"2030-01-07",localStartTime:"09:00",localEndTime:"09:30",status:"PENDING",createdAt:"2029-01-01T00:00:00.000Z",canCancel:true,canReschedule:true,visitNote:null};
function service():AppointmentService{return {book:vi.fn(async()=>item),list:vi.fn(async()=>[item]),get:vi.fn(async()=>item),cancel:vi.fn(async():Promise<PatientAppointment>=>({...item,status:"CANCELLED",canCancel:false,canReschedule:false})),reschedule:vi.fn(async():Promise<PatientAppointment>=>({...item,localStartTime:"09:30",localEndTime:"10:00"}))};}
function setup(role:UserRole="PATIENT"){const profile:SafeProfile={id:patientId,role,fullName:"Test",phone:"+92000",dateOfBirth:null,gender:null,isActive:true};const appointments=service();return {appointments,app:createApp(env,{tokenVerifier:{verify:async()=>({userId:patientId,email:null})},profileRepository:{findById:async()=>profile},appointmentService:appointments})};}
const auth={Authorization:"Bearer valid"};

describe("assembled patient appointment routes",()=>{
  it("mounts booking and derives the patient from authentication",async()=>{const context=setup();const response=await request(context.app).post("/api/v1/patient/appointments").set(auth).send({doctorId,date:"2030-01-07",startTime:"09:00"});expect(response.status).toBe(201);expect(response.body.data.status).toBe("PENDING");expect(context.appointments.book).toHaveBeenCalledWith(patientId,{doctorId,date:"2030-01-07",startTime:"09:00"});});
  it("rejects unauthenticated requests",async()=>expect((await request(setup().app).get("/api/v1/patient/appointments")).status).toBe(401));
  it.each(["DOCTOR","ADMIN"] as UserRole[])("forbids %s appointment mutations",async role=>expect((await request(setup(role).app).post("/api/v1/patient/appointments").set(auth).send({doctorId,date:"2030-01-07",startTime:"09:00"})).status).toBe(403));
  it.each([
    {doctorId,date:"2030-01-07",startTime:"09:15"},
    {doctorId,date:"bad-date",startTime:"09:00"},
    {doctorId,date:"2030-01-07",startTime:"09:00",patientId:"forged"},
    {doctorId,date:"2030-01-07",startTime:"09:00",status:"CONFIRMED"},
    {doctorId,date:"2030-01-07",startTime:"09:00",duration:60},
  ])("rejects malformed or forged booking payload %#",async body=>expect((await request(setup().app).post("/api/v1/patient/appointments").set(auth).send(body)).status).toBe(400));
  it("mounts list, details, cancellation and rescheduling",async()=>{const context=setup();expect((await request(context.app).get("/api/v1/patient/appointments").set(auth)).status).toBe(200);expect((await request(context.app).get(`/api/v1/patient/appointments/${appointmentId}`).set(auth)).status).toBe(200);expect((await request(context.app).post(`/api/v1/patient/appointments/${appointmentId}/cancel`).set(auth)).body.data.status).toBe("CANCELLED");expect((await request(context.app).post(`/api/v1/patient/appointments/${appointmentId}/reschedule`).set(auth).send({date:"2030-01-07",startTime:"09:30"})).status).toBe(200);});
});
