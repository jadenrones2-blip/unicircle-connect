
-- Allow current owners and transfer recipients to update transfer records
CREATE POLICY "Involved parties can update transfers"
ON public.ownership_transfers
FOR UPDATE
USING (
  (from_user_id = auth.uid()) OR (to_user_id = auth.uid())
)
WITH CHECK (
  (from_user_id = auth.uid()) OR (to_user_id = auth.uid())
);
