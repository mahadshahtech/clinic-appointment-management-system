ALTER TABLE "profiles" ADD COLUMN "email" varchar(320);
UPDATE "profiles" p SET "email"=u.email FROM auth.users u WHERE p.id=u.id;
CREATE UNIQUE INDEX "profiles_email_unique" ON "profiles" (lower("email")) WHERE "email" IS NOT NULL;
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, email)
  VALUES (NEW.id, 'PATIENT', coalesce(nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)), coalesce(nullif(trim(NEW.raw_user_meta_data->>'phone'), ''), 'Not provided'), NEW.email)
  ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email;
  RETURN NEW;
END; $$;
