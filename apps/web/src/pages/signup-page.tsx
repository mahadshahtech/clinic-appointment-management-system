import { zodResolver } from "@hookform/resolvers/zod";
import { patientSignupSchema, type PatientSignupInput } from "@nfc/contracts";
import { CheckCircle2, Eye, EyeOff, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-provider";

export function SignupPage() {
  const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState<string | null>(null); const [checkEmail, setCheckEmail] = useState(false);
  const { signUp } = useAuth(); const navigate = useNavigate();
  const form = useForm<PatientSignupInput>({ resolver: zodResolver(patientSignupSchema), defaultValues: { fullName: "", phone: "", email: "", password: "", confirmPassword: "" } });
  const submit = form.handleSubmit(async (values) => { setError(null); try { const result = await signUp(values); if (result.requiresEmailConfirmation) setCheckEmail(true); else navigate("/patient", { replace: true }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create your account."); } });
  if (checkEmail) return <section className="auth-card glass-panel auth-success"><div className="auth-icon"><CheckCircle2 /></div><p className="auth-kicker">Almost there</p><h1>Check your email</h1><p>We sent a confirmation link to <strong>{form.getValues("email")}</strong>. Confirm it, then return to sign in.</p><Link className="button button-primary auth-submit" to="/login">Back to sign in</Link></section>;
  return <section className="auth-card glass-panel signup-card"><div className="auth-icon"><UserRoundPlus size={22} /></div><p className="auth-kicker">Patient registration</p><h1>Create your account</h1><p className="auth-intro">Your account is always created with patient access. Clinical roles are issued only by the clinic.</p>
    <form onSubmit={submit} noValidate>
      <div className="form-grid"><label>Full name<input autoComplete="name" {...form.register("fullName")} /><span className="field-error">{form.formState.errors.fullName?.message}</span></label><label>Phone number<input autoComplete="tel" {...form.register("phone")} /><span className="field-error">{form.formState.errors.phone?.message}</span></label></div>
      <label>Email address<input type="email" autoComplete="email" {...form.register("email")} /><span className="field-error">{form.formState.errors.email?.message}</span></label>
      <div className="form-grid"><label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="new-password" {...form.register("password")} /><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide passwords" : "Show passwords"}>{showPassword ? <EyeOff /> : <Eye />}</button></div><span className="field-error">{form.formState.errors.password?.message}</span></label><label>Confirm password<input type={showPassword ? "text" : "password"} autoComplete="new-password" {...form.register("confirmPassword")} /><span className="field-error">{form.formState.errors.confirmPassword?.message}</span></label></div>
      {error && <div className="form-alert" role="alert">{error}</div>}<button className="button button-primary auth-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating account…" : "Create patient account"}</button>
    </form><p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
  </section>;
}
