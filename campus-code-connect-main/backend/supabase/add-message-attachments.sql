-- Add attachment support to messages table

-- Make content column nullable to allow files/images without text
ALTER TABLE messages
ALTER COLUMN content DROP NOT NULL;

-- Add image_url and attachment_url columns if they don't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text,
ADD COLUMN IF NOT EXISTS is_read boolean default false;

-- Create index for faster message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON messages TO anon, authenticated;

COMMENT ON COLUMN messages.image_url IS 'URL to image attachment if message contains an image';
COMMENT ON COLUMN messages.attachment_url IS 'URL to file attachment if message contains a file';
COMMENT ON COLUMN messages.attachment_name IS 'Original filename of attachment if message contains a file';
COMMENT ON COLUMN messages.is_read IS 'Flag to track if message has been read';
