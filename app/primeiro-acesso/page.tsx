"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { chamarFuncao, sb } from "@/lib/supabase";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { Marca } from "@/lib/marca";

export default function PrimeiroAcesso() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    setEnviando(true);
    try {
      await chamarFuncao("acesso", { acao: "primeiro_acesso", codigo, nome, email, senha });
      const { error } = await sb().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
      if (error) throw error;
      router.replace("/");
    } catch (err: any) {
      setErro(err?.message ?? "Não deu certo. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <Marca />
        <form onSubmit={criar} className="bg-white border border-linha rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-extrabold">Primeiro acesso</h1>
            <p className="text-sm text-texto2 mt-1">Crie a conta de administrador com o código que você recebeu. Esse código só funciona uma vez.</p>
          </div>
          <Campo rotulo="Código de acesso">
            <Entrada value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="CL-XXXX-XXXX" autoCapitalize="characters" />
          </Campo>
          <Campo rotulo="Seu nome">
            <Entrada autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="E-mail">
            <Entrada type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo rotulo="Senha" dica="Pelo menos 8 caracteres.">
            <Entrada type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </Campo>
          <Campo rotulo="Repita a senha">
            <Entrada type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
          </Campo>
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
          <Botao type="submit" disabled={enviando}>{enviando ? "Criando…" : "Criar conta e entrar"}</Botao>
        </form>
        <Link href="/login" className="text-center text-[13px] font-bold text-azul-esc">Voltar para o login</Link>
      </div>
    </div>
  );
}
