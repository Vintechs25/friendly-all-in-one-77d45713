
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  user_id UUID, -- null means all users in business
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, critical, reminder
  category TEXT NOT NULL DEFAULT 'system', -- low_stock, expiry, shift, system
  reference_id UUID, -- optional link to product/shift/etc
  reference_type TEXT, -- product, shift, etc
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view notifications for their business (either targeted to them or broadcast)
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (
    business_id = get_user_business_id(auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (
    business_id = get_user_business_id(auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- System/edge functions insert via service role, but also allow owners/managers
CREATE POLICY "Owners/managers can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    business_id = get_user_business_id(auth.uid())
    AND (has_role(auth.uid(), 'business_owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Owners can delete notifications
CREATE POLICY "Owners can delete notifications"
  ON public.notifications FOR DELETE
  USING (
    business_id = get_user_business_id(auth.uid())
    AND has_role(auth.uid(), 'business_owner'::app_role)
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
