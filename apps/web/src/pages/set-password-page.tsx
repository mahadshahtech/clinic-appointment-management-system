import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2,KeyRound } from "lucide-react";
import { useEffect,useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { establishInviteSession } from "../features/auth/invite-callback";
import { fetchCurrentProfile } from "../lib/api";
import { getSupabaseClient } from "../lib/supabase";

const schema=z.object({password:z.string().min(8).max(128),confirmPassword:z.string()}).refine(value=>value.password===value.confirmPassword,{path:["confirmPassword"],message:"Passwords must match."});
type Form=z.infer<typeof schema>;
const invalidInvitation="This invitation is not connected to the invited Doctor account. Sign out and reopen the invitation link.";

export function SetPasswordPage(){
  const [complete,setComplete]=useState(false),[processing,setProcessing]=useState(true),[doctorUserId,setDoctorUserId]=useState<string|null>(null),[error,setError]=useState<string|null>(null);
  const form=useForm<Form>({resolver:zodResolver(schema),defaultValues:{password:"",confirmPassword:""}});
  useEffect(()=>{let active=true;const establish=async()=>{try{const supabase=getSupabaseClient();const result=await establishInviteSession(supabase.auth,window.location.href);if(result.error||!result.session)throw new Error("Invalid invite session");const current=await fetchCurrentProfile(result.session.access_token);if(current.profile.role!=="DOCTOR"||current.profile.id!==result.session.user.id)throw new Error("Invite identity is not a Doctor");if(active)setDoctorUserId(result.session.user.id);}catch{if(active)setError(invalidInvitation);}finally{if(active)setProcessing(false);}};void establish();return()=>{active=false;};},[]);
  const submit=form.handleSubmit(async({password})=>{setError(null);const supabase=getSupabaseClient(),current=await supabase.auth.getSession();if(!doctorUserId||!current.data.session||current.data.session.user.id!==doctorUserId){setError(invalidInvitation);return;}const {error:updateError}=await supabase.auth.updateUser({password});if(updateError)setError("Your secure invitation is invalid or expired. Request a new invitation from the clinic.");else setComplete(true);});
  if(processing)return <section className="auth-card glass-panel"><div className="auth-loading-inline">Validating your secure invitation…</div></section>;
  if(complete)return <section className="auth-card glass-panel auth-success"><div className="auth-icon"><CheckCircle2/></div><p className="auth-kicker">Password secured</p><h1>Your Doctor account is ready</h1><p>You can now enter the Doctor portal with your email and new password.</p><Link className="button button-primary auth-submit" to="/doctor">Continue to Doctor portal</Link></section>;
  return <section className="auth-card glass-panel"><div className="auth-icon"><KeyRound/></div><p className="auth-kicker">Secure Doctor invitation</p><h1>Choose your password</h1><p className="auth-intro">This password is known only to you.</p>{!doctorUserId?<div className="form-alert" role="alert">{error??invalidInvitation}</div>:<form onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" {...form.register("password")}/><span className="field-error">{form.formState.errors.password?.message}</span></label><label>Confirm password<input type="password" autoComplete="new-password" {...form.register("confirmPassword")}/><span className="field-error">{form.formState.errors.confirmPassword?.message}</span></label>{error&&<div className="form-alert" role="alert">{error}</div>}<button className="button button-primary auth-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting?"Securing account…":"Set password"}</button></form>}</section>;
}
