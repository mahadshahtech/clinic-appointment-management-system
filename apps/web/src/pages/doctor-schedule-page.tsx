import { workingHourInputSchema, type WorkingHour } from "@nfc/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../features/auth/auth-provider";
import { schedulingApi } from "../lib/api";

const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const timeOptions = Array.from({length:49},(_,i)=>({value:i*30,label:`${Math.floor(i*30/60).toString().padStart(2,"0")}:${(i*30%60).toString().padStart(2,"0")}`}));
const displayTime=(minute:number)=>timeOptions.find(t=>t.value===minute)?.label;
export function DoctorSchedulePage() {
  const { session }=useAuth(); const client=useQueryClient(); const [day,setDay]=useState(1); const [start,setStart]=useState(540); const [end,setEnd]=useState(660); const [editing,setEditing]=useState<WorkingHour|null>(null); const [message,setMessage]=useState<string|null>(null);
  const schedule=useQuery({queryKey:["doctor-schedule"],queryFn:()=>schedulingApi.schedule(session!.access_token),enabled:Boolean(session)});
  const save=useMutation({mutationFn:async()=>{const parsed=workingHourInputSchema.parse({dayOfWeek:day,startMinute:start,endMinute:end}); return editing?schedulingApi.updateSchedule(session!.access_token,editing.id,parsed):schedulingApi.createSchedule(session!.access_token,parsed);},onSuccess:async()=>{setEditing(null);setMessage("Schedule saved.");await client.invalidateQueries({queryKey:["doctor-schedule"]});},onError:(e)=>setMessage(e instanceof Error?e.message:"Unable to save schedule.")});
  const remove=useMutation({mutationFn:(id:string)=>schedulingApi.deleteSchedule(session!.access_token,id),onSuccess:async()=>{setMessage("Working period removed.");await client.invalidateQueries({queryKey:["doctor-schedule"]});},onError:(e)=>setMessage(e instanceof Error?e.message:"Unable to remove working period.")});
  function edit(range:WorkingHour){setEditing(range);setDay(range.dayOfWeek);setStart(range.startMinute);setEnd(range.endMinute);}
  return <div><div className="portal-title"><div><p><Clock3 size={14}/>Recurring weekly hours</p><h1>Your working schedule</h1><span>Add split periods where needed. Times use Asia/Karachi.</span></div></div>
    <section className="schedule-editor glass-panel"><h2>{editing?"Edit working period":"Add working period"}</h2><div className="schedule-form"><label>Day<select value={day} onChange={e=>setDay(Number(e.target.value))}>{days.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label><label>Starts<select value={start} onChange={e=>setStart(Number(e.target.value))}>{timeOptions.slice(0,-1).map(t=><option value={t.value} key={t.value}>{t.label}</option>)}</select></label><label>Ends<select value={end} onChange={e=>setEnd(Number(e.target.value))}>{timeOptions.slice(1).map(t=><option value={t.value} key={t.value}>{t.label}</option>)}</select></label><button className="button button-primary" onClick={()=>{setMessage(null);save.mutate();}} disabled={save.isPending}><Plus size={17}/>{editing?"Update":"Add period"}</button></div>{message&&<div className={message.includes("saved")?"success-note":"form-alert"}>{message}</div>}</section>
    {schedule.isLoading&&<div className="state-card">Loading your working schedule…</div>}{schedule.isError&&<div className="form-alert" role="alert">Working schedule could not be loaded.</div>}<div className="week-grid">{days.map((name,index)=><section className="day-card glass-panel" key={name}><h3>{name}</h3>{schedule.data?.filter(r=>r.dayOfWeek===index).map(range=><div className="time-range" key={range.id}><span>{displayTime(range.startMinute)} – {displayTime(range.endMinute)}</span><div><button aria-label="Edit range" onClick={()=>edit(range)}><Pencil/></button><button aria-label="Delete range" onClick={()=>remove.mutate(range.id)}><Trash2/></button></div></div>)}{!schedule.isLoading&&!schedule.data?.some(r=>r.dayOfWeek===index)&&<p>Not working</p>}</section>)}</div>
  </div>;
}
