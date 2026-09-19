# Scheduling and availability

The clinic timezone is `Asia/Karachi`. Recurring working hours remain local integer minutes; actual appointment timestamps and returned slot instants are UTC ISO strings.

## APIs

- `GET /api/v1/doctors?q=` — active doctor directory for authenticated patients.
- `GET /api/v1/doctors/:doctorId` — active public doctor details.
- `GET /api/v1/doctors/:doctorId/availability?date=YYYY-MM-DD` — server-derived free slots.
- `GET|POST /api/v1/doctor/schedule`
- `PATCH|DELETE /api/v1/doctor/schedule/:id`
- `GET|POST /api/v1/doctor/leave`
- `DELETE /api/v1/doctor/leave/:id`

Doctor mutations derive the doctor record from the verified profile ID. There is no doctor ID in the mutation payload. PostgreSQL's existing GiST exclusion constraint remains the final protection against concurrent overlapping ranges.

Availability validates an active Doctor, calculates the clinic weekday, reads recurring ranges, returns no slots on leave, generates half-hour starts before each range end, and removes only `PENDING` and `CONFIRMED` appointment starts. Availability is informational; booking and rescheduling rely on PostgreSQL constraints for atomic collision protection.

Adding leave immediately suppresses availability and transactionally cancels affected `PENDING` and `CONFIRMED` appointments, records audit events, and enqueues idempotent cancellation emails. Doctor identities and professional records are created through the Admin invitation flow; there is no public role-promotion endpoint.
