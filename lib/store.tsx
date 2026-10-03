"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sb } from "./supabase";
import { hoje, somaDias } from "./dates";
import type { Aluno, Checkin, Cobranca, Exercicio, Perfil, Personal, Plano } from "./types";

export interface Dados {
  perfil: Perfil | null;
  email: string;
  // personal (e admin, que também atende alunos)
  personal: Personal | null;
  alunos: Aluno[];
  planos: Plano[];
  exercicios: Exercicio[];
  cobrancas: Cobranca[];
  checkinsAbertos: Checkin[];
  ultimoTreino: Record<string, string>;
  ultimoCheckin: Record<string, string>;
  treinosSemana: Record<string, number>;
  naoLidas: Record<string, number>;
  // aluno
  aluno: Aluno | null;
  meuPersonal: { id: string; nome: string } | null;
  meuPlano: Plano | null;
  bloqueado: boolean;
  regras: { checkin_dia: number; bloqueio_ativo: boolean; bloqueio_dias: number } | null;
}

interface Store extends Dados {
  carregando: boolean;
  erro: string | null;
  ehAluno: boolean;
  recarregar: () => Promise<void>;
  zerarNaoLidas: (alunoId: string) => void;
  totalNaoLidas: number;
}

const vazio: Dados = {
  perfil: null, email: "", personal: null, alunos: [], planos: [], exercicios: [], cobrancas: [], checkinsAbertos: [],
  ultimoTreino: {}, ultimoCheckin: {}, treinosSemana: {}, naoLidas: {}, aluno: null, meuPersonal: null, meuPlano: null, bloqueado: false, regras: null,
};

const Ctx = createContext<Store | null>(null);

export const numeros = <T,>(xs: T[] | null | undefined, campos: string[]): T[] =>
  (xs ?? []).map((x: any) => {
    const y = { ...x };
    for (const c of campos) if (y[c] != null) y[c] = Number(y[c]);
    return y;
  });

function verifica(rs: { error: any }[]) {
  const falha = rs.find((r) => r.error);
  if (falha) throw falha.error;
}

async function carregarPersonal(uid: string): Promise<Partial<Dados>> {
  const s = sb();
  await s.rpc("gerar_cobrancas");
  const hj = hoje();
  const desde = somaDias(hj, -400);
  const semana = somaDias(hj, -6);
  const [personal, alunos, planos, exercicios, cobrancas, checkins, treinos, msgs] = await Promise.all([
    s.from("personais").select("*").maybeSingle(),
    s.from("alunos").select("*").order("nome"),
    s.from("planos").select("*").order("valor"),
    s.from("exercicios").select("*").order("nome"),
    s.from("cobrancas").select("*").or(`vencimento.gte.${desde},status.eq.pendente`).order("vencimento", { ascending: false }).limit(3000),
    s.from("checkins").select("*").gte("data", somaDias(hj, -120)).order("data", { ascending: false }).limit(2000),
    s.from("treinos_feitos").select("aluno_id, data, concluido").gte("data", somaDias(hj, -90)).order("data", { ascending: false }).limit(5000),
    s.from("mensagens").select("aluno_id").is("lida_em", null).neq("autor_id", uid).limit(2000),
  ]);
  verifica([personal, alunos, planos, exercicios, cobrancas, checkins, treinos, msgs]);
  const ultimoTreino: Record<string, string> = {};
  const treinosSemana: Record<string, number> = {};
  for (const t of (treinos.data ?? []) as { aluno_id: string; data: string; concluido: boolean }[]) {
    if (!t.concluido) continue;
    if (!ultimoTreino[t.aluno_id]) ultimoTreino[t.aluno_id] = t.data;
    if (t.data >= semana) treinosSemana[t.aluno_id] = (treinosSemana[t.aluno_id] ?? 0) + 1;
  }
  const todosCheckins = numeros(checkins.data as Checkin[], ["peso"]);
  const ultimoCheckin: Record<string, string> = {};
  for (const c of todosCheckins) if (!ultimoCheckin[c.aluno_id]) ultimoCheckin[c.aluno_id] = c.data;
  const naoLidas: Record<string, number> = {};
  for (const m of (msgs.data ?? []) as { aluno_id: string }[]) naoLidas[m.aluno_id] = (naoLidas[m.aluno_id] ?? 0) + 1;
  return {
    personal: (personal.data ?? null) as Personal | null,
    regras: personal.data ? { checkin_dia: personal.data.checkin_dia, bloqueio_ativo: personal.data.bloqueio_ativo, bloqueio_dias: personal.data.bloqueio_dias } : null,
    alunos: (alunos.data ?? []) as Aluno[],
    planos: numeros(planos.data as Plano[], ["valor"]),
    exercicios: (exercicios.data ?? []) as Exercicio[],
    cobrancas: numeros(cobrancas.data as Cobranca[], ["valor", "taxa"]),
    checkinsAbertos: todosCheckins.filter((c) => !c.respondido_em),
    ultimoTreino, ultimoCheckin, treinosSemana, naoLidas,
  };
}

async function carregarAluno(uid: string): Promise<Partial<Dados>> {
  const s = sb();
  const [aluno, pers, bloq, msgs, regras] = await Promise.all([
    s.from("alunos").select("*").eq("user_id", uid).eq("status", "ativo").maybeSingle(),
    s.rpc("meu_personal"),
    s.rpc("aluno_bloqueado", {}),
    s.from("mensagens").select("aluno_id").is("lida_em", null).neq("autor_id", uid).limit(500),
    s.rpc("regras_do_personal"),
  ]);
  verifica([aluno, pers, bloq, msgs, regras]);
  const a = (aluno.data ?? null) as Aluno | null;
  let meuPlano: Plano | null = null;
  let cobrancas: Cobranca[] = [];
  if (a) {
    const [plano, cobs] = await Promise.all([
      a.plano_id ? s.from("planos").select("*").eq("id", a.plano_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      s.from("cobrancas").select("*").eq("aluno_id", a.id).order("vencimento", { ascending: false }).limit(36),
    ]);
    verifica([plano, cobs]);
    meuPlano = plano.data ? numeros([plano.data as Plano], ["valor"])[0] : null;
    cobrancas = numeros(cobs.data as Cobranca[], ["valor", "taxa"]);
  }
  const p = Array.isArray(pers.data) ? pers.data[0] : pers.data;
  const naoLidas: Record<string, number> = {};
  if (a) naoLidas[a.id] = (msgs.data ?? []).length;
  const r = Array.isArray(regras.data) ? regras.data[0] : regras.data;
  return { aluno: a, meuPersonal: p ? { id: p.id, nome: p.nome } : null, meuPlano, cobrancas, bloqueado: !!bloq.data, naoLidas, regras: r ?? null };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const uidRef = useRef<string | null>(null);

  const recarregar = useCallback(async () => {
    const s = sb();
    try {
      setErro(null);
      const { data: u } = await s.auth.getUser();
      if (!u.user) return;
      uidRef.current = u.user.id;
      const { data: perfil, error } = await s.from("perfis").select("*").maybeSingle();
      if (error) throw error;
      if (!perfil) throw new Error("Seu perfil não foi encontrado. Fale com quem te convidou.");
      const extra = perfil.papel === "aluno" ? await carregarAluno(u.user.id) : await carregarPersonal(u.user.id);
      setDados({ ...vazio, ...extra, perfil: perfil as Perfil, email: u.user.email ?? "" });
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível carregar seus dados.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  // Mensagens novas chegam em tempo real para atualizar os contadores.
  useEffect(() => {
    if (!dados.perfil) return;
    const uid = dados.perfil.id;
    const canal = sb()
      .channel("contador-mensagens")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, (p: any) => {
        const m = p.new as { aluno_id: string; autor_id: string };
        if (m.autor_id === uid) return;
        setDados((d) => ({ ...d, naoLidas: { ...d.naoLidas, [m.aluno_id]: (d.naoLidas[m.aluno_id] ?? 0) + 1 } }));
      })
      .subscribe();
    return () => { sb().removeChannel(canal); };
  }, [dados.perfil]);

  const zerarNaoLidas = useCallback((alunoId: string) => {
    setDados((d) => (d.naoLidas[alunoId] ? { ...d, naoLidas: { ...d.naoLidas, [alunoId]: 0 } } : d));
  }, []);

  const valor = useMemo<Store>(() => {
    const totalNaoLidas = Object.values(dados.naoLidas).reduce((a, b) => a + b, 0);
    return { ...dados, carregando, erro, recarregar, zerarNaoLidas, totalNaoLidas, ehAluno: dados.perfil?.papel === "aluno" };
  }, [dados, carregando, erro, recarregar, zerarNaoLidas]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDados() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDados fora do DataProvider");
  return v;
}
