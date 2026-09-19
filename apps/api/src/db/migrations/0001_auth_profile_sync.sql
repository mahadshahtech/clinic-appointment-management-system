CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	profile_name text;
	profile_phone text;
BEGIN
	profile_name := trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1), 'Patient'));
	profile_phone := trim(COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone, 'Not provided'));

	IF profile_name = '' THEN profile_name := 'Patient'; END IF;
	IF profile_phone = '' THEN profile_phone := 'Not provided'; END IF;

	INSERT INTO public.profiles (id, role, full_name, phone, is_active)
	VALUES (NEW.id, 'PATIENT'::public.user_role, profile_name, profile_phone, true);

	RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
--> statement-breakpoint
CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_auth_user"();
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."handle_new_auth_user"() FROM PUBLIC;
