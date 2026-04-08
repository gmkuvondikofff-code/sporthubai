
-- Add username and age to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;

-- Chat messages table for AI conversations
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  chat_type text NOT NULL DEFAULT 'sport',
  sport_context text,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all messages"
ON public.chat_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fan custom sports table
CREATE TABLE public.fan_sports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sport_name text NOT NULL,
  image_url text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fan_sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom sports"
ON public.fan_sports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom sports"
ON public.fan_sports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom sports"
ON public.fan_sports FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all custom sports"
ON public.fan_sports FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id, chat_type);
CREATE INDEX idx_fan_sports_user ON public.fan_sports(user_id);
