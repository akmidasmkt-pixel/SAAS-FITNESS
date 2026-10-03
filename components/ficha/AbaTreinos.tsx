"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import type { Aluno, Ficha, FichaItem, TreinoFeito } from "@/lib/types";
import { Botao, Card, CardTopo, Carregando, Vazio } from "../ui";
import { ddmm, ddmmaa } from "@/lib/format";
import { IconVideo } from "@/lib/icons";

export function AbaTreinos({ aluno }: { aluno: Aluno }) {
  const { exercicios } = useDados();
  const [fichas, setFichas] = useState<Ficha[] | null>(null);
  const [itens, setItens] = useState<FichaItem[]>([]);
  const [feitos, setFeitos] = useState<TreinoFeito[]>([]);

  useEffect(() => {
    const s = sb();
    (async () => {
      const [f, t] = await Promise.all([
        s.from("fichas").select("*").eq("aluno_id", aluno.id).order("ordem"),
        s.from("treinos_feitos").select("*").eq("aluno_id", aluno.id).order("criado_em", { ascending: false }).limit(15),
      ]);
      const lista = (f.data ?? []) as Ficha[];
      const i = lista.length ? await s.from("ficha_itens").select("*").in("ficha_id", lista.map((x) => x.id)).order("ordem") : { data: [] };
      setItens((i.data ?? []) as FichaItem[]);
      setFeitos((t.data ?? []) as TreinoFeito[]);
      setFichas(lista);
    })();
  }, [aluno.id]);

  if (!fichas) return <Carregando />;
  const ex = (id: string) => exercicios.find((e) => e.id === id);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] items-start">
      <Card>
        <CardTopo titulo="Treinos montados" sub={`${fichas.filter((f) => f.ativa).length} ativos`}
          direita={<Link href={`/alunos/${aluno.id}/treino`} className="text-xs font-bold text-azul-esc">Editar →</Link>} />
        {!fichas.length ? (
          <Vazio titulo="Nenhum treino ainda" texto="Monte os treinos (A, B, C…) com séries, cargas e descanso. O aluno vê no app com os vídeos."
            acao={<Link href={`/alunos/${aluno.id}/treino`}><Botao>Montar treino</Botao></Link>} />
        ) : (
          <div className="px-4 sm:px-5 pb-4 flex flex-col gap-4">
            {fichas.map((f) => {
              const lista = itens.filter((i) => i.ficha_id === f.id);
              return (
                <div key={f.id} className={`rounded-xl border border-linha ${f.ativa ? "" : "opacity-60"}`}>
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-linha2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold truncate">{f.nome}</p>
                      <p className="text-xs text-mudo">{lista.length} exercícios{f.dias ? ` · ${f.dias}` : ""}{f.valida_ate ? ` · até ${ddmm(f.valida_ate)}` : ""}{f.ativa ? "" : " · inativo"}</p>
                    </div>
                  </div>
                  <ul className="divide-y divide-linha2">
                    {lista.map((i) => {
                      const e = ex(i.exercicio_id);
                      const temVideo = !!(e?.video_caminho || e?.video_link);
                      return (
                        <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          <IconVideo size={16} className={temVideo ? "text-azul" : "text-[#c9c8c3]"} aria-label={temVideo ? "Com vídeo" : "Sem vídeo"} />
                          <span className="flex-1 min-w-0 truncate font-semibold">{e?.nome ?? "Exercício"}</span>
                          <span className="text-texto2 text-xs whitespace-nowrap">{i.series} × {i.repeticoes}{i.carga ? ` · ${i.carga}` : ""}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            <p className="text-xs text-mudo">O ícone azul indica exercício com vídeo; o cinza, ainda sem vídeo (o aluno vê “vídeo em breve”).</p>
          </div>
        )}
      </Card>
      <Card>
        <CardTopo titulo="Treinos feitos" sub="Os mais recentes" />
        {feitos.length ? (
          <ul className="px-4 sm:px-5 pb-4 flex flex-col divide-y divide-linha2">
            {feitos.map((t) => (
              <li key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{fichas.find((f) => f.id === t.ficha_id)?.nome ?? "Treino"}</span>
                  <span className="block text-xs text-mudo">{ddmmaa(t.data)}{t.duracao_min ? ` · ${t.duracao_min} min` : ""}</span>
                </span>
                <span className={`text-xs font-bold ${t.concluido ? "text-verde" : "text-ambar-txt"}`}>{t.concluido ? "Concluído" : "Incompleto"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-mudo">Nenhum treino registrado ainda.</p>
        )}
      </Card>
    </div>
  );
}
