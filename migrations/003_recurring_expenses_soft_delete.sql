-- Add soft delete and sync columns to recurring_expenses table
-- These columns are required by postgresStore.go for multi-user mode

ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Index for efficient queries filtering deleted records
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_not_deleted ON recurring_expenses(user_id) WHERE is_deleted = FALSE;

-- Trigger to update last_modified_at on changes
CREATE OR REPLACE FUNCTION update_recurring_expense_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_recurring_expenses_last_modified ON recurring_expenses;
CREATE TRIGGER update_recurring_expenses_last_modified BEFORE UPDATE ON recurring_expenses
    FOR EACH ROW EXECUTE FUNCTION update_recurring_expense_last_modified();