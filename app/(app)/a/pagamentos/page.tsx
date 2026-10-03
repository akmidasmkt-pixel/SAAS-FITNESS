"use client";

import { useDados } from "@/lib/store";
import { sb } from "@/lib/supabase";
import { TopoAluno, PagarCobranca, cobrancaEmAberto } from "@/components/AlunoComum";
import { InstalarApp } from "@/components/InstalarApp";
import { Botao } from "@/components/ui";
import { FORMAS_ALUNO, FORMAS_COBRANCA, diasEntre } from "@/lib/cobranca";
import { brl, ddmm, ddmmaa } from "@/lib/format";
import { hoje } from "@/lib/dates";

export default function PagamentosAluno() {
  const { aluno, meuPersonal, meuPlano, cobrancas, email } = useDados();
  if (!aluno) return null;
  const hj = hoje();
  const aberta = cobrancaEmAberto(cobrancas);
  const atraso = aberta ? diasEntre(aberta.vencimento, hj) : 0;
  const historico = cobrancas.filter((c) => c.status !== "cancelada");
  const situacao = !meuPlano && !aberta ? null : aberta && atraso > 0 ? { t: `Atrasada há ${atraso} ${atraso === 1 ? "dia" : "dias"}`, c: "bg-ambar-cl text-ambar-txt" } : { t: "Em dia", c: "bg-verde-cl text-verde" };

  return (
    <>
      <TopoAluno titulo="Pagamentos" sub={meuPlano ? `${meuPlano.nome} com ${meuPersonal?.nome ?? "seu personal"}` : undefined} direita={<span />} />
      <div className="px-4 flex flex-col gap-3.5">
        <section className="bg-white border border-linha rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">{meuPlano ? `${brl(meuPlano.valor)}/mês · todo dia ${aluno.dia_vencimento}` : "Sem plano de mensalidade"}</span>
            {situacao ? <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold ${situacao.c}`}>{situacao.t}</span> : null}
          </div>
          {aberta ? (
            <>
              <div>
                <p className="text-[11px] font-bold text-mudo tracking-[0.06em]">{atraso > 0 ? "EM ABERTO" : "PRÓXIMA MENSALIDADE"}</p>
                <p className="text-2xl font-black tabular-nums">{brl(aberta.valor)} <span className="text-base font-bold text-texto2">· {ddmm(aberta.vencimento)}</span></p>
                <p className="text-xs text-texto2">{aberta.descricao}</p>
              </div>
              <PagarCobranca c={aberta} />
            </>
          ) : meuPlano ? (
            <p className="text-sm text-texto2">Nenhuma mensalidade em aberto. A próxima aparece aqui perto do vencimento.</p>
          ) : null}
          {meuPlano ? <p className="text-xs text-mudo">Forma combinada: {FORMAS_ALUNO[aluno.forma_pagamento]}.</p> : null}
        </section>

        {historico.length ? (
          <section className="bg-white border border-linha rounded-2xl">
            <h2 className="px-5 pt-4 pb-2 text-[15px] font-extrabold">Histórico</h2>
            <ul className="px-5 pb-3 divide-y divide-linha2">
              {historico.map((c) => (
                <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{c.descricao || "Mensalidade"}</span>
                    <span className="block text-xs text-mudo">
                      {c.status === "paga" ? `Pago em ${ddmmaa((c.pago_em ?? c.vencimento).slice(0, 10))}${c.forma ? ` · ${FORMAS_COBRANCA[c.forma]}` : ""}` : `Vence ${ddmmaa(c.vencimento)}`}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-bold tabular-nums">{brl(c.valor)}</span>
                    <span className={`block text-[10px] font-extrabold ${c.status === "paga" ? "text-verde" : c.vencimento < hj ? "text-ambar-txt" : "text-mudo"}`}>{c.status === "paga" ? "PAGO" : c.vencimento < hj ? "ATRASADO" : "EM ABERTO"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="bg-white border border-linha rounded-2xl p-5 flex flex-col gap-1.5 text-sm">
          <span className="font-extrabold">Minha conta</span>
          <span className="text-texto2">{aluno.nome} · {email}</span>
          {aluno.consentimento_em ? <span className="text-xs text-mudo">Termos de privacidade e do plano aceitos em {ddmmaa(aluno.consentimento_em.slice(0, 10))}.</span> : null}
          <Botao variante="secundario" className="mt-2" onClick={() => sb().auth.signOut()}>Sair do app</Botao>
        </section>
        <InstalarApp />
      </div>
    </>
  );
}
