CREATE TABLE "admin_doctor_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "actor_profile_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "admin_doctor_events" ADD CONSTRAINT "admin_doctor_events_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE restrict ON UPDATE cascade;
ALTER TABLE "admin_doctor_events" ADD CONSTRAINT "admin_doctor_events_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE cascade;
CREATE INDEX "admin_doctor_events_doctor_created_idx" ON "admin_doctor_events" USING btree ("doctor_id", "created_at");
ALTER TABLE "admin_doctor_events" ENABLE ROW LEVEL SECURITY;
