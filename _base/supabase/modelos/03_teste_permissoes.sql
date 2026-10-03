-- Teste de permissões com dois usuários falsos, rodado com execute_sql. Tudo é desfeito no final:
-- cada bloco begin/exception é uma subtransação, e o "raise exception 'desfazer'" apaga o que foi feito.
-- Rode depois de criar as tabelas e antes de publicar. Os testes com dados simulados (mocks) no
-- navegador não pegam coluna com nome errado nem permissão faltando; este pega.
-- Ajuste as consultas de <tabela> às tabelas do app. Resultado esperado no comentário de cada linha.

create or replace function pg_temp.teste_permissoes() returns text language plpgsql as $$
declare
  r text := '';
  x uuid := gen_random_uuid();
  y uuid := gen_random_uuid();
  n int;
begin
  -- Trava do beta: sem convite, recusa.
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sem-convite@teste.local', '', '{}', '{}', now(), now());
    r := r || 'SEM CONVITE CRIOU (ruim); ';
    raise exception 'desfazer';
  exception when others then r := r || 'sem convite -> ' || sqlerrm || '; ';
  end;

  begin
    insert into public.convites_pendentes (email) values ('x@teste.local'), ('y@teste.local');
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
      (x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'x@teste.local', '', '{}', '{"nome":"Usuario X"}', now(), now()),
      (y, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'y@teste.local', '', '{}', '{"nome":"Usuario Y"}', now(), now());
    -- dados do Y criados como administrador do banco:
    -- insert into public.<tabela> (user_id, ...) values (y, ...);

    -- A partir daqui o banco enxerga o usuário X logado, como o app enxerga.
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);

    select count(*) into n from public.perfis; r := r || 'perfis visiveis=' || n || ' (1); ';
    -- select count(*) into n from public.<tabela>; r := r || 'linhas do Y visiveis=' || n || ' (0); ';
    -- insert into public.<tabela> (...) values (...);  -- user_id vem sozinho
    begin
      update public.perfis set papel = 'admin' where id = x;
      r := r || 'VIROU ADMIN (ruim); ';
    exception when others then r := r || 'virar admin bloqueado ' || sqlstate || ' (42501); ';
    end;
    -- update public.<tabela> set ... where user_id = y; get diagnostics n = row_count; r := r || 'alterar do Y=' || n || ' (0); ';
    -- delete from public.<tabela> where user_id = y; get diagnostics n = row_count; r := r || 'apagar do Y=' || n || ' (0); ';
    -- begin insert ... com categoria_id do Y ...; r := r || 'USOU DADO ALHEIO (ruim); ';
    -- exception when others then r := r || 'dado alheio bloqueado ' || sqlstate || ' (23503); '; end;
    begin
      perform count(*) from public.app_setup; r := r || 'LEU APP_SETUP (ruim); ';
    exception when others then r := r || 'app_setup bloqueado ' || sqlstate || ' (42501); ';
    end;
    reset role;
    raise exception 'desfazer';
  exception when others then r := r || '[fim: ' || sqlerrm || ']';
  end;
  return r;
end $$;
select pg_temp.teste_permissoes() as resultado, (select count(*) from auth.users) as usuarios_reais;
