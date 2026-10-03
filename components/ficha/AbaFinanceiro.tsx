"use client";

import { useState } from "react";
import { useDados } from "@/lib/store";
import type { Aluno, Cobranca } from "@/lib/types";
import { FORMAS_ALUNO, planoDe, taxaDe } from "@/lib/cobranca";
import { brl, ddmmaa } from "@/lib/format";
import { Botao, Card, CardTopo } from "../ui";
import { CobrancaFolha, NovaCobranca, SeloCobranca } from "../Cobrancas";
import { AlunoForm } from "../AlunoForm";

export function AbaFinanceiro({ aluno }: { aluno: Aluno }) {
  const { cobrancas, planos, personal } = useDados();
  const [sel, setSel] = useState<Cobranca | null>(null);
  const [nova, setNova] = useState(false);
  const [editar, setEditar] = useState(false);
  const plano = planoDe(aluno, planos);
  const minhas = cobrancas.filter((c) => c.aluno_id === aluno.id).sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  const proxima = [...minhas].reverse().find((c) => c.status === "pendente");
  const taxa = plano && aluno.forma_pagamento !== "fora_do_app" ? taxaDe(aluno.forma_pagamento === "cartao" ? "cartao" : "boleto", plano.valor) : 0;
  const item = (r: string, v: string) => (
    <div className="flex flex-col"><span className="text-[11px] font-bold text-mudo uppercase tracking-[0.05em]">{r}</span><span className="text-sm font-bold">{v}</span></div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr] items-start">
      <Card>
        <CardTopo titulo="Plano e cobrança" direita={<Botao pequeno variante="secundario" onClick={() => setEditar(true)}>Alterar</Botao>} />
        <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3.5">
            {item("Plano", plano?.nome ?? "Sem plano")}
            {item("Valor", plano ? `${brl(plano.valor)}/mês · dia ${aluno.dia_vencimento}` : "—")}
            {item("Forma", FORMAS_ALUNO[aluno.forma_pagamento])}
            {item("Próxima", proxima ? `${ddmmaa(proxima.vencimento)} · ${brl(proxima.valor)}` : "—")}
          </div>
          {plano ? (
            <div className="rounded-xl bg-verde-cl px-4 py-3">
              <p className="text-xs font-bold text-verde">Por mensalidade você recebe</p>
              <p className="text-xl font-extrabold text-verde tabular-nums">{brl(plano.valor - taxa)}</p>
              <p className="text-xs text-verde/80">
                {aluno.forma_pagamento === "fora_do_app" ? "Recebido fora do app: sem taxa." : aluno.forma_pagamento === "cartao"
                  ? `${brl(plano.valor)} menos a taxa de 4,49% + R$ 0,49 do cartão.` : `${brl(plano.valor)} menos a taxa fixa de R$ 3,98 por Pix ou boleto pago.`}
              </p>
            </div>
          ) : null}
          <p className="text-xs text-mudo">
            {aluno.consentimento_em ? `Termos aceitos pelo aluno em ${ddmmaa(aluno.consentimento_em.slice(0, 10))}` : "O aluno ainda não aceitou os termos no app"}
            {personal?.bloqueio_ativo ? `, com a regra de pausa do treino após ${personal.bloqueio_dias} dias de atraso.` : "."}
          </p>
        </div>
      </Card>
      <Card>
        <CardTopo titulo="Histórico" sub={`${minhas.filter((c) => c.status === "paga").length} pagas`} direita={<Botao pequeno variante="secundario" onClick={() => setNova(true)}>Cobrança avulsa</Botao>} />
        {minhas.length ? (
          <ul className="px-2 sm:px-3 pb-3 flex flex-col">
            {minhas.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSel(c)} className="w-full text-left flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-fundo cursor-pointer">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">{c.descricao || "Mensalidade"}</span>
                    <span className="block text-xs text-mudo">{ddmmaa(c.vencimento)}{c.status === "paga" && c.taxa ? ` · taxa −${brl(c.taxa)}` : ""}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">{brl(c.valor)}</span>
                  <SeloCobranca c={c} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-mudo">{plano ? "A primeira mensalidade aparece aqui no mês de início da cobrança." : "Escolha um plano para gerar as mensalidades."}</p>
        )}
      </Card>
      <CobrancaFolha cobranca={sel} onFechar={() => setSel(null)} />
      <NovaCobranca aberta={nova} alunoId={aluno.id} onFechar={() => setNova(false)} />
      <AlunoForm aberta={editar} aluno={aluno} onFechar={() => setEditar(false)} />
    </div>
  );
}
