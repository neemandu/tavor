-- 0004: switch vocabulary to the Hebrew-phonetic word format
-- The source file has no Arabic script: the headline word is the Arabic
-- pronunciation written in Hebrew letters. Categories become broad Hebrew
-- buckets, plus we keep the raw semantic field and the chapter number.

ALTER TABLE public.vocabulary ALTER COLUMN arabic_text DROP NOT NULL;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS hebrew_phonetic TEXT;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS semantic_field TEXT;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS chapter INT;

-- Drop the old 5-value English category CHECK. We deliberately do NOT add a
-- Hebrew replacement CHECK: the allowed values now live in code
-- (lib/vocab-categories.ts + the admin dropdown), and a Hebrew IN-list pasted
-- into the Supabase SQL Editor gets mangled by bidirectional-text reordering.
ALTER TABLE public.vocabulary DROP CONSTRAINT IF EXISTS vocabulary_category_check;

-- Rebuild the search index over the fields we now display/search.
DROP INDEX IF EXISTS public.vocabulary_search_idx;
CREATE INDEX IF NOT EXISTS vocabulary_search_idx
  ON public.vocabulary USING gin(
    to_tsvector('simple',
      coalesce(hebrew_phonetic,'') || ' ' ||
      coalesce(hebrew_translation,'') || ' ' ||
      coalesce(semantic_field,'') || ' ' ||
      coalesce(arabic_text,'')
    )
  );
