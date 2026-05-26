CREATE OR REPLACE FUNCTION public.delete_student(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_jaffary BOOLEAN;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT is_jaffary INTO _is_jaffary FROM public.students WHERE id = _student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  IF _is_jaffary THEN
    RAISE EXCEPTION 'Cannot delete the Jaffary recipient. Assign another student as Jaffary first.';
  END IF;

  DELETE FROM public.transaction_items
    WHERE transaction_id IN (SELECT id FROM public.transactions WHERE student_id = _student_id);
  DELETE FROM public.transactions WHERE student_id = _student_id;
  DELETE FROM public.contributions WHERE student_id = _student_id;
  DELETE FROM public.weekly_transfers WHERE student_id = _student_id;
  DELETE FROM public.student_credentials WHERE student_id = _student_id;
  DELETE FROM public.students WHERE id = _student_id;
END;
$$;