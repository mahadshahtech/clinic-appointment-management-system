# Automation and email delivery

Appointment state changes remain in Express/PostgreSQL. The same transaction writes immutable `appointment_events` and durable `automation_events`; the worker performs only expiry scans, tomorrow-reminder generation, and external delivery.

Run `npm run automation:worker` as a separate process. It polls every 60 seconds by default, processes bounded batches, and may be deployed as a separate worker process. Console mode is the safe development default and logs only non-sensitive event metadata—never recipients, appointment payloads, visit notes, or secrets.

Reminder policy: every polling cycle scans CONFIRMED appointments occurring on the next Asia/Karachi calendar day. The deterministic `reminder:<appointmentId>:<startAt>` key prevents duplicates and makes rescheduled starts distinct. Rescheduling returns the appointment to PENDING, so stale reminder generation stops.

In `n8n` mode the worker POSTs normalized payloads with `x-nfc-webhook-secret` and `idempotency-key` headers. Configure SMTP/provider credentials inside n8n. The exported workflow validates the shared secret and provides the safe appointment-email template; configure all real credentials in n8n/server secrets and never in frontend variables.

Failed deliveries use exponential backoff capped at one hour and stop after five attempts. Database conditional claims prevent concurrent processors from claiming the same event. Pending expiry and leave cancellation write cancellation emails transactionally and are idempotent.
