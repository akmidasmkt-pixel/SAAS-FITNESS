"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Cobranca } from "@/lib/types";
import { brl, ddmm } from "@/lib/format";
import { hoje } from "@/lib/dates";
import { Avatar } from "./Cabecalho";
import { Botao } from "./ui";
import { IconCadeado, IconCopiar, IconEsq } from "@/lib/icons";

export function TopoAluno({ titulo, sub, voltar, direita }: { titulo: ReactNode; sub?: ReactNode; voltar?: string; direita?: ReactNode }) {
  const { aluno } = useDados();
  return (
    <header className="sticky top-0 z-30 bg-fundo/95 backdrop-blur px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 flex items-center gap-3">
      {voltar ? (
        <Link href={voltar} aria-label="Voltar" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-texto2 hover:bg-linha2"><IconEsq size={22} /></Link>
      ) : null}
      <div className="flex-1 min-w-0">
        {sub ? <p className="text-xs font-bold text-mudo">{sub}</p> : null}
        <h1 className="text-[22px] font-black tracking-tight truncate">{titulo}</h1>
      </div>
      {direita ?? (aluno && !voltar ? <Link href="/a/pagamentos" aria-label="Minha conta"><Avatar nome={aluno.nome} tamanho={38} /></Link> : null)}
    </header>
  );
}

/** Cobrança em aberto mais antiga do aluno. */
export function cobrancaEmAberto(cobrancas: Cobranca[]) {
  return [...cobrancas].filter((c) => c.status === "pendente").sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0] ?? null;
}

export function PagarCobranca({ c }: { c: Cobranca }) {
  const { avisar } = useUi();
  const [copiado, setCopiado] = useState(false);
  const { meuPersonal } = useDados();
  async function copiar() {
    try { await navigator.clipboard.writeText(c.pix_copia_cola!); setCopiado(true); avisar("Código Pix copiado. Cole no app do seu banco."); } catch { avisar("Não foi possível copiar. Toque e segure o código para copiar.", "erro"); }
  }
  if (!c.pix_copia_cola && !c.link_pagamento) {
    return (
      <p className="text-sm text-texto2 bg-fundo rounded-xl px-3.5 py-3">
        {c.forma === "fora_do_app" ? `Pague como combinado com ${meuPersonal?.nome.split(" ")[0] ?? "seu personal"}. Assim que ele registrar, aparece aqui.` : `${meuPersonal?.nome.split(" ")[0] ?? "Seu personal"} vai liberar o Pix ou o link de pagamento por aqui.`}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {c.pix_copia_cola ? (
        <>
          <span className="text-[11px] font-bold text-mudo uppercase tracking-[0.05em]">Pix copia e cola</span>
          <code className="block text-xs bg-fundo border border-linha rounded-xl px-3 py-2.5 break-all max-h-20 overflow-hidden select-all">{c.pix_copia_cola}</code>
          <Botao onClick={copiar}><IconCopiar size={16} /> {copiado ? "Copiado!" : "Copiar código Pix"}</Botao>
        </>
      ) : null}
      {c.link_pagamento ? (
        <a href={c.link_pagamento} target="_blank" rel="noreferrer" className="block">
          <Botao variante={c.pix_copia_cola ? "secundario" : "primario"} className="w-full">{c.forma === "cartao" ? "Pagar com cartão" : "Abrir boleto, Pix ou cartão"}</Botao>
        </a>
      ) : null}
    </div>
  );
}

/** Tela de treino pausado por atraso. */
export function TreinoPausado() {
  const { cobrancas, meuPersonal, recarregar } = useDados();
  const c = cobrancaEmAberto(cobrancas);
  const primeiro = meuPersonal?.nome.split(" ")[0] ?? "seu personal";
  return (
    <div className="px-4 flex flex-col gap-4">
      <div className="bg-white border border-linha rounded-2xl p-5 flex flex-col gap-4">
        <span className="w-12 h-12 rounded-full bg-vermelho-cl text-vermelho flex items-center justify-center"><IconCadeado size={24} /></span>
        <div>
          <h2 className="text-lg font-extrabold">Seu treino está pausado</h2>
          <p className="text-sm text-texto2 mt-1 leading-relaxed">
            {c ? `A mensalidade de ${ddmm(c.vencimento)} ainda não foi paga.` : "Há uma mensalidade em aberto."} Assim que o pagamento cair, seu treino volta na hora, com tudo do jeito que estava.
          </p>
        </div>
        {c ? (
          <>
            <div className="flex items-center justify-between rounded-xl bg-fundo px-4 py-3">
              <span className="text-sm text-texto2">{c.descricao || "Mensalidade"} · venceu {ddmm(c.vencimento)}</span>
              <span className="text-base font-extrabold">{brl(c.valor)}</span>
            </div>
            <PagarCobranca c={c} />
          </>
        ) : null}
        <Link href="/a/conversa"><Botao variante="secundario" className="w-full">Falar com {primeiro}</Botao></Link>
        <button type="button" onClick={() => recarregar()} className="text-xs font-bold text-azul-esc cursor-pointer">Já paguei · verificar de novo</button>
      </div>
      <p className="text-xs text-mudo text-center px-4">Sua evolução, as fotos e a conversa continuam disponíveis.</p>
    </div>
  );
}

export const semanaDe = (iso: string) => {
  const d = new Date(iso + "T12:00:00Z");
  const dia = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dia === 0 ? -6 : 1 - dia));
  return d.toISOString().slice(0, 10);
};
export const estaSemana = (iso: string) => semanaDe(iso) === semanaDe(hoje());
