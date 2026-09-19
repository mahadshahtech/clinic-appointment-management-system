import { describe, expect, it } from "vitest";
import { assertBeforeCutoff, assertFuture, assertScheduleAllowsSlot, canPatientModify, localAppointmentParts, parseSlot } from "../src/appointments/rules.js";

describe("appointment lifecycle rules",()=>{
  it("converts Karachi wall-clock selections to UTC without changing the local display",()=>{const slot=parseSlot("2030-01-07","09:00");expect(slot.startAt.toISOString()).toBe("2030-01-07T04:00:00.000Z");expect(localAppointmentParts(slot.startAt,slot.endAt)).toEqual({localDate:"2030-01-07",localStartTime:"09:00",localEndTime:"09:30"});});
  it("handles a clinic-local day boundary",()=>{const slot=parseSlot("2030-01-07","00:00");expect(slot.startAt.toISOString()).toBe("2030-01-06T19:00:00.000Z");expect(localAppointmentParts(slot.startAt,slot.endAt).localDate).toBe("2030-01-07");});
  it("allows changes one millisecond before the two-hour boundary",()=>expect(()=>assertBeforeCutoff(new Date("2030-01-07T10:00:00Z"),new Date("2030-01-07T07:59:59.999Z"))).not.toThrow());
  it("allows changes exactly at the two-hour boundary",()=>expect(()=>assertBeforeCutoff(new Date("2030-01-07T10:00:00Z"),new Date("2030-01-07T08:00:00Z"))).not.toThrow());
  it("blocks changes one millisecond inside the two-hour boundary",()=>expect(()=>assertBeforeCutoff(new Date("2030-01-07T10:00:00Z"),new Date("2030-01-07T08:00:00.001Z"))).toThrow(/two hours/i));
  it("rejects past appointment instants",()=>expect(()=>assertFuture(new Date("2030-01-07T10:00:00Z"),new Date("2030-01-07T10:00:00Z"))).toThrow(/future/i));
  it("accepts split schedule slots and rejects outside hours",()=>{const ranges=[{startMinute:540,endMinute:720},{startMinute:840,endMinute:1020}];expect(()=>assertScheduleAllowsSlot(690,ranges,false)).not.toThrow();expect(()=>assertScheduleAllowsSlot(720,ranges,false)).toThrow(/outside/i);});
  it("rejects an otherwise valid slot on leave",()=>expect(()=>assertScheduleAllowsSlot(540,[{startMinute:540,endMinute:660}],true)).toThrow(/leave/i));
  it.each(["CANCELLED","REJECTED","COMPLETED","NO_SHOW"] as const)("does not offer patient actions for %s",status=>expect(canPatientModify(status,new Date("2030-01-07T10:00:00Z"),new Date("2030-01-07T00:00:00Z"))).toBe(false));
  it("offers actions for reserving statuses through the exact cutoff",()=>{const start=new Date("2030-01-07T10:00:00Z");expect(canPatientModify("PENDING",start,new Date("2030-01-07T08:00:00Z"))).toBe(true);expect(canPatientModify("CONFIRMED",start,new Date("2030-01-07T08:00:00.001Z"))).toBe(false);});
});
