import { uuidSchema,visitNoteInputSchema } from "@nfc/contracts";
import { Router,type Request,type RequestHandler,type Response } from "express";
import type { ProfileRepository,TokenVerifier } from "../auth/types.js";
import type { VisitNoteService } from "../appointments/visit-note-types.js";
import { ApiError } from "../http/api-error.js";
import { success } from "../http/responses.js";
import { createRequireAuth,requireDoctor,requirePatient } from "../middleware/auth.js";
function appointmentId(req:Request){const parsed=uuidSchema.safeParse(req.params.appointmentId);if(!parsed.success)throw new ApiError(400,"VALIDATION_ERROR","Appointment ID is invalid.");return parsed.data;}
function asyncRoute(handler:(req:Request,res:Response)=>Promise<unknown>):RequestHandler{return async(req,res,next)=>{try{await handler(req,res);}catch(error){next(error);}};}
export function createVisitNoteRouters(verifier:TokenVerifier,profiles:ProfileRepository,service:VisitNoteService){const doctor=Router(),patient=Router(),auth=createRequireAuth(verifier,profiles);doctor.use(auth,requireDoctor);patient.use(auth,requirePatient);doctor.post("/:appointmentId/note",asyncRoute(async(req,res)=>{const input=visitNoteInputSchema.safeParse(req.body);if(!input.success)throw new ApiError(400,"VALIDATION_ERROR","Visit note is invalid.",input.error.issues.map(issue=>({field:issue.path.join("."),message:issue.message})));res.status(201).json(success(await service.createForDoctor(req.auth!.profile.id,appointmentId(req),input.data)));}));doctor.get("/:appointmentId/note",asyncRoute(async(req,res)=>res.json(success(await service.getForDoctor(req.auth!.profile.id,appointmentId(req))))));patient.get("/:appointmentId/note",asyncRoute(async(req,res)=>res.json(success(await service.getForPatient(req.auth!.profile.id,appointmentId(req))))));return {doctor,patient};}
