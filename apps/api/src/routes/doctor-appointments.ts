import { uuidSchema } from "@nfc/contracts";
import { Router,type Request,type RequestHandler,type Response } from "express";
import type { ProfileRepository,TokenVerifier } from "../auth/types.js";
import type { DoctorAppointmentService } from "../appointments/doctor-types.js";
import { ApiError } from "../http/api-error.js";
import { success } from "../http/responses.js";
import { createRequireAuth,requireDoctor } from "../middleware/auth.js";
function id(request:Request){const result=uuidSchema.safeParse(request.params.appointmentId);if(!result.success)throw new ApiError(400,"VALIDATION_ERROR","Appointment ID is invalid.");return result.data;}
function asyncRoute(handler:(request:Request,response:Response)=>Promise<unknown>):RequestHandler{return async(request,response,next)=>{try{await handler(request,response);}catch(error){next(error);}};}
export function createDoctorWorkspaceRouter(verifier:TokenVerifier,profiles:ProfileRepository,service:DoctorAppointmentService){
  const router=Router();router.use(createRequireAuth(verifier,profiles),requireDoctor);
  router.get("/appointments",asyncRoute(async(req,res)=>res.json(success(await service.list(req.auth!.profile.id)))));
  router.get("/appointments/:appointmentId",asyncRoute(async(req,res)=>res.json(success(await service.get(req.auth!.profile.id,id(req))))));
  for(const [path,method] of [["confirm","confirm"],["reject","reject"],["complete","complete"],["no-show","markNoShow"]] as const) router.post(`/appointments/:appointmentId/${path}`,asyncRoute(async(req,res)=>res.json(success(await service[method](req.auth!.profile.id,id(req))))));
  router.get("/patients",asyncRoute(async(req,res)=>res.json(success(await service.listPatients(req.auth!.profile.id)))));
  router.get("/patients/:patientId/history",asyncRoute(async(req,res)=>{const parsed=uuidSchema.safeParse(req.params.patientId);if(!parsed.success)throw new ApiError(400,"VALIDATION_ERROR","Patient ID is invalid.");res.json(success(await service.patientHistory(req.auth!.profile.id,parsed.data)));}));return router;
}
