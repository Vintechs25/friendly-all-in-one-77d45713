
-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  from_name text,
  from_email text,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamp with time zone,
  total_recipients integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ec_all" ON public.email_campaigns FOR ALL TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "ec_select" ON public.email_campaigns FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

-- Email logs (sent emails tracking)
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  resend_id text,
  to_email text NOT NULL,
  to_name text,
  from_email text,
  subject text NOT NULL,
  email_type text NOT NULL DEFAULT 'transactional',
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_all" ON public.email_logs FOR ALL TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "el_select" ON public.email_logs FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

-- Inbound emails (received via Resend webhook)
CREATE TABLE public.inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL,
  subject text,
  body_html text,
  body_text text,
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  raw_payload jsonb
);

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ie_all" ON public.inbound_emails FOR ALL TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "ie_select" ON public.inbound_emails FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

-- Email templates for notifications
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  template_type text NOT NULL DEFAULT 'notification',
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "et_all" ON public.email_templates FOR ALL TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "et_select" ON public.email_templates FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
