BEGIN;
CREATE TABLE public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- No browser policies: the Go API reads through its trusted database connection.
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_user_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_user_role() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_user_role();
-- Existing accounts are normal users until an administrator explicitly promotes them.
INSERT INTO public.user_roles(user_id, role)
SELECT id, 'user' FROM auth.users ON CONFLICT (user_id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.schema_migrations (
 version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.schema_migrations FROM PUBLIC, anon, authenticated;
INSERT INTO public.schema_migrations(version) VALUES ('001_user_roles');
COMMIT;
