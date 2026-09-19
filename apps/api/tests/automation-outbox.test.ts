import { describe,expect,it,vi } from "vitest";
import type { DatabaseTransaction } from "../src/db/transaction.js";
import { enqueueAppointmentEmail } from "../src/automation/outbox.js";

function transactionReturning(rows:Array<{id:string}>){const returning=vi.fn().mockResolvedValue(rows),onConflictDoNothing=vi.fn(()=>({returning})),values=vi.fn(()=>({onConflictDoNothing})),insert=vi.fn(()=>({values}));return {transaction:{insert} as unknown as DatabaseTransaction,insert,onConflictDoNothing};}

const input={type:"APPOINTMENT_REMINDER_EMAIL" as const,appointmentId:"11111111-1111-4111-8111-111111111111",recipient:"patient@example.test",patientName:"Test Patient",doctorName:"Dr. Test",startAt:new Date("2030-01-07T04:00:00.000Z"),key:"reminder:test"};

describe("automation outbox enqueue result",()=>{
  it("reports a newly inserted event",async()=>{const mock=transactionReturning([{id:"event"}]);await expect(enqueueAppointmentEmail(mock.transaction,input)).resolves.toBe(true);expect(mock.onConflictDoNothing).toHaveBeenCalledOnce();});
  it("reports an idempotency conflict without treating it as a new reminder",async()=>{const mock=transactionReturning([]);await expect(enqueueAppointmentEmail(mock.transaction,input)).resolves.toBe(false);});
});
