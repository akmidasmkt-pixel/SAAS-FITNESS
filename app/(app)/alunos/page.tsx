"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useParam } from "@/lib/useParam";
import { Cabecalho, Conteudo, Avatar } from "@/components/Cabecalho";
import { Botao, Card, Entrada, Filtros, Vazio } from "@/components/ui";
import { AlunoForm } from "@/components/AlunoForm";
import { COR_SITUACAO, diasEntre, planoDe, situacaoAluno } from "@/lib/cobranca";
import { hoje } from "@/lib/dates";
import { brl, ddmm } from "@/lib/format";
import { IconBusca, IconMais } from "@/lib/icons";

type Filtro = "ativos" | "em_dia" | "atrasados" | "pausados" | "sem_acesso" | "sumidos" | "arquivados";

export default function Alunos() {
  const { alunos, cobrancas, personal, planos, ultimoTreino, ultimoCheckin, checkinsAbertos } = useDados();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [novo, setNovo] = useState(false);
  const pNovo = useParam("novo");
  const pFiltro = useParam("filtro");
  const hj = hoje();

  useEffect(() => { if (pNovo) setNovo(true); }, [pNovo]);
  useEffect(() => { if (pFiltro === "sumidos" || pFiltro === "atrasados") setFiltro(pFiltro); }, [pFiltro]);

  const linhas = useMemo(() => alunos.map((a) => {
    const sit = situacaoAluno(a, cobrancas, personal, hj);
    const ult = ultimoTreino[a.id];
    return { a, sit, plano: planoDe(a, planos), ult, sumido: a.status === "ativo" && !!a.user_id && (!ult || diasEntre(ult, hj) > 7) };
  }), [alunos, cobrancas, personal, planos, ultimoTreino, hj]);

  const conta = (f: Filtro) => linhas.filter((l) => passa(l, f)).length;
  function passa(l: (typeof linhas)[number], f: Filtro) {
    if (f === "arquivados") return l.a.status === "arquivado";
    if (l.a.status !== "ativo") return false;
    if (f === "em_dia") return l.sit.tipo === "pago" || l.sit.tipo === "a_vencer";
    if (f === "atrasados") return l.sit.tipo === "atrasado" || l.sit.tipo === "pausado";
    if (f === "pausados") return l.sit.tipo === "pausado";
    if (f === "sem_acesso") return !l.a.user_id;
    if (f === "sumidos") return l.sumido;
    return true;
  }
  const termo = busca.trim().toLowerCase();
  const visiveis = linhas.filter((l) => passa(l, filtro) && (!termo || l.a.nome.toLowerCase().includes(termo) || (l.a.email ?? "").includes(termo)));
  const ativos = conta("ativos");

  const FILTROS: { valor: Filtro; rotulo: string; qtd?: number }[] = [
    { valor: "ativos", rotulo: "Ativos", qtd: ativos },
    { valor: "em_dia", rotulo: "Em dia", qtd: conta("em_dia") },
    { valor: "atrasados", rotulo: "Atrasados", qtd: conta("atrasados") },
    { valor: "pausados", rotulo: "Treino pausado", qtd: conta("pausados") },
    { valor: "sem_acesso", rotulo: "Sem acesso ao app", qtd: conta("sem_acesso") },
    { valor: "sumidos", rotulo: "Sem treinar há 7+ dias", qtd: conta("sumidos") },
    { valor: "arquivados", rotulo: "Arquivados", qtd: conta("arquivados") },
  ];

  const selo = (t: keyof typeof COR_SITUACAO, texto: string) => (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: COR_SITUACAO[t].fundo, color: COR_SITUACAO[t].texto }}>{texto}</span>
  );

  return (
    <>
      <Cabecalho titulo="Alunos"
        sub={`${ativos} ${ativos === 1 ? "ativo" : "ativos"}${personal?.plano === "gratis" ? " · plano grátis, até 1 aluno" : " · sem limite de alunos"}`}
        acoes={<Botao onClick={() => setNovo(true)} aria-label="Novo aluno"><IconMais size={18} /> <span className="hidden sm:inline">Novo aluno</span></Botao>} />
      <Conteudo>
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <IconBusca size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mudo" />
            <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno" className="pl-10" aria-label="Buscar aluno" />
          </div>
          <Filtros opcoes={FILTROS} valor={filtro} onChange={(v) => setFiltro(v)} />
        </div>
        <Card>
          {!visiveis.length ? (
            <Vazio titulo={alunos.length ? "Nenhum aluno com esse filtro" : "Nenhum aluno ainda"}
              texto={alunos.length ? undefined : "Cadastre o primeiro aluno e gere o acesso dele ao app."}
              acao={alunos.length ? null : <Botao onClick={() => setNovo(true)}>Cadastrar aluno</Botao>} />
          ) : (
            <>
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-mudo uppercase tracking-[0.05em] border-b border-linha2">
                    <th className="px-5 py-3">Aluno</th><th className="px-3 py-3">Plano</th><th className="px-3 py-3">Situação</th>
                    <th className="px-3 py-3">Último treino</th><th className="px-5 py-3">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map(({ a, sit, plano, ult }) => {
                    const ci = ultimoCheckin[a.id];
                    const aberto = checkinsAbertos.some((c) => c.aluno_id === a.id);
                    return (
                      <tr key={a.id} className="border-b border-linha2 last:border-0 hover:bg-fundo">
                        <td className="px-5 py-3">
                          <Link href={`/alunos/${a.id}`} className="flex items-center gap-3 min-w-0">
                            <Avatar nome={a.nome} tamanho={36} />
                            <span className="min-w-0">
                              <span className="block font-bold truncate">{a.nome}</span>
                              <span className="block text-xs text-mudo truncate">{a.user_id ? a.email : "Ainda sem acesso ao app"}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-3">{plano ? <><span className="font-semibold">{plano.nome}</span><span className="block text-xs text-mudo">{brl(plano.valor)} · dia {a.dia_vencimento}</span></> : <span className="text-mudo">—</span>}</td>
                        <td className="px-3 py-3">{selo(sit.tipo, sit.texto)}</td>
                        <td className="px-3 py-3 text-texto2">{ult ? (ult === hoje() ? "Hoje" : `${ddmm(ult)} · há ${diasEntre(ult, hoje())} d`) : "—"}</td>
                        <td className="px-5 py-3">{aberto ? <Link href="/checkins" className="text-xs font-bold text-azul-esc">Responder</Link> : <span className="text-texto2">{ci ? ddmm(ci) : "—"}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <ul className="md:hidden divide-y divide-linha2">
                {visiveis.map(({ a, sit, plano, ult }) => (
                  <li key={a.id}>
                    <Link href={`/alunos/${a.id}`} className="flex items-center gap-3 px-4 py-3">
                      <Avatar nome={a.nome} tamanho={40} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-bold truncate">{a.nome}</span>
                        <span className="block text-xs text-mudo truncate">{plano ? `${plano.nome} · ${brl(plano.valor)}` : "Sem plano"} · treino {ult ? ddmm(ult) : "—"}</span>
                      </span>
                      {selo(sit.tipo, sit.texto)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </Conteudo>
      <AlunoForm aberta={novo} onFechar={() => setNovo(false)} />
    </>
  );
}
