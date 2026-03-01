
-- Force schema cache rebuild by adding and dropping a dummy column
ALTER TABLE public.terminal_hardware_configs ADD COLUMN _cache_bust text;
ALTER TABLE public.terminal_hardware_configs DROP COLUMN _cache_bust;

-- Also force refresh on sales table for customer_name issue
ALTER TABLE public.sales ADD COLUMN _cache_bust text;
ALTER TABLE public.sales DROP COLUMN _cache_bust;

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
