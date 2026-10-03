// Datas no fuso de Brasília (UTC−3, sem horário de verão).
export const FUSO = "America/Sao_Paulo";

const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false });

/** Hoje em AAAA-MM-DD */
export const hoje = () => fmtDia.format(new Date());
/** Data local AAAA-MM-DD de um instante */
export const diaLocal = (d: Date | string) => fmtDia.format(typeof d === "string" ? new Date(d) : d);
/** Hora local HH:MM de um instante */
export const horaLocal = (d: Date | string) => fmtHora.format(typeof d === "string" ? new Date(d) : d);
/** Junta dia + hora locais num instante ISO (UTC) */
export const instante = (dia: string, hora = "00:00") => new Date(`${dia}T${hora}:00-03:00`).toISOString();

/** AAAA-MM */
export const mesDe = (iso: string) => iso.slice(0, 7);
export const mesAtual = () => mesDe(hoje());

export function somaMeses(ym: string, n: number) {
  const [a, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function somaDias(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const diasNoMes = (ym: string) => {
  const [a, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};
export const primeiroDia = (ym: string) => `${ym}-01`;
export const ultimoDia = (ym: string) => `${ym}-${String(diasNoMes(ym)).padStart(2, "0")}`;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const SEMANA_CURTA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const nomeMes = (ym: string) => MESES[Number(ym.slice(5, 7)) - 1];
export const nomeMesCap = (ym: string) => {
  const n = nomeMes(ym);
  return n.charAt(0).toUpperCase() + n.slice(1);
};
export const mesCurto = (ym: string) => MESES_CURTOS[Number(ym.slice(5, 7)) - 1];
export const rotuloMes = (ym: string) => `${nomeMesCap(ym)} ${ym.slice(0, 4)}`;
export const diaSemana = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDay();
export const nomeDiaSemana = (iso: string) => SEMANA[diaSemana(iso)];
export const diaSemanaCurto = (iso: string) => SEMANA_CURTA[diaSemana(iso)];

/** "Quarta, 23 de setembro" */
export function dataPorExtenso(iso: string) {
  const s = nomeDiaSemana(iso);
  return `${s.charAt(0).toUpperCase() + s.slice(1)}, ${Number(iso.slice(8, 10))} de ${nomeMes(mesDe(iso))}`;
}

/** Segunda-feira da semana de uma data */
export function inicioSemana(iso: string) {
  const d = diaSemana(iso);
  return somaDias(iso, d === 0 ? -6 : 1 - d);
}
