CREATE EXTENSION IF NOT EXISTS "btree_gist";--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."automation_event_status" AS ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('PATIENT', 'DOCTOR', 'ADMIN');--> statement-breakpoint
CREATE TABLE "appointment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_status" "appointment_status",
	"to_status" "appointment_status",
	"actor_profile_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'PENDING' NOT NULL,
	"cancellation_reason" text,
	"rejection_reason" text,
	"confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_identity_parties_unique" UNIQUE("id","doctor_id","patient_id"),
	CONSTRAINT "appointments_exactly_thirty_minutes" CHECK ("appointments"."end_at" = "appointments"."start_at" + interval '30 minutes')
);
--> statement-breakpoint
CREATE TABLE "automation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"recipient" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "automation_event_status" DEFAULT 'PENDING' NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_events_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "automation_events_attempt_count_nonnegative" CHECK ("automation_events"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"specialization" varchar(160) NOT NULL,
	"qualifications" text NOT NULL,
	"bio" text NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"consultation_location" varchar(240) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_profile_id_unique" UNIQUE("profile_id"),
	CONSTRAINT "doctors_experience_years_nonnegative" CHECK ("doctors"."experience_years" >= 0),
	CONSTRAINT "doctors_specialization_not_blank" CHECK (length(trim("doctors"."specialization")) > 0)
);
--> statement-breakpoint
CREATE TABLE "doctor_leave" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"leave_date" date NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_leave_doctor_date_unique" UNIQUE("doctor_id","leave_date")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"date_of_birth" date,
	"gender" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_full_name_not_blank" CHECK (length(trim("profiles"."full_name")) > 0),
	CONSTRAINT "profiles_phone_not_blank" CHECK (length(trim("profiles"."phone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "visit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_notes_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "working_hours_exact_range_unique" UNIQUE("doctor_id","day_of_week","start_minute","end_minute"),
	CONSTRAINT "working_hours_weekday_valid" CHECK ("doctor_working_hours"."day_of_week" between 0 and 6),
	CONSTRAINT "working_hours_start_minute_valid" CHECK ("doctor_working_hours"."start_minute" between 0 and 1439),
	CONSTRAINT "working_hours_end_minute_valid" CHECK ("doctor_working_hours"."end_minute" between 1 and 1440),
	CONSTRAINT "working_hours_range_ordered" CHECK ("doctor_working_hours"."start_minute" < "doctor_working_hours"."end_minute"),
	CONSTRAINT "working_hours_half_hour_aligned" CHECK ("doctor_working_hours"."start_minute" % 30 = 0 and "doctor_working_hours"."end_minute" % 30 = 0)
);
--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_profiles_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_leave" ADD CONSTRAINT "doctor_leave_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_appointment_parties_fk" FOREIGN KEY ("appointment_id","doctor_id","patient_id") REFERENCES "public"."appointments"("id","doctor_id","patient_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_patient_id_profiles_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_working_hours" ADD CONSTRAINT "working_hours_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "appointment_events_appointment_created_idx" ON "appointment_events" USING btree ("appointment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_doctor_reserving_slot_unique" ON "appointments" USING btree ("doctor_id","start_at") WHERE status in ('PENDING'::appointment_status, 'CONFIRMED'::appointment_status);--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_patient_reserving_slot_unique" ON "appointments" USING btree ("patient_id","start_at") WHERE status in ('PENDING'::appointment_status, 'CONFIRMED'::appointment_status);--> statement-breakpoint
CREATE INDEX "appointments_doctor_start_idx" ON "appointments" USING btree ("doctor_id","start_at");--> statement-breakpoint
CREATE INDEX "appointments_patient_start_idx" ON "appointments" USING btree ("patient_id","start_at");--> statement-breakpoint
CREATE INDEX "appointments_status_start_idx" ON "appointments" USING btree ("status","start_at");--> statement-breakpoint
CREATE INDEX "appointments_doctor_status_start_idx" ON "appointments" USING btree ("doctor_id","status","start_at");--> statement-breakpoint
CREATE INDEX "automation_events_claim_idx" ON "automation_events" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "automation_events_aggregate_idx" ON "automation_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "doctors_active_idx" ON "doctors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "doctor_leave_date_idx" ON "doctor_leave" USING btree ("leave_date");--> statement-breakpoint
CREATE INDEX "profiles_role_active_idx" ON "profiles" USING btree ("role","is_active");--> statement-breakpoint
CREATE INDEX "working_hours_doctor_weekday_idx" ON "doctor_working_hours" USING btree ("doctor_id","day_of_week");
--> statement-breakpoint
ALTER TABLE "doctor_working_hours"
ADD CONSTRAINT "working_hours_no_overlap"
EXCLUDE USING gist (
	"doctor_id" WITH =,
	"day_of_week" WITH =,
	int4range("start_minute", "end_minute", '[)') WITH &&
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "set_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "profiles_set_updated_at"
BEFORE UPDATE ON "profiles"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "doctors_set_updated_at"
BEFORE UPDATE ON "doctors"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "working_hours_set_updated_at"
BEFORE UPDATE ON "doctor_working_hours"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "appointments_set_updated_at"
BEFORE UPDATE ON "appointments"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "visit_notes_set_updated_at"
BEFORE UPDATE ON "visit_notes"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_appointment_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'appointment_events are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "appointment_events_immutable"
BEFORE UPDATE OR DELETE ON "appointment_events"
FOR EACH ROW EXECUTE FUNCTION "prevent_appointment_event_mutation"();
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "doctors" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "doctor_working_hours" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "doctor_leave" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "appointment_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "visit_notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "automation_events" ENABLE ROW LEVEL SECURITY;
