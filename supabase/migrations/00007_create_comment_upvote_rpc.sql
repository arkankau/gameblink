-- Create RPC function for atomic comment upvote increment
CREATE OR REPLACE FUNCTION public.increment_comment_upvote(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Increment upvote count
  UPDATE public.comments
  SET upvotes = COALESCE(upvotes, 0) + 1
  WHERE id = p_comment_id;
END;
$$;