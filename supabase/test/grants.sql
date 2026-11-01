-- Replica os privilégios padrão do Supabase (RLS é a barreira real).
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
grant usage on schema extensions to anon, authenticated;
