
-- 1. Add class/combination to students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS form_level TEXT,
  ADD COLUMN IF NOT EXISTS combination TEXT,
  ADD COLUMN IF NOT EXISTS is_jaffary BOOLEAN NOT NULL DEFAULT false;

-- Only one Jaffary recipient
CREATE UNIQUE INDEX IF NOT EXISTS students_one_jaffary
  ON public.students ((is_jaffary)) WHERE is_jaffary = true;

-- 2. Contributions table (Asasco, Offering, Trimming, Plaiting)
CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('asasco','offering','trimming','plaiting')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contributions"
  ON public.contributions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS contributions_student_idx ON public.contributions(student_id);
CREATE INDEX IF NOT EXISTS contributions_category_idx ON public.contributions(category);

-- 3. Weekly transfers ledger (audit of Jaffary auto-transfers)
CREATE TABLE IF NOT EXISTS public.weekly_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start)
);
ALTER TABLE public.weekly_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view weekly transfers"
  ON public.weekly_transfers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Update register_student to accept form_level/combination/is_jaffary
DROP FUNCTION IF EXISTS public.register_student(text, text, text, numeric);

CREATE OR REPLACE FUNCTION public.register_student(
  _student_code text,
  _name text,
  _email text,
  _initial_balance numeric,
  _form_level text DEFAULT NULL,
  _combination text DEFAULT NULL,
  _is_jaffary boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.students (student_code, name, email, balance, initial_balance, form_level, combination, is_jaffary)
    VALUES (_student_code, _name, _email, _initial_balance, _initial_balance, _form_level, _combination, _is_jaffary)
    RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 5. Process contribution (fingerprint-verified)
CREATE OR REPLACE FUNCTION public.process_contribution(
  _student_code text,
  _credential_id text,
  _category text,
  _amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _student RECORD;
  _cred RECORD;
  _new_balance NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive'); END IF;
  IF _category NOT IN ('asasco','offering','trimming','plaiting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid category');
  END IF;

  SELECT * INTO _student FROM public.students WHERE student_code = _student_code FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Student not found'); END IF;

  SELECT * INTO _cred FROM public.student_credentials
    WHERE student_id = _student.id AND credential_id = _credential_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Fingerprint not recognized'); END IF;

  IF _student.balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', _student.balance);
  END IF;

  INSERT INTO public.contributions (student_id, category, amount)
    VALUES (_student.id, _category, _amount);

  _new_balance := _student.balance - _amount;
  UPDATE public.students SET balance = _new_balance WHERE id = _student.id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', _new_balance,
    'student_name', _student.name,
    'category', _category,
    'amount', _amount
  );
END;
$$;

-- 6. Weekly Jaffary transfer
CREATE OR REPLACE FUNCTION public.run_weekly_jaffary_transfer()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _jaffary RECORD;
  _student RECORD;
  _week_start DATE := (date_trunc('week', now() - interval '1 day'))::date;
  -- Last completed week (we run at Sunday 00:00 -> week we just ended)
  _transfer_amount NUMERIC := 100;
  _weekly_limit NUMERIC := 10000;
  _count INT := 0;
  _total NUMERIC := 0;
BEGIN
  SELECT * INTO _jaffary FROM public.students WHERE is_jaffary = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Jaffary recipient not configured');
  END IF;

  FOR _student IN
    SELECT * FROM public.students
    WHERE id <> _jaffary.id
      AND week_start = _week_start
      AND weekly_spent < _weekly_limit
      AND balance >= _transfer_amount
  LOOP
    BEGIN
      INSERT INTO public.weekly_transfers (student_id, amount, week_start)
        VALUES (_student.id, _transfer_amount, _week_start);
      UPDATE public.students SET balance = balance - _transfer_amount WHERE id = _student.id;
      UPDATE public.students SET balance = balance + _transfer_amount WHERE id = _jaffary.id;
      _count := _count + 1;
      _total := _total + _transfer_amount;
    EXCEPTION WHEN unique_violation THEN
      -- Already transferred this week
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'students_charged', _count, 'total_transferred', _total, 'week', _week_start);
END;
$$;

-- 7. Enable pg_cron + schedule weekly run (Sunday 00:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule if exists, then reschedule
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-jaffary-transfer') THEN
    PERFORM cron.unschedule('weekly-jaffary-transfer');
  END IF;
END $$;

SELECT cron.schedule(
  'weekly-jaffary-transfer',
  '0 0 * * 0',
  $$ SELECT public.run_weekly_jaffary_transfer(); $$
);
