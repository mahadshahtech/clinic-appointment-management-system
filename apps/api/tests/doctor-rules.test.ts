import { describe,expect,it } from "vitest";
import { assertDoctorTransition } from "../src/appointments/doctor-rules.js";
const start=new Date("2030-01-07T10:00:00Z"),before=new Date("2030-01-07T09:59:59Z"),at=new Date("2030-01-07T10:00:00Z"),after=new Date("2030-01-07T10:30:00Z");
describe("doctor appointment state machine",()=>{
  it("allows only future PENDING confirmation",()=>{expect(()=>assertDoctorTransition("CONFIRM","PENDING",start,before)).not.toThrow();expect(()=>assertDoctorTransition("CONFIRM","PENDING",start,at)).toThrow();});
  it("allows only PENDING rejection",()=>{expect(()=>assertDoctorTransition("REJECT","PENDING",start,after)).not.toThrow();expect(()=>assertDoctorTransition("REJECT","CONFIRMED",start,before)).toThrow();});
  it.each(["COMPLETE","NO_SHOW"] as const)("allows %s exactly at and after start",action=>{expect(()=>assertDoctorTransition(action,"CONFIRMED",start,at)).not.toThrow();expect(()=>assertDoctorTransition(action,"CONFIRMED",start,after)).not.toThrow();expect(()=>assertDoctorTransition(action,"CONFIRMED",start,before)).toThrow(/start time/i);});
  it.each(["CANCELLED","REJECTED","COMPLETED","NO_SHOW","CONFIRMED"] as const)("does not confirm %s",status=>expect(()=>assertDoctorTransition("CONFIRM",status,start,before)).toThrow());
  it.each(["PENDING","CANCELLED","REJECTED","COMPLETED","NO_SHOW"] as const)("does not complete %s",status=>expect(()=>assertDoctorTransition("COMPLETE",status,start,after)).toThrow());
});
