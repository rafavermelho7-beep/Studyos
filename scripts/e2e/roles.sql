-- Papéis equivalentes aos do Supabase (somente para a stack local de testes).
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit password 'localpw';
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login createrole password 'localpw';
create schema auth authorization supabase_auth_admin;
grant create on database postgres to supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
