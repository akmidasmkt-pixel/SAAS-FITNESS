import type { Aluno, Cobranca, FormaCobranca, FormaPagamento, Personal, Plano } from "./types";
import { brl, ddmm } from "./format";
import { somaDias } from "./dates";

export const FORMAS_ALUNO: Record<FormaPagamento, string> = {
  pix_boleto: "Pix ou boleto todo mês",
  cartao: "Cartão de crédito recorrente",
  pix_automatico: "Pix Automático",
  fora_do_app: "Recebo fora do app",
};

export const FORMAS_COBRANCA: Record<FormaCobranca, string> = {
  pix: "Pix",
  boleto: "Boleto/Pix",
  cartao: "Cartão",
  pix_automatico: "Pix Automático",
  fora_do_app: "Fora do app",
};

/** Taxa fixa para o personal por cobrança paga pelo app (já inclui o Asaas). */
export function taxaDe(forma: FormaCobranca | null, valor: number): number {
  if (!forma || forma === "fora_do_app") return 0;
  if (forma === "cartao") return Math.round((valor * 0.0449 + 0.49) * 100) / 100;
  return 3.98;
}

export const diasEntre = (de: string, ate: string) =>
  Math.round((new Date(ate + "T12:00:00Z").getTime() - new Date(de + "T12:00:00Z").getTime()) / 86400000);

export type Situacao = "paga" | "cancelada" | "a_vencer" | "vence_hoje" | "atrasada";

export function situacao(c: Cobranca, hoje: string): { tipo: Situacao; dias: number } {
  if (c.status === "paga") return { tipo: "paga", dias: 0 };
  if (c.status === "cancelada") return { tipo: "cancelada", dias: 0 };
  const d = diasEntre(c.vencimento, hoje);
  if (d > 0) return { tipo: "atrasada", dias: d };
  if (d === 0) return { tipo: "vence_hoje", dias: 0 };
  return { tipo: "a_vencer", dias: -d };
}

export type SituacaoAluno = { tipo: "pago" | "a_vencer" | "atrasado" | "pausado" | "sem_plano" | "arquivado"; texto: string; dias: number };

/** Situação financeira do aluno no mês, do jeito que aparece na lista. */
export function situacaoAluno(a: Aluno, cobrancas: Cobranca[], personal: Personal | null, hoje: string): SituacaoAluno {
  if (a.status === "arquivado") return { tipo: "arquivado", texto: "Arquivado", dias: 0 };
  const minhas = cobrancas.filter((c) => c.aluno_id === a.id && c.status !== "cancelada");
  const atrasadas = minhas.filter((c) => c.status === "pendente" && c.vencimento < hoje).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
  if (atrasadas.length) {
    const dias = diasEntre(atrasadas[0].vencimento, hoje);
    const pausado = !!personal?.bloqueio_ativo && dias > (personal?.bloqueio_dias ?? 5);
    return pausado
      ? { tipo: "pausado", texto: `Treino pausado · ${dias} dias`, dias }
      : { tipo: "atrasado", texto: `Atrasado · ${dias} ${dias === 1 ? "dia" : "dias"}`, dias };
  }
  if (!a.plano_id) return { tipo: "sem_plano", texto: "Sem plano", dias: 0 };
  const mes = hoje.slice(0, 7);
  const doMes = minhas.find((c) => c.vencimento.slice(0, 7) === mes);
  if (doMes?.status === "paga") return { tipo: "pago", texto: `Pago em ${ddmm((doMes.pago_em ?? doMes.vencimento).slice(0, 10))}`, dias: 0 };
  if (doMes) return { tipo: "a_vencer", texto: `Vence ${ddmm(doMes.vencimento)}`, dias: 0 };
  return { tipo: "a_vencer", texto: `Vence dia ${a.dia_vencimento}`, dias: 0 };
}

export const COR_SITUACAO: Record<SituacaoAluno["tipo"], { fundo: string; texto: string }> = {
  pago: { fundo: "#e6f4ea", texto: "#006300" },
  a_vencer: { fundo: "#f0efec", texto: "#52514e" },
  atrasado: { fundo: "#fbf1d6", texto: "#8a5a00" },
  pausado: { fundo: "#fdeae2", texto: "#b3261e" },
  sem_plano: { fundo: "#f0efec", texto: "#75746f" },
  arquivado: { fundo: "#f0efec", texto: "#75746f" },
};

export function linkWhats(fone: string, texto: string) {
  let d = (fone || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}

export function lembreteCobranca(a: Aluno, c: Cobranca, personalNome: string, link: string | null) {
  const primeiro = a.nome.split(" ")[0];
  const venc = ddmm(c.vencimento);
  return `Oi, ${primeiro}! Aqui é ${personalNome.split(" ")[0]}. Passando para lembrar da mensalidade de ${brl(Number(c.valor))}, com vencimento em ${venc}.` +
    (link ? `\nPague por aqui: ${link}` : "\nVocê também encontra o pagamento no app, em Pagamentos.") +
    `\nQualquer dúvida, me chama!`;
}

export const planoDe = (a: Aluno, planos: Plano[]) => planos.find((p) => p.id === a.plano_id) ?? null;

/** Data limite antes de o treino pausar. */
export const limiteBloqueio = (c: Cobranca, personal: Personal | null) => somaDias(c.vencimento, (personal?.bloqueio_dias ?? 5) + 1);
