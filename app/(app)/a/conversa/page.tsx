"use client";

import { useDados } from "@/lib/store";
import { Chat } from "@/components/Chat";
import { Avatar } from "@/components/Cabecalho";

export default function ConversaAluno() {
  const { aluno, meuPersonal } = useDados();
  if (!aluno) return null;
  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(64px+env(safe-area-inset-bottom))] max-w-[560px] mx-auto flex flex-col bg-fundo">
      <header className="shrink-0 bg-white border-b border-linha px-4 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 flex items-center gap-3">
        <Avatar nome={meuPersonal?.nome ?? "?"} tamanho={38} />
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold truncate">{meuPersonal?.nome ?? "Seu personal"}</p>
          <p className="text-xs text-mudo">Seu personal · responde por aqui</p>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <Chat alunoId={aluno.id} personalId={aluno.personal_id} outroNome={meuPersonal?.nome ?? "seu personal"} linkCheckin={() => "/a/checkin"} />
      </div>
    </div>
  );
}
