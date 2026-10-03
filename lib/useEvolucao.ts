"use client";

import { useCallback, useEffect, useState } from "react";
import { sb } from "./supabase";
import { numeros } from "./store";
import type { Avaliacao, Checkin, Exercicio, Ficha, Foto, Meta, SerieFeita, TreinoFeito } from "./types";

export interface DadosEvolucao {
  avaliacoes: Avaliacao[];
  checkins: Checkin[];
  metas: Meta[];
  fotos: Foto[];
  treinos: TreinoFeito[];
  series: SerieFeita[];
  exercicios: Exercicio[];
  fichas: Ficha[];
}

const VAZIO: DadosEvolucao = { avaliacoes: [], checkins: [], metas: [], fotos: [], treinos: [], series: [], exercicios: [], fichas: [] };

/** Tudo o que o painel de evolução de um aluno precisa. */
export function useEvolucao(alunoId: string | null | undefined) {
  const [dados, setDados] = useState<DadosEvolucao>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!alunoId) return;
    const s = sb();
    try {
      const [av, ci, me, fo, tr, se, ex, fi] = await Promise.all([
        s.from("avaliacoes").select("*").eq("aluno_id", alunoId).order("data"),
        s.from("checkins").select("*").eq("aluno_id", alunoId).order("data"),
        s.from("metas").select("*").eq("aluno_id", alunoId).order("criado_em"),
        s.from("fotos").select("*").eq("aluno_id", alunoId).order("data"),
        s.from("treinos_feitos").select("*").eq("aluno_id", alunoId).order("data").limit(3000),
        s.from("series_feitas").select("*").eq("aluno_id", alunoId).order("criado_em").limit(20000),
        s.from("exercicios").select("*").order("nome"),
        s.from("fichas").select("*").eq("aluno_id", alunoId).order("ordem"),
      ]);
      const falha = [av, ci, me, fo, tr, se, ex, fi].find((r) => r.error);
      if (falha) throw falha.error;
      setDados({
        avaliacoes: numeros(av.data as Avaliacao[], ["peso", "gordura", "cintura", "quadril", "braco", "coxa", "massa_magra"]),
        checkins: numeros(ci.data as Checkin[], ["peso"]),
        metas: numeros(me.data as Meta[], ["inicio", "alvo"]),
        fotos: (fo.data ?? []) as Foto[],
        treinos: (tr.data ?? []) as TreinoFeito[],
        series: numeros(se.data as SerieFeita[], ["carga"]),
        exercicios: (ex.data ?? []) as Exercicio[],
        fichas: (fi.data ?? []) as Ficha[],
      });
      setErro(null);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível carregar a evolução.");
    } finally {
      setCarregando(false);
    }
  }, [alunoId]);

  useEffect(() => { recarregar(); }, [recarregar]);
  return { ...dados, carregando, erro, recarregar };
}
