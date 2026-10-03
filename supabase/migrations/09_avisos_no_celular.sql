-- Notificações no celular (web push).
-- Cada aparelho que ativa os avisos vira uma inscrição. A função "avisos" do servidor envia as mensagens.

create table public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  criado_em timestamptz not null default now()
);
create index push_inscricoes_user_idx on public.push_inscricoes (user_id);
alter table public.push_inscricoes enable row level security;
create policy push_ler on public.push_inscricoes for select to authenticated using (user_id = (select auth.uid()));
create policy push_inserir on public.push_inscricoes for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_editar on public.push_inscricoes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_apagar on public.push_inscricoes for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.push_inscricoes from anon;

-- Configuração interna: chaves do web push (geradas pela própria função no servidor)
-- e o token que o banco usa para chamar a função. Ninguém do app lê esta tabela.
create table public.push_config (
  id int primary key default 1 check (id = 1),
  url_funcao text not null,
  token text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  vapid_publica text,
  vapid_privada text
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (url_funcao) values ('https://sxuqwutpgzxqhqqhxise.supabase.co/functions/v1/avisos');

-- Chama a função de avisos sem travar quem gravou o dado (pg_net é assíncrono).
create or replace function privado.chamar_avisos(p_tipo text, p_id uuid) returns void
  language plpgsql security definer set search_path to '' as $$
declare c record;
begin
  select url_funcao, token into c from public.push_config where id = 1;
  if c is null then return; end if;
  perform net.http_post(
    url := c.url_funcao,
    body := jsonb_build_object('tipo', p_tipo, 'id', p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso-token', c.token),
    timeout_milliseconds := 8000
  );
exception when others then
  null; -- aviso nunca impede gravar mensagem, pagamento ou treino
end;
$$;
revoke all on function privado.chamar_avisos(text, uuid) from public, anon, authenticated;

create or replace function privado.aviso_mensagem() returns trigger
  language plpgsql security definer set search_path to '' as $$
begin
  perform privado.chamar_avisos('mensagem', new.id);
  return null;
end;
$$;
create or replace function privado.aviso_cobranca() returns trigger
  language plpgsql security definer set search_path to '' as $$
begin
  if new.status = 'paga' and old.status <> 'paga' and coalesce(new.forma, '') <> 'fora_do_app' then
    perform privado.chamar_avisos('cobranca_paga', new.id);
  end if;
  return null;
end;
$$;
create or replace function privado.aviso_ficha() returns trigger
  language plpgsql security definer set search_path to '' as $$
begin
  if new.ativa and (tg_op = 'INSERT' or new.atualizado_em is distinct from old.atualizado_em or (new.ativa and not old.ativa)) then
    perform privado.chamar_avisos('ficha', new.id);
  end if;
  return null;
end;
$$;
revoke all on function privado.aviso_mensagem(), privado.aviso_cobranca(), privado.aviso_ficha() from public, anon, authenticated;

create trigger aviso_mensagem after insert on public.mensagens for each row execute function privado.aviso_mensagem();
create trigger aviso_cobranca after update of status on public.cobrancas for each row execute function privado.aviso_cobranca();
create trigger aviso_ficha after update of atualizado_em, ativa on public.fichas for each row execute function privado.aviso_ficha();

-- Lembretes diários às 9h (Brasília): check-in da semana e mensalidade perto do vencimento.
create extension if not exists pg_cron;
select cron.schedule('avisos-diarios', '0 12 * * *', $$ select privado.chamar_avisos('diario', null) $$);
