import type { Session } from "@supabase/supabase-js";

export interface InviteAuthClient {
  verifyOtp(input:{token_hash:string;type:"invite"}):Promise<{data:{session:Session|null};error:unknown}>;
  setSession(input:{access_token:string;refresh_token:string}):Promise<{data:{session:Session|null};error:unknown}>;
  exchangeCodeForSession(code:string):Promise<{data:{session:Session|null};error:unknown}>;
  getSession():Promise<{data:{session:Session|null};error:unknown}>;
}
export function parseInviteCallback(url:string){const parsed=new URL(url),hash=new URLSearchParams(parsed.hash.replace(/^#/,""));return {type:hash.get("type")??parsed.searchParams.get("type"),tokenHash:parsed.searchParams.get("token_hash")??hash.get("token_hash"),accessToken:hash.get("access_token")??parsed.searchParams.get("access_token"),refreshToken:hash.get("refresh_token")??parsed.searchParams.get("refresh_token"),code:parsed.searchParams.get("code"),errorCode:parsed.searchParams.get("error_code")??hash.get("error_code")};}
export async function establishInviteSession(auth:InviteAuthClient,url:string){const params=parseInviteCallback(url);if(params.errorCode)return {session:null,error:new Error("Invitation callback returned an error.")};if(params.tokenHash&&params.type==="invite"){const result=await auth.verifyOtp({token_hash:params.tokenHash,type:"invite"});return {session:result.data.session,error:result.error};}if(params.accessToken&&params.refreshToken){const result=await auth.setSession({access_token:params.accessToken,refresh_token:params.refreshToken});return {session:result.data.session,error:result.error};}if(params.code){const result=await auth.exchangeCodeForSession(params.code);return {session:result.data.session,error:result.error};}const result=await auth.getSession();return {session:result.data.session,error:result.error};}
