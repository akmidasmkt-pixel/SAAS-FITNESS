"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import { sb } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import {
  IconAjustes, IconCheckin, IconClientes, IconConversa, IconDinheiro, IconEvolucao, IconHalter, IconInicio, IconMenu, IconSair, IconVideo,
} from "@/lib/icons";
import { Folha } from "./ui";
import { Contador } from "./Cabecalho";
import { Simbolo } from "@/lib/marca";

type Item = { href: string; rotulo: string; Icone: ComponentType<{ size?: number }>; qtd?: number; extra?: string[] };

const ativo = (href: string, path: string) => (href === "/" || href === "/a" ? path === href : path === href || path.startsWith(href + "/"));

function LinkMenu({ item, path, onClick }: { item: Item; path: string; onClick?: () => void }) {
  const on = ativo(item.href, path) || (item.extra ?? []).some((e) => ativo(e, path));
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className={`flex items-center gap-3 px-3 py-[9px] rounded-[10px] text-sm font-semibold ${on ? "text-azul-esc bg-azul-cl" : "text-texto2 hover:bg-fundo"}`}
    >
      <item.Icone size={20} />
      <span>{item.rotulo}</span>
      <Contador n={item.qtd ?? 0} escuro={!on} />
    </Link>
  );
}

const PLANO_NOME = { gratis: "Plano grátis", mensal: "Ilimitado mensal", anual: "Ilimitado anual", beta: "Beta" } as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const router = useRouter();
  const { perfil, personal, alunos, checkinsAbertos, totalNaoLidas } = useDados();
  const [mais, setMais] = useState(false);
  const ativos = alunos.filter((a) => a.status === "ativo").length;

  const ROTINA: Item[] = [
    { href: "/", rotulo: "Início", Icone: IconInicio },
    { href: "/alunos", rotulo: "Alunos", Icone: IconClientes, qtd: ativos },
    { href: "/conversas", rotulo: "Conversas", Icone: IconConversa, qtd: totalNaoLidas },
    { href: "/checkins", rotulo: "Check-ins", Icone: IconCheckin, qtd: checkinsAbertos.length },
  ];
  const TREINOS: Item[] = [
    { href: "/treinos", rotulo: "Montar treino", Icone: IconHalter },
    { href: "/exercicios", rotulo: "Exercícios e vídeos", Icone: IconVideo },
  ];
  const DINHEIRO: Item[] = [{ href: "/financeiro", rotulo: "Financeiro", Icone: IconDinheiro }];
  const RODAPE: Item[] = [{ href: "/ajustes", rotulo: "Ajustes", Icone: IconAjustes }];

  async function sair() {
    await sb().auth.signOut();
    router.replace("/login");
  }

  const secao = (t: string) => <span className="px-3 pt-3 pb-1 text-[11px] font-bold text-mudo uppercase tracking-[0.06em]">{t}</span>;

  return (
    <div className="min-h-dvh">
      <nav aria-label="Menu principal" className="hidden lg:flex fixed inset-y-0 left-0 w-[236px] bg-white border-r border-linha flex-col gap-0.5 px-4 py-5 overflow-y-auto">
        <div className="flex items-center gap-2.5 px-2 pb-3.5">
          <Simbolo className="h-9 w-auto shrink-0" />
          <div className="flex flex-col">
            <span className="text-[15px] font-extrabold tracking-tight">C-Level</span>
            <span className="text-[11px] font-semibold text-mudo">Personal</span>
          </div>
        </div>
        {ROTINA.map((i) => <LinkMenu key={i.href} item={i} path={path} />)}
        {secao("Treinos")}
        {TREINOS.map((i) => <LinkMenu key={i.href} item={i} path={path} />)}
        {secao("Dinheiro")}
        {DINHEIRO.map((i) => <LinkMenu key={i.href} item={i} path={path} />)}
        <div className="mt-auto flex flex-col gap-0.5 pt-4">
          {RODAPE.map((i) => <LinkMenu key={i.href} item={i} path={path} />)}
          <button type="button" onClick={sair} className="flex items-center gap-3 px-3 py-[9px] rounded-[10px] text-sm font-semibold text-texto2 hover:bg-fundo cursor-pointer">
            <IconSair size={20} />
            <span>Sair</span>
          </button>
          <div className="px-2 pt-2 text-xs text-mudo truncate">
            {perfil?.nome ? `${perfil.nome} · ` : ""}{personal ? PLANO_NOME[personal.plano] : ""}
          </div>
        </div>
      </nav>

      <main className="lg:pl-[236px] min-h-dvh">{children}</main>

      <nav aria-label="Menu" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-linha pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          <AbaMobile item={{ href: "/", rotulo: "Início", Icone: IconInicio }} path={path} />
          <AbaMobile item={{ href: "/alunos", rotulo: "Alunos", Icone: IconClientes, extra: ["/treinos"] }} path={path} />
          <AbaMobile item={{ href: "/conversas", rotulo: "Conversas", Icone: IconConversa, qtd: totalNaoLidas }} path={path} />
          <AbaMobile item={{ href: "/checkins", rotulo: "Check-ins", Icone: IconCheckin, qtd: checkinsAbertos.length }} path={path} />
          <button type="button" onClick={() => setMais(true)} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-texto2 cursor-pointer">
            <IconMenu size={22} />
            Mais
          </button>
        </div>
      </nav>

      <Folha aberta={mais} titulo="Menu" onFechar={() => setMais(false)}>
        <div className="flex flex-col gap-1">
          {[...ROTINA, ...TREINOS, ...DINHEIRO, ...RODAPE].map((i) => (
            <LinkMenu key={i.href} item={i} path={path} onClick={() => setMais(false)} />
          ))}
          <button type="button" onClick={sair} className="flex items-center gap-3 px-3 py-[9px] rounded-[10px] text-sm font-semibold text-vermelho hover:bg-fundo cursor-pointer">
            <IconSair size={20} />
            Sair
          </button>
        </div>
      </Folha>
    </div>
  );
}

function AbaMobile({ item, path }: { item: Item; path: string }) {
  const on = ativo(item.href, path) || (item.extra ?? []).some((e) => ativo(e, path));
  return (
    <Link href={item.href} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${on ? "text-azul-esc" : "text-texto2"}`}>
      <span className="relative">
        <item.Icone size={22} />
        {item.qtd ? (
          <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-azul text-white text-[10px] font-extrabold flex items-center justify-center">
            {item.qtd > 99 ? "99+" : item.qtd}
          </span>
        ) : null}
      </span>
      {item.rotulo}
    </Link>
  );
}

/** Barra de baixo do app do aluno. */
export function ShellAluno({ children }: { children: ReactNode }) {
  const path = usePathname() || "/a";
  const { totalNaoLidas } = useDados();
  const ABAS: Item[] = [
    { href: "/a", rotulo: "Hoje", Icone: IconInicio },
    { href: "/a/treino", rotulo: "Treino", Icone: IconHalter },
    { href: "/a/evolucao", rotulo: "Evolução", Icone: IconEvolucao, extra: ["/a/checkin"] },
    { href: "/a/conversa", rotulo: "Conversa", Icone: IconConversa, qtd: totalNaoLidas },
    { href: "/a/pagamentos", rotulo: "Pagamentos", Icone: IconDinheiro },
  ];
  const tela = path.startsWith("/a/treino/") || path === "/a/checkin";
  return (
    <div className="min-h-dvh max-w-[560px] mx-auto bg-fundo">
      <main className={tela ? "" : "pb-24"}>{children}</main>
      {tela ? null : (
        <nav aria-label="Menu" className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-linha pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 h-16 max-w-[560px] mx-auto">
            {ABAS.map((i) => <AbaMobile key={i.href} item={i} path={path} />)}
          </div>
        </nav>
      )}
    </div>
  );
}
