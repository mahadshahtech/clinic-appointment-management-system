import { describe, expect, it } from "vitest";

import { patientProfileUpdateSchema } from "./auth.js";

describe("patient profile update contract",()=>{
  it("accepts supported profile fields and normalizes whitespace",()=>{expect(patientProfileUpdateSchema.parse({fullName:"  Test Patient  ",phone:" +92-300-1111111 ",dateOfBirth:"1995-06-12",gender:" Female "})).toEqual({fullName:"Test Patient",phone:"+92-300-1111111",dateOfBirth:"1995-06-12",gender:"Female"});});
  it("rejects identity and role fields from affecting the parsed update",()=>{const parsed=patientProfileUpdateSchema.parse({fullName:"Test Patient",phone:"+92-300-1111111",dateOfBirth:null,gender:null,email:"other@example.test",role:"ADMIN"});expect(parsed).not.toHaveProperty("email");expect(parsed).not.toHaveProperty("role");});
});
