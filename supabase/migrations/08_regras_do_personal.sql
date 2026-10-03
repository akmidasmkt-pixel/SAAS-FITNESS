-- O app do aluno precisa do dia do check-in e da regra de pausa do seu personal
-- (a tabela personais não é visível para o aluno).
create or replace function privado.regras_do_personal()
  returns table (checkin_dia int, bloqueio_ativo boolean, bloqueio_dias int)
  language sql stable security definer set search_path to '' as $$
  select p.checkin_dia, p.bloqueio_ativo, p.bloqueio_dias
    from public.alunos a join public.personais p on p.id = a.personal_id
   where a.user_id = (select auth.uid()) and a.status = 'ativo'
   limit 1;
$$;
revoke all on function privado.regras_do_personal() from public, anon;
grant execute on function privado.regras_do_personal() to authenticated;

create or replace function public.regras_do_personal()
  returns table (checkin_dia int, bloqueio_ativo boolean, bloqueio_dias int)
  language sql stable security invoker set search_path to '' as $$ select * from privado.regras_do_personal(); $$;
revoke all on function public.regras_do_personal() from public, anon;
grant execute on function public.regras_do_personal() to authenticated;
