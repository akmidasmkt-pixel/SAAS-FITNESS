"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { useDados, numeros } from "@/lib/store";
import { Cabecalho, Conteudo, Avatar } from "@/components/Cabecalho";
import { Bloco, Botao, Card, CardTopo, Vazio } from "@/components/ui";
import { AlunoForm } from "@/components/AlunoForm";
import { FaixaAvisos } from "@/components/AtivarAvisos";
import { resumirMetas, type ResumoMeta } from "@/components/Evolucao";
import { hoje, dataPorExtenso, diaLocal, horaLocal, mesAtual, nomeMes, somaDias, ultimoDia } from "@/lib/dates";
import { brl, brl0, ddmm } from "@/lib/format";
import { diasEntre } from "@/lib/cobranca";
import { MEDIDAS } from "@/lib/evolucao";
import { IconCheck, IconDir, IconMais } from "@/lib/icons";
import type { Aluno, Avaliacao, Checkin, Meta } from "@/lib/types";

function saudacao() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

interface Extra {
  fichas: { aluno_id: string }[];
  treinosHoje: { aluno_id: string; criado_em: string; concluido: boolean; ficha_id: string | null }[];
  checkinsHoje: Checkin[];
  metas: Meta[];
  avaliacoes: Avaliacao[];
  pesos: Checkin[];
}

export default function Inicio() {
  const { perfil, personal, alunos, planos, exercicios, cobrancas, checkinsAbertos, naoLidas, treinosSemana, ultimoTreino, recarregar } = useDados();
  const [novo, setNovo] = useState(false);
  const [extra, setExtra] = useState<Extra | null>(null);
  const hj = hoje();
  const ativos = alunos.filter((a) => a.status === "ativo");
  const nomeDe = (id: string) => alunos.find((a) => a.id === id)?.nome ?? "Aluno";

  useEffect(() => {
    const s = sb();
    Promise.all([
      s.from("fichas").select("aluno_id").eq("ativa", true),
      s.from("treinos_feitos").select("aluno_id, criado_em, concluido, ficha_id").eq("data", hj).order("criado_em", { ascending: false }),
      s.from("checkins").select("*").eq("data", hj),
      s.from("metas").select("*"),
      s.from("avaliacoes").select("*").order("data"),
      s.from("checkins").select("id, aluno_id, data, peso").not("peso", "is", null).gte("data", somaDias(hj, -400)).order("data"),
    ]).then(([fi, tr, ci, me, av, pe]) => {
      setExtra({
        fichas: (fi.data ?? []) as { aluno_id: string }[],
        treinosHoje: (tr.data ?? []) as Extra["treinosHoje"],
        checkinsHoje: (ci.data ?? []) as Checkin[],
        metas: numeros(me.data as Meta[], ["inicio", "alvo"]),
        avaliacoes: numeros(av.data as Avaliacao[], ["peso", "gordura", "cintura", "quadril", "braco", "coxa", "massa_magra"]),
        pesos: numeros(pe.data as Checkin[], ["peso"]),
      });
    });
  }, [hj]);

  const mes = mesAtual();
  const doMes = cobrancas.filter((c) => c.status !== "cancelada" && c.vencimento.slice(0, 7) === mes);
  const recebido = doMes.filter((c) => c.status === "paga").reduce((s, c) => s + c.valor - (c.taxa ?? 0), 0);
  const aReceber = doMes.filter((c) => c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const atrasadas = cobrancas.filter((c) => c.status === "pendente" && c.vencimento < hj);
  const treinosNaSemana = Object.values(treinosSemana).reduce((a, b) => a + b, 0);
  const proximas = cobrancas.filter((c) => c.status === "pendente" && c.vencimento >= hj && c.vencimento <= ultimoDia(mes)).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const sumidos = ativos.filter((a) => a.user_id && (!ultimoTreino[a.id] || diasEntre(ultimoTreino[a.id], hj) > 7));
  const semTreino = extra ? ativos.filter((a) => !extra.fichas.some((f) => f.aluno_id === a.id)) : [];
  const conversas = Object.entries(naoLidas).filter(([, n]) => n > 0);

  const pendencias = [
    checkinsAbertos.length && { n: checkinsAbertos.length, titulo: checkinsAbertos.length === 1 ? "Check-in para responder" : "Check-ins para responder", sub: checkinsAbertos.slice(0, 3).map((c) => nomeDe(c.aluno_id).split(" ")[0]).join(", "), href: "/checkins" },
    conversas.length && { n: conversas.reduce((s, [, n]) => s + n, 0), titulo: "Mensagens não lidas", sub: conversas.slice(0, 3).map(([id]) => nomeDe(id).split(" ")[0]).join(", "), href: "/conversas" },
    atrasadas.length && { n: atrasadas.length, titulo: atrasadas.length === 1 ? "Mensalidade atrasada" : "Mensalidades atrasadas", sub: brl(atrasadas.reduce((s, c) => s + c.valor, 0)) + " em aberto", href: "/financeiro" },
    semTreino.length && { n: semTreino.length, titulo: semTreino.length === 1 ? "Aluno sem treino montado" : "Alunos sem treino montado", sub: semTreino.slice(0, 3).map((a) => a.nome.split(" ")[0]).join(", "), href: "/treinos" },
    sumidos.length && { n: sumidos.length, titulo: "Sem treinar há mais de 7 dias", sub: sumidos.slice(0, 3).map((a) => a.nome.split(" ")[0]).join(", "), href: "/alunos?filtro=sumidos" },
  ].filter(Boolean) as { n: number; titulo: string; sub: string; href: string }[];

  const destaque = useMemo(() => {
    if (!extra) return null;
    let melhor: { aluno: Aluno; metas: ResumoMeta[] } | null = null;
    for (const a of ativos) {
      const metas = resumirMetas(a, {
        metas: extra.metas.filter((m) => m.aluno_id === a.id),
        avaliacoes: extra.avaliacoes.filter((x) => x.aluno_id === a.id),
        checkins: extra.pesos.filter((x) => x.aluno_id === a.id),
      });
      if (!metas.length || metas[0].pontos.length < 2) continue;
      if (!melhor || metas[0].pct > melhor.metas[0].pct) melhor = { aluno: a, metas };
    }
    return melhor;
  }, [extra, ativos]);

  const passos = [
    { feito: planos.length > 0, titulo: "Crie seu plano de mensalidade", sub: "Ex.: Consultoria online · R$ 189/mês", href: "/financeiro?aba=planos" },
    { feito: exercicios.some((e) => e.video_caminho || e.video_link), titulo: "Grave os vídeos dos exercícios", sub: "Envie do celular ou cole um link do YouTube", href: "/exercicios" },
    { feito: alunos.some((a) => a.user_id), titulo: "Convide seu primeiro aluno", sub: "Ele recebe o acesso pelo WhatsApp", href: "/alunos?novo=1" },
    { feito: !!extra && extra.fichas.length > 0, titulo: "Monte o primeiro treino", sub: "Com séries, cargas e descanso", href: "/treinos" },
    { feito: !!personal && personal.asaas_status !== "nao_iniciado", titulo: "Abra sua conta de recebimento", sub: "Para cobrar por Pix, boleto e cartão no app", href: "/ajustes" },
  ];
  const feitos = passos.filter((p) => p.feito).length;

  async function ocultarPassos() {
    await sb().from("perfis").update({ onboarding_ok: true }).eq("id", perfil!.id);
    recarregar();
  }

  const atividade = extra
    ? [
        ...extra.treinosHoje.filter((t) => t.concluido).map((t) => ({ hora: t.criado_em, quem: nomeDe(t.aluno_id), oque: "concluiu o treino" })),
        ...extra.checkinsHoje.map((c) => ({ hora: c.criado_em, quem: nomeDe(c.aluno_id), oque: c.peso != null ? `enviou o check-in · ${String(c.peso).replace(".", ",")} kg` : "enviou o check-in" })),
        ...cobrancas.filter((c) => c.status === "paga" && c.pago_em && diaLocal(c.pago_em) === hj)
          .map((c) => ({ hora: c.pago_em!, quem: nomeDe(c.aluno_id), oque: `pagou ${brl(c.valor)}` })),
      ].sort((a, b) => b.hora.localeCompare(a.hora))
    : [];

  return (
    <>
      <Cabecalho titulo={`${saudacao()}, ${perfil?.nome.split(" ")[0] ?? ""}`} sub={dataPorExtenso(hj)}
        acoes={<Botao onClick={() => setNovo(true)}><IconMais size={18} /> <span className="hidden sm:inline">Novo aluno</span></Botao>} />
      <Conteudo>
        <FaixaAvisos texto="Saiba na hora quando um aluno manda mensagem, envia o check-in ou paga a mensalidade." />
        {!perfil?.onboarding_ok && feitos < passos.length ? (
          <Card>
            <CardTopo titulo="Comece por aqui" sub={`${feitos} de ${passos.length} passos para deixar tudo pronto`}
              direita={<button type="button" onClick={ocultarPassos} className="text-xs font-bold text-mudo hover:text-tinta cursor-pointer">Ocultar</button>} />
            <ol className="px-2 sm:px-3 pb-3 grid sm:grid-cols-2 lg:grid-cols-5 gap-1">
              {passos.map((p, i) => (
                <li key={p.titulo}>
                  <Link href={p.href} className={`flex lg:flex-col items-start gap-3 p-3 rounded-xl h-full ${p.feito ? "opacity-60" : "hover:bg-fundo"}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${p.feito ? "bg-verde-cl text-verde" : "bg-azul-cl text-azul-esc"}`}>
                      {p.feito ? <IconCheck size={14} /> : i + 1}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className={`text-sm font-bold ${p.feito ? "line-through" : ""}`}>{p.titulo}</span>
                      <span className="text-xs text-mudo">{p.sub}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        ) : null}

        {!ativos.length ? (
          <Card>
            <Vazio titulo="Seus alunos aparecem aqui"
              texto={personal?.plano === "gratis" ? "No plano grátis você acompanha 1 aluno; no Ilimitado, quantos quiser." : "Cadastre o primeiro aluno e gere o acesso dele ao app."}
              acao={<Botao onClick={() => setNovo(true)}>Cadastrar primeiro aluno</Botao>} />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Bloco rotulo="Alunos ativos" valor={ativos.length} sub={`${ativos.filter((a) => a.user_id).length} com acesso ao app`} />
              <Bloco rotulo={`Recebido em ${nomeMes(mes)}`} valor={brl0(recebido)} sub="já descontadas as taxas" corSub="#006300" />
              <Bloco rotulo="A receber no mês" valor={brl0(aReceber)} sub={atrasadas.length ? `${atrasadas.length} em atraso` : "nenhuma em atraso"} corSub={atrasadas.length ? "#8a5a00" : "#52514e"} />
              <Bloco rotulo="Treinos na semana" valor={treinosNaSemana} sub="últimos 7 dias" />
            </div>

            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4 items-start">
              <div className="flex flex-col gap-4">
                <Card>
                  <CardTopo titulo="Precisa de você" sub="O que está esperando uma resposta ou ação" />
                  {pendencias.length ? (
                    <ul className="px-2 sm:px-3 pb-3 flex flex-col">
                      {pendencias.map((p) => (
                        <li key={p.titulo}>
                          <Link href={p.href} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-fundo">
                            <span className="min-w-9 h-9 px-2 rounded-full bg-azul-cl text-azul-esc text-sm font-extrabold flex items-center justify-center">{p.n}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-bold">{p.titulo}</span>
                              <span className="block text-xs text-mudo truncate">{p.sub}</span>
                            </span>
                            <IconDir size={16} className="text-mudo" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 pb-5 text-sm text-mudo">Tudo em dia por aqui.</p>
                  )}
                </Card>

                {destaque ? (
                  <Card>
                    <CardTopo titulo="Evolução em destaque" sub={`Quem está mais perto da meta`}
                      direita={<Link href={`/alunos/${destaque.aluno.id}`} className="text-xs font-bold text-azul-esc">Abrir evolução →</Link>} />
                    <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar nome={destaque.aluno.nome} />
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold truncate">{destaque.aluno.nome}</p>
                          <p className="text-xs text-mudo">Meta de {MEDIDAS[destaque.metas[0].meta.medida].rotulo.toLowerCase()}: {destaque.metas[0].meta.alvo.toLocaleString("pt-BR")}{MEDIDAS[destaque.metas[0].meta.medida].unidade}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {destaque.metas.slice(0, 3).map((m) => (
                          <div key={m.meta.id} className="rounded-xl bg-fundo p-3 flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-mudo uppercase tracking-[0.05em]">{MEDIDAS[m.meta.medida].rotulo} · {Math.max(0, m.pct)}%</span>
                            <span className="text-sm font-extrabold leading-tight">{m.texto}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ) : null}
              </div>

              <div className="flex flex-col gap-4">
                <Card>
                  <CardTopo titulo="Atividade de hoje" sub="Treinos, check-ins e pagamentos dos alunos" />
                  {atividade.length ? (
                    <ul className="px-4 sm:px-5 pb-4 flex flex-col gap-2.5">
                      {atividade.slice(0, 8).map((a, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <span className="text-xs font-bold text-mudo tabular-nums w-11">{horaLocal(a.hora)}</span>
                          <span className="min-w-0 truncate"><b>{a.quem.split(" ")[0]}</b> {a.oque}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 pb-5 text-sm text-mudo">Nada ainda hoje.</p>
                  )}
                </Card>
                <Card>
                  <CardTopo titulo="Próximas cobranças" sub={`Restante de ${nomeMes(mes)} · ${brl0(proximas.reduce((s, c) => s + c.valor, 0))} em ${proximas.length}`}
                    direita={<Link href="/financeiro" className="text-xs font-bold text-azul-esc">Ver financeiro →</Link>} />
                  {proximas.length ? (
                    <ul className="px-4 sm:px-5 pb-3 flex flex-col divide-y divide-linha2">
                      {proximas.slice(0, 6).map((c) => (
                        <li key={c.id} className="py-2 flex items-center gap-3 text-sm">
                          <span className="text-xs font-bold text-mudo w-11">{ddmm(c.vencimento)}</span>
                          <span className="flex-1 truncate font-semibold">{nomeDe(c.aluno_id)}</span>
                          <span className="font-bold tabular-nums">{brl(c.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 pb-4 text-sm text-mudo">Nenhuma cobrança em aberto até o fim do mês.</p>
                  )}
                  <p className="px-5 pb-4 text-xs text-mudo">Taxa por cobrança recebida pelo app: Pix e boleto R$ 3,98 · cartão 4,49% + R$ 0,49.</p>
                </Card>
              </div>
            </div>
          </>
        )}
      </Conteudo>
      <AlunoForm aberta={novo} onFechar={() => setNovo(false)} />
    </>
  );
}
