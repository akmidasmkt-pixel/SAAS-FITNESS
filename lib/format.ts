const inteiro = (v: number) => Math.abs(Math.round(v)).toLocaleString("pt-BR");

/** R$ 1.234,56 */
export const brl = (v: number) =>
  (v < -0.004 ? "−" : "") + "R$ " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** R$ 1.235 (sem centavos) */
export const brl0 = (v: number) => (Math.round(v) < 0 ? "−" : "") + "R$ " + inteiro(v);

/** +R$ 1.235 / −R$ 1.235 */
export const sbrl0 = (v: number) => (Math.round(v) > 0 ? "+" : Math.round(v) < 0 ? "−" : "") + "R$ " + inteiro(v);

const sinal = (x: number) => (x > 0.0005 ? "+" : x < -0.0005 ? "−" : "");
const dec = (x: number, d: number) => Math.abs(x).toFixed(d).replace(".", ",");

export const pct = (x: number, d = 1) => (x < -0.0005 ? "−" : "") + dec(x * 100, d) + "%";
export const spct = (x: number, d = 1) => sinal(x) + dec(x * 100, d) + "%";
export const spp = (x: number, d = 1) => sinal(x) + dec(x * 100, d) + " p.p.";
export const num1 = (x: number) => dec(x, 1);
export const snum1 = (x: number) => sinal(Math.round(x * 10) / 10) + dec(x, 1);

/** 2026-09-23 -> 23/09 */
export const ddmm = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
/** 2026-09-23 -> 23/09/2026 */
export const ddmmaa = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

/** Aceita "1.234,56", "1234,56", "1234.56", "R$ 90" */
export function parseValor(entrada: string | number): number {
  if (typeof entrada === "number") return entrada;
  const t = String(entrada).replace(/[^\d,.-]/g, "");
  if (!t) return NaN;
  if (t.includes(",")) return parseFloat(t.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return parseFloat(t.replace(/\./g, ""));
  return parseFloat(t);
}

/** 1234.5 -> "1.234,50" para preencher campos */
export const valorCampo = (v: number | null | undefined) =>
  v == null || isNaN(Number(v)) ? "" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const AREA_NOME: Record<string, string> = { pessoal: "Pessoal", empresa: "Empresa" };

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Busca sem acento e sem maiúsculas, com as palavras em qualquer ordem: "triceps halter" acha "Tríceps francês unilateral com halter". */
export const combinaBusca = (texto: string, busca: string) => {
  const t = semAcento(texto);
  return semAcento(busca).split(/\s+/).filter(Boolean).every((p) => t.includes(p));
};
