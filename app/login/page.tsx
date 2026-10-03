"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { chamarFuncao, sb } from "@/lib/supabase";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { Marca } from "@/lib/marca";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [esqueci, setEsqueci] = useState(false);

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => { if (data.session) router.replace("/"); });
    chamarFuncao<{ precisa_primeiro_acesso: boolean }>("acesso", { acao: "status" })
      .then((r) => setPrimeiroAcesso(!!r.precisa_primeiro_acesso))
      .catch(() => {});
  }, [router]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (!email.trim() || !senha) return setErro("Preencha e-mail e senha.");
    setEntrando(true);
    const { error } = await sb().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    setEntrando(false);
    if (error) return setErro(/invalid login/i.test(error.message) ? "E-mail ou senha incorretos." : error.message);
    router.replace("/");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <Marca />
        <form onSubmit={entrar} className="bg-white border border-linha rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-extrabold">Entrar</h1>
            <p className="text-sm text-texto2 mt-1">Treinos, evolução, conversa e pagamentos com seu personal.</p>
          </div>
          <Campo rotulo="E-mail">
            <Entrada type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo rotulo="Senha">
            <Entrada type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </Campo>
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
          <Botao type="submit" disabled={entrando}>{entrando ? "Entrando…" : "Entrar"}</Botao>
          <button type="button" onClick={() => setEsqueci((v) => !v)} className="text-[13px] font-bold text-azul-esc self-center cursor-pointer">
            Esqueci minha senha
          </button>
          {esqueci ? <Aviso>Peça ao seu personal para gerar uma nova senha pelo app. Personais: peçam à Agência C-Level.</Aviso> : null}
        </form>
        {primeiroAcesso ? (
          <Link href="/primeiro-acesso" className="text-center text-[13px] font-bold text-azul-esc">
            Primeiro acesso do administrador
          </Link>
        ) : null}
        <p className="text-center text-xs text-mudo">Beta fechado · Agência C-Level</p>
      </div>
    </div>
  );
}
