import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Search, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/auth-provider";
import { schedulingApi } from "../lib/api";

export function DoctorDirectoryPage() {
  const { session } = useAuth(); const [search, setSearch] = useState(""); const [specialty,setSpecialty]=useState("");
  const query = useQuery({ queryKey: ["doctors", search, specialty], queryFn: () => schedulingApi.doctors(session!.access_token, search, specialty), enabled: Boolean(session), placeholderData: (old) => old });
  return <div><div className="portal-title"><div><p><Stethoscope size={14}/> Trusted care team</p><h1>Find your doctor</h1><span>Browse active clinic doctors and inspect their real schedule availability.</span></div></div>
    <div className="directory-filters"><div className="directory-toolbar glass-panel"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctor…" aria-label="Search doctors"/></div><div className="directory-toolbar glass-panel"><Stethoscope size={18}/><input value={specialty} onChange={(e)=>setSpecialty(e.target.value)} placeholder="Filter specialty…" aria-label="Filter by specialty"/></div></div>
    {query.isLoading && <div className="card-skeletons">{[1,2,3].map((item)=><div key={item} className="doctor-card skeleton"/>)}</div>}
    {query.isError && <div className="state-card">Unable to load doctors. Please try again.</div>}
    {query.data?.length === 0 && <div className="state-card">No active doctors match your search.</div>}
    <div className="doctor-directory">{query.data?.map((doctor, index) => <motion.article className="doctor-card glass-panel" key={doctor.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*.04}}><div className="doctor-avatar large">{doctor.fullName.split(" ").map((p)=>p[0]).slice(-2).join("")}</div><div><span className="specialty-pill">{doctor.specialization}</span><h2>{doctor.fullName}</h2><p>{doctor.qualifications}</p><small><MapPin size={14}/>{doctor.consultationLocation}</small></div><Link to={`/patient/doctors/${doctor.id}`} aria-label={`View times for ${doctor.fullName}`}><span>View times</span><ArrowRight/></Link></motion.article>)}</div>
  </div>;
}
