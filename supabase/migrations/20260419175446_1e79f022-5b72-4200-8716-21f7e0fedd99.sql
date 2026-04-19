-- Auto-grant admin role to the designated admin email on signup
CREATE OR REPLACE FUNCTION public.grant_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'kuvondikofff@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.grant_admin_role();

-- If the admin user already exists, grant the role now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'kuvondikofff@gmail.com'
ON CONFLICT DO NOTHING;