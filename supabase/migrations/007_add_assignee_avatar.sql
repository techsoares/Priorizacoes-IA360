-- Add assignee avatar URL column
ALTER TABLE initiatives
ADD COLUMN IF NOT EXISTS assignee_avatar_url TEXT;
