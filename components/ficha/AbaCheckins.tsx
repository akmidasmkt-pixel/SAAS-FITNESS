"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Aluno, Checkin, Foto } from "@/lib/types";
import { urlsAssinadas } from "@/lib/arquivos";
import { num } from "@/lib/evolucao";
import { ddmmaa, ddmm } from "@/lib/format";
import { horaLocal } from "@/lib/dates";
import { AreaTexto, Botao, Card, CardTopo, Carregando, Vazio } from "../ui";
import { Avatar } from "../Cabecalho";

const NOTA = ["", "Ruim", "Fraco", "Ok", "Bom", "Ótimo"];

/** Um check-in com fotos, comparação com a semana anterior e resposta do personal. */
export function CheckinCard({ c, anterior, fotos, aluno, mostrarAluno = false, onRespondido }: {
  c: Checkin; anterior?: Checkin | null; fotos: Foto[]; aluno?: Aluno; mostrarAluno?: boolean; onRespondido?: () => void;
}) {
  const { perfil, recarregar } = useDados();
  const { avisar } = useUi();
  const [resposta, setResposta] = useState(c.resposta);
  const [enviando, setEnviando] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const minhas = fotos.filter((f) => f.aluno_id === c.aluno_id && f.data === c.data);

  useEffect(() => {
    if (!minhas.length) return;
    urlsAssinadas("fotos", minhas.map((f) => f.caminho)).then(setUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minhas.map((f) => f.caminho).join("|")]);

  async function responder() {
    const t = resposta.trim();
    if (!t) return;
    setEnviando(true);
    try {
      const s = sb();
      const { error } = await s.from("checkins").update({ resposta: t, respondido_em: new Date().toISOString() }).eq("id", c.id);
      if (error) throw error;
      await s.from("mensagens").insert({ personal_id: perfil!.id, aluno_id: c.aluno_id, tipo: "texto", texto: `Sobre o seu check-in de ${ddmm(c.data)}:\n${t}` });
      avisar("Resposta enviada. O aluno vê na conversa.");
      await recarregar();
      onRespondido?.();
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    } finally {
      setEnviando(false);
    }
  }

  const dPeso = c.peso != null && anterior?.peso != null ? c.peso - anterior.peso : null;
  const item = (rotulo: string, valor: string, sub?: string) => (
    <div className="rounded-xl bg-fundo px-3 py-2.5 flex flex-col">
      <span className="text-[10px] font-bold text-mudo uppercase tracking-[0.05em]">{rotulo}</span>
      <span className="text-[15px] font-extrabold tabular-nums">{valor}</span>
      {sub ? <span className="text-[11px] font-semibold text-texto2">{sub}</span> : null}
    </div>
  );

  return (
    <Card>
      <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {mostrarAluno && aluno ? <Avatar nome={aluno.nome} tamanho={38} /> : null}
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold truncate">
              {mostrarAluno && aluno ? <Link href={`/alunos/${aluno.id}?aba=checkins`} className="hover:underline">{aluno.nome}</Link> : `Check-in de ${ddmmaa(c.data)}`}
            </p>
            <p className="text-xs text-mudo">{mostrarAluno ? `${ddmmaa(c.data)} · ` : ""}enviado às {horaLocal(c.criado_em)}</p>
          </div>
        </div>
        <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap ${c.respondido_em ? "bg-verde-cl text-verde" : "bg-azul-cl text-azul-esc"}`}>
          {c.respondido_em ? "Respondido" : "Para responder"}
        </span>
      </div>
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {item("Peso", c.peso != null ? `${num(c.peso)} kg` : "—", dPeso != null ? `${dPeso === 0 ? "igual" : `${num(Math.abs(dPeso))} kg a ${dPeso < 0 ? "menos" : "mais"}`} na semana` : undefined)}
          {item("Treinos", c.treinos_feitos != null ? String(c.treinos_feitos) : "—", "na semana")}
          {item("Sono", c.sono ? `${c.sono}/5` : "—", c.sono ? NOTA[c.sono] : undefined)}
          {item("Energia", c.energia ? `${c.energia}/5` : "—", c.energia ? NOTA[c.energia] : undefined)}
        </div>
        {c.dor ? <p className="text-sm font-semibold text-vermelho bg-vermelho-cl rounded-xl px-3.5 py-2.5">Sentiu dor{c.dor_texto ? `: ${c.dor_texto}` : ""}</p> : null}
        {c.recado ? <p className="text-sm bg-fundo rounded-xl px-3.5 py-2.5 whitespace-pre-wrap">“{c.recado}”</p> : null}
        {minhas.length ? (
          <div className="grid grid-cols-3 gap-2">
            {minhas.map((f) => (
              <button key={f.id} type="button" onClick={() => urls[f.caminho] && setAmpliada(urls[f.caminho])} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#eceae5] cursor-zoom-in">
                {urls[f.caminho] ? <img src={urls[f.caminho]} alt={`Foto ${f.angulo}`} className="absolute inset-0 w-full h-full object-cover" /> : null}
                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold capitalize">{f.angulo}</span>
              </button>
            ))}
          </div>
        ) : null}
        {c.respondido_em ? (
          <div className="rounded-xl border border-linha px-3.5 py-2.5">
            <p className="text-[11px] font-bold text-mudo uppercase tracking-[0.05em]">Sua resposta · {ddmm(c.respondido_em.slice(0, 10))}</p>
            <p className="text-sm whitespace-pre-wrap mt-1">{c.resposta}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AreaTexto value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Escreva o retorno da semana: o que melhorou, o que ajustar…" aria-label="Resposta ao check-in" />
            <div className="flex justify-end"><Botao onClick={responder} disabled={enviando || !resposta.trim()}>{enviando ? "Enviando…" : "Responder"}</Botao></div>
          </div>
        )}
      </div>
      {ampliada ? (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setAmpliada(null)} role="dialog" aria-label="Foto">
          <img src={ampliada} alt="Foto do check-in" className="max-w-full max-h-full object-contain" />
        </div>
      ) : null}
    </Card>
  );
}

export function AbaCheckins({ aluno }: { aluno: Aluno }) {
  const [lista, setLista] = useState<Checkin[] | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const carregar = () => {
    const s = sb();
    Promise.all([
      s.from("checkins").select("*").eq("aluno_id", aluno.id).order("data", { ascending: false }).limit(52),
      s.from("fotos").select("*").eq("aluno_id", aluno.id).eq("origem", "checkin"),
    ]).then(([c, f]) => {
      setLista(((c.data ?? []) as Checkin[]).map((x) => ({ ...x, peso: x.peso != null ? Number(x.peso) : null })));
      setFotos((f.data ?? []) as Foto[]);
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [aluno.id]);

  if (!lista) return <Carregando />;
  if (!lista.length) {
    return (
      <Card>
        <CardTopo titulo="Check-ins semanais" />
        <Vazio titulo="Nenhum check-in ainda" texto={`Toda semana ${aluno.nome.split(" ")[0]} recebe um lembrete para mandar peso, fotos, sono, energia e recado. Eles aparecem aqui para você responder.`} />
      </Card>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      {lista.map((c, i) => <CheckinCard key={c.id} c={c} anterior={lista[i + 1] ?? null} fotos={fotos} onRespondido={carregar} />)}
    </div>
  );
}
