-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';