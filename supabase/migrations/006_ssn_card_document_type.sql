-- Add ssn_card to the document_type enum
-- Required because the CLAUDE.md spec lists ssn_card as a supported document type
-- but it was missing from the initial schema definition.

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'ssn_card' AFTER 'i94';
