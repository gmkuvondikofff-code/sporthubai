-- Add new user_type enum value
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'tt_player';

-- Create tt_players table
CREATE TABLE IF NOT EXISTS public.tt_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  age INTEGER,
  level TEXT NOT NULL DEFAULT 'beginner',
  goals TEXT,
  training_streak INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tt_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TT players can view their own data"
ON public.tt_players FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "TT players can insert their own data"
ON public.tt_players FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "TT players can update their own data"
ON public.tt_players FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all TT players"
ON public.tt_players FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tt_players_updated_at
BEFORE UPDATE ON public.tt_players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();