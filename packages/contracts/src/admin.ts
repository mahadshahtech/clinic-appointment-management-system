import { z } from "zod";
import { appointmentStatusSchema } from "./appointments.js";
import { clinicDateSchema,uuidSchema } from "./scheduling.js";

const statusCounts=z.object({total:z.number().int().nonnegative(),pending:z.number().int().nonnegative(),confirmed:z.number().int().nonnegative(),completed:z.number().int().nonnegative(),noShow:z.number().int().nonnegative(),cancelled:z.number().int().nonnegative(),rejected:z.number().int().nonnegative()});
export const adminDashboardSchema=z.object({date:clinicDateSchema,timezone:z.literal("Asia/Karachi"),totals:statusCounts,doctors:z.array(statusCounts.extend({doctorId:uuidSchema,doctorName:z.string(),specialization:z.string()}))});
export type AdminDashboard=z.infer<typeof adminDashboardSchema>;
export const adminAppointmentQuerySchema=z.object({q:z.string().trim().max(100).optional(),doctorId:uuidSchema.optional(),status:appointmentStatusSchema.optional(),date:clinicDateSchema.optional(),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20)});
export type AdminAppointmentQuery=z.infer<typeof adminAppointmentQuerySchema>;
export const adminAppointmentSchema=z.object({id:uuidSchema,doctor:{id:uuidSchema,fullName:z.string(),specialization:z.string()},patient:{id:uuidSchema,fullName:z.string(),phone:z.string()},startAt:z.string().datetime(),endAt:z.string().datetime(),localDate:clinicDateSchema,localStartTime:z.string(),localEndTime:z.string(),status:appointmentStatusSchema,createdAt:z.string().datetime()});
export type AdminAppointment={id:string;doctor:{id:string;fullName:string;specialization:string};patient:{id:string;fullName:string;phone:string};startAt:string;endAt:string;localDate:string;localStartTime:string;localEndTime:string;status:z.infer<typeof appointmentStatusSchema>;createdAt:string};
export type AdminAppointmentPage={items:AdminAppointment[];page:number;limit:number;total:number;totalPages:number};
