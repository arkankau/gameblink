-- Drop existing private league policy
DROP POLICY IF EXISTS "Private leagues viewable by members" ON leagues;

-- Create improved policy that allows creators to see their own private leagues
CREATE POLICY "Private leagues viewable by creators and members" ON leagues FOR SELECT USING (
  is_private AND (created_by = auth.uid() OR can_view_league_content(id))
);