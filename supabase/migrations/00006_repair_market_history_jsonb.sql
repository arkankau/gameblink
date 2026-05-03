-- Repair market history: convert stringified JSON arrays to proper JSONB arrays
-- Step 1: Convert JSONB strings that contain JSON arrays into proper JSONB arrays
UPDATE public.markets
SET history = (history #>> '{}')::jsonb
WHERE history IS NOT NULL
  AND jsonb_typeof(history) = 'string'
  AND left(history #>> '{}', 1) = '[';

-- Step 2: Repair null or non-array history with fallback data
UPDATE public.markets
SET history = jsonb_build_array(
  jsonb_build_object(
    't', floor(extract(epoch from now()) * 1000),
    'y', coalesce(yes_price, 50)
  )
)
WHERE history IS NULL
   OR jsonb_typeof(history) <> 'array';