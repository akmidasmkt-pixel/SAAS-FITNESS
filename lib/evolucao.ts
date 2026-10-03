import type { Avaliacao, Checkin, Medida, Meta, Objetivo } from "./types";

export const MEDIDAS: Record<Medida, { rotulo: string; unidade: string; casas: number }> = {
  peso: { rotulo: "Peso", unidade: " kg", casas: 1 },
  gordura: { rotulo: "Gordura", unidade: "%", casas: 1 },
  cintura: { rotulo: "Cintura", unidade: " cm", casas: 1 },
  quadril: { rotulo: "Quadril", unidade: " cm", casas: 1 },
  braco: { rotulo: "Braço", unidade: " cm", casas: 1 },
  coxa: { rotulo: "Coxa", unidade: " cm", casas: 1 },
  massa_magra: { rotulo: "Massa magra", unidade: " kg", casas: 1 },
};
export const ORDEM_MEDIDAS: Medida[] = ["peso", "gordura", "massa_magra", "cintura", "quadril", "braco", "coxa"];

export const OBJETIVOS: Record<Objetivo, string> = {
  emagrecer: "Emagrecer",
  ganhar_massa: "Ganhar massa",
  condicionamento: "Condicionamento",
  saude: "Saúde e qualidade de vida",
  outro: "Outro",
};

/** Medidas que aparecem primeiro no painel, conforme o objetivo do aluno. */
export const MEDIDAS_DO_OBJETIVO: Record<Objetivo, Medida[]> = {
  emagrecer: ["peso", "gordura", "cintura"],
  ganhar_massa: ["peso", "massa_magra", "braco"],
  condicionamento: ["peso", "gordura", "cintura"],
  saude: ["peso", "cintura", "gordura"],
  outro: ["peso", "gordura", "cintura"],
};

export const num = (v: number, casas = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const valorMedida = (m: Medida, v: number) => num(v, MEDIDAS[m].casas) + MEDIDAS[m].unidade;

/** Percentual do caminho entre o início e a meta. Sobe ao se aproximar da meta, cai ao se afastar. */
export function progresso(inicio: number, alvo: number, atual: number): number {
  if (alvo === inicio) return 0;
  return Math.round(((atual - inicio) / (alvo - inicio)) * 100);
}

/** "6,2 kg a menos" e se a mudança foi na direção da meta. */
export function mudanca(medida: Medida, de: number, para: number, meta?: Meta | null) {
  const d = para - de;
  if (Math.abs(d) < 0.05) return { texto: "Sem mudança", rumo: null as boolean | null };
  const unidade = medida === "gordura" ? " pts" : MEDIDAS[medida].unidade;
  const texto = num(Math.abs(d), MEDIDAS[medida].casas) + unidade + (d < 0 ? " a menos" : " a mais");
  const rumo = meta ? d * (meta.alvo - meta.inicio) > 0 : null;
  return { texto, rumo };
}

export interface Ponto {
  data: string;
  valor: number;
  origem: "avaliacao" | "checkin";
}

/** Série de uma medida no tempo: avaliações (todas as medidas) e check-ins (só peso). */
export function serie(medida: Medida, avaliacoes: Avaliacao[], checkins: Checkin[]): Ponto[] {
  const porData = new Map<string, Ponto>();
  for (const c of checkins) {
    if (medida === "peso" && c.peso != null) porData.set(c.data, { data: c.data, valor: Number(c.peso), origem: "checkin" });
  }
  for (const a of avaliacoes) {
    const v = (a as any)[medida];
    if (v != null) porData.set(a.data, { data: a.data, valor: Number(v), origem: "avaliacao" });
  }
  return [...porData.values()].sort((x, y) => x.data.localeCompare(y.data));
}

/** Meta da medida; sem meta cadastrada, usa o primeiro valor como início e devolve null para o alvo. */
export function metaDe(medida: Medida, metas: Meta[]) {
  return metas.find((m) => m.medida === medida) ?? null;
}
