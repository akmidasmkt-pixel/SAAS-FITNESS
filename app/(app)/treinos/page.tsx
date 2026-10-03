"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { Cabecalho, Conteudo, Avatar } from "@/components/Cabecalho";
import { Card, Entrada, Vazio, Botao } from "@/components/ui";
import { ddmm } from "@/lib/format";
import { IconBusca, IconDir } from "@/lib/icons";

export default function Treinos() {
  const { alunos } = useDados();
  const [fichas, setFichas] = useState<{ aluno_id: string; ativa: boolean; atualizado_em: string; valida_ate: string | null }[] | null>(null);
  const [busca, setBusca] = useState("");
  useEffect(() => {
    sb().from("fichas").select("aluno_id, ativa, atualizado_em, valida_ate").then(({ data }) => setFichas((data ?? []) as typeof fichas & object));
  }, []);
  const ativos = alunos.filter((a) => a.status === "ativo" && (!busca.trim() || a.nome.toLowerCase().includes(busca.trim().toLowerCase())));
  const info = (id: string) => {
    const fs = (fichas ?? []).filter((f) => f.aluno_id === id);
    const ultima = fs.map((f) => f.atualizado_em).sort().pop();
    return { n: fs.filter((f) => f.ativa).length, ultima };
  };
  const ordenados = [...ativos].sort((a, b) => info(a.id).n - info(b.id).n || a.nome.localeCompare(b.nome));

  return (
    <>
      <Cabecalho titulo="Montar treino" sub="Escolha o aluno" />
      <Conteudo>
        <div className="relative max-w-md">
          <IconBusca size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mudo" />
          <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno" className="pl-10" aria-label="Buscar aluno" />
        </div>
        <Card>
          {!ordenados.length ? (
            <Vazio titulo="Nenhum aluno ativo" texto="Cadastre um aluno para montar o treino." acao={<Link href="/alunos?novo=1"><Botao>Cadastrar aluno</Botao></Link>} />
          ) : (
            <ul className="divide-y divide-linha2">
              {ordenados.map((a) => {
                const i = info(a.id);
                return (
                  <li key={a.id}>
                    <Link href={`/alunos/${a.id}/treino`} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-fundo">
                      <Avatar nome={a.nome} tamanho={38} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-bold truncate">{a.nome}</span>
                        <span className={`block text-xs ${i.n ? "text-mudo" : "text-ambar-txt font-bold"}`}>
                          {fichas == null ? "…" : i.n ? `${i.n} ${i.n === 1 ? "treino ativo" : "treinos ativos"}${i.ultima ? ` · atualizado ${ddmm(i.ultima.slice(0, 10))}` : ""}` : "Sem treino montado"}
                        </span>
                      </span>
                      <IconDir size={16} className="text-mudo" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Conteudo>
    </>
  );
}
