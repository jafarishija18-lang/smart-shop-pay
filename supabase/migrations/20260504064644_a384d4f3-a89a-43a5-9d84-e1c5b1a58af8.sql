CREATE OR REPLACE FUNCTION public.delete_student(_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = _student_id) THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  DELETE FROM public.transaction_items
    WHERE transaction_id IN (SELECT id FROM public.transactions WHERE student_id = _student_id);
  DELETE FROM public.transactions WHERE student_id = _student_id;
  DELETE FROM public.contributions WHERE student_id = _student_id;
  DELETE FROM public.weekly_transfers WHERE student_id = _student_id;
  DELETE FROM public.student_credentials WHERE student_id = _student_id;
  DELETE FROM public.students WHERE id = _student_id;
END;
$function$;