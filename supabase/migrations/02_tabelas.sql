-- Tabelas do C-Level Personal.
-- Regra geral: o personal é o dono dos dados dos seus alunos (personal_id = auth.uid()).
-- O aluno enxerga só o que é dele (aluno_id = meu_aluno_id()) e grava só check-ins, fotos,
-- registros de treino e mensagens. Chaves compostas (personal_id, x) impedem apontar para dado
-- de outro personal. Dinheiro em numeric, datas em date, horários em timestamptz.

-- ---------------------------------------------------------------- personal
create table public.personais (
  id uuid primary key references public.perfis on delete cascade,
  plano text not null default 'gratis' check (plano in ('gratis', 'mensal', 'anual', 'beta')),
  bloqueio_ativo boolean not null default true,
  bloqueio_dias int not null default 5 check (bloqueio_dias between 1 and 30),
  lembrete_antes boolean not null default true,
  lembrete_dia boolean not null default true,
  lembrete_depois boolean not null default true,
  avisar_whatsapp boolean not null default false,
  checkin_dia int not null default 6 check (checkin_dia between 0 and 6),
  asaas_status text not null default 'nao_iniciado' check (asaas_status in ('nao_iniciado', 'pendente', 'aprovada', 'recusada')),
  asaas_conta_id text,
  asaas_wallet_id text,
  asaas_onboarding_url text,
  asaas_tipo text check (asaas_tipo in ('fisica', 'juridica')),
  asaas_doc_final text,
  asaas_criada_em timestamptz,
  criado_em timestamptz not null default now()
);

-- Chave de API da subconta Asaas de cada personal: só as funções do servidor leem.
create table public.asaas_chaves (
  personal_id uuid primary key references public.personais on delete cascade,
  api_key text not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- planos e alunos
create table public.planos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  valor numeric(10,2) not null check (valor > 0 and valor < 100000),
  descricao text not null default '' check (char_length(descricao) <= 300),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (personal_id, id)
);

create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais on delete cascade,
  user_id uuid unique references auth.users on delete set null,
  nome text not null check (char_length(nome) between 1 and 120),
  email text check (email is null or (email = lower(email) and email like '%@%')),
  whatsapp text not null default '' check (char_length(whatsapp) <= 30),
  cpf text check (cpf is null or cpf ~ '^[0-9]{11}$'),
  nascimento date,
  objetivo text not null default 'emagrecer' check (objetivo in ('emagrecer', 'ganhar_massa', 'condicionamento', 'saude', 'outro')),
  observacoes text not null default '' check (char_length(observacoes) <= 2000),
  status text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  plano_id uuid,
  dia_vencimento int not null default 10 check (dia_vencimento between 1 and 28),
  forma_pagamento text not null default 'pix_boleto' check (forma_pagamento in ('pix_automatico', 'cartao', 'pix_boleto', 'fora_do_app')),
  inicio_cobranca date,
  consentimento_em timestamptz,
  convidado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (personal_id, id),
  unique (personal_id, email),
  foreign key (personal_id, plano_id) references public.planos (personal_id, id) on delete set null (plano_id)
);
create index alunos_personal_plano on public.alunos (personal_id, plano_id);

create table public.anamneses (
  aluno_id uuid primary key,
  personal_id uuid not null default auth.uid(),
  parq_ok boolean,
  parq_obs text not null default '' check (char_length(parq_obs) <= 2000),
  lesoes text not null default '' check (char_length(lesoes) <= 2000),
  rotina text not null default '' check (char_length(rotina) <= 2000),
  objetivo_texto text not null default '' check (char_length(objetivo_texto) <= 2000),
  medicamentos text not null default '' check (char_length(medicamentos) <= 2000),
  atualizado_em timestamptz not null default now(),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade
);
create index anamneses_personal_aluno on public.anamneses (personal_id, aluno_id);

-- ---------------------------------------------------------------- evolução
create table public.metas (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid(),
  aluno_id uuid not null,
  medida text not null check (medida in ('peso', 'gordura', 'cintura', 'quadril', 'braco', 'coxa', 'massa_magra')),
  inicio numeric(6,2) not null,
  alvo numeric(6,2) not null,
  criado_em timestamptz not null default now(),
  unique (aluno_id, medida),
  check (inicio <> alvo),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade
);
create index metas_personal_aluno on public.metas (personal_id, aluno_id);

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid(),
  aluno_id uuid not null,
  data date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  peso numeric(5,2) check (peso is null or peso between 20 and 400),
  gordura numeric(4,1) check (gordura is null or gordura between 2 and 70),
  cintura numeric(5,1) check (cintura is null or cintura between 30 and 250),
  quadril numeric(5,1) check (quadril is null or quadril between 30 and 250),
  braco numeric(5,1) check (braco is null or braco between 10 and 80),
  coxa numeric(5,1) check (coxa is null or coxa between 20 and 120),
  massa_magra numeric(5,2) check (massa_magra is null or massa_magra between 10 and 200),
  observacoes text not null default '' check (char_length(observacoes) <= 2000),
  criado_em timestamptz not null default now(),
  unique (personal_id, id),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade
);
create index avaliacoes_personal_aluno on public.avaliacoes (personal_id, aluno_id, data);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null,
  aluno_id uuid not null,
  data date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  peso numeric(5,2) check (peso is null or peso between 20 and 400),
  sono int check (sono between 1 and 5),
  energia int check (energia between 1 and 5),
  treinos_feitos int check (treinos_feitos between 0 and 14),
  dor boolean not null default false,
  dor_texto text not null default '' check (char_length(dor_texto) <= 500),
  recado text not null default '' check (char_length(recado) <= 2000),
  resposta text not null default '' check (char_length(resposta) <= 4000),
  respondido_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (personal_id, id),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade
);
create index checkins_personal_aluno on public.checkins (personal_id, aluno_id, data);

create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null,
  aluno_id uuid not null,
  data date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  angulo text not null check (angulo in ('frente', 'lado', 'costas')),
  caminho text not null check (char_length(caminho) <= 300),
  origem text not null default 'checkin' check (origem in ('avaliacao', 'checkin')),
  criado_em timestamptz not null default now(),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade
);
create index fotos_personal_aluno on public.fotos (personal_id, aluno_id, data);

-- ---------------------------------------------------------------- treinos
create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  grupo text not null check (grupo in ('Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Glúteos', 'Abdômen', 'Cardio', 'Outros')),
  video_caminho text check (video_caminho is null or char_length(video_caminho) <= 300),
  video_link text check (video_link is null or (char_length(video_link) <= 500 and video_link ~ '^https://')),
  dica text not null default '' check (char_length(dica) <= 500),
  proprio boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (personal_id, id),
  unique (personal_id, nome)
);

create table public.fichas (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid(),
  aluno_id uuid not null,
  nome text not null check (char_length(nome) between 1 and 80),
  dias text not null default '' check (char_length(dias) <= 60),
  ordem int not null default 0,
  valida_ate date,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (personal_id, id),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade
);
create index fichas_personal_aluno on public.fichas (personal_id, aluno_id);

create table public.ficha_itens (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid(),
  ficha_id uuid not null,
  exercicio_id uuid not null,
  ordem int not null default 0,
  series text not null default '3' check (char_length(series) <= 20),
  repeticoes text not null default '12' check (char_length(repeticoes) <= 30),
  carga text not null default '' check (char_length(carga) <= 30),
  descanso text not null default '60 s' check (char_length(descanso) <= 20),
  observacao text not null default '' check (char_length(observacao) <= 500),
  unique (personal_id, id),
  foreign key (personal_id, ficha_id) references public.fichas (personal_id, id) on delete cascade,
  foreign key (personal_id, exercicio_id) references public.exercicios (personal_id, id) on delete restrict
);
create index ficha_itens_ficha on public.ficha_itens (personal_id, ficha_id, ordem);
create index ficha_itens_exercicio on public.ficha_itens (personal_id, exercicio_id);

create table public.treinos_feitos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null,
  aluno_id uuid not null,
  ficha_id uuid,
  data date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  concluido boolean not null default false,
  duracao_min int check (duracao_min is null or duracao_min between 0 and 600),
  criado_em timestamptz not null default now(),
  unique (personal_id, id),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade,
  foreign key (personal_id, ficha_id) references public.fichas (personal_id, id) on delete set null (ficha_id)
);
create index treinos_feitos_aluno on public.treinos_feitos (personal_id, aluno_id, data);
create index treinos_feitos_ficha on public.treinos_feitos (personal_id, ficha_id);

create table public.series_feitas (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null,
  aluno_id uuid not null,
  treino_id uuid not null,
  exercicio_id uuid not null,
  serie int not null check (serie between 1 and 20),
  carga numeric(6,2) check (carga is null or carga between 0 and 1000),
  repeticoes int check (repeticoes is null or repeticoes between 0 and 500),
  criado_em timestamptz not null default now(),
  unique (treino_id, exercicio_id, serie),
  foreign key (personal_id, treino_id) references public.treinos_feitos (personal_id, id) on delete cascade,
  foreign key (personal_id, exercicio_id) references public.exercicios (personal_id, id) on delete cascade,
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade
);
create index series_feitas_treino on public.series_feitas (personal_id, treino_id);
create index series_feitas_exercicio on public.series_feitas (personal_id, exercicio_id);
create index series_feitas_aluno on public.series_feitas (personal_id, aluno_id);

-- ---------------------------------------------------------------- conversa
create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null,
  aluno_id uuid not null,
  autor_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo text not null default 'texto' check (tipo in ('texto', 'foto', 'audio', 'checkin')),
  texto text not null default '' check (char_length(texto) <= 4000),
  arquivo text check (arquivo is null or char_length(arquivo) <= 300),
  duracao_seg int check (duracao_seg is null or duracao_seg between 0 and 600),
  checkin_id uuid references public.checkins on delete set null,
  lida_em timestamptz,
  criado_em timestamptz not null default now(),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade
);
create index mensagens_conversa on public.mensagens (personal_id, aluno_id, criado_em);
create index mensagens_autor on public.mensagens (autor_id);
create index mensagens_checkin on public.mensagens (checkin_id);

-- ---------------------------------------------------------------- cobranças
create table public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid(),
  aluno_id uuid not null,
  plano_id uuid,
  descricao text not null default '' check (char_length(descricao) <= 200),
  valor numeric(10,2) not null check (valor > 0 and valor < 100000),
  vencimento date not null,
  competencia date,
  status text not null default 'pendente' check (status in ('pendente', 'paga', 'cancelada')),
  forma text check (forma in ('pix', 'boleto', 'cartao', 'pix_automatico', 'fora_do_app')),
  taxa numeric(10,2),
  pago_em timestamptz,
  asaas_id text unique,
  pix_copia_cola text,
  link_pagamento text,
  criado_em timestamptz not null default now(),
  unique (personal_id, id),
  foreign key (personal_id, aluno_id) references public.alunos (personal_id, id) on delete cascade,
  foreign key (personal_id, plano_id) references public.planos (personal_id, id) on delete set null (plano_id)
);
create unique index cobrancas_recorrencia on public.cobrancas (aluno_id, competencia) where competencia is not null;
create index cobrancas_personal on public.cobrancas (personal_id, vencimento);
create index cobrancas_personal_aluno on public.cobrancas (personal_id, aluno_id);
create index cobrancas_personal_plano on public.cobrancas (personal_id, plano_id);
