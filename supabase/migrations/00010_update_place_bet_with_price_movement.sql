-- Update place_bet RPC to include price movement and history updates
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
  v_price_impact NUMERIC;
  v_new_yes_price INTEGER;
  v_new_no_price INTEGER;
  v_history JSONB;
  v_new_point JSONB;
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

  -- Calculate price impact (max 4 points per bet)
  v_price_impact := LEAST((p_stake / 1000.0) * 1.5, 4);

  -- Calculate new prices based on bet side
  IF p_side = 'yes' THEN
    v_new_yes_price := LEAST(GREATEST(COALESCE(v_market.yes_price, 50) + v_price_impact::INTEGER, 1), 99);
  ELSE
    v_new_yes_price := LEAST(GREATEST(COALESCE(v_market.yes_price, 50) - v_price_impact::INTEGER, 1), 99);
  END IF;

  v_new_no_price := 100 - v_new_yes_price;

  -- Get current history or initialize empty array
  v_history := COALESCE(v_market.history, '[]'::jsonb);

  -- Ensure history is an array
  IF jsonb_typeof(v_history) != 'array' THEN
    v_history := '[]'::jsonb;
  END IF;

  -- Create new history point
  v_new_point := jsonb_build_object(
    't', FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
    'y', v_new_yes_price
  );

  -- Append new point to history
  v_history := v_history || v_new_point;

  -- Keep only last 50 points
  IF jsonb_array_length(v_history) > 50 THEN
    v_history := (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_history) elem
        ORDER BY (elem->>'t')::bigint DESC
        LIMIT 50
      ) subq
      ORDER BY (elem->>'t')::bigint ASC
    );
  END IF;

  -- Update market volume, bettors count, prices, and history
  UPDATE public.markets
  SET volume = volume + p_stake,
      bettors = CASE 
        WHEN v_is_first_bet THEN bettors + 1
        ELSE bettors
      END,
      yes_price = v_new_yes_price,
      no_price = v_new_no_price,
      history = v_history
  WHERE id = p_market_id;

  RETURN new_bet;
END;
$$;