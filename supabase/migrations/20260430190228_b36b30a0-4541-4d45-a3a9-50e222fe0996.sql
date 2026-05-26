
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins view roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  weekly_spent NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (weekly_spent >= 0),
  week_start DATE NOT NULL DEFAULT date_trunc('week', now())::date,
  low_balance_notified BOOLEAN NOT NULL DEFAULT false,
  zero_balance_notified BOOLEAN NOT NULL DEFAULT false,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage students" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view transactions" ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view transaction items" ON public.transaction_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER students_updated BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Checkout RPC: atomically validates and processes a sale
CREATE OR REPLACE FUNCTION public.process_checkout(
  _student_code TEXT,
  _pin TEXT,
  _items JSONB  -- [{product_id, quantity}, ...]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _student RECORD;
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
  -- Caller must be authenticated admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Find student
  SELECT * INTO _student FROM public.students WHERE student_code = _student_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;

  -- Verify PIN (hash comparison via pgcrypto)
  IF _student.pin_hash <> crypt(_pin, _student.pin_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  -- Reset weekly counter if new week
  IF _student.week_start <> _current_week THEN
    _student.weekly_spent := 0;
    _student.week_start := _current_week;
  END IF;

  -- Calculate total and validate stock
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Product not found');
    END IF;
    _line_total := _product.price * (_item->>'quantity')::int;
    _total := _total + _line_total;
  END LOOP;

  -- Check balance
  IF _student.balance < _total THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', _student.balance, 'total', _total);
  END IF;

  -- Check weekly limit
  IF _student.weekly_spent + _total > _weekly_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'Weekly limit reached', 'weekly_spent', _student.weekly_spent, 'limit', _weekly_limit);
  END IF;

  -- Create transaction
  INSERT INTO public.transactions (student_id, total_amount) VALUES (_student.id, _total) RETURNING id INTO _txn_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.transaction_items (transaction_id, product_id, product_name, price, quantity)
      VALUES (_txn_id, _product.id, _product.name, _product.price, (_item->>'quantity')::int);
    UPDATE public.products SET stock = GREATEST(0, stock - (_item->>'quantity')::int) WHERE id = _product.id;
  END LOOP;

  -- Update student
  _new_balance := _student.balance - _total;
  UPDATE public.students
    SET balance = _new_balance,
        weekly_spent = _student.weekly_spent + _total,
        week_start = _current_week
    WHERE id = _student.id;

  -- Determine alerts
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
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper to register a student with hashed pin
CREATE OR REPLACE FUNCTION public.register_student(
  _student_code TEXT,
  _name TEXT,
  _email TEXT,
  _pin TEXT,
  _initial_balance NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.students (student_code, name, email, pin_hash, balance, initial_balance)
    VALUES (_student_code, _name, _email, crypt(_pin, gen_salt('bf')), _initial_balance, _initial_balance)
    RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_funds(_student_id UUID, _amount NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _new NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  UPDATE public.students
    SET balance = balance + _amount,
        initial_balance = balance + _amount,
        low_balance_notified = false,
        zero_balance_notified = false
    WHERE id = _student_id
    RETURNING balance INTO _new;
  RETURN _new;
END;
$$;
