CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: waitlist waitlist_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_email_key UNIQUE (email);


--
-- Name: waitlist waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);


--
-- Name: waitlist Anyone can join waitlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);


--
-- Name: waitlist Users cannot delete waitlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users cannot delete waitlist" ON public.waitlist AS RESTRICTIVE FOR DELETE USING (false);


--
-- Name: waitlist Users cannot read waitlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users cannot read waitlist" ON public.waitlist FOR SELECT USING (false);


--
-- Name: waitlist Users cannot update waitlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users cannot update waitlist" ON public.waitlist AS RESTRICTIVE FOR UPDATE USING (false);


--
-- Name: waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;