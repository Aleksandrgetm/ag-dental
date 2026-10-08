-- ONLY for an empty, explicitly disposable local PostgreSQL test database.
-- Never apply this auth stub to Supabase or an application database.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
