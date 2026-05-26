-- Add denomination tracking to offering contributions
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS denomination TEXT;
CREATE INDEX IF NOT EXISTS idx_contributions_category_denom ON public.contributions(category, denomination);

-- Allow admins to manage cashier role assignments (was blocking cashier creation)
DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update process_contribution to record denomination
CREATE OR REPLACE FUNCTION public.process_contribution(
  _student_code text,
  _credential_id text,
  _category text,
  _amount numeric,
  _denomination text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _student RECORD;
  _cred RECORD;
  _new_balance NUMERIC;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cashier')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
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

  INSERT INTO public.contributions (student_id, category, amount, denomination)
    VALUES (_student.id, _category, _amount, _denomination);

  _new_balance := _student.balance - _amount;
  UPDATE public.students SET balance = _new_balance WHERE id = _student.id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', _new_balance,
    'student_name', _student.name,
    'category', _category,
    'denomination', _denomination,
    'amount', _amount
  );
END;
$function$;