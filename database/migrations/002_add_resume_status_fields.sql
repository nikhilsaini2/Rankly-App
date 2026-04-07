-- Add new columns to resumes table
-- This migration adds extracted_text and status columns to support the new upload pipeline

-- Add extracted_text column (nullable, stores extracted PDF text)
ALTER TABLE resumes 
ADD COLUMN extracted_text TEXT NULL;

-- Add status column with default value 'uploaded'
ALTER TABLE resumes 
ADD COLUMN status TEXT DEFAULT 'uploaded' NOT NULL;

-- Create index on status column for better query performance
CREATE INDEX idx_resumes_status ON resumes(status);

-- Update existing records to have 'uploaded' status (they were uploaded before this change)
UPDATE resumes 
SET status = 'uploaded' 
WHERE status IS NULL;

-- Add check constraint to ensure status values are valid
ALTER TABLE resumes 
ADD CONSTRAINT chk_resume_status 
CHECK (status IN ('uploaded', 'analyzed'));

-- Create index on extracted_text for better search performance (optional)
-- CREATE INDEX idx_resumes_extracted_text ON resumes USING gin(to_tsvector('english', extracted_text));
