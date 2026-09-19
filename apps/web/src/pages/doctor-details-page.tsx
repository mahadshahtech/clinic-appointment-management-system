import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock3, MapPin } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/auth-provider";
import { ApiClientError, appointmentApi, schedulingApi } from "../lib/api";
import { clinicToday } from "../lib/clinic-time";

export function DoctorDetailsPage() {
  const { id = "" } = useParams(); const { session } = useAuth(); const navigate=useNavigate(); const queryClient=useQueryClient(); const [date, setDate] = useState(clinicToday()); const [selected, setSelected] = useState<string | null>(null); const [notice,setNotice]=useState<string|null>(null);
  const doctor = useQuery({ queryKey:["doctor",id], queryFn:()=>schedulingApi.doctor(session!.access_token,id), enabled:Boolean(session&&id) });
  const availability = useQuery({ queryKey:["availability",id,date], queryFn:()=>schedulingApi.availability(session!.access_token,id,date), enabled:Boolean(session&&id&&date) });
  const booking=useMutation({mutationFn:()=>{const slot=availability.data?.slots.find(s=>s.startAt===selected);if(!slot)throw new Error("Choose an available time.");return appointmentApi.book(session!.access_token,{doctorId:id,date,startTime:slot.localTime});},onSuccess:async()=>{setSelected(null);setNotice("Appointment requested. It is pending doctor confirmation.");await Promise.all([queryClient.invalidateQueries({queryKey:["availability",id,date]}),queryClient.invalidateQueries({queryKey:["patient-appointments"]})]);},onError:async(error)=>{if(error instanceof ApiClientError&&error.status===409){setNotice("That slot is no longer available. The live schedule has been refreshed.");setSelected(null);await queryClient.invalidateQueries({queryKey:["availability",id,date]});}}});
  if (doctor.isLoading) return <div className="state-card">Loading doctor profile…</div>;
  if (doctor.isError || !doctor.data) return <div className="state-card">Doctor profile could not be found.</div>;
  const emptyMessage = availability.data?.reason === "LEAVE" ? "The doctor is on leave this date." : availability.data?.reason === "NO_WORKING_HOURS" ? "The doctor has no working hours this date." : "No free slots remain for this date.";
  return <div><Link className="back-link" to="/patient/doctors"><ChevronLeft size={17}/>All doctors</Link><section className="doctor-profile glass-panel"><div className="doctor-avatar hero-avatar">{doctor.data.fullName.split(" ").map(p=>p[0]).slice(-2).join("")}</div><div><span className="specialty-pill">{doctor.data.specialization}</span><h1>{doctor.data.fullName}</h1><p>{doctor.data.bio}</p><div className="doctor-facts"><span>{doctor.data.qualifications}</span><span><MapPin size={15}/>{doctor.data.consultationLocation}</span><span>{doctor.data.experienceYears} years experience</span></div></div></section>
    <section className="availability-panel glass-panel"><div className="availability-head"><div><p><CalendarDays size={16}/>Choose a clinic date</p><h2>Available times</h2></div><input type="date" min={clinicToday()} value={date} onChange={(e)=>{setDate(e.target.value);setSelected(null);}}/></div>
      {availability.isLoading && <div className="slot-loading">Checking the live schedule…</div>}{availability.isError && <div className="form-alert">Availability could not be loaded.</div>}
      {availability.data && availability.data.slots.length === 0 && <div className="availability-empty"><Clock3/><strong>No times available</strong><span>{emptyMessage}</span></div>}
      <div className="slots-grid">{availability.data?.slots.map(slot=><button key={slot.startAt} className={selected===slot.startAt?"selected":""} onClick={()=>setSelected(slot.startAt)}>{slot.localTime}</button>)}</div>
      {selected && <div className="booking-summary"><div><span>Appointment request</span><strong>{doctor.data.fullName}</strong><p>{date} · {availability.data?.slots.find(s=>s.startAt===selected)?.localTime}–{(() => { const t=availability.data?.slots.find(s=>s.startAt===selected)?.localTime;if(!t)return "";const [h,m]=t.split(":").map(Number);return `${String(h!+(m===30?1:0)).padStart(2,"0")}:${m===30?"00":"30"}`; })()} · 30 minutes</p><small>Begins as Pending Doctor Confirmation</small></div><button className="button button-primary" disabled={booking.isPending} onClick={()=>booking.mutate()}>{booking.isPending?"Requesting…":"Request appointment"}</button></div>}
      {booking.isError && !(booking.error instanceof ApiClientError&&booking.error.status===409) && <div className="form-alert">{booking.error.message}</div>}
      {notice && <div className="success-note"><CheckCircle2 size={17}/><span>{notice}</span>{notice.startsWith("Appointment requested")&&<button onClick={()=>navigate("/patient/appointments")}>View appointments</button>}</div>}
    </section></div>;
}
