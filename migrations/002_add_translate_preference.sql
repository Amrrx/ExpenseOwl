-- Add translate_to_english column to user_configs
ALTER TABLE user_configs ADD COLUMN IF NOT EXISTS translate_to_english BOOLEAN DEFAULT false;