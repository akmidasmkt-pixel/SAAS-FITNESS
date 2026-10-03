"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useParam } from "@/lib/useParam";
import type { Mensagem } from "@/lib/types";
import { Cabecalho, Avatar } from "@/components/Cabecalho";
import { Chat } from "@/components/Chat";
import { Entrada, Vazio } from "@/components/ui";
import { ddmm } from "@/lib/format";
import { diaLocal, hoje, horaLocal } from "@/lib/dates";
import { IconBusca, IconEsq } from "@/lib/icons";

const previa = (m: Mensagem, meu: string) =>
  (m.autor_id === meu ? "Você: " : "") + (m.tipo === "foto" ? "📷 Foto" : m.tipo === "audio" ? "🎤 Áudio" : m.tipo === "checkin" ? "Check-in enviado" : m.texto);

export default function Conversas() {
  const { alunos, naoLidas, perfil } = useDados();
  const pAluno = useParam("aluno");
  const [sel, setSel] = useState<string | null>(null);
  const [ultimas, setUltimas] = useState<Record<string, Mensagem>>({});
  const [busca, setBusca] = useState("");

  useEffect(() => { if (pAluno) setSel(pAluno); }, [pAluno]);
  useEffect(() => {
    sb().from("mensagens").select("*").order("criado_em", { ascending: false }).limit(800).then(({ data }) => {
      const r: Record<string, Mensagem> = {};
      for (const m of (data ?? []) as Mensagem[]) if (!r[m.aluno_id]) r[m.aluno_id] = m;
      setUltimas(r);
    });
    const canal = sb().channel("conversas-lista")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, (p: any) => {
        const m = p.new as Mensagem;
        setUltimas((u) => ({ ...u, [m.aluno_id]: m }));
      }).subscribe();
    return () => { sb().removeChannel(canal); };
  }, []);

  const termo = busca.trim().toLowerCase();
  const lista = useMemo(() => alunos
    .filter((a) => a.status === "ativo" && (!termo || a.nome.toLowerCase().includes(termo)))
    .sort((a, b) => (ultimas[b.id]?.criado_em ?? "").localeCompare(ultimas[a.id]?.criado_em ?? "") || a.nome.localeCompare(b.nome)), [alunos, ultimas, termo]);
  const aluno = alunos.find((a) => a.id === sel);

  return (
    <div className="flex flex-col h-dvh lg:h-dvh pb-16 lg:pb-0">
      <div className={aluno ? "hidden lg:block" : ""}>
        <Cabecalho titulo="Conversas" sub="Texto, foto e áudio com cada aluno" />
      </div>
      <div className="flex-1 min-h-0 flex">
        <aside className={`${aluno ? "hidden lg:flex" : "flex"} w-full lg:w-[340px] shrink-0 flex-col border-r border-linha bg-white min-h-0`}>
          <div className="p-3 border-b border-linha2">
            <div className="relative">
              <IconBusca size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mudo" />
              <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno" className="pl-10 h-10" aria-label="Buscar aluno" />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto rolagem-fina">
            {lista.map((a) => {
              const m = ultimas[a.id];
              const n = naoLidas[a.id] ?? 0;
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setSel(a.id)} className={`w-full flex items-center gap-3 px-3 py-3 text-left cursor-pointer ${sel === a.id ? "bg-azul-cl" : "hover:bg-fundo"}`}>
                    <Avatar nome={a.nome} tamanho={42} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${n ? "font-extrabold" : "font-bold"}`}>{a.nome}</span>
                        {m ? <span className="text-[11px] text-mudo shrink-0">{diaLocal(m.criado_em) === hoje() ? horaLocal(m.criado_em) : ddmm(diaLocal(m.criado_em))}</span> : null}
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${n ? "text-tinta font-semibold" : "text-mudo"}`}>{m ? previa(m, perfil!.id) : a.user_id ? "Nenhuma mensagem ainda" : "Sem acesso ao app"}</span>
                        {n ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-azul text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">{n}</span> : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!lista.length ? <li className="p-6 text-sm text-mudo text-center">Nenhum aluno ativo.</li> : null}
          </ul>
        </aside>
        <section className={`${aluno ? "flex" : "hidden lg:flex"} flex-1 min-w-0 flex-col min-h-0 bg-fundo`}>
          {aluno ? (
            <>
              <div className="h-14 shrink-0 bg-white border-b border-linha px-3 flex items-center gap-3">
                <button type="button" onClick={() => setSel(null)} aria-label="Voltar" className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-texto2"><IconEsq size={20} /></button>
                <Avatar nome={aluno.nome} tamanho={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold truncate">{aluno.nome}</p>
                  <p className="text-xs text-mudo truncate">{aluno.user_id ? "Com acesso ao app" : "Ainda sem acesso ao app: as mensagens ficam guardadas"}</p>
                </div>
                <Link href={`/alunos/${aluno.id}`} className="text-xs font-bold text-azul-esc whitespace-nowrap">Ver ficha</Link>
              </div>
              <div className="flex-1 min-h-0">
                <Chat key={aluno.id} alunoId={aluno.id} personalId={perfil!.id} outroNome={aluno.nome} linkCheckin={() => `/alunos/${aluno.id}?aba=checkins`} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center"><Vazio titulo="Escolha um aluno" texto="As conversas ficam guardadas aqui, com fotos e áudios." /></div>
          )}
        </section>
      </div>
    </div>
  );
}
