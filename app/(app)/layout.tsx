"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sb, mensagemErro } from "@/lib/supabase";
import { DataProvider, useDados } from "@/lib/store";
import { UiProvider } from "@/lib/ui";
import { Shell, ShellAluno } from "@/components/Shell";
import { Aviso, Botao, Campo, Carregando, Entrada } from "@/components/ui";
import { Marca } from "@/lib/marca";
import { brl } from "@/lib/format";
import { FORMAS_ALUNO } from "@/lib/cobranca";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const s = sb();
    s.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setOk(true);
    });
    const { data: sub } = s.auth.onAuthStateChange((_evento, sessao) => {
      if (!sessao) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ok) return <Carregando />;
  return (
    <DataProvider>
      <UiProvider>
        <Portao>{children}</Portao>
      </UiProvider>
    </DataProvider>
  );
}

function Portao({ children }: { children: ReactNode }) {
  const { carregando, erro, perfil, recarregar, ehAluno, aluno } = useDados();
  const path = usePathname() || "/";
  const router = useRouter();
  const naAreaAluno = path === "/a" || path.startsWith("/a/");

  useEffect(() => {
    if (!perfil || perfil.trocar_senha) return;
    if (ehAluno && !naAreaAluno) router.replace("/a");
    if (!ehAluno && naAreaAluno) router.replace("/");
  }, [perfil, ehAluno, naAreaAluno, router]);

  if (carregando) return <Carregando />;
  if (erro && !perfil) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-sm w-full flex flex-col gap-3 text-center">
          <p className="font-extrabold">Não foi possível carregar seus dados.</p>
          <p className="text-sm text-texto2">{erro}</p>
          <Botao onClick={() => recarregar()}>Tentar de novo</Botao>
          <Botao variante="fantasma" onClick={() => sb().auth.signOut()}>Sair</Botao>
        </div>
      </div>
    );
  }
  if (perfil?.trocar_senha) return <TrocarSenha />;
  if (ehAluno) {
    if (!aluno) return <AcessoEncerrado />;
    if (!aluno.consentimento_em) return <Consentimento />;
    if (!naAreaAluno) return <Carregando />;
    return <ShellAluno>{children}</ShellAluno>;
  }
  if (naAreaAluno) return <Carregando />;
  return <Shell>{children}</Shell>;
}

function TelaCentral({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white border border-linha rounded-2xl p-6 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function TrocarSenha() {
  const { recarregar, perfil } = useDados();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    setSalvando(true);
    const { error } = await sb().auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      return setErro(/different|same/i.test(error.message) ? "Escolha uma senha diferente da temporária." : "Não foi possível trocar a senha: " + error.message);
    }
    await sb().from("perfis").update({ trocar_senha: false }).eq("id", perfil!.id);
    await recarregar();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <form onSubmit={salvar} className="w-full max-w-sm bg-white border border-linha rounded-2xl p-6 flex flex-col gap-4">
        <Marca />
        <div>
          <h1 className="text-lg font-extrabold">Crie sua senha</h1>
          <p className="text-sm text-texto2 mt-1">Você entrou com uma senha temporária. Escolha uma senha só sua para continuar.</p>
        </div>
        <Campo rotulo="Nova senha" dica="Pelo menos 8 caracteres.">
          <Entrada type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>
        <Campo rotulo="Repita a senha">
          <Entrada type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        </Campo>
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <Botao type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar e entrar"}</Botao>
      </form>
    </div>
  );
}

function AcessoEncerrado() {
  return (
    <TelaCentral>
      <Marca />
      <h1 className="text-lg font-extrabold">Seu acesso está pausado</h1>
      <p className="text-sm text-texto2 leading-relaxed">
        Seu personal encerrou ou pausou o acompanhamento por aqui. Se achar que é um engano, fale com ele.
      </p>
      <Botao variante="secundario" onClick={() => sb().auth.signOut()}>Sair</Botao>
    </TelaCentral>
  );
}

function Consentimento() {
  const { aluno, meuPersonal, meuPlano, recarregar } = useDados();
  const [marcado, setMarcado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const nomePersonal = meuPersonal?.nome ?? "seu personal";
  const primeiro = nomePersonal.split(" ")[0];

  async function aceitar() {
    setSalvando(true);
    const { error } = await sb().rpc("registrar_consentimento");
    if (error) {
      setSalvando(false);
      return setErro(mensagemErro(error));
    }
    await recarregar();
  }

  return (
    <TelaCentral>
      <Marca />
      <div>
        <h1 className="text-lg font-extrabold">Bem-vindo, {aluno!.nome.split(" ")[0]}!</h1>
        <p className="text-sm text-texto2 mt-1">Antes de começar com {nomePersonal}, leia como funciona.</p>
      </div>
      {meuPlano ? (
        <div className="rounded-xl bg-fundo border border-linha p-4 flex flex-col gap-1.5 text-sm">
          <span className="text-[11px] font-bold text-mudo uppercase tracking-[0.05em]">Seu plano</span>
          <span className="font-extrabold">{meuPlano.nome} · {brl(meuPlano.valor)}/mês</span>
          <span className="text-texto2">Vencimento todo dia {aluno!.dia_vencimento} · {FORMAS_ALUNO[aluno!.forma_pagamento]}</span>
          <span className="text-texto2">
            Se a mensalidade atrasar, você recebe lembretes. Depois de alguns dias de atraso, o acesso aos treinos pode ser pausado até o pagamento cair; nada se perde.
          </span>
        </div>
      ) : null}
      <ul className="text-sm text-texto2 leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
        <li>Suas fotos, medidas e respostas ficam privadas: só você e {primeiro} veem.</li>
        <li>Os dados servem apenas para o seu acompanhamento. Nada é vendido nem divulgado.</li>
        <li>Você pode pedir a exclusão dos seus dados a qualquer momento, falando com {primeiro}.</li>
        <li>Os treinos e orientações não substituem acompanhamento médico. Se sentir algo fora do normal, pare e avise.</li>
      </ul>
      <label className="flex items-start gap-3 text-sm font-semibold cursor-pointer">
        <input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#2a78d6]" />
        <span>Li e concordo com o uso dos meus dados para o acompanhamento{meuPlano ? " e com as regras do plano" : ""}.</span>
      </label>
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      <Botao disabled={!marcado || salvando} onClick={aceitar}>{salvando ? "Salvando…" : "Concordo e quero começar"}</Botao>
    </TelaCentral>
  );
}
