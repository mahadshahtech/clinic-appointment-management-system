import type { AppointmentStatus } from "@nfc/contracts";
import { ApiError } from "../http/api-error.js";

export type DoctorAction="CONFIRM"|"REJECT"|"COMPLETE"|"NO_SHOW";
export function assertDoctorTransition(action:DoctorAction,status:AppointmentStatus,startAt:Date,now:Date){
  if(action==="CONFIRM"){if(status!=="PENDING")throw new ApiError(409,"APPOINTMENT_NOT_CONFIRMABLE","Only a pending appointment can be confirmed.");if(startAt<=now)throw new ApiError(409,"APPOINTMENT_NOT_CONFIRMABLE","A started or expired pending appointment cannot be confirmed.");return;}
  if(action==="REJECT"){if(status!=="PENDING")throw new ApiError(409,"APPOINTMENT_NOT_REJECTABLE","Only a pending appointment can be rejected.");return;}
  if(status!=="CONFIRMED")throw new ApiError(409,action==="COMPLETE"?"APPOINTMENT_NOT_COMPLETABLE":"APPOINTMENT_NOT_NO_SHOW_ELIGIBLE",`Only a confirmed appointment can be marked ${action==="COMPLETE"?"completed":"no-show"}.`);
  if(now<startAt)throw new ApiError(409,"APPOINTMENT_NOT_STARTED","This action is available at or after the appointment start time.");
}
