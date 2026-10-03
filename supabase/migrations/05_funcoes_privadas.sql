-- As funções que leem dados acima das regras de acesso (security definer) ficam no esquema
-- "privado", que não é exposto pela API. As versões públicas viram atalhos (security invoker),
-- usados pelas políticas e pelo app, sem abrir as funções privadas para chamada direta.

create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create or replace function privado.meu_aluno_id() returns uuid
  language sql stable security definer set search_path to '' as $$
  select id from public.alunos where user_id = (select auth.uid()) and status = 'ativo' limit 1;
$$;

create or replace function privado.personal_do_aluno() returns uuid
  language sql stable security definer set search_path to '' as $$
  select personal_id from public.alunos where user_id = (select auth.uid()) and status = 'ativo' limit 1;
$$;

create or replace function privado.meu_plano_id() returns uuid
  language sql stable security definer set search_path to '' as $$
  select plano_id from public.alunos where user_id = (select auth.uid()) and status = 'ativo' limit 1;
$$;

create or replace function privado.aluno_bloqueado(p_aluno uuid) returns boolean
  language sql stable security definer set search_path to '' as $$
  select coalesce((
    select p.bloqueio_ativo and exists (
             select 1 from public.cobrancas c
              where c.aluno_id = a.id and c.status = 'pendente'
                and c.vencimento < ((now() at time zone 'America/Sao_Paulo')::date - p.bloqueio_dias))
      from public.alunos a
      join public.personais p on p.id = a.personal_id
     where a.id = coalesce(p_aluno, privado.meu_aluno_id())
       and (a.user_id = (select auth.uid()) or a.personal_id = (select auth.uid()))
  ), false);
$$;

create or replace function privado.meu_personal() returns table (id uuid, nome text)
  language sql stable security definer set search_path to '' as $$
  select pf.id, pf.nome
    from public.alunos a join public.perfis pf on pf.id = a.personal_id
   where a.user_id = (select auth.uid()) and a.status = 'ativo'
   limit 1;
$$;

create or replace function privado.registrar_consentimento() returns void
  language sql security definer set search_path to '' as $$
  update public.alunos set consentimento_em = now()
   where user_id = (select auth.uid()) and consentimento_em is null;
$$;

revoke all on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;

create or replace function public.meu_aluno_id() returns uuid
  language sql stable security invoker set search_path to '' as $$ select privado.meu_aluno_id(); $$;
create or replace function public.personal_do_aluno() returns uuid
  language sql stable security invoker set search_path to '' as $$ select privado.personal_do_aluno(); $$;
create or replace function public.meu_plano_id() returns uuid
  language sql stable security invoker set search_path to '' as $$ select privado.meu_plano_id(); $$;
create or replace function public.aluno_bloqueado(p_aluno uuid default null) returns boolean
  language sql stable security invoker set search_path to '' as $$ select privado.aluno_bloqueado(p_aluno); $$;
create or replace function public.meu_personal() returns table (id uuid, nome text)
  language sql stable security invoker set search_path to '' as $$ select * from privado.meu_personal(); $$;
create or replace function public.registrar_consentimento() returns void
  language sql security invoker set search_path to '' as $$ select privado.registrar_consentimento(); $$;
