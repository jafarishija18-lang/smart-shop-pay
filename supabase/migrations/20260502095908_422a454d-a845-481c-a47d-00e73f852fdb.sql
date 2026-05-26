CREATE OR REPLACE FUNCTION public.process_checkout(_student_code text, _credential_id text, _items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _student RECORD;
  _cred RECORD;
  _item JSONB;
  _product RECORD;
  _total NUMERIC(12,2) := 0;
  _txn_id UUID;
  _weekly_limit NUMERIC := 10000;
  _current_week DATE := date_trunc('week', now())::date;
  _line_total NUMERIC;
  _new_balance NUMERIC;
  _low_alert BOOLEAN := false;
  _zero_alert BOOLEAN := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO _student FROM public.students WHERE student_code = _student_code FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Student not found'); END IF;

  SELECT * INTO _cred FROM public.student_credentials
    WHERE student_id = _student.id AND credential_id = _credential_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Fingerprint not recognized'); END IF;

  IF _student.week_start <> _current_week THEN
    _student.weekly_spent := 0;
    _student.week_start := _current_week;
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Product not found'); END IF;
    _line_total := _product.price * (_item->>'quantity')::int;
    _total := _total + _line_total;
  END LOOP;

  IF _student.balance < _total THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', _student.balance, 'total', _total);
  END IF;

  IF _student.weekly_spent + _total > _weekly_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'Weekly limit reached', 'weekly_spent', _student.weekly_spent, 'limit', _weekly_limit);
  END IF;

  INSERT INTO public.transactions (student_id, total_amount) VALUES (_student.id, _total) RETURNING id INTO _txn_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.transaction_items (transaction_id, product_id, product_name, price, quantity)
      VALUES (_txn_id, _product.id, _product.name, _product.price, (_item->>'quantity')::int);
    -- Stock is unlimited — do not decrement
  END LOOP;

  _new_balance := _student.balance - _total;
  UPDATE public.students
    SET balance = _new_balance,
        weekly_spent = _student.weekly_spent + _total,
        week_start = _current_week
    WHERE id = _student.id;

  IF _new_balance = 0 AND NOT _student.zero_balance_notified THEN
    _zero_alert := true;
    UPDATE public.students SET zero_balance_notified = true WHERE id = _student.id;
  ELSIF _student.initial_balance > 0
        AND _new_balance <= _student.initial_balance * 0.25
        AND _new_balance > 0
        AND NOT _student.low_balance_notified THEN
    _low_alert := true;
    UPDATE public.students SET low_balance_notified = true WHERE id = _student.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', _txn_id,
    'total', _total,
    'new_balance', _new_balance,
    'student_name', _student.name,
    'student_email', _student.email,
    'low_balance_alert', _low_alert,
    'zero_balance_alert', _zero_alert
  );
END;
$function$;