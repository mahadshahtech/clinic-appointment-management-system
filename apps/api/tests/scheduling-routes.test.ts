import type { SafeProfile, UserRole } from "@nfc/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { ApiEnvironment } from "../src/config/env.js";
import { ApiError } from "../src/http/api-error.js";
import type { SchedulingService } from "../src/scheduling/types.js";

const env: ApiEnvironment = { NODE_ENV:"test",PORT:4000,WEB_ORIGIN:"http://localhost:5173",LOG_LEVEL:"silent",SUPABASE_URL:"https://example.supabase.co",SUPABASE_PUBLISHABLE_KEY:"sb_publishable_test_value_long_enough" };
const doctorPublic={id:"10000000-0000-4000-8000-000000000001",fullName:"Dr Active",specialization:"Family Medicine",qualifications:"MBBS",bio:"Bio",experienceYears:8,consultationLocation:"Room 1"};
const schedule={id:"20000000-0000-4000-8000-000000000001",dayOfWeek:1,startMinute:540,endMinute:660};
function service(): SchedulingService { return {listDoctors:vi.fn(async()=>[doctorPublic]),getDoctor:vi.fn(async(id)=>{if(id!==doctorPublic.id)throw new ApiError(404,"NOT_FOUND","Doctor was not found.");return doctorPublic;}),getAvailability:vi.fn(async(id,date)=>({doctorId:id,date,timezone:"Asia/Karachi" as const,reason:null,slots:[]})),listOwnSchedule:vi.fn(async()=>[schedule]),createOwnSchedule:vi.fn(async(_p,input)=>({...schedule,...input})),updateOwnSchedule:vi.fn(async(_p,id,input)=>({id,...input})),deleteOwnSchedule:vi.fn(async()=>undefined),listOwnLeave:vi.fn(async()=>[]),createOwnLeave:vi.fn(async(_p,input)=>({id:"30000000-0000-4000-8000-000000000001",...input,createdAt:new Date().toISOString()})),deleteOwnLeave:vi.fn(async()=>undefined)}; }
function app(role:UserRole,scheduling=service()){const profile:SafeProfile={id:"00000000-0000-4000-8000-000000000001",role,fullName:"User",phone:"+92000",dateOfBirth:null,gender:null,isActive:true};return {scheduling,app:createApp(env,{tokenVerifier:{verify:async()=>({userId:profile.id,email:null})},profileRepository:{findById:async()=>profile},schedulingService:scheduling})};}
const auth={Authorization:"Bearer valid"};

describe("assembled scheduling routes",()=>{
  it("returns the active doctor directory and details",async()=>{const {app:api}=app("PATIENT");expect((await request(api).get("/api/v1/doctors").set(auth)).body.data).toEqual([doctorPublic]);expect((await request(api).get(`/api/v1/doctors/${doctorPublic.id}`).set(auth)).body.data.fullName).toBe("Dr Active");});
  it("returns 404 for an unknown doctor",async()=>expect((await request(app("PATIENT").app).get("/api/v1/doctors/40000000-0000-4000-8000-000000000001").set(auth)).status).toBe(404));
  it("lets a doctor create a valid own schedule using the authenticated profile",async()=>{const setup=app("DOCTOR");const response=await request(setup.app).post("/api/v1/doctor/schedule").set(auth).send({dayOfWeek:1,startMinute:540,endMinute:660});expect(response.status).toBe(201);expect(setup.scheduling.createOwnSchedule).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001",{dayOfWeek:1,startMinute:540,endMinute:660});});
  it("forbids patients from schedule and leave mutations",async()=>{const api=app("PATIENT").app;expect((await request(api).post("/api/v1/doctor/schedule").set(auth).send({dayOfWeek:1,startMinute:540,endMinute:660})).status).toBe(403);expect((await request(api).post("/api/v1/doctor/leave").set(auth).send({leaveDate:"2030-01-07"})).status).toBe(403);});
  it("rejects reversed and unaligned schedule input",async()=>{const api=app("DOCTOR").app;expect((await request(api).post("/api/v1/doctor/schedule").set(auth).send({dayOfWeek:1,startMinute:660,endMinute:540})).status).toBe(400);expect((await request(api).post("/api/v1/doctor/schedule").set(auth).send({dayOfWeek:1,startMinute:545,endMinute:600})).status).toBe(400);});
  it("returns a useful conflict for overlapping ranges",async()=>{const scheduling=service();scheduling.createOwnSchedule=vi.fn(async()=>{throw new ApiError(409,"CONFLICT","This schedule overlaps an existing range.");});expect((await request(app("DOCTOR",scheduling).app).post("/api/v1/doctor/schedule").set(auth).send({dayOfWeek:1,startMinute:540,endMinute:660})).status).toBe(409);});
  it("rejects malformed availability dates",async()=>expect((await request(app("PATIENT").app).get(`/api/v1/doctors/${doctorPublic.id}/availability?date=2030-02-30`).set(auth)).status).toBe(400));
  it("adds leave for the authenticated doctor",async()=>expect((await request(app("DOCTOR").app).post("/api/v1/doctor/leave").set(auth).send({leaveDate:"2030-01-07"})).status).toBe(201));
  it("does not grant admin doctor mutation rights",async()=>expect((await request(app("ADMIN").app).post("/api/v1/doctor/schedule").set(auth).send({dayOfWeek:1,startMinute:540,endMinute:660})).status).toBe(403));
});
