"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import type { Ficha, FichaItem, TreinoFeito } from "@/lib/types";
import { TopoAluno, TreinoPausado } from "@/components/AlunoComum";
import { Carregando, Vazio } from "@/components/ui";
import { fichaDoDia } from "@/lib/treino";
import { hoje, somaDias } from "@/lib/dates";
import { ddmm } from "@/lib/format";
import { IconDir } from "@/lib/icons";

export default function TreinosAluno() {
  const { aluno, bloqueado, meuPersonal } = useDados();
  const [fichas, setFichas] = useState<Ficha[] | null>(null);
  const [itens, setItens] = useState<FichaItem[]>([]);
  const [feitos, setFeitos] = useState<TreinoFeito[]>([]);
  useEffect(() => {
    if (!aluno) return;
    const s = sb();
    (async () => {
      const [f, t] = await Promise.all([
        s.from("fichas").select("*").eq("aluno_id", aluno.id).eq("ativa", true).order("ordem"),
        s.from("treinos_feitos").select("*").eq("aluno_id", aluno.id).gte("data", somaDias(hoje(), -60)).order("criado_em", { ascending: false }),
      ]);
      const lista = (f.data ?? []) as Ficha[];
      const i = lista.length ? await s.from("ficha_itens").select("*").in("ficha_id", lista.map((x) => x.id)) : { data: [] };
      setItens((i.data ?? []) as FichaItem[]);
      setFeitos((t.data ?? []) as TreinoFeito[]);
      setFichas(lista);
    })();
  }, [aluno]);

  if (bloqueado) return <><TopoAluno titulo="Treino" /><TreinoPausado /></>;
  if (!fichas) return <><TopoAluno titulo="Treino" /><Carregando /></>;
  const sugerida = fichaDoDia(fichas, feitos, hoje());
  return (
    <>
      <TopoAluno titulo="Meus treinos" sub={meuPersonal ? `Montados por ${meuPersonal.nome}` : undefined} />
      <div className="px-4 flex flex-col gap-3">
        {!fichas.length ? (
          <div className="bg-white border border-linha rounded-2xl"><Vazio titulo="Seu treino está sendo montado" texto={`Assim que ${meuPersonal?.nome.split(" ")[0] ?? "seu personal"} liberar, ele aparece aqui com os vídeos de cada exercício.`} /></div>
        ) : fichas.map((f) => {
          const n = itens.filter((i) => i.ficha_id === f.id).length;
          const ultimo = feitos.find((t) => t.ficha_id === f.id && t.concluido);
          return (
            <Link key={f.id} href={`/a/treino/${f.id}`} className={`bg-white border rounded-2xl p-4 flex items-center gap-3 ${sugerida?.id === f.id ? "border-azul" : "border-linha"}`}>
              <span className="flex-1 min-w-0">
                {sugerida?.id === f.id ? <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-azul text-white text-[10px] font-extrabold">SUGERIDO PARA HOJE</span> : null}
                <span className="block text-base font-extrabold truncate">{f.nome}</span>
                <span className="block text-xs text-texto2">{n} exercícios{f.dias ? ` · ${f.dias}` : ""}{ultimo ? ` · último em ${ddmm(ultimo.data)}` : ""}</span>
              </span>
              <IconDir size={18} className="text-mudo" />
            </Link>
          );
        })}
      </div>
    </>
  );
}
