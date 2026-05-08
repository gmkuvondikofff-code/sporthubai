CREATE TABLE public.tt_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section TEXT NOT NULL,
  item_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, section, item_index)
);

ALTER TABLE public.tt_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own completions" ON public.tt_completions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own completions" ON public.tt_completions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own completions" ON public.tt_completions
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins view all completions" ON public.tt_completions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_tt_completions_user ON public.tt_completions(user_id);