"use client";

import Link from "next/link";
import { useDados } from "@/lib/store";
import { TopoAluno } from "@/components/AlunoComum";
import { PainelEvolucao } from "@/components/Evolucao";
import { IconCheckin } from "@/lib/icons";

export default function EvolucaoAluno() {
  const { aluno, meuPersonal } = useDados();
  if (!aluno) return null;
  return (
    <>
      <TopoAluno titulo="Minha evolução" sub={meuPersonal ? `${aluno.nome.split(" ")[0]} · com ${meuPersonal.nome}` : undefined}
        direita={<Link href="/a/checkin" className="h-10 px-3.5 rounded-full bg-azul text-white text-sm font-bold inline-flex items-center gap-1.5 hover:text-white"><IconCheckin size={16} /> Check-in</Link>} />
      <div className="px-4">
        <PainelEvolucao aluno={aluno} personalNome={meuPersonal?.nome ?? "seu personal"} visao="aluno" />
      </div>
    </>
  );
}
