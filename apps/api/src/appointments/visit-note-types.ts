import type { VisitNote,VisitNoteInput } from "@nfc/contracts";
export interface VisitNoteService {
  createForDoctor(profileId:string,appointmentId:string,input:VisitNoteInput):Promise<VisitNote>;
  getForDoctor(profileId:string,appointmentId:string):Promise<VisitNote|null>;
  getForPatient(profileId:string,appointmentId:string):Promise<VisitNote|null>;
}
