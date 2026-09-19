import type { AdminAppointmentPage,AdminAppointmentQuery,AdminDashboard,AdminDoctor,CreateDoctorInput } from "@nfc/contracts";
export interface DoctorInviter { invite(email:string,redirectTo:string,metadata:{fullName:string;phone:string}):Promise<{userId:string}>; deleteUser(userId:string):Promise<void>; }
export interface AdminService {
  dashboard():Promise<AdminDashboard>;
  appointments(query:AdminAppointmentQuery):Promise<AdminAppointmentPage>;
  listDoctors(query:{q?:string|undefined}):Promise<AdminDoctor[]>;
  createDoctor(actorProfileId:string,input:CreateDoctorInput,redirectTo:string):Promise<AdminDoctor>;
  setDoctorActive(actorProfileId:string,doctorId:string,isActive:boolean):Promise<AdminDoctor>;
}
