-- Create RPC function for atomic bet placement with validation
CREATE OR REPLACE FUNCTION public.place_bet(
  p_market_id UUID,
  p_side TEXT,
  p_stake INTEGER,
  p_price_at_bet INTEGER,
  p_shares INTEGER,
  p_potential_payout INTEGER
)
RETURNS public.bets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.markets;
  v_user public.users;
  new_bet public.bets;
  v_is_first_bet BOOLEAN;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch and lock market
  SELECT * INTO v_market
  FROM public.markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  -- Validate market status
  IF v_market.status != 'live' THEN
    RAISE EXCEPTION 'Market is not live';
  END IF;

  -- Validate market not expired
  IF v_market.ends_at <= NOW() THEN
    RAISE EXCEPTION 'Market has closed';
  END IF;

  -- Fetch and lock user
  SELECT * INTO v_user
  FROM public.users
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Validate user balance
  IF v_user.balance < p_stake THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Check if this is user's first bet on this market
  SELECT NOT EXISTS (
    SELECT 1 FROM public.bets
    WHERE market_id = p_market_id AND user_id = auth.uid()
  ) INTO v_is_first_bet;

  -- Insert bet
  INSERT INTO public.bets (
    user_id,
    market_id,
    side,
    stake,
    price_at_bet,
    shares,
    potential_payout
  )
  VALUES (
    auth.uid(),
    p_market_id,
    p_side,
    p_stake,
    p_price_at_bet,
    p_shares,
    p_potential_payout
  )
  RETURNING * INTO new_bet;

  -- Deduct user balance
  UPDATE public.users
  SET balance = balance - p_stake,
      total_bets = total_bets + 1
  WHERE id = auth.uid();

  -- Update market volume and bettors count
  UPDATE public.markets
  SET volume = volume + p_stake,
      bettors = CASE 
        WHEN v_is_first_bet THEN bettors + 1
        ELSE bettors
      END
  WHERE id = p_market_id;

  RETURN new_bet;
END;
$$;