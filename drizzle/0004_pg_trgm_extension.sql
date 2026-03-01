-- Enable pg_trgm for fuzzy text search (similarity(name, q))
CREATE EXTENSION IF NOT EXISTS pg_trgm;
