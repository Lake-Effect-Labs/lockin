-- Add is_admin column to league_members table
-- League creator is automatically admin

ALTER TABLE league_members 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set creator as admin for existing leagues
UPDATE league_members lm
SET is_admin = true
FROM leagues l
WHERE lm.league_id = l.id 
  AND lm.user_id = l.created_by
  AND lm.is_admin = false;

-- Create function to set creator as admin when league is created
CREATE OR REPLACE FUNCTION set_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- When a league is created, set the creator as admin
  UPDATE league_members
  SET is_admin = true
  WHERE league_id = NEW.id 
    AND user_id = NEW.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set creator as admin
DROP TRIGGER IF EXISTS trigger_set_creator_admin ON leagues;
CREATE TRIGGER trigger_set_creator_admin
  AFTER INSERT ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION set_creator_as_admin();

-- Add index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_league_members_admin 
ON league_members(league_id, is_admin) 
WHERE is_admin = true;

