-- Create RPC function for atomic league creation with creator membership
CREATE OR REPLACE FUNCTION public.create_league_with_creator(
  p_name TEXT,
  p_icon TEXT,
  p_description TEXT,
  p_is_private BOOLEAN,
  p_invite_code TEXT
)
RETURNS public.leagues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_league public.leagues;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert league
  INSERT INTO public.leagues (
    name,
    icon,
    description,
    is_private,
    invite_code,
    created_by
  )
  VALUES (
    p_name,
    p_icon,
    p_description,
    p_is_private,
    p_invite_code,
    auth.uid()
  )
  RETURNING * INTO new_league;

  -- Add creator as first member
  INSERT INTO public.league_members (
    league_id,
    user_id
  )
  VALUES (
    new_league.id,
    auth.uid()
  );

  RETURN new_league;
END;
$$;