-- Acesso do C-Level Personal: perfis (admin, personal, aluno), primeiro administrador por código
-- e beta fechado por convite. Adaptado do modelo 01 da Base de apps C-Level.
--
-- Por que existe a trava: com a chave publicável (que fica no navegador) qualquer pessoa consegue
-- chamar /auth/v1/signup. Aqui o banco só aceita criar conta para um e-mail que a função "acesso"
-- liberou nos últimos 15 minutos.

create table if not exists public.app_setup (
  id int primary key default 1 check (id = 1),
  codigo_hash text not null,          -- sha256 do código de primeiro acesso (em maiúsculas)
  usado_em timestamptz
);
alter table public.app_setup enable row level security;
revoke all on public.app_setup from anon, authenticated;

create table if not exists public.convites_pendentes (
  email text primary key,
  criado_em timestamptz not null default now()
);
alter table public.convites_pendentes enable row level security;
revoke all on public.convites_pendentes from anon, authenticated;

-- papel: admin = agência (também usa o app como personal); personal = cliente pagante; aluno = aluno de um personal.
-- O padrão é o papel com menos poder; quem define personal/admin é a função "acesso".
create table if not exists public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  papel text not null default 'aluno' check (papel in ('admin', 'personal', 'aluno')),
  trocar_senha boolean not null default false,
  onboarding_ok boolean not null default false,
  criado_em timestamptz not null default now()
);
alter table public.perfis enable row level security;
create policy perfis_ler on public.perfis for select to authenticated using (id = (select auth.uid()));
create policy perfis_editar on public.perfis for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke all on public.perfis from anon;
revoke insert, update, delete on public.perfis from authenticated;
grant update (nome, trocar_senha, onboarding_ok) on public.perfis to authenticated;

create or replace function public.novo_usuario()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  delete from public.convites_pendentes
   where email = lower(new.email)
     and criado_em > now() - interval '15 minutes';
  if not found then
    raise exception 'Cadastro fechado: o acesso ao beta é só por convite.' using errcode = 'P0001';
  end if;

  insert into public.perfis (id, nome)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)));
  return new;
end;
$function$;
revoke execute on function public.novo_usuario() from public, anon, authenticated;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();
