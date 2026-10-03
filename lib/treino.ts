import type { Ficha, TreinoFeito } from "./types";
import { diaSemana } from "./dates";

const CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Ficha sugerida para hoje: a marcada para o dia da semana; senão, a seguinte à última feita. */
export function fichaDoDia(fichas: Ficha[], feitos: TreinoFeito[], hoje: string): Ficha | null {
  const ativas = fichas.filter((f) => f.ativa).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  if (!ativas.length) return null;
  const dia = CURTOS[diaSemana(hoje)];
  const doDia = ativas.find((f) => f.dias.toLowerCase().split(/[\s,;/·]+/).some((d) => d.startsWith(dia.slice(0, 3))));
  if (doDia) return doDia;
  const ultimo = [...feitos].filter((t) => t.concluido && t.ficha_id).sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
  if (!ultimo) return ativas[0];
  const i = ativas.findIndex((f) => f.id === ultimo.ficha_id);
  return ativas[(i + 1) % ativas.length] ?? ativas[0];
}

/** Descanso em segundos a partir de textos como "60 s", "1min30", "90". */
export function segundosDescanso(t: string): number {
  const s = (t || "").toLowerCase().replace(",", ".");
  const min = s.match(/(\d+(?:\.\d+)?)\s*m/);
  const seg = s.match(/(\d+)\s*s/);
  if (min) return Math.round(parseFloat(min[1]) * 60) + (seg && s.indexOf("s") > s.indexOf("m") ? parseInt(seg[1]) : 0);
  const n = parseInt(s);
  return isFinite(n) && n > 0 ? n : 60;
}

export const numeroSeries = (t: string) => {
  const n = parseInt(t);
  return isFinite(n) && n > 0 ? Math.min(n, 12) : 3;
};
