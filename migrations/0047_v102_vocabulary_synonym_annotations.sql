PRAGMA foreign_keys = ON;
ALTER TABLE vocabulary_collection_items ADD COLUMN import_synonyms_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE vocabulary_collection_items ADD COLUMN import_synonym_notes_json TEXT NOT NULL DEFAULT '[]';
