-- Padrão de tabela de dados dos apps C-Level: cada linha pertence a um usuário e só ele vê e altera.
-- Troque <tabela> e as colunas de negócio. Repita para cada tabela do app.

create table public.<tabela> (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- colunas de negócio aqui (dinheiro em numeric(12,2), datas em date, horários em timestamptz)
  criado_em timestamptz not null default now(),
  unique (user_id, id)                 -- permite chaves compostas vindas de outras tabelas
);
alter table public.<tabela> enable row level security;
create policy dono on public.<tabela> for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Referência a outra tabela do MESMO dono (impede apontar para a categoria/cliente de outra pessoa).
-- Exige unique (user_id, id) na tabela referenciada. "set null (col)" precisa de Postgres 15+.
-- alter table public.<tabela> add column categoria_id uuid,
--   add foreign key (user_id, categoria_id) references public.categorias (user_id, id) on delete set null (categoria_id);

-- Itens recorrentes (ex.: contas fixas que viram lançamentos todo mês): função idempotente.
-- Um índice único parcial garante que chamar a função duas vezes não duplica nada.
-- create unique index <tabela>_recorrencia on public.<tabela> (origem_id, competencia) where origem_id is not null;
-- create or replace function public.gerar_recorrencias(p_mes date default null) returns integer
--   language plpgsql set search_path to '' as $$
-- declare v_mes date := date_trunc('month', coalesce(p_mes, (now() at time zone 'America/Sao_Paulo')::date))::date;
-- begin
--   insert into public.<tabela> (...) select ... from public.<origem> o
--   where o.user_id = (select auth.uid()) and o.ativa
--   on conflict (origem_id, competencia) where origem_id is not null do nothing;
--   ...
-- end $$;
-- revoke execute on function public.gerar_recorrencias(date) from public, anon;
-- grant execute on function public.gerar_recorrencias(date) to authenticated;
--
-- O banco roda em UTC: para "hoje" e "mês atual" use (now() at time zone 'America/Sao_Paulo')::date.
