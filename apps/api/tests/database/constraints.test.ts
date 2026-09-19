import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseConnection } from "../../src/db/client.js";
import { createAppointmentService } from "../../src/appointments/database-service.js";
import { createDoctorAppointmentService } from "../../src/appointments/doctor-database-service.js";
import { createVisitNoteService } from "../../src/appointments/visit-note-database-service.js";

const shouldRun = process.env.RUN_DATABASE_TESTS === "true" && Boolean(process.env.TEST_DATABASE_URL);
const databaseSuite = shouldRun ? describe : describe.skip;

const doctorProfileId = "20000000-0000-4000-8000-000000000001";
const secondDoctorProfileId = "20000000-0000-4000-8000-000000000002";
const patientId = "20000000-0000-4000-8000-000000000003";
const secondPatientId = "20000000-0000-4000-8000-000000000004";
const doctorId = "30000000-0000-4000-8000-000000000001";
const secondDoctorId = "30000000-0000-4000-8000-000000000002";

databaseSuite("PostgreSQL database constraints", () => {
  let connection: DatabaseConnection;

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error("TEST_DATABASE_URL is required.");

    connection = createDatabase({ DATABASE_URL: url }, { max: 10 });
    const migrationsFolder = fileURLToPath(new URL("../../src/db/migrations", import.meta.url));
    await migrate(connection.db, { migrationsFolder });
  });

  beforeEach(async () => {
    await connection.client`TRUNCATE TABLE automation_events, visit_notes, appointment_events, appointments, doctor_leave, doctor_working_hours, doctors, profiles RESTART IDENTITY CASCADE`;
    await connection.client`
      INSERT INTO profiles (id, role, full_name, phone) VALUES
        (${doctorProfileId}, 'DOCTOR', 'Doctor One', '+92-300-1000001'),
        (${secondDoctorProfileId}, 'DOCTOR', 'Doctor Two', '+92-300-1000002'),
        (${patientId}, 'PATIENT', 'Patient One', '+92-300-2000001'),
        (${secondPatientId}, 'PATIENT', 'Patient Two', '+92-300-2000002')
    `;
    await connection.client`
      INSERT INTO doctors (id, profile_id, specialization, qualifications, bio, consultation_location) VALUES
        (${doctorId}, ${doctorProfileId}, 'Family Medicine', 'MBBS', 'Bio', 'Room 1'),
        (${secondDoctorId}, ${secondDoctorProfileId}, 'General Medicine', 'MBBS', 'Bio', 'Room 2')
    `;
  });

  afterAll(async () => {
    await connection?.close();
  });

  async function expectDatabaseCode(operation: Promise<unknown>, code: string) {
    await expect(operation).rejects.toMatchObject({ code });
  }

  it("rejects invalid weekdays", async () => {
    await expectDatabaseCode(
      connection.client`INSERT INTO doctor_working_hours (doctor_id, day_of_week, start_minute, end_minute) VALUES (${doctorId}, 7, 540, 600)`,
      "23514",
    );
  });

  it("rejects reversed hours", async () => {
    await expectDatabaseCode(
      connection.client`INSERT INTO doctor_working_hours (doctor_id, day_of_week, start_minute, end_minute) VALUES (${doctorId}, 1, 660, 540)`,
      "23514",
    );
  });

  it("rejects non-30-minute-aligned hours", async () => {
    await expectDatabaseCode(
      connection.client`INSERT INTO doctor_working_hours (doctor_id, day_of_week, start_minute, end_minute) VALUES (${doctorId}, 1, 545, 600)`,
      "23514",
    );
  });

  it("rejects overlapping working-hour ranges", async () => {
    await connection.client`INSERT INTO doctor_working_hours (doctor_id, day_of_week, start_minute, end_minute) VALUES (${doctorId}, 1, 540, 660)`;
    await expectDatabaseCode(
      connection.client`INSERT INTO doctor_working_hours (doctor_id, day_of_week, start_minute, end_minute) VALUES (${doctorId}, 1, 630, 720)`,
      "23P01",
    );
  });

  it("rejects duplicate working-hour ranges", async () => {
    await connection.client`INSERT INTO doctor_working_hours (doctor_id, day_of_week, start_minute, end_minute) VALUES (${doctorId}, 1, 540, 660)`;
    await expect(
      connection.client`INSERT INTO doctor_working_hours (doctor_id, day_of_week, start_minute, end_minute) VALUES (${doctorId}, 1, 540, 660)`,
    ).rejects.toMatchObject({ code: expect.stringMatching(/^(23505|23P01)$/) });
  });

  it("rejects duplicate leave dates", async () => {
    await connection.client`INSERT INTO doctor_leave (doctor_id, leave_date) VALUES (${doctorId}, '2030-01-10')`;
    await expectDatabaseCode(
      connection.client`INSERT INTO doctor_leave (doctor_id, leave_date) VALUES (${doctorId}, '2030-01-10')`,
      "23505",
    );
  });

  it("rejects appointment durations other than 30 minutes", async () => {
    await expectDatabaseCode(
      connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${patientId}, ${doctorId}, '2030-01-10T09:00:00Z', '2030-01-10T09:45:00Z')`,
      "23514",
    );
  });

  it("prevents simultaneous reservations for the same doctor slot", async () => {
    const insertOne = connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${patientId}, ${doctorId}, '2030-01-10T09:00:00Z', '2030-01-10T09:30:00Z')`;
    const insertTwo = connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${secondPatientId}, ${doctorId}, '2030-01-10T09:00:00Z', '2030-01-10T09:30:00Z')`;
    const results = await Promise.allSettled([insertOne, insertTwo]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("prevents the same patient reserving different doctors at the same time", async () => {
    await connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${patientId}, ${doctorId}, '2030-01-10T10:00:00Z', '2030-01-10T10:30:00Z')`;
    await expectDatabaseCode(
      connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${patientId}, ${secondDoctorId}, '2030-01-10T10:00:00Z', '2030-01-10T10:30:00Z')`,
      "23505",
    );
  });

  it.each(["CANCELLED", "REJECTED", "COMPLETED", "NO_SHOW"] as const)("does not reserve slots for %s history", async (status) => {
    await connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at, status) VALUES (${patientId}, ${doctorId}, '2030-01-10T11:00:00Z', '2030-01-10T11:30:00Z', ${status})`;
    await expect(
      connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${patientId}, ${doctorId}, '2030-01-10T11:00:00Z', '2030-01-10T11:30:00Z')`,
    ).resolves.toBeDefined();
  });

  it("rejects duplicate automation idempotency keys", async () => {
    await connection.client`INSERT INTO automation_events (event_type, aggregate_type, aggregate_id, recipient, idempotency_key) VALUES ('test', 'appointment', ${doctorId}, 'patient@example.test', 'same-key')`;
    await expectDatabaseCode(
      connection.client`INSERT INTO automation_events (event_type, aggregate_type, aggregate_id, recipient, idempotency_key) VALUES ('test', 'appointment', ${doctorId}, 'patient@example.test', 'same-key')`,
      "23505",
    );
  });

  it("keeps appointment events immutable", async () => {
    const [appointment] = await connection.client`
      INSERT INTO appointments (patient_id, doctor_id, start_at, end_at)
      VALUES (${patientId}, ${doctorId}, '2030-01-10T12:00:00Z', '2030-01-10T12:30:00Z')
      RETURNING id
    `;
    const [event] = await connection.client`
      INSERT INTO appointment_events (appointment_id, event_type)
      VALUES (${appointment!.id}, 'BOOKED')
      RETURNING id
    `;

    await expect(
      connection.client`UPDATE appointment_events SET event_type = 'CHANGED' WHERE id = ${event!.id}`,
    ).rejects.toThrow(/immutable/i);
  });

  it("books, reschedules, and cancels atomically with audit events", async () => {
    await connection.client`INSERT INTO doctor_working_hours (doctor_id, day_of_week, start_minute, end_minute) VALUES (${doctorId}, 1, 540, 660)`;
    const service = createAppointmentService(connection.db, () => new Date("2029-01-01T00:00:00Z"));
    const booked = await service.book(patientId, { doctorId, date: "2030-01-07", startTime: "09:00" });
    expect(booked.status).toBe("PENDING");
    const moved = await service.reschedule(patientId, booked.id, { date: "2030-01-07", startTime: "09:30" });
    expect(moved).toMatchObject({ status: "PENDING", localStartTime: "09:30" });
    const cancelled = await service.cancel(patientId, booked.id);
    expect(cancelled.status).toBe("CANCELLED");
    const events = await connection.client`SELECT event_type FROM appointment_events WHERE appointment_id = ${booked.id} ORDER BY created_at`;
    expect(events.map((event) => event.event_type)).toEqual(["APPOINTMENT_CREATED", "APPOINTMENT_RESCHEDULED", "APPOINTMENT_CANCELLED"]);
  });

  it("enforces doctor ownership, transitions, treating history, and idempotent pending expiry", async () => {
    const [own] = await connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${patientId}, ${doctorId}, '2030-01-07T09:00:00Z', '2030-01-07T09:30:00Z') RETURNING id`;
    const [other] = await connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${patientId}, ${secondDoctorId}, '2030-01-08T09:00:00Z', '2030-01-08T09:30:00Z') RETURNING id`;
    let now = new Date("2030-01-07T08:00:00Z");
    const service = createDoctorAppointmentService(connection.db, () => now);
    await expect(service.get(secondDoctorProfileId, own!.id)).rejects.toMatchObject({ status: 404 });
    expect((await service.patientHistory(doctorProfileId, patientId)).map((item) => item.id)).toEqual([own!.id]);
    expect(await service.confirm(doctorProfileId, own!.id)).toMatchObject({ status: "CONFIRMED" });
    now = new Date("2030-01-07T09:00:00Z");
    expect(await service.complete(doctorProfileId, own!.id)).toMatchObject({ status: "COMPLETED" });
    expect(await service.expirePending(other!.id)).toBe(false);
    const [expiring] = await connection.client`INSERT INTO appointments (patient_id, doctor_id, start_at, end_at) VALUES (${secondPatientId}, ${doctorId}, '2030-01-07T08:30:00Z', '2030-01-07T09:00:00Z') RETURNING id`;
    expect(await service.expirePending(expiring!.id)).toBe(true);
    expect(await service.expirePending(expiring!.id)).toBe(false);
    const expiryEvents = await connection.client`SELECT event_type FROM appointment_events WHERE appointment_id = ${expiring!.id}`;
    expect(expiryEvents).toHaveLength(1);
    expect(expiryEvents[0]!.event_type).toBe("PENDING_EXPIRED");
  });

  it("enforces completed-only, one-note, patient ownership, and cross-doctor note privacy",async()=>{
    const [appointment]=await connection.client`INSERT INTO appointments (patient_id,doctor_id,start_at,end_at,status,completed_at) VALUES (${patientId},${doctorId},'2030-01-07T09:00:00Z','2030-01-07T09:30:00Z','COMPLETED','2030-01-07T09:30:00Z') RETURNING id`;
    const [other]=await connection.client`INSERT INTO appointments (patient_id,doctor_id,start_at,end_at,status,completed_at) VALUES (${patientId},${secondDoctorId},'2030-01-08T09:00:00Z','2030-01-08T09:30:00Z','COMPLETED','2030-01-08T09:30:00Z') RETURNING id`;
    const notes=createVisitNoteService(connection.db);
    const created=await notes.createForDoctor(doctorProfileId,appointment!.id,{note:"Note A"});expect(created.note).toBe("Note A");
    await notes.createForDoctor(secondDoctorProfileId,other!.id,{note:"Note B"});
    await expect(notes.createForDoctor(doctorProfileId,appointment!.id,{note:"duplicate"})).rejects.toMatchObject({code:"VISIT_NOTE_ALREADY_EXISTS"});
    await expect(notes.getForDoctor(doctorProfileId,other!.id)).rejects.toMatchObject({status:404});
    expect((await notes.getForPatient(patientId,appointment!.id))?.note).toBe("Note A");expect((await notes.getForPatient(patientId,other!.id))?.note).toBe("Note B");
    await expect(notes.getForPatient(secondPatientId,appointment!.id)).rejects.toMatchObject({status:404});
    const [pending]=await connection.client`INSERT INTO appointments (patient_id,doctor_id,start_at,end_at) VALUES (${secondPatientId},${doctorId},'2030-01-09T09:00:00Z','2030-01-09T09:30:00Z') RETURNING id`;
    await expect(notes.createForDoctor(doctorProfileId,pending!.id,{note:"not allowed"})).rejects.toMatchObject({code:"VISIT_NOTE_NOT_ALLOWED"});
    const events=await connection.client`SELECT metadata FROM appointment_events WHERE appointment_id=${appointment!.id} AND event_type='VISIT_NOTE_CREATED'`;expect(JSON.stringify(events)).not.toContain("Note A");
  });
});
