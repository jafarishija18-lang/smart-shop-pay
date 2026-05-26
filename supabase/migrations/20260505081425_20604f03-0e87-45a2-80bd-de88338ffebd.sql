-- Allow cashiers to view transactions and items (read-only)
CREATE POLICY "Cashiers view transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'cashier'));

CREATE POLICY "Cashiers view transaction items"
  ON public.transaction_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'cashier'));

CREATE POLICY "Cashiers view contributions"
  ON public.contributions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'cashier'));