import { createClient } from "@supabase/supabase-js";
import { ApiError } from "../http/api-error.js";
import type { DoctorInviter } from "./types.js";

type SupabaseInviteError={status?:number|undefined;code?:string|undefined;name?:string|undefined;message?:string|undefined};
export function safeSupabaseInviteDiagnostic(error:SupabaseInviteError){
  const message=String(error.message??"Unknown Supabase Auth error")
    .replace(/https?:\/\/\S+/gi,"[redacted-url]")
    .replace(/\beyJ[A-Za-z0-9._-]+\b/g,"[redacted-credential]")
    .replace(/(access_token|refresh_token|token|password|secret)=?[^\s&,]*/gi,"$1=[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,"[redacted-email]")
    .slice(0,500);
  return {status:typeof error.status==="number"?error.status:null,code:typeof error.code==="string"?error.code:null,name:typeof error.name==="string"?error.name:null,message};
}
export function createSupabaseDoctorInviter(url:string,secretKey:string,nodeEnvironment=process.env.NODE_ENV):DoctorInviter {
  const client=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  return {
    async invite(email,redirectTo,metadata){
      const {data,error}=await client.auth.admin.inviteUserByEmail(email,{redirectTo,data:{full_name:metadata.fullName,phone:metadata.phone}});
      if(error){
        if(nodeEnvironment==="development")console.error("Supabase Doctor invitation failed",safeSupabaseInviteDiagnostic(error));
        if(error.status===422||/already|registered|exists/i.test(error.message))throw new ApiError(409,"DOCTOR_EMAIL_EXISTS","A clinic account already uses this email address.");
        throw new ApiError(502,"INVITATION_FAILED","The secure Doctor invitation could not be sent.");
      }
      if(!data.user){if(nodeEnvironment==="development")console.error("Supabase Doctor invitation failed",{status:null,code:"MISSING_USER",name:null,message:"Supabase returned no Auth user."});throw new ApiError(502,"INVITATION_FAILED","The secure Doctor invitation could not be created.");}
      return {userId:data.user.id};
    },
    async deleteUser(userId){await client.auth.admin.deleteUser(userId);},
  };
}
