CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage classes" ON public.classes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cashiers view classes" ON public.classes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'cashier'));

INSERT INTO public.classes (name)
SELECT unnest(ARRAY['Form 1','Form 2','Form 3','Form 4','Form 5','Form 6'])
ON CONFLICT (name) DO NOTHING;
