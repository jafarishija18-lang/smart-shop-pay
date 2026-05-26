
-- Manual deduction from a student
CREATE OR REPLACE FUNCTION public.deduct_funds(_student_id uuid, _amount numeric, _reason text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _new NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  UPDATE public.students
    SET balance = GREATEST(balance - _amount, 0)
    WHERE id = _student_id
    RETURNING balance INTO _new;
  IF _new IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  RETURN _new;
END;
$$;

-- Clear contributions for a category (optionally a specific denomination)
CREATE OR REPLACE FUNCTION public.clear_contributions(_category text, _denomination text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _denomination IS NULL THEN
    DELETE FROM public.contributions WHERE category = _category;
  ELSE
    DELETE FROM public.contributions WHERE category = _category AND denomination = _denomination;
  END IF;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- Clear all transactions (POS)
CREATE OR REPLACE FUNCTION public.clear_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.transaction_items;
  DELETE FROM public.transactions;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- Reset all student balances to 0
CREATE OR REPLACE FUNCTION public.clear_all_student_balances()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE public.students SET balance = 0, initial_balance = 0, weekly_spent = 0,
    low_balance_notified = false, zero_balance_notified = false
    WHERE TRUE;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
