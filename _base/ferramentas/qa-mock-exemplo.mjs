// Dados de exemplo para testar as telas sem rede (mesmos números do protótipo).
let n = 0;
const id = (p) => `${p}-${String(++n).padStart(4, "0")}-0000-0000-000000000000`;
const U = "11111111-1111-1111-1111-111111111111";

const catDefs = [
  ["Vendas e serviços", "entrada", "empresa"], ["Mensalidades", "entrada", "empresa"], ["Outras receitas", "entrada", "empresa"],
  ["Fornecedores", "saida", "empresa"], ["Marketing e anúncios", "saida", "empresa"], ["Equipe e freelas", "saida", "empresa"],
  ["Impostos", "saida", "empresa"], ["Aluguel e contas", "saida", "empresa"], ["Ferramentas e sistemas", "saida", "empresa"],
  ["Serviços", "saida", "empresa"], ["Outros gastos", "saida", "empresa"],
  ["Salário e pró-labore", "entrada", "pessoal"], ["Outras entradas", "entrada", "pessoal"],
  ["Moradia", "saida", "pessoal"], ["Mercado", "saida", "pessoal"], ["Saúde", "saida", "pessoal"], ["Transporte", "saida", "pessoal"],
  ["Lazer", "saida", "pessoal"], ["Educação", "saida", "pessoal"], ["Assinaturas", "saida", "pessoal"], ["Outros gastos", "saida", "pessoal"],
];
export const categorias = catDefs.map(([nome, tipo, area]) => ({ id: id("c"), user_id: U, nome, tipo, area, ativa: true }));
const cat = (nome, area) => categorias.find((c) => c.nome === nome && c.area === area).id;

export const clientes = [
  ["Auto Peças Sul", "Autopeças"], ["Oficina do Zé", "Oficina mecânica"], ["Garagem 7", "Revenda de veículos"],
  ["Pneus Express", "Pneus e rodas"], ["Ed Motors", "Concessionária"], ["Lava Rápido Prime", "Estética automotiva"],
].map(([nome, segmento]) => ({ id: id("k"), user_id: U, nome, segmento, contato: "(84) 99999-0000", observacoes: null, ativo: true }));
const cli = (nome) => clientes.find((c) => c.nome === nome).id;

const M = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
const E = { "Marketing e anúncios": [900, 1100, 800, 1300, 1200, 900], "Equipe e freelas": [2600, 2900, 2500, 3200, 3100, 2700], "Impostos": [740, 790, 710, 830, 800, 910], "Ferramentas e sistemas": [520, 540, 510, 580, 560, 540], "Aluguel e contas": [900, 900, 900, 900, 900, 900], "Serviços": [450, 450, 450, 450, 450, 450] };
const P = { "Moradia": [1940, 1950, 1920, 1970, 1960, 1920], "Mercado": [1050, 1120, 980, 1160, 1110, 960], "Saúde": [530, 530, 530, 710, 530, 530], "Transporte": [480, 560, 440, 590, 520, 430], "Lazer": [520, 780, 460, 740, 690, 380], "Assinaturas": [85, 85, 85, 85, 95, 85] };
const RECEITA = [12400, 13100, 11800, 13900, 13400, 15200];

export const fixas = [];
const fx = (nome, tipo, area, valor, dia, categoria, extra = {}) => {
  const f = { id: id("f"), user_id: U, nome, tipo, area, area_destino: tipo === "transferencia" ? "pessoal" : null, categoria_id: categoria, cliente_id: null, valor, dia_vencimento: dia, valor_variavel: false, ativa: true, inicio: "2026-04-01", ...extra };
  fixas.push(f);
  return f;
};
const F = {
  pro: fx("Pró-labore", "transferencia", "empresa", 5000, 5, null),
  aluguel: fx("Aluguel do apartamento", "saida", "pessoal", 1300, 5, cat("Moradia", "pessoal")),
  assistente: fx("Assistente de social media", "saida", "empresa", 1500, 5, cat("Equipe e freelas", "empresa")),
  cowork: fx("Coworking", "saida", "empresa", 900, 10, cat("Aluguel e contas", "empresa")),
  cond: fx("Condomínio", "saida", "pessoal", 320, 10, cat("Moradia", "pessoal")),
  gw: fx("Google Workspace", "saida", "empresa", 210, 15, cat("Ferramentas e sistemas", "empresa")),
  plano: fx("Plano de saúde", "saida", "pessoal", 420, 15, cat("Saúde", "pessoal")),
  energia: fx("Energia elétrica", "saida", "pessoal", 200, 18, cat("Moradia", "pessoal"), { valor_variavel: true }),
  net: fx("Internet e celular", "saida", "pessoal", 120, 20, cat("Moradia", "pessoal")),
  academia: fx("Academia", "saida", "pessoal", 110, 25, cat("Saúde", "pessoal")),
  stream: fx("Streaming e música", "saida", "pessoal", 85, 27, cat("Assinaturas", "pessoal")),
  contador: fx("Contador", "saida", "empresa", 450, 28, cat("Serviços", "empresa")),
  adobe: fx("Adobe Creative Cloud", "saida", "empresa", 330, 30, cat("Ferramentas e sistemas", "empresa")),
  m1: fx("Mensalidade · Ed Motors", "entrada", "empresa", 3400, 15, cat("Mensalidades", "empresa"), { cliente_id: cli("Ed Motors") }),
  m2: fx("Mensalidade · Garagem 7", "entrada", "empresa", 2200, 10, cat("Mensalidades", "empresa"), { cliente_id: cli("Garagem 7") }),
  m3: fx("Mensalidade · Auto Peças Sul", "entrada", "empresa", 800, 25, cat("Mensalidades", "empresa"), { cliente_id: cli("Auto Peças Sul") }),
  m4: fx("Mensalidade · Pneus Express", "entrada", "empresa", 1100, 5, cat("Mensalidades", "empresa"), { cliente_id: cli("Pneus Express") }),
};

export const lancamentos = [];
const HOJE = "2026-09-23";
const add = (o) => lancamentos.push({ id: id("l"), user_id: U, area_destino: null, categoria_id: null, cliente_id: null, conta_fixa_id: null, competencia: null, origem: "manual", observacoes: null, criado_em: "2026-09-01T12:00:00Z", ...o });
const dia = (ym, d) => `${ym}-${String(d).padStart(2, "0")}`;
M.forEach((ym, i) => {
  const atual = ym === "2026-09";
  const pago = (venc, forcar) => (forcar === false ? null : !atual || venc <= HOJE ? venc : null);
  // receitas
  add({ tipo: "entrada", area: "empresa", descricao: "Mensalidade · Ed Motors", valor: 3400, vencimento: dia(ym, 15), pago_em: pago(dia(ym, 15)), categoria_id: cat("Mensalidades", "empresa"), cliente_id: cli("Ed Motors"), conta_fixa_id: F.m1.id, competencia: `${ym}-01`, origem: "conta_fixa" });
  add({ tipo: "entrada", area: "empresa", descricao: "Mensalidade · Garagem 7", valor: 2200, vencimento: dia(ym, 10), pago_em: pago(dia(ym, 10)), categoria_id: cat("Mensalidades", "empresa"), cliente_id: cli("Garagem 7"), conta_fixa_id: F.m2.id, competencia: `${ym}-01`, origem: "conta_fixa" });
  add({ tipo: "entrada", area: "empresa", descricao: "Mensalidade · Auto Peças Sul", valor: 800, vencimento: dia(ym, 25), pago_em: pago(dia(ym, 25)), categoria_id: cat("Mensalidades", "empresa"), cliente_id: cli("Auto Peças Sul"), conta_fixa_id: F.m3.id, competencia: `${ym}-01`, origem: "conta_fixa" });
  add({ tipo: "entrada", area: "empresa", descricao: "Mensalidade · Pneus Express", valor: 1100, vencimento: dia(ym, 5), pago_em: atual ? null : dia(ym, 6), categoria_id: cat("Mensalidades", "empresa"), cliente_id: cli("Pneus Express"), conta_fixa_id: F.m4.id, competencia: `${ym}-01`, origem: "conta_fixa" });
  const projetos = RECEITA[i] - 7500;
  add({ tipo: "entrada", area: "empresa", descricao: "Projeto · vídeos e campanhas", valor: projetos - (atual ? 1500 : 0), vencimento: dia(ym, 18), pago_em: pago(dia(ym, 18)), categoria_id: cat("Vendas e serviços", "empresa"), cliente_id: cli("Ed Motors") });
  if (atual) add({ tipo: "entrada", area: "empresa", descricao: "Oficina do Zé · vídeo institucional", valor: 1500, vencimento: dia(ym, 30), pago_em: null, categoria_id: cat("Vendas e serviços", "empresa"), cliente_id: cli("Oficina do Zé") });
  // pró-labore
  add({ tipo: "transferencia", area: "empresa", area_destino: "pessoal", descricao: "Pró-labore", valor: 5000, vencimento: dia(ym, 5), pago_em: dia(ym, 5), conta_fixa_id: F.pro.id, competencia: `${ym}-01`, origem: "conta_fixa" });
  // saídas empresa
  for (const [nome, vals] of Object.entries(E)) {
    const fixasCat = { "Equipe e freelas": [[F.assistente, 1500]], "Aluguel e contas": [[F.cowork, 900]], "Serviços": [[F.contador, 450]], "Ferramentas e sistemas": [[F.adobe, 330], [F.gw, ym === "2026-09" ? 210 : 180]] }[nome] ?? [];
    let resto = vals[i];
    for (const [f, v] of fixasCat) {
      resto -= v;
      const venc = dia(ym, f.dia_vencimento);
      add({ tipo: "saida", area: "empresa", descricao: f.nome, valor: v, vencimento: venc, pago_em: pago(venc), categoria_id: f.categoria_id, conta_fixa_id: f.id, competencia: `${ym}-01`, origem: "conta_fixa" });
    }
    if (resto > 0) {
      const venc = dia(ym, nome === "Marketing e anúncios" ? 25 : 20);
      add({ tipo: "saida", area: "empresa", descricao: nome === "Marketing e anúncios" ? "Meta Ads" : nome === "Equipe e freelas" ? "Freelancer · edição de vídeo" : nome === "Impostos" ? "DAS · Simples Nacional" : nome, valor: resto, vencimento: venc, pago_em: nome === "Equipe e freelas" && atual ? null : pago(venc), categoria_id: cat(nome, "empresa") });
    }
  }
  // saídas pessoais
  for (const [nome, vals] of Object.entries(P)) {
    const fixasCat = { "Moradia": [[F.aluguel, 1300], [F.cond, 320], [F.net, 120], [F.energia, vals[i] - 1740]], "Saúde": [[F.plano, 420], [F.academia, 110]], "Assinaturas": [[F.stream, vals[i]]] }[nome] ?? [];
    let resto = vals[i];
    for (const [f, v] of fixasCat) {
      resto -= v;
      const venc = dia(ym, f.dia_vencimento);
      add({ tipo: "saida", area: "pessoal", descricao: f.nome, valor: v, vencimento: venc, pago_em: pago(venc), categoria_id: f.categoria_id, conta_fixa_id: f.id, competencia: `${ym}-01`, origem: "conta_fixa" });
    }
    if (resto > 0) {
      const venc = dia(ym, 12);
      add({ tipo: "saida", area: "pessoal", descricao: nome, valor: resto, vencimento: venc, pago_em: venc <= HOJE ? venc : null, categoria_id: cat(nome, "pessoal") });
    }
  }
});

export const bancos = [
  { id: id("b"), user_id: U, nome: "Conta da empresa", area: "empresa", saldo_inicial: 12200, data_saldo: "2026-04-01" },
  { id: id("b"), user_id: U, nome: "Conta pessoal", area: "pessoal", saldo_inicial: 4610, data_saldo: "2026-04-01" },
];
export const orcamentos = [
  ["Marketing e anúncios", "empresa", 1000], ["Equipe e freelas", "empresa", 3000], ["Impostos", "empresa", 900], ["Ferramentas e sistemas", "empresa", 500],
  ["Aluguel e contas", "empresa", 900], ["Serviços", "empresa", 450], ["Moradia", "pessoal", 2000], ["Mercado", "pessoal", 1000], ["Saúde", "pessoal", 550],
  ["Transporte", "pessoal", 400], ["Lazer", "pessoal", 600], ["Assinaturas", "pessoal", 100],
].map(([n2, a, v]) => ({ id: id("o"), user_id: U, competencia: "2026-09-01", categoria_id: cat(n2, a), valor: v }));
export const metas = [
  { id: id("m"), user_id: U, titulo: "Sobrar R$ 500 por mês", area: "pessoal", tipo: "sobra_mensal", valor_alvo: 500, valor_atual: 0, categoria_id: null, prazo: null, ativa: true },
  { id: id("m"), user_id: U, titulo: "Lazer até R$ 600", area: "pessoal", tipo: "limite_categoria", valor_alvo: 600, valor_atual: 0, categoria_id: cat("Lazer", "pessoal"), prazo: null, ativa: true },
  { id: id("m"), user_id: U, titulo: "Reserva para 3 meses de contas", area: "empresa", tipo: "juntar", valor_alvo: 25000, valor_atual: 18000, categoria_id: null, prazo: "2026-12-31", ativa: true },
];
const ev = (d, h1, h2, titulo, area, local = null) => ({ id: id("e"), user_id: U, titulo, inicio: `${d}T${h1}:00-03:00`, fim: `${d}T${h2}:00-03:00`, dia_inteiro: false, area, cliente_id: null, local, notas: null, origem: "manual" });
export const eventos = [
  ev("2026-09-21", "08:00", "09:00", "Treino", "pessoal"), ev("2026-09-21", "16:00", "18:00", "Captação audiovisual · Ed Motors", "empresa"),
  ev("2026-09-22", "09:00", "12:00", "Gravação de conteúdo", "empresa"), ev("2026-09-22", "19:00", "22:00", "Curso de oratória", "pessoal"),
  ev("2026-09-23", "08:00", "09:00", "Treino", "pessoal"), ev("2026-09-23", "10:00", "11:00", "Alinhamento semanal · Ed Motors", "empresa", "Loja Ed Motors"),
  ev("2026-09-23", "14:00", "15:30", "Gravação · Garagem 7", "empresa"), ev("2026-09-23", "19:00", "22:00", "Dev e otimizações", "empresa"),
  ev("2026-09-24", "10:00", "11:30", "Visita a loja · prospecção", "empresa"), ev("2026-09-25", "14:00", "17:00", "Captação · JBF Pneus", "empresa"),
  ev("2026-09-26", "09:00", "11:00", "Visita presencial · Garagem 7", "empresa"), ev("2026-09-27", "18:00", "19:00", "Rotina semanal", "pessoal"),
];
export const perfil = { id: U, nome: "Ramon Garcia", papel: "admin", trocar_senha: false, onboarding_ok: false };
export const link = { user_id: U, token: "a".repeat(64), incluir_vencimentos: true };
export const USER = { id: U, email: "ramon@agenciaclevel.com", aud: "authenticated", role: "authenticated" };
