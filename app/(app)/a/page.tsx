"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { useDados, numeros } from "@/lib/store";
import type { Avaliacao, Checkin, Ficha, FichaItem, Mensagem, Meta, TreinoFeito } from "@/lib/types";
import { TopoAluno, TreinoPausado, cobrancaEmAberto, estaSemana, semanaDe } from "@/components/AlunoComum";
import { Anel } from "@/components/Graficos";
import { metaSemanal, resumirMetas } from "@/components/Evolucao";
import { Botao, Carregando } from "@/components/ui";
import { Avatar } from "@/components/Cabecalho";
import { FaixaAvisos } from "@/components/AtivarAvisos";
import { fichaDoDia, numeroSeries, segundosDescanso } from "@/lib/treino";
import { dataPorExtenso, diaLocal, hoje, horaLocal, somaDias } from "@/lib/dates";
import { brl, ddmm } from "@/lib/format";
import { diasEntre, FORMAS_ALUNO } from "@/lib/cobranca";
import { valorMedida } from "@/lib/evolucao";
import { IconCheck, IconCheckin, IconDir } from "@/lib/icons";

interface DadosHoje {
  fichas: Ficha[];
  itens: FichaItem[];
  feitos: TreinoFeito[];
  checkins: Checkin[];
  metas: Meta[];
  avaliacoes: Avaliacao[];
  ultima: Mensagem | null;
}

const LETRA_DIA = ["S", "T", "Q", "Q", "S", "S", "D"];

export default function HojeAluno() {
  const { aluno, meuPersonal, bloqueado, cobrancas, regras, meuPlano, perfil } = useDados();
  const [d, setD] = useState<DadosHoje | null>(null);
  const hj = hoje();

  useEffect(() => {
    if (!aluno) return;
    const s = sb();
    (async () => {
      const [fi, fe, ci, me, av, ms] = await Promise.all([
        s.from("fichas").select("*").eq("aluno_id", aluno.id).eq("ativa", true).order("ordem"),
        s.from("treinos_feitos").select("*").eq("aluno_id", aluno.id).gte("data", somaDias(hj, -40)).order("criado_em", { ascending: false }),
        s.from("checkins").select("*").eq("aluno_id", aluno.id).order("data"),
        s.from("metas").select("*").eq("aluno_id", aluno.id),
        s.from("avaliacoes").select("*").eq("aluno_id", aluno.id).order("data"),
        s.from("mensagens").select("*").eq("aluno_id", aluno.id).order("criado_em", { ascending: false }).limit(1),
      ]);
      const fichas = (fi.data ?? []) as Ficha[];
      const it = fichas.length ? await s.from("ficha_itens").select("*").in("ficha_id", fichas.map((f) => f.id)) : { data: [] };
      setD({
        fichas, itens: (it.data ?? []) as FichaItem[], feitos: (fe.data ?? []) as TreinoFeito[],
        checkins: numeros(ci.data as Checkin[], ["peso"]), metas: numeros(me.data as Meta[], ["inicio", "alvo"]),
        avaliacoes: numeros(av.data as Avaliacao[], ["peso", "gordura", "cintura", "quadril", "braco", "coxa", "massa_magra"]),
        ultima: ((ms.data ?? [])[0] as Mensagem) ?? null,
      });
    })();
  }, [aluno, hj]);

  const metas = useMemo(() => (aluno && d ? resumirMetas(aluno, d) : []), [aluno, d]);
  if (!aluno) return null;
  const primeiro = aluno.nome.split(" ")[0];
  const pers = meuPersonal?.nome.split(" ")[0] ?? "seu personal";

  if (bloqueado) {
    return (<><TopoAluno titulo={`Oi, ${primeiro}`} sub={dataPorExtenso(hj)} /><TreinoPausado /></>);
  }
  if (!d) return (<><TopoAluno titulo={`Oi, ${primeiro}`} sub={dataPorExtenso(hj)} /><Carregando /></>);

  const sugerida = fichaDoDia(d.fichas, d.feitos, hj);
  const itensSug = sugerida ? d.itens.filter((i) => i.ficha_id === sugerida.id) : [];
  const minutos = Math.max(10, Math.round(itensSug.reduce((s, i) => s + numeroSeries(i.series) * (45 + segundosDescanso(i.descanso)), 0) / 60 / 5) * 5);
  const feitosSemana = d.feitos.filter((t) => t.concluido && estaSemana(t.data));
  const meta = metaSemanal({ fichas: d.fichas });
  const fezHoje = feitosSemana.some((t) => t.data === hj);
  const segunda = semanaDe(hj);
  const diasSemana = Array.from({ length: 7 }, (_, k) => somaDias(segunda, k));

  const checkinSemana = [...d.checkins].reverse().find((c) => estaSemana(c.data));
  const diaCheckin = regras?.checkin_dia ?? 6;
  const hojeDow = new Date(hj + "T12:00:00Z").getUTCDay();
  const ordem = (x: number) => (x === 0 ? 7 : x);
  const horaDoCheckin = ordem(hojeDow) >= ordem(diaCheckin);

  const principal = metas[0];
  const aberta = cobrancaEmAberto(cobrancas);
  const atraso = aberta ? diasEntre(aberta.vencimento, hj) : 0;

  return (
    <>
      <TopoAluno titulo={`Oi, ${primeiro}`} sub={dataPorExtenso(hj)} />
      <div className="px-4 flex flex-col gap-3.5">
        <FaixaAvisos texto={`Receba as mensagens de ${pers}, a resposta do check-in e o lembrete do treino.`} />
        <section className="bg-tinta text-white rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.08em] text-white/60">TREINO DE HOJE</span>
            <span className="text-xs font-bold text-white/80">{feitosSemana.length} de {meta} na semana</span>
          </div>
          {sugerida ? (
            <>
              <div>
                <h2 className="text-xl font-extrabold leading-tight">{sugerida.nome}</h2>
                <p className="text-sm text-white/70 mt-0.5">{itensSug.length} exercícios · cerca de {minutos} min</p>
              </div>
              <div className="flex gap-1.5">
                {diasSemana.map((dia, k) => {
                  const fez = feitosSemana.some((t) => t.data === dia);
                  return (
                    <span key={dia} className={`flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold ${fez ? "bg-azul text-white" : dia === hj ? "bg-white/20 text-white ring-1 ring-white/50" : "bg-white/10 text-white/50"}`}>
                      {fez ? <IconCheck size={14} /> : LETRA_DIA[k]}
                    </span>
                  );
                })}
              </div>
              <Link href={`/a/treino/${sugerida.id}`}><Botao className="w-full !h-12 !text-base">{fezHoje ? "Treinar de novo" : "Começar treino"}</Botao></Link>
              {d.fichas.length > 1 ? <Link href="/a/treino" className="text-xs font-bold text-white/70 text-center hover:text-white">Escolher outro treino</Link> : null}
            </>
          ) : (
            <p className="text-sm text-white/75 leading-relaxed">{pers} ainda está montando seu treino. Assim que ficar pronto, aparece aqui.</p>
          )}
        </section>

        {principal ? (
          <Link href="/a/evolucao" className="bg-white border border-linha rounded-2xl p-4 flex items-center gap-4 hover:border-azul-borda">
            <Anel pct={principal.pct} tamanho={72} espessura={8}><span className="text-base font-black">{Math.max(0, principal.pct)}%</span></Anel>
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-mudo tracking-[0.06em]">MINHA EVOLUÇÃO</span>
              <span className="block text-[15px] font-extrabold leading-snug">{principal.pct >= 100 ? "Meta alcançada!" : `${Math.max(0, principal.pct)}% do caminho até ${valorMedida(principal.meta.medida, principal.meta.alvo)}`}</span>
              <span className="block text-xs text-texto2">{principal.texto} · <span className="text-azul-esc font-bold">ver time-lapse →</span></span>
            </span>
          </Link>
        ) : null}

        {checkinSemana ? (
          <Link href="/a/checkin" className="bg-white border border-linha rounded-2xl p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-verde-cl text-verde flex items-center justify-center shrink-0"><IconCheck size={20} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-extrabold">Check-in da semana enviado</span>
              <span className="block text-xs text-texto2 truncate">{checkinSemana.respondido_em ? `${pers} respondeu: ${checkinSemana.resposta}` : `${diaLocal(checkinSemana.criado_em) === hj ? "Hoje" : ddmm(checkinSemana.data)}, ${horaLocal(checkinSemana.criado_em)} · ${pers} vai responder`}</span>
            </span>
            <IconDir size={16} className="text-mudo" />
          </Link>
        ) : (
          <Link href="/a/checkin" className={`rounded-2xl p-4 flex items-center gap-3 border ${horaDoCheckin ? "bg-azul-bg border-azul-borda" : "bg-white border-linha"}`}>
            <span className="w-10 h-10 rounded-full bg-azul text-white flex items-center justify-center shrink-0"><IconCheckin size={20} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-extrabold">{horaDoCheckin ? "Hora do check-in da semana" : "Check-in semanal"}</span>
              <span className="block text-xs text-texto2">Peso, 3 fotos e como foi a semana · leva uns 3 minutos</span>
            </span>
            <IconDir size={16} className="text-mudo" />
          </Link>
        )}

        <Link href="/a/conversa" className="bg-white border border-linha rounded-2xl p-4 flex items-center gap-3">
          <Avatar nome={meuPersonal?.nome ?? "?"} tamanho={40} />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-extrabold">{meuPersonal?.nome ?? "Seu personal"}</span>
            <span className="block text-xs text-texto2 truncate">
              {d.ultima ? `${d.ultima.autor_id === perfil?.id ? "Você: " : ""}${d.ultima.tipo === "foto" ? "Foto" : d.ultima.tipo === "audio" ? "Áudio" : d.ultima.tipo === "checkin" ? "Check-in" : d.ultima.texto}` : "Mande uma mensagem, foto ou áudio"}
            </span>
          </span>
          {d.ultima ? <span className="text-[11px] text-mudo">{diaLocal(d.ultima.criado_em) === hj ? horaLocal(d.ultima.criado_em) : ddmm(diaLocal(d.ultima.criado_em))}</span> : null}
        </Link>

        {meuPlano ? (
          <Link href="/a/pagamentos" className="bg-white border border-linha rounded-2xl p-4 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${aberta && atraso > 0 ? "bg-ambar" : "bg-verde-dot"}`} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-extrabold">{aberta && atraso > 0 ? `Mensalidade atrasada há ${atraso} ${atraso === 1 ? "dia" : "dias"}` : aberta && atraso === 0 ? "Mensalidade vence hoje" : "Mensalidade em dia"}</span>
              <span className="block text-xs text-texto2 truncate">
                {aberta ? `${brl(aberta.valor)} · venc. ${ddmm(aberta.vencimento)}` : `${brl(meuPlano.valor)} · todo dia ${aluno.dia_vencimento}`} · {FORMAS_ALUNO[aluno.forma_pagamento]}
              </span>
            </span>
            <IconDir size={16} className="text-mudo" />
          </Link>
        ) : null}
      </div>
    </>
  );
}
