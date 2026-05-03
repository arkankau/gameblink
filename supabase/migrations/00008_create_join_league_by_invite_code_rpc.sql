-- Create RPC function for joining private leagues by invite code
CREATE OR REPLACE FUNCTION public.join_league_by_invite_code(p_invite_code text)
RETURNS public.leagues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_league public.leagues;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the private league with matching invite code
  SELECT *
  INTO target_league
  FROM public.leagues
  WHERE invite_code = p_invite_code
    AND is_private = true
  LIMIT 1;

  -- Check if league exists
  IF target_league.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Insert user as member (on conflict do nothing to handle already-member case)
  INSERT INTO public.league_members (league_id, user_id)
  VALUES (target_league.id, auth.uid())
  ON CONFLICT (league_id, user_id) DO NOTHING;

  RETURN target_league;
END;
$$;