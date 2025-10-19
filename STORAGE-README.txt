Storage setup (do once in Supabase):
1) Create a bucket named `intakes` (or set SUPABASE_STORAGE_BUCKET to another name).
2) Keep it PRIVATE (recommended). Signed upload URLs allow client uploads.
3) No additional policies needed for signed uploads.
