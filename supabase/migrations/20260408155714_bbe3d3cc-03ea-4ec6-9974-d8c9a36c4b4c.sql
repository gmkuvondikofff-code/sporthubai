
-- Create enum types
CREATE TYPE public.user_type AS ENUM ('fan', 'athlete');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'uz' CHECK (preferred_language IN ('uz', 'ru', 'en')),
  user_type user_type NOT NULL DEFAULT 'fan',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Athletes table
CREATE TABLE public.athletes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sport_type TEXT NOT NULL,
  stress_level INTEGER DEFAULT 0 CHECK (stress_level >= 0 AND stress_level <= 100),
  upcoming_competition_date DATE,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view their own data" ON public.athletes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Athletes can insert their own data" ON public.athletes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Athletes can update their own data" ON public.athletes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view athlete profiles" ON public.athletes FOR SELECT USING (true);

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON public.athletes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fans table
CREATE TABLE public.fans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  favorite_sport TEXT,
  favorite_team TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans can view their own data" ON public.fans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Fans can insert their own data" ON public.fans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Fans can update their own data" ON public.fans FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_fans_updated_at BEFORE UPDATE ON public.fans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stress scores history
CREATE TABLE public.stress_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stress_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view their own stress scores" ON public.stress_scores
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = stress_scores.athlete_id AND athletes.user_id = auth.uid())
);
CREATE POLICY "System can insert stress scores" ON public.stress_scores
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = stress_scores.athlete_id AND athletes.user_id = auth.uid())
);

-- User roles table (for admin access)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all athletes
CREATE POLICY "Admins can view all athletes" ON public.athletes
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all stress scores
CREATE POLICY "Admins can view all stress scores" ON public.stress_scores
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all fans
CREATE POLICY "Admins can view all fans" ON public.fans
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view roles
CREATE POLICY "Admins can view roles" ON public.user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
