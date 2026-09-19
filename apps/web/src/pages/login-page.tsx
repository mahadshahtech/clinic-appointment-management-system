import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput, type UserRole } from "@nfc/contracts";
import { Eye, EyeOff, HeartHandshake, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/auth-provider";
import { getRoleHome } from "../features/auth/routes";

type PortalChoice = "patient" | "doctor" | "admin";
const portals: Record<PortalChoice, { role: UserRole; label: string; title: string; kicker: string; description: string; context: string; icon: typeof HeartHandshake }> = {
  patient: { role: "PATIENT", label: "Patient", title: "Patient Portal", kicker: "Your care, organized", description: "Book appointments, find Doctors, and keep your visit history close at hand.", context: "New patients can create their own secure account.", icon: HeartHandshake },
  doctor: { role: "DOCTOR", label: "Doctor", title: "Doctor Portal", kicker: "Clinical workspace", description: "Manage appointments, schedules, patients, and the day’s clinical workflow.", context: "Doctor accounts are invited by clinic administration.", icon: Stethoscope },
  admin: { role: "ADMIN", label: "Admin", title: "Clinic Administration", kicker: "Clinic operations", description: "Oversee clinic activity, appointments, and Doctor access from one secure workspace.", context: "Administrative access is issued privately by the clinic.", icon: ShieldCheck },
};

function portalFromQuery(value: string | null): PortalChoice { return value === "doctor" || value === "admin" ? value : "patient"; }

export function LoginPage() {
  const [params, setParams] = useSearchParams();
  const selected = portalFromQuery(params.get("portal"));
  const portal = portals[selected];
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const selectPortal = (choice: PortalChoice) => { setFormError(null); setParams({ portal: choice }, { replace: true }); };
  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const profile = await signIn(values);
      if (profile.role !== portal.role) {
        navigate("/auth/portal-mismatch", { replace: true, state: { selectedRole: portal.role } });
        return;
      }
      navigate(getRoleHome(profile.role), { replace: true });
    } catch (error) { setFormError(error instanceof Error ? error.message : "Unable to sign in."); }
  });
  const Icon = portal.icon;
  return <section className={`role-auth-shell role-${selected}`}>
    <aside className="auth-context-panel"><div className="auth-context-icon"><Icon /></div><p>{portal.kicker}</p><h1>{portal.title}</h1><span>{portal.description}</span><div className="auth-context-note"><ShieldCheck size={16} />One secure clinic account. Access is always verified by the server.</div></aside>
    <div className="auth-card role-login-card glass-panel">
      <div className="role-selector" role="tablist" aria-label="Choose sign-in portal">{(Object.keys(portals) as PortalChoice[]).map((choice) => { const ChoiceIcon = portals[choice].icon; return <button key={choice} type="button" role="tab" aria-selected={choice === selected} onClick={() => selectPortal(choice)}><ChoiceIcon size={16} /><span>{portals[choice].label}</span></button>; })}</div>
      <div className="role-login-heading"><div className="auth-icon"><Icon size={22} /></div><div><p className="auth-kicker">Welcome back</p><h2>{portal.title}</h2></div></div>
      <p className="auth-intro">{portal.context}</p>
      <form onSubmit={submit} noValidate><label>Email address<input type="email" autoComplete="email" {...form.register("email")} />{form.formState.errors.email && <span className="field-error">{form.formState.errors.email.message}</span>}</label><label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" {...form.register("password")} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button></div>{form.formState.errors.password && <span className="field-error">{form.formState.errors.password.message}</span>}</label>{formError && <div className="form-alert" role="alert">{formError}</div>}<button className="button button-primary auth-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Signing in…" : `Sign in to ${portal.title}`}</button></form>
      {selected === "patient" ? <p className="auth-switch">New patient? <Link to="/signup">Create patient account</Link></p> : <p className="auth-access-note">{portal.context}</p>}
    </div>
  </section>;
}
