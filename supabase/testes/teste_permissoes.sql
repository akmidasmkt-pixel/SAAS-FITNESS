-- Teste de permissões do C-Level Personal com dados de mentira. Tudo é desfeito no final
-- (o "raise exception 'desfazer'" apaga o que foi criado). Rode com execute_sql.
-- Resultado: lista só o que FALHOU e a contagem de verificações que passaram.

create or replace function pg_temp.teste() returns text language plpgsql as $$
declare
  r text := ''; ok int := 0; n int; v text; b boolean;
  p1 uuid := gen_random_uuid(); p2 uuid := gen_random_uuid();
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
  pl1 uuid; pl2 uuid; al1 uuid; al2 uuid; ex1 uuid; ex2 uuid; f1 uuid; f2 uuid; ci2 uuid; m1 uuid; tr uuid; novo uuid;
begin
  begin
    insert into public.convites_pendentes (email) values ('p1@teste.local'), ('p2@teste.local'), ('a1@teste.local'), ('a2@teste.local');
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
      (p1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p1@teste.local', '', '{}', '{"nome":"Rafael Teste"}', now(), now()),
      (p2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p2@teste.local', '', '{}', '{"nome":"Bruna Teste"}', now(), now()),
      (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a1@teste.local', '', '{}', '{"nome":"Camila Teste"}', now(), now()),
      (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a2@teste.local', '', '{}', '{"nome":"Paulo Teste"}', now(), now());
    update public.perfis set papel = 'personal' where id in (p1, p2);
    insert into public.personais (id, plano) values (p1, 'beta'), (p2, 'gratis');
    insert into public.planos (personal_id, nome, valor) values (p1, 'Consultoria', 189) returning id into pl1;
    insert into public.planos (personal_id, nome, valor) values (p2, 'Plano B', 150) returning id into pl2;
    insert into public.alunos (personal_id, user_id, nome, email, plano_id, dia_vencimento, cpf)
      values (p1, u1, 'Camila Teste', 'a1@teste.local', pl1, 28, '12345678901') returning id into al1;
    insert into public.alunos (personal_id, user_id, nome, email, plano_id, dia_vencimento)
      values (p2, u2, 'Paulo Teste', 'a2@teste.local', pl2, 28) returning id into al2;
    select id into ex1 from public.exercicios where personal_id = p1 limit 1;
    select id into ex2 from public.exercicios where personal_id = p2 limit 1;
    insert into public.fichas (personal_id, aluno_id, nome) values (p1, al1, 'Treino A') returning id into f1;
    insert into public.fichas (personal_id, aluno_id, nome) values (p2, al2, 'Treino X') returning id into f2;
    insert into public.ficha_itens (personal_id, ficha_id, exercicio_id) values (p1, f1, ex1);
    insert into public.checkins (personal_id, aluno_id, peso) values (p2, al2, 80) returning id into ci2;
    insert into public.mensagens (personal_id, aluno_id, autor_id, texto) values (p1, al1, p1, 'Oi Camila') returning id into m1;
    insert into public.cobrancas (personal_id, aluno_id, valor, vencimento) values (p2, al2, 150, current_date);

    select count(*) into n from public.exercicios where personal_id = p1;
    if n = (select count(*) from public.exercicios_base) then ok := ok + 1; else r := r || 'FALHOU exercicios base semeados=' || n || '; '; end if;

    ---------------------------------------------------------------- personal 1
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', p1, 'role', 'authenticated')::text, true);

    select count(*) into n from public.perfis; if n = 1 then ok := ok + 1; else r := r || 'FALHOU P1 perfis=' || n || '; '; end if;
    select count(*) into n from public.personais; if n = 1 then ok := ok + 1; else r := r || 'FALHOU P1 personais=' || n || '; '; end if;
    select count(*) into n from public.alunos; if n = 1 then ok := ok + 1; else r := r || 'FALHOU P1 alunos=' || n || '; '; end if;
    select count(*) into n from public.cobrancas where personal_id = p2; if n = 0 then ok := ok + 1; else r := r || 'FALHOU P1 ve cobrancas do P2; '; end if;
    select count(*) into n from public.fichas where aluno_id = al2; if n = 0 then ok := ok + 1; else r := r || 'FALHOU P1 ve fichas do P2; '; end if;
    select count(*) into n from public.checkins; if n = 0 then ok := ok + 1; else r := r || 'FALHOU P1 ve checkin do P2; '; end if;
    select count(*) into n from public.exercicios where personal_id = p2; if n = 0 then ok := ok + 1; else r := r || 'FALHOU P1 ve exercicios do P2; '; end if;

    begin update public.personais set plano = 'anual' where id = p1; r := r || 'FALHOU P1 mudou o proprio plano; ';
    exception when others then ok := ok + 1; end;
    update public.personais set bloqueio_dias = 7 where id = p1; get diagnostics n = row_count;
    if n = 1 then ok := ok + 1; else r := r || 'FALHOU P1 nao salvou regra; '; end if;
    begin update public.alunos set user_id = null where id = al1; r := r || 'FALHOU P1 trocou user_id do aluno; ';
    exception when others then ok := ok + 1; end;
    update public.checkins set resposta = 'x' where id = ci2; get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else r := r || 'FALHOU P1 respondeu checkin do P2; '; end if;

    insert into public.alunos (nome, email, objetivo) values ('Aluno Novo', 'novo@teste.local', 'ganhar_massa') returning id into novo;
    ok := ok + 1;
    select public.gerar_cobrancas() into n; if n = 1 then ok := ok + 1; else r := r || 'FALHOU gerar_cobrancas=' || n || '; '; end if;
    select public.gerar_cobrancas() into n; if n = 0 then ok := ok + 1; else r := r || 'FALHOU gerar_cobrancas duplicou; '; end if;
    update public.cobrancas set status = 'paga' where aluno_id = al1;
    select forma || '/' || taxa into v from public.cobrancas where aluno_id = al1;
    if v = 'fora_do_app/0.00' then ok := ok + 1; else r := r || 'FALHOU pago a mao virou ' || coalesce(v, 'nulo') || '; '; end if;
    begin insert into public.cobrancas (aluno_id, valor, vencimento) values (al2, 10, current_date); r := r || 'FALHOU P1 cobrou aluno do P2; ';
    exception when others then ok := ok + 1; end;
    begin insert into public.ficha_itens (ficha_id, exercicio_id) values (f1, ex2); r := r || 'FALHOU P1 usou exercicio do P2; ';
    exception when others then ok := ok + 1; end;
    begin insert into public.fichas (aluno_id, nome) values (al2, 'Invasao'); r := r || 'FALHOU P1 criou ficha para aluno do P2; ';
    exception when others then ok := ok + 1; end;
    if not has_table_privilege('authenticated', 'public.cobrancas', 'DELETE') then ok := ok + 1; else r := r || 'FALHOU personal pode apagar cobranca; '; end if;
    begin perform count(*) from public.push_config; r := r || 'FALHOU P1 leu push_config; ';
    exception when others then ok := ok + 1; end;
    begin perform count(*) from public.exercicios_base; r := r || 'FALHOU P1 leu exercicios_base; ';
    exception when others then ok := ok + 1; end;
    begin perform count(*) from public.asaas_chaves; r := r || 'FALHOU P1 leu asaas_chaves; ';
    exception when others then ok := ok + 1; end;
    begin perform privado.chamar_avisos('diario', null); r := r || 'FALHOU P1 chamou avisos direto; ';
    exception when others then ok := ok + 1; end;
    begin insert into storage.objects (bucket_id, name) values ('fotos', p1 || '/' || al1 || '/a.jpg'); ok := ok + 1;
    exception when others then r := r || 'FALHOU P1 enviar foto propria: ' || sqlerrm || '; '; end;
    begin insert into storage.objects (bucket_id, name) values ('fotos', p2 || '/' || al2 || '/a.jpg'); r := r || 'FALHOU P1 enviou foto na pasta do P2; ';
    exception when others then ok := ok + 1; end;
    begin insert into storage.objects (bucket_id, name) values ('videos', p1 || '/v.mp4'); ok := ok + 1;
    exception when others then r := r || 'FALHOU P1 enviar video: ' || sqlerrm || '; '; end;

    ---------------------------------------------------------------- aluno 1
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    select count(*) into n from public.alunos; if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 alunos=' || n || '; '; end if;
    select count(*) into n from public.personais; if n = 0 then ok := ok + 1; else r := r || 'FALHOU A1 ve personais; '; end if;
    select count(*) into n from public.planos; if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 planos=' || n || '; '; end if;
    select nome into v from public.meu_personal(); if v = 'Rafael Teste' then ok := ok + 1; else r := r || 'FALHOU meu_personal=' || coalesce(v, 'nulo') || '; '; end if;
    select bloqueio_dias::text into v from public.regras_do_personal(); if v = '7' then ok := ok + 1; else r := r || 'FALHOU regras_do_personal=' || coalesce(v, 'nulo') || '; '; end if;
    select count(*) into n from public.exercicios where personal_id = p2; if n = 0 then ok := ok + 1; else r := r || 'FALHOU A1 ve exercicios do P2; '; end if;
    select count(*) into n from public.exercicios; if n >= 40 then ok := ok + 1; else r := r || 'FALHOU A1 nao ve exercicios do P1; '; end if;
    select count(*) into n from public.fichas; if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 fichas=' || n || '; '; end if;
    select count(*) into n from public.ficha_itens; if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 ficha_itens=' || n || '; '; end if;
    select count(*) into n from public.cobrancas; if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 cobrancas=' || n || '; '; end if;
    select count(*) into n from public.mensagens; if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 mensagens=' || n || '; '; end if;

    insert into public.checkins (personal_id, aluno_id, peso, sono, energia) values (p1, al1, 72.5, 4, 5); ok := ok + 1;
    begin insert into public.checkins (personal_id, aluno_id) values (p2, al1); r := r || 'FALHOU A1 checkin com personal errado; ';
    exception when others then ok := ok + 1; end;
    begin insert into public.checkins (personal_id, aluno_id) values (p2, al2); r := r || 'FALHOU A1 checkin em nome do A2; ';
    exception when others then ok := ok + 1; end;
    insert into public.mensagens (personal_id, aluno_id, texto) values (p1, al1, 'Oi Rafael'); ok := ok + 1;
    begin insert into public.mensagens (personal_id, aluno_id, autor_id, texto) values (p1, al1, p1, 'falsa'); r := r || 'FALHOU A1 falou como personal; ';
    exception when others then ok := ok + 1; end;
    update public.mensagens set lida_em = now() where id = m1; get diagnostics n = row_count;
    if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 nao marcou lida; '; end if;
    update public.mensagens set lida_em = now() where autor_id = u1; get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else r := r || 'FALHOU A1 marcou a propria como lida; '; end if;
    update public.alunos set nome = 'Hacker' where id = al1; get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else r := r || 'FALHOU A1 editou o proprio cadastro; '; end if;
    update public.checkins set resposta = 'eu mesmo' where aluno_id = al1; get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else r := r || 'FALHOU A1 respondeu o proprio checkin; '; end if;
    perform public.registrar_consentimento();
    select consentimento_em is not null into b from public.alunos where id = al1;
    if b then ok := ok + 1; else r := r || 'FALHOU consentimento nao gravou; '; end if;
    insert into public.treinos_feitos (personal_id, aluno_id, ficha_id) values (p1, al1, f1) returning id into tr; ok := ok + 1;
    insert into public.series_feitas (personal_id, aluno_id, treino_id, exercicio_id, serie, carga, repeticoes) values (p1, al1, tr, ex1, 1, 20, 12)
      on conflict (treino_id, exercicio_id, serie) do update set carga = excluded.carga;
    insert into public.series_feitas (personal_id, aluno_id, treino_id, exercicio_id, serie, carga, repeticoes) values (p1, al1, tr, ex1, 1, 22.5, 10)
      on conflict (treino_id, exercicio_id, serie) do update set carga = excluded.carga, repeticoes = excluded.repeticoes;
    select carga::text into v from public.series_feitas where treino_id = tr; if v = '22.50' then ok := ok + 1; else r := r || 'FALHOU serie regravada=' || coalesce(v, 'nulo') || '; '; end if;
    update public.treinos_feitos set concluido = true, duracao_min = 50 where id = tr; get diagnostics n = row_count;
    if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 concluir treino; '; end if;
    insert into public.fotos (personal_id, aluno_id, angulo, caminho) values (p1, al1, 'frente', p1 || '/' || al1 || '/x.jpg'); ok := ok + 1;
    begin insert into public.fotos (personal_id, aluno_id, angulo, caminho) values (p2, al2, 'frente', 'x'); r := r || 'FALHOU A1 foto em nome do A2; ';
    exception when others then ok := ok + 1; end;
    begin insert into storage.objects (bucket_id, name) values ('fotos', p1 || '/' || al1 || '/b.jpg'); ok := ok + 1;
    exception when others then r := r || 'FALHOU A1 enviar foto propria: ' || sqlerrm || '; '; end;
    begin insert into storage.objects (bucket_id, name) values ('conversas', p1 || '/' || al1 || '/c.webm'); ok := ok + 1;
    exception when others then r := r || 'FALHOU A1 enviar audio: ' || sqlerrm || '; '; end;
    begin insert into storage.objects (bucket_id, name) values ('fotos', p1 || '/' || novo || '/b.jpg'); r := r || 'FALHOU A1 enviou foto na pasta de outro aluno; ';
    exception when others then ok := ok + 1; end;
    begin insert into storage.objects (bucket_id, name) values ('videos', p1 || '/v2.mp4'); r := r || 'FALHOU A1 enviou video; ';
    exception when others then ok := ok + 1; end;
    select count(*) into n from storage.objects where bucket_id = 'videos' and name like p1 || '/%'; if n = 1 then ok := ok + 1; else r := r || 'FALHOU A1 nao ve video do P1=' || n || '; '; end if;
    begin insert into public.cobrancas (aluno_id, valor, vencimento) values (al1, 1, current_date); r := r || 'FALHOU A1 criou cobranca; ';
    exception when others then ok := ok + 1; end;
    update public.cobrancas set status = 'paga' where aluno_id = al1; get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else r := r || 'FALHOU A1 se deu baixa; '; end if;
    insert into public.push_inscricoes (endpoint, p256dh, auth) values ('https://exemplo.local/a1', 'k', 'a'); ok := ok + 1;
    select public.aluno_bloqueado() into b; if not b then ok := ok + 1; else r := r || 'FALHOU A1 bloqueado sem atraso; '; end if;

    -- atraso de 10 dias: treino pausa (regra de 7 dias)
    reset role;
    insert into public.cobrancas (personal_id, aluno_id, valor, vencimento, descricao) values (p1, al1, 189, current_date - 10, 'atrasada');
    set local role authenticated;
    select public.aluno_bloqueado() into b; if b then ok := ok + 1; else r := r || 'FALHOU nao pausou com 10 dias de atraso; '; end if;
    select count(*) into n from public.fichas; if n = 0 then ok := ok + 1; else r := r || 'FALHOU ficha visivel com treino pausado; '; end if;
    select count(*) into n from public.ficha_itens; if n = 0 then ok := ok + 1; else r := r || 'FALHOU itens visiveis com treino pausado; '; end if;
    select count(*) into n from public.mensagens; if n >= 2 then ok := ok + 1; else r := r || 'FALHOU conversa sumiu com treino pausado; '; end if;

    ---------------------------------------------------------------- personal 1 vê o pausado e pode liberar
    perform set_config('request.jwt.claims', json_build_object('sub', p1, 'role', 'authenticated')::text, true);
    select public.aluno_bloqueado(al1) into b; if b then ok := ok + 1; else r := r || 'FALHOU P1 nao ve aluno pausado; '; end if;
    update public.cobrancas set status = 'paga' where aluno_id = al1 and descricao = 'atrasada';
    select public.aluno_bloqueado(al1) into b; if not b then ok := ok + 1; else r := r || 'FALHOU pagamento nao liberou treino; '; end if;
    select count(*) into n from public.push_inscricoes; if n = 0 then ok := ok + 1; else r := r || 'FALHOU P1 ve inscricao de aviso do aluno; '; end if;

    ---------------------------------------------------------------- personal 2 no plano grátis
    perform set_config('request.jwt.claims', json_build_object('sub', p2, 'role', 'authenticated')::text, true);
    begin insert into public.alunos (nome) values ('Segundo aluno'); r := r || 'FALHOU plano gratis aceitou 2 alunos; ';
    exception when others then if sqlerrm like '%plano grátis%' then ok := ok + 1; else r := r || 'FALHOU limite gratis com erro inesperado: ' || sqlerrm || '; '; end if; end;
    select count(*) into n from public.mensagens; if n = 0 then ok := ok + 1; else r := r || 'FALHOU P2 ve mensagens do P1; '; end if;

    ---------------------------------------------------------------- exclusão do aluno apaga tudo dele
    -- (conferido pelas ligações entre tabelas: todas as que apontam para alunos apagam junto)
    reset role;
    select count(*) into n from pg_constraint
     where contype = 'f' and confrelid = 'public.alunos'::regclass and confdeltype <> 'c';
    if n = 0 then ok := ok + 1; else r := r || 'FALHOU ' || n || ' tabelas nao apagam junto com o aluno; '; end if;
    if has_table_privilege('authenticated', 'public.alunos', 'DELETE') then ok := ok + 1; else r := r || 'FALHOU personal nao pode excluir aluno; '; end if;

    raise exception 'desfazer';
  exception when others then
    if sqlerrm <> 'desfazer' then r := r || '[PAROU: ' || sqlerrm || ']'; end if;
  end;
  return coalesce(nullif(r, ''), 'nenhuma falha; ') || ok || ' verificações ok';
end $$;
select pg_temp.teste() as resultado,
  (select count(*) from auth.users where email like '%@teste.local') as sobras_usuarios,
  (select count(*) from public.alunos where email like '%@teste.local') as sobras_alunos;
