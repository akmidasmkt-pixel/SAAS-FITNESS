-- Biblioteca de exercícios ampliada (referência: MFIT Personal), de 48 para cerca de 300, e três grupos novos:
-- Antebraço, Funcional e Alongamento. Os exercícios continuam sem vídeo; o personal grava os que usa.
-- A lista base passa a viver numa tabela: o personal novo recebe tudo; quem já usa o app recebe só o lote novo,
-- então o que ele apagou ou renomeou da primeira lista não volta.

alter table public.exercicios drop constraint exercicios_grupo_check;
alter table public.exercicios add constraint exercicios_grupo_check check (grupo in (
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Pernas', 'Glúteos', 'Abdômen', 'Cardio', 'Funcional', 'Alongamento', 'Outros'));

create table public.exercicios_base (
  nome text primary key check (char_length(nome) between 1 and 80),
  grupo text not null check (grupo in (
    'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Pernas', 'Glúteos', 'Abdômen', 'Cardio', 'Funcional', 'Alongamento', 'Outros')),
  lote smallint not null
);
-- Só as funções do servidor leem; o app recebe a lista já copiada em exercicios.
alter table public.exercicios_base enable row level security;
revoke all on public.exercicios_base from public, anon, authenticated;

-- Lote 1: a lista que já era semeada desde o início.
insert into public.exercicios_base (nome, grupo, lote)
select nome, grupo, 1 from (values
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
) as e(nome, grupo);

-- Lote 2: variações por equipamento (barra, halteres, máquina, polia, smith, elástico, peso do corpo) e os grupos novos.
insert into public.exercicios_base (nome, grupo, lote)
select nome, grupo, 2 from (values
  -- Peito
  ('Supino inclinado com barra', 'Peito'), ('Supino declinado com barra', 'Peito'), ('Supino declinado com halteres', 'Peito'),
  ('Supino reto no smith', 'Peito'), ('Supino inclinado no smith', 'Peito'), ('Supino reto na máquina', 'Peito'),
  ('Supino inclinado na máquina', 'Peito'), ('Supino reto com halteres pegada neutra', 'Peito'), ('Supino no chão (floor press)', 'Peito'),
  ('Supino com elástico', 'Peito'), ('Supino com anilha (svend press)', 'Peito'),
  ('Crucifixo reto com halteres', 'Peito'), ('Crucifixo inclinado com halteres', 'Peito'), ('Crucifixo declinado com halteres', 'Peito'),
  ('Crucifixo com cabos no banco', 'Peito'), ('Crucifixo com elástico', 'Peito'),
  ('Crossover na polia alta', 'Peito'), ('Crossover na polia baixa', 'Peito'), ('Pullover com halter', 'Peito'),
  ('Flexão de braço inclinada (mãos elevadas)', 'Peito'), ('Flexão de braço declinada (pés elevados)', 'Peito'),
  ('Flexão de braço com joelhos apoiados', 'Peito'), ('Flexão de braço com pegada aberta', 'Peito'),
  -- Costas
  ('Puxada frontal pegada fechada (triângulo)', 'Costas'), ('Puxada frontal pegada supinada', 'Costas'), ('Puxada por trás da nuca', 'Costas'),
  ('Puxada unilateral na polia', 'Costas'), ('Puxada na máquina articulada', 'Costas'),
  ('Pulldown na polia (braços estendidos)', 'Costas'), ('Pulldown na polia com corda', 'Costas'),
  ('Remada baixa pegada aberta', 'Costas'), ('Remada baixa unilateral', 'Costas'), ('Remada unilateral na polia', 'Costas'),
  ('Remada curvada com halteres', 'Costas'), ('Remada curvada pegada supinada', 'Costas'), ('Remada Pendlay', 'Costas'),
  ('Remada cavalinho', 'Costas'), ('Remada na máquina articulada', 'Costas'), ('Remada no smith', 'Costas'),
  ('Remada apoiada no banco inclinado', 'Costas'), ('Remada invertida na barra', 'Costas'), ('Remada com elástico', 'Costas'),
  ('Barra fixa pegada supinada', 'Costas'), ('Barra fixa pegada neutra', 'Costas'), ('Barra fixa no graviton (assistida)', 'Costas'),
  ('Barra fixa assistida com elástico', 'Costas'), ('Extensão lombar no banco romano', 'Costas'),
  ('Superman (extensão lombar no solo)', 'Costas'), ('Bom dia com barra (good morning)', 'Costas'),
  -- Ombros
  ('Desenvolvimento com barra pela frente', 'Ombros'), ('Desenvolvimento por trás da nuca', 'Ombros'), ('Desenvolvimento militar em pé', 'Ombros'),
  ('Desenvolvimento no smith', 'Ombros'), ('Desenvolvimento na máquina', 'Ombros'), ('Desenvolvimento Arnold', 'Ombros'),
  ('Elevação lateral sentado com halteres', 'Ombros'), ('Elevação lateral unilateral na polia', 'Ombros'),
  ('Elevação lateral na máquina', 'Ombros'), ('Elevação lateral com elástico', 'Ombros'),
  ('Elevação frontal com barra', 'Ombros'), ('Elevação frontal com anilha', 'Ombros'), ('Elevação frontal na polia', 'Ombros'),
  ('Elevação frontal alternada com halteres', 'Ombros'), ('Crucifixo inverso na máquina', 'Ombros'), ('Crucifixo inverso na polia', 'Ombros'),
  ('Remada alta com barra', 'Ombros'), ('Remada alta na polia', 'Ombros'), ('Face pull na polia', 'Ombros'),
  ('Encolhimento com barra', 'Ombros'), ('Encolhimento no smith', 'Ombros'),
  ('Rotação externa de ombro na polia', 'Ombros'), ('Rotação externa de ombro com elástico', 'Ombros'), ('Rotação interna de ombro na polia', 'Ombros'),
  -- Bíceps
  ('Rosca direta com barra W', 'Bíceps'), ('Rosca direta na polia', 'Bíceps'), ('Rosca simultânea com halteres', 'Bíceps'),
  ('Rosca inclinada com halteres', 'Bíceps'), ('Rosca concentrada', 'Bíceps'), ('Rosca martelo na polia com corda', 'Bíceps'),
  ('Rosca martelo cruzada', 'Bíceps'), ('Rosca scott unilateral com halter', 'Bíceps'), ('Rosca scott na máquina', 'Bíceps'),
  ('Rosca 21', 'Bíceps'), ('Rosca aranha (spider)', 'Bíceps'), ('Rosca bíceps na polia alta', 'Bíceps'),
  ('Rosca unilateral na polia baixa', 'Bíceps'), ('Rosca bayesiana na polia', 'Bíceps'), ('Rosca na máquina', 'Bíceps'),
  ('Rosca com elástico', 'Bíceps'), ('Rosca Zottman', 'Bíceps'),
  -- Tríceps
  ('Tríceps pulley com barra V', 'Tríceps'), ('Tríceps pulley pegada supinada', 'Tríceps'), ('Tríceps unilateral na polia', 'Tríceps'),
  ('Tríceps testa com halteres', 'Tríceps'), ('Tríceps testa na polia', 'Tríceps'), ('Tríceps francês unilateral com halter', 'Tríceps'),
  ('Tríceps francês na polia com corda', 'Tríceps'), ('Tríceps coice com halter', 'Tríceps'), ('Tríceps coice na polia', 'Tríceps'),
  ('Supino com pegada fechada', 'Tríceps'), ('Mergulho nas paralelas', 'Tríceps'), ('Mergulho na máquina', 'Tríceps'),
  ('Tríceps na máquina', 'Tríceps'), ('Flexão de braço diamante', 'Tríceps'), ('Tríceps com elástico', 'Tríceps'),
  -- Antebraço
  ('Rosca punho com barra', 'Antebraço'), ('Rosca punho inversa com barra', 'Antebraço'), ('Rosca punho com halteres', 'Antebraço'),
  ('Rosca inversa com barra', 'Antebraço'), ('Rosca inversa na polia', 'Antebraço'), ('Rolo de punho', 'Antebraço'),
  ('Suspensão na barra fixa', 'Antebraço'), ('Pegada em pinça com anilhas', 'Antebraço'), ('Hand grip', 'Antebraço'),
  -- Pernas
  ('Agachamento no smith', 'Pernas'), ('Agachamento frontal com barra', 'Pernas'), ('Agachamento hack', 'Pernas'),
  ('Agachamento pêndulo', 'Pernas'), ('Agachamento goblet', 'Pernas'), ('Agachamento com halteres', 'Pernas'),
  ('Agachamento com peso corporal', 'Pernas'), ('Agachamento isométrico na parede', 'Pernas'), ('Agachamento unilateral (pistol)', 'Pernas'),
  ('Agachamento sissy', 'Pernas'), ('Sentar e levantar do banco', 'Pernas'), ('Agachamento búlgaro no smith', 'Pernas'),
  ('Leg press horizontal', 'Pernas'), ('Leg press 45° unilateral', 'Pernas'), ('Cadeira extensora unilateral', 'Pernas'),
  ('Afundo com halteres', 'Pernas'), ('Afundo no smith', 'Pernas'), ('Afundo reverso', 'Pernas'), ('Afundo lateral', 'Pernas'),
  ('Passada caminhando', 'Pernas'), ('Subida no banco (step-up)', 'Pernas'),
  ('Mesa flexora unilateral', 'Pernas'), ('Cadeira flexora', 'Pernas'), ('Flexora em pé', 'Pernas'),
  ('Flexão de joelhos na bola suíça', 'Pernas'), ('Flexão nórdica', 'Pernas'), ('Stiff com halteres', 'Pernas'),
  ('Stiff unilateral', 'Pernas'), ('Levantamento terra romeno', 'Pernas'), ('Cadeira adutora', 'Pernas'),
  ('Adução de quadril na polia', 'Pernas'), ('Panturrilha sentado', 'Pernas'), ('Panturrilha no leg press', 'Pernas'),
  ('Panturrilha no smith', 'Pernas'), ('Panturrilha unilateral em pé', 'Pernas'),
  -- Glúteos
  ('Elevação pélvica na máquina', 'Glúteos'), ('Elevação pélvica unilateral', 'Glúteos'), ('Ponte de glúteo', 'Glúteos'),
  ('Ponte de glúteo unilateral', 'Glúteos'), ('Ponte de glúteo pés unidos (frog pump)', 'Glúteos'), ('Glúteo na máquina', 'Glúteos'),
  ('Coice quatro apoios com caneleira', 'Glúteos'), ('Abdução quatro apoios (fire hydrant)', 'Glúteos'),
  ('Abdução de quadril na polia', 'Glúteos'), ('Abdução lateral deitado com caneleira', 'Glúteos'),
  ('Caminhada lateral com elástico', 'Glúteos'), ('Ostra com elástico (clamshell)', 'Glúteos'), ('Levantamento terra sumô', 'Glúteos'),
  ('Afundo cruzado (curtsy)', 'Glúteos'), ('Pull through na polia', 'Glúteos'),
  -- Abdômen
  ('Abdominal remador', 'Abdômen'), ('Abdominal bicicleta', 'Abdômen'), ('Abdominal oblíquo cruzado', 'Abdômen'),
  ('Abdominal canivete (V-up)', 'Abdômen'), ('Abdominal no banco declinado', 'Abdômen'), ('Abdominal na máquina', 'Abdômen'),
  ('Abdominal na bola suíça', 'Abdômen'), ('Abdominal tesoura', 'Abdômen'), ('Elevação de joelhos na paralela', 'Abdômen'),
  ('Elevação de pernas na barra fixa', 'Abdômen'), ('Prancha lateral', 'Abdômen'), ('Prancha com toque no ombro', 'Abdômen'),
  ('Rotação russa (russian twist)', 'Abdômen'), ('Roda abdominal', 'Abdômen'), ('Dead bug', 'Abdômen'),
  ('Perdigueiro (bird dog)', 'Abdômen'), ('Canoa (hollow hold)', 'Abdômen'), ('Pallof press (antirrotação)', 'Abdômen'),
  ('Lenhador na polia', 'Abdômen'), ('Flexão lateral de tronco com halter', 'Abdômen'), ('Vácuo abdominal', 'Abdômen'),
  -- Cardio
  ('Caminhada na esteira inclinada', 'Cardio'), ('Tiros na esteira (HIIT)', 'Cardio'), ('Caminhada ao ar livre', 'Cardio'),
  ('Corrida ao ar livre', 'Cardio'), ('Bike de spinning', 'Cardio'), ('Bicicleta horizontal', 'Cardio'),
  ('Air bike', 'Cardio'), ('Remo ergômetro', 'Cardio'), ('Ski erg', 'Cardio'), ('Natação', 'Cardio'),
  -- Funcional
  ('Burpee', 'Funcional'), ('Polichinelo', 'Funcional'), ('Agachamento com salto', 'Funcional'), ('Afundo com salto', 'Funcional'),
  ('Salto na caixa (box jump)', 'Funcional'), ('Escalador (mountain climber)', 'Funcional'), ('Flexão pliométrica', 'Funcional'),
  ('Swing com kettlebell', 'Funcional'), ('Arranco com kettlebell', 'Funcional'), ('Levantamento turco (turkish get-up)', 'Funcional'),
  ('Thruster com halteres', 'Funcional'), ('Power clean', 'Funcional'), ('Wall ball', 'Funcional'), ('Slam ball', 'Funcional'),
  ('Corda naval (battle rope)', 'Funcional'), ('Caminhada do fazendeiro (farmer walk)', 'Funcional'), ('Empurrar trenó', 'Funcional'),
  ('Virar pneu', 'Funcional'), ('Tiro de corrida (sprint)', 'Funcional'), ('Skipping', 'Funcional'), ('Escada de agilidade', 'Funcional'),
  ('Deslocamento lateral', 'Funcional'), ('Caminhada do urso (bear crawl)', 'Funcional'), ('Remada no TRX', 'Funcional'),
  ('Flexão no TRX', 'Funcional'), ('Agachamento no TRX', 'Funcional'), ('Agachamento no bosu', 'Funcional'), ('Equilíbrio unipodal', 'Funcional'),
  -- Alongamento e mobilidade
  ('Alongamento de peitoral', 'Alongamento'), ('Alongamento de dorsal', 'Alongamento'), ('Alongamento de ombro (braço cruzado)', 'Alongamento'),
  ('Alongamento de tríceps', 'Alongamento'), ('Alongamento de antebraço', 'Alongamento'), ('Alongamento de quadríceps', 'Alongamento'),
  ('Alongamento de posterior de coxa', 'Alongamento'), ('Alongamento de panturrilha', 'Alongamento'), ('Alongamento de glúteo (figura 4)', 'Alongamento'),
  ('Alongamento de flexores do quadril', 'Alongamento'), ('Alongamento de adutores (borboleta)', 'Alongamento'), ('Alongamento de lombar', 'Alongamento'),
  ('Alongamento de pescoço', 'Alongamento'), ('Postura da criança', 'Alongamento'), ('Gato e vaca (mobilidade de coluna)', 'Alongamento'),
  ('Cobra (extensão de coluna)', 'Alongamento'), ('Rotação torácica em quatro apoios', 'Alongamento'), ('Mobilidade de quadril 90/90', 'Alongamento'),
  ('Mobilidade de tornozelo', 'Alongamento'), ('Mobilidade de ombro com bastão', 'Alongamento'), ('Liberação miofascial com rolo', 'Alongamento'),
  ('Rotação de braços (aquecimento)', 'Alongamento'), ('Maior alongamento do mundo', 'Alongamento')
) as e(nome, grupo);

-- Cada personal novo ganha a biblioteca base inteira (sem vídeo; ele grava os dele).
create or replace function public.semear_exercicios() returns trigger
  language plpgsql security definer set search_path to '' as $$
begin
  insert into public.exercicios (personal_id, nome, grupo, proprio)
  select new.id, b.nome, b.grupo, false from public.exercicios_base b
  on conflict (personal_id, nome) do nothing;
  return new;
end;
$$;
revoke execute on function public.semear_exercicios() from public, anon, authenticated;

-- Quem já usa o app recebe o lote novo. Pula o nome que o personal já tem, mesmo escrito com outras maiúsculas.
insert into public.exercicios (personal_id, nome, grupo, proprio)
select p.id, b.nome, b.grupo, false
  from public.personais p cross join public.exercicios_base b
 where b.lote = 2
   and not exists (select 1 from public.exercicios e where e.personal_id = p.id and lower(e.nome) = lower(b.nome))
on conflict (personal_id, nome) do nothing;
