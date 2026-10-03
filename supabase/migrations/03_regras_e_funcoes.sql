-- Funções auxiliares, regras de negócio e regras de acesso (RLS) do C-Level Personal.

-- ---------------------------------------------------------------- auxiliares (usadas nas políticas)
create or replace function public.meu_aluno_id() returns uuid
  language sql stable security definer set search_path to '' as $$
  select id from public.alunos where user_id = (select auth.uid()) and status = 'ativo' limit 1;
$$;

create or replace function public.personal_do_aluno() returns uuid
  language sql stable security definer set search_path to '' as $$
  select personal_id from public.alunos where user_id = (select auth.uid()) and status = 'ativo' limit 1;
$$;

create or replace function public.meu_plano_id() returns uuid
  language sql stable security definer set search_path to '' as $$
  select plano_id from public.alunos where user_id = (select auth.uid()) and status = 'ativo' limit 1;
$$;

-- Treino pausado: o personal ligou o bloqueio e há mensalidade pendente vencida há mais dias que o prazo.
-- Só responde sobre o próprio aluno (para o aluno) ou sobre alunos do próprio personal.
create or replace function public.aluno_bloqueado(p_aluno uuid default null) returns boolean
  language sql stable security definer set search_path to '' as $$
  select coalesce((
    select p.bloqueio_ativo and exists (
             select 1 from public.cobrancas c
              where c.aluno_id = a.id and c.status = 'pendente'
                and c.vencimento < ((now() at time zone 'America/Sao_Paulo')::date - p.bloqueio_dias))
      from public.alunos a
      join public.personais p on p.id = a.personal_id
     where a.id = coalesce(p_aluno, public.meu_aluno_id())
       and (a.user_id = (select auth.uid()) or a.personal_id = (select auth.uid()))
  ), false);
$$;

-- Nome do personal, para o app do aluno.
create or replace function public.meu_personal() returns table (id uuid, nome text)
  language sql stable security definer set search_path to '' as $$
  select pf.id, pf.nome
    from public.alunos a join public.perfis pf on pf.id = a.personal_id
   where a.user_id = (select auth.uid()) and a.status = 'ativo'
   limit 1;
$$;

-- Consentimento LGPD do aluno (fotos e medidas), gravado no primeiro acesso.
create or replace function public.registrar_consentimento() returns void
  language sql security definer set search_path to '' as $$
  update public.alunos set consentimento_em = now()
   where user_id = (select auth.uid()) and consentimento_em is null;
$$;

-- Taxa fixa para o personal por cobrança paga pelo app (já inclui o Asaas).
create or replace function public.taxa_de(p_forma text, p_valor numeric) returns numeric
  language sql immutable set search_path to '' as $$
  select case
    when p_forma is null then null
    when p_forma = 'cartao' then round(p_valor * 0.0449 + 0.49, 2)
    when p_forma = 'fora_do_app' then 0
    else 3.98
  end;
$$;

-- ---------------------------------------------------------------- regras de negócio
-- Cada personal novo ganha a biblioteca base de exercícios (sem vídeo; ele grava os dele).
create or replace function public.semear_exercicios() returns trigger
  language plpgsql security definer set search_path to '' as $$
begin
  insert into public.exercicios (personal_id, nome, grupo, proprio)
  select new.id, e.nome, e.grupo, false
    from (values
      ('Supino reto com barra', 'Peito'), ('Supino reto com halteres', 'Peito'), ('Supino inclinado com halteres', 'Peito'),
      ('Crucifixo na máquina (peck deck)', 'Peito'), ('Crossover na polia', 'Peito'), ('Flexão de braço', 'Peito'),
      ('Puxada frontal na polia', 'Costas'), ('Remada baixa', 'Costas'), ('Remada curvada com barra', 'Costas'),
      ('Remada unilateral com halter', 'Costas'), ('Barra fixa', 'Costas'), ('Levantamento terra', 'Costas'),
      ('Desenvolvimento com halteres', 'Ombros'), ('Elevação lateral', 'Ombros'), ('Elevação frontal', 'Ombros'),
      ('Crucifixo inverso', 'Ombros'), ('Encolhimento com halteres', 'Ombros'),
      ('Rosca direta com barra', 'Bíceps'), ('Rosca alternada com halteres', 'Bíceps'), ('Rosca martelo', 'Bíceps'), ('Rosca scott', 'Bíceps'),
      ('Tríceps pulley', 'Tríceps'), ('Tríceps testa', 'Tríceps'), ('Tríceps corda', 'Tríceps'), ('Mergulho no banco', 'Tríceps'), ('Tríceps francês', 'Tríceps'),
      ('Agachamento livre', 'Pernas'), ('Agachamento búlgaro', 'Pernas'), ('Leg press 45°', 'Pernas'), ('Cadeira extensora', 'Pernas'),
      ('Mesa flexora', 'Pernas'), ('Afundo', 'Pernas'), ('Stiff', 'Pernas'), ('Panturrilha em pé', 'Pernas'),
      ('Elevação pélvica', 'Glúteos'), ('Cadeira abdutora', 'Glúteos'), ('Glúteo na polia (coice)', 'Glúteos'), ('Agachamento sumô', 'Glúteos'),
      ('Abdominal supra', 'Abdômen'), ('Abdominal infra', 'Abdômen'), ('Abdominal na polia', 'Abdômen'), ('Elevação de pernas', 'Abdômen'), ('Prancha', 'Abdômen'),
      ('Esteira', 'Cardio'), ('Bicicleta ergométrica', 'Cardio'), ('Elíptico', 'Cardio'), ('Corda', 'Cardio'), ('Escada', 'Cardio')
    ) as e(nome, grupo)
  on conflict (personal_id, nome) do nothing;
  return new;
end;
$$;
revoke execute on function public.semear_exercicios() from public, anon, authenticated;
create trigger ao_criar_personal after insert on public.personais
  for each row execute function public.semear_exercicios();

-- Plano grátis: 1 aluno ativo. Primeira cobrança: este mês se o vencimento ainda não passou, senão o próximo.
create or replace function public.alunos_regras() returns trigger
  language plpgsql security definer set search_path to '' as $$
declare
  v_plano text;
  v_qtd int;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.status = 'ativo' and (tg_op = 'INSERT' or old.status <> 'ativo') then
    select plano into v_plano from public.personais where id = new.personal_id;
    if v_plano = 'gratis' then
      select count(*) into v_qtd from public.alunos
       where personal_id = new.personal_id and status = 'ativo' and id <> new.id;
      if v_qtd >= 1 then
        raise exception 'O plano grátis permite 1 aluno ativo. Assine o Ilimitado para cadastrar mais.' using errcode = 'P0001';
      end if;
    end if;
  end if;
  if new.inicio_cobranca is null then
    new.inicio_cobranca := case
      when extract(day from v_hoje) > new.dia_vencimento then (date_trunc('month', v_hoje) + interval '1 month')::date
      else date_trunc('month', v_hoje)::date end;
  end if;
  return new;
end;
$$;
revoke execute on function public.alunos_regras() from public, anon, authenticated;
create trigger alunos_regras before insert or update of status, dia_vencimento, inicio_cobranca on public.alunos
  for each row execute function public.alunos_regras();

-- Pagamento marcado à mão pelo personal conta como recebido fora do app (sem taxa).
-- Pagamentos pelo Asaas são gravados pela função do servidor, com a taxa da forma de pagamento.
create or replace function public.cobrancas_regras() returns trigger
  language plpgsql security definer set search_path to '' as $$
begin
  if new.status = 'paga' and (tg_op = 'INSERT' or old.status <> 'paga') then
    if coalesce((select auth.role()), '') = 'authenticated' then
      new.forma := 'fora_do_app';
      new.taxa := 0;
    elsif new.taxa is null then
      new.taxa := public.taxa_de(new.forma, new.valor);
    end if;
    new.pago_em := coalesce(new.pago_em, now());
  elsif new.status <> 'paga' then
    new.pago_em := null;
    if coalesce((select auth.role()), '') = 'authenticated' then new.taxa := null; end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.cobrancas_regras() from public, anon, authenticated;
create trigger cobrancas_regras before insert or update on public.cobrancas
  for each row execute function public.cobrancas_regras();

-- Mensalidades do mês para os alunos ativos com plano. Idempotente: chamar de novo não duplica.
create or replace function public.gerar_cobrancas() returns integer
  language plpgsql set search_path to '' as $$
declare
  v_mes date := date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date)::date;
  v_ult int := extract(day from (date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date) + interval '1 month - 1 day'))::int;
  v_n int;
begin
  insert into public.cobrancas (personal_id, aluno_id, plano_id, descricao, valor, vencimento, competencia, forma)
  select a.personal_id, a.id, p.id,
         p.nome || ' · ' || to_char(v_mes, 'MM/YYYY'),
         p.valor,
         v_mes + (least(a.dia_vencimento, v_ult) - 1),
         v_mes,
         case a.forma_pagamento when 'cartao' then 'cartao' when 'pix_automatico' then 'pix_automatico' when 'fora_do_app' then 'fora_do_app' else null end
    from public.alunos a
    join public.planos p on p.personal_id = a.personal_id and p.id = a.plano_id
   where a.personal_id = (select auth.uid())
     and a.status = 'ativo'
     and coalesce(a.inicio_cobranca, v_mes) <= v_mes
  on conflict (aluno_id, competencia) where competencia is not null do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.meu_aluno_id(), public.personal_do_aluno(), public.meu_plano_id(),
  public.aluno_bloqueado(uuid), public.meu_personal(), public.registrar_consentimento(),
  public.taxa_de(text, numeric), public.gerar_cobrancas() from public, anon;
grant execute on function public.meu_aluno_id(), public.personal_do_aluno(), public.meu_plano_id(),
  public.aluno_bloqueado(uuid), public.meu_personal(), public.registrar_consentimento(),
  public.taxa_de(text, numeric), public.gerar_cobrancas() to authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.personais enable row level security;
alter table public.asaas_chaves enable row level security;
alter table public.planos enable row level security;
alter table public.alunos enable row level security;
alter table public.anamneses enable row level security;
alter table public.metas enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.checkins enable row level security;
alter table public.fotos enable row level security;
alter table public.exercicios enable row level security;
alter table public.fichas enable row level security;
alter table public.ficha_itens enable row level security;
alter table public.treinos_feitos enable row level security;
alter table public.series_feitas enable row level security;
alter table public.mensagens enable row level security;
alter table public.cobrancas enable row level security;

-- personais: cada um vê e ajusta só a própria configuração (plano e Asaas só pelo servidor)
create policy personais_ler on public.personais for select to authenticated using (id = (select auth.uid()));
create policy personais_editar on public.personais for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- planos
create policy planos_ler on public.planos for select to authenticated
  using (personal_id = (select auth.uid()) or id = (select public.meu_plano_id()));
create policy planos_inserir on public.planos for insert to authenticated with check (personal_id = (select auth.uid()));
create policy planos_editar on public.planos for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy planos_apagar on public.planos for delete to authenticated using (personal_id = (select auth.uid()));

-- alunos
create policy alunos_ler on public.alunos for select to authenticated
  using (personal_id = (select auth.uid()) or user_id = (select auth.uid()));
create policy alunos_inserir on public.alunos for insert to authenticated with check (personal_id = (select auth.uid()));
create policy alunos_editar on public.alunos for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy alunos_apagar on public.alunos for delete to authenticated using (personal_id = (select auth.uid()));

-- tabelas do personal que o aluno só lê: anamneses, metas, avaliações
create policy anamneses_ler on public.anamneses for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy anamneses_inserir on public.anamneses for insert to authenticated with check (personal_id = (select auth.uid()));
create policy anamneses_editar on public.anamneses for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy anamneses_apagar on public.anamneses for delete to authenticated using (personal_id = (select auth.uid()));

create policy metas_ler on public.metas for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy metas_inserir on public.metas for insert to authenticated with check (personal_id = (select auth.uid()));
create policy metas_editar on public.metas for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy metas_apagar on public.metas for delete to authenticated using (personal_id = (select auth.uid()));

create policy avaliacoes_ler on public.avaliacoes for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy avaliacoes_inserir on public.avaliacoes for insert to authenticated with check (personal_id = (select auth.uid()));
create policy avaliacoes_editar on public.avaliacoes for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy avaliacoes_apagar on public.avaliacoes for delete to authenticated using (personal_id = (select auth.uid()));

-- check-ins: o aluno envia; o personal responde
create policy checkins_ler on public.checkins for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy checkins_inserir on public.checkins for insert to authenticated
  with check (aluno_id = (select public.meu_aluno_id()) and personal_id = (select public.personal_do_aluno()));
create policy checkins_responder on public.checkins for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy checkins_apagar on public.checkins for delete to authenticated using (personal_id = (select auth.uid()));

-- fotos: personal (avaliação) e aluno (check-in) enviam; o aluno pode apagar as próprias (LGPD)
create policy fotos_ler on public.fotos for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy fotos_inserir on public.fotos for insert to authenticated
  with check (personal_id = (select auth.uid())
    or (aluno_id = (select public.meu_aluno_id()) and personal_id = (select public.personal_do_aluno())));
create policy fotos_apagar on public.fotos for delete to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));

-- exercícios: o aluno lê os do seu personal (para ver os vídeos)
create policy exercicios_ler on public.exercicios for select to authenticated
  using (personal_id = (select auth.uid()) or personal_id = (select public.personal_do_aluno()));
create policy exercicios_inserir on public.exercicios for insert to authenticated with check (personal_id = (select auth.uid()));
create policy exercicios_editar on public.exercicios for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy exercicios_apagar on public.exercicios for delete to authenticated using (personal_id = (select auth.uid()));

-- fichas: o aluno só vê as ativas e só se o treino não estiver pausado por atraso
create policy fichas_ler on public.fichas for select to authenticated
  using (personal_id = (select auth.uid())
    or (aluno_id = (select public.meu_aluno_id()) and ativa and not (select public.aluno_bloqueado())));
create policy fichas_inserir on public.fichas for insert to authenticated with check (personal_id = (select auth.uid()));
create policy fichas_editar on public.fichas for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy fichas_apagar on public.fichas for delete to authenticated using (personal_id = (select auth.uid()));

create policy ficha_itens_ler on public.ficha_itens for select to authenticated
  using (personal_id = (select auth.uid())
    or ficha_id in (select f.id from public.fichas f where f.aluno_id = (select public.meu_aluno_id())));
create policy ficha_itens_inserir on public.ficha_itens for insert to authenticated with check (personal_id = (select auth.uid()));
create policy ficha_itens_editar on public.ficha_itens for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));
create policy ficha_itens_apagar on public.ficha_itens for delete to authenticated using (personal_id = (select auth.uid()));

-- registros de treino: o aluno grava; o personal lê
create policy treinos_feitos_ler on public.treinos_feitos for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy treinos_feitos_inserir on public.treinos_feitos for insert to authenticated
  with check (aluno_id = (select public.meu_aluno_id()) and personal_id = (select public.personal_do_aluno()));
create policy treinos_feitos_editar on public.treinos_feitos for update to authenticated
  using (aluno_id = (select public.meu_aluno_id()))
  with check (aluno_id = (select public.meu_aluno_id()) and personal_id = (select public.personal_do_aluno()));
create policy treinos_feitos_apagar on public.treinos_feitos for delete to authenticated using (aluno_id = (select public.meu_aluno_id()));

create policy series_feitas_ler on public.series_feitas for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy series_feitas_inserir on public.series_feitas for insert to authenticated
  with check (aluno_id = (select public.meu_aluno_id()) and personal_id = (select public.personal_do_aluno()));
create policy series_feitas_editar on public.series_feitas for update to authenticated
  using (aluno_id = (select public.meu_aluno_id()))
  with check (aluno_id = (select public.meu_aluno_id()) and personal_id = (select public.personal_do_aluno()));
create policy series_feitas_apagar on public.series_feitas for delete to authenticated using (aluno_id = (select public.meu_aluno_id()));

-- conversa: os dois lados leem e escrevem; quem recebe marca como lida
create policy mensagens_ler on public.mensagens for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy mensagens_enviar on public.mensagens for insert to authenticated
  with check (autor_id = (select auth.uid()) and (
    personal_id = (select auth.uid())
    or (aluno_id = (select public.meu_aluno_id()) and personal_id = (select public.personal_do_aluno()))));
create policy mensagens_marcar_lida on public.mensagens for update to authenticated
  using (autor_id <> (select auth.uid()) and (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id())))
  with check (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));

-- cobranças: o personal gerencia; o aluno vê as dele
create policy cobrancas_ler on public.cobrancas for select to authenticated
  using (personal_id = (select auth.uid()) or aluno_id = (select public.meu_aluno_id()));
create policy cobrancas_inserir on public.cobrancas for insert to authenticated with check (personal_id = (select auth.uid()));
create policy cobrancas_editar on public.cobrancas for update to authenticated
  using (personal_id = (select auth.uid())) with check (personal_id = (select auth.uid()));

-- ---------------------------------------------------------------- permissões por coluna
revoke all on all tables in schema public from anon;
revoke all on public.asaas_chaves from authenticated;

revoke insert, update, delete on public.personais from authenticated;
grant update (bloqueio_ativo, bloqueio_dias, lembrete_antes, lembrete_dia, lembrete_depois, avisar_whatsapp, checkin_dia)
  on public.personais to authenticated;

revoke insert, update on public.alunos from authenticated;
grant insert (personal_id, nome, email, whatsapp, cpf, nascimento, objetivo, observacoes, status, plano_id, dia_vencimento, forma_pagamento, inicio_cobranca)
  on public.alunos to authenticated;
grant update (nome, email, whatsapp, cpf, nascimento, objetivo, observacoes, status, plano_id, dia_vencimento, forma_pagamento, inicio_cobranca)
  on public.alunos to authenticated;

revoke update on public.checkins from authenticated;
grant update (resposta, respondido_em) on public.checkins to authenticated;

revoke update on public.fotos from authenticated;

revoke update on public.mensagens from authenticated;
grant update (lida_em) on public.mensagens to authenticated;

revoke insert, update, delete on public.cobrancas from authenticated;
grant insert (personal_id, aluno_id, plano_id, descricao, valor, vencimento, forma) on public.cobrancas to authenticated;
grant update (descricao, valor, vencimento, status, forma, pago_em) on public.cobrancas to authenticated;
