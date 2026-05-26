DO $$
DECLARE _id UUID := '0d67f772-1a5d-4d92-bf1b-897c5c60f260';
BEGIN
  DELETE FROM public.transaction_items WHERE transaction_id IN (SELECT id FROM public.transactions WHERE student_id = _id);
  DELETE FROM public.transactions WHERE student_id = _id;
  DELETE FROM public.contributions WHERE student_id = _id;
  DELETE FROM public.weekly_transfers WHERE student_id = _id;
  DELETE FROM public.student_credentials WHERE student_id = _id;
  DELETE FROM public.students WHERE id = _id;
END $$;