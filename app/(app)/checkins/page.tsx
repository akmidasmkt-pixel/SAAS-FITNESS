"use client";

import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useDados, numeros } from "@/lib/store";
import type { Checkin, Foto } from "@/lib/types";
import { Cabecalho, Conteudo } from "@/components/Cabecalho";
import { Card, Carregando, Filtros, Vazio } from "@/components/ui";
import { CheckinCard } from "@/components/ficha/AbaCheckins";
import { hoje, somaDias } from "@/lib/dates";

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export default function Checkins() {
  const { alunos, personal } = useDados();
  const [filtro, setFiltro] = useState<"abertos" | "respondidos">("abertos");
  const [lista, setLista] = useState<Checkin[] | null>(null);
  const [anteriores, setAnteriores] = useState<Checkin[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);

  const carregar = useCallback(async () => {
    const s = sb();
    const desde = somaDias(hoje(), -45);
    const [c, f] = await Promise.all([
      s.from("checkins").select("*").gte("data", somaDias(desde, -21)).order("data", { ascending: false }).limit(1000),
      s.from("fotos").select("*").eq("origem", "checkin").gte("data", desde),
    ]);
    const todos = numeros(c.data as Checkin[], ["peso"]);
    setAnteriores(todos);
    setLista(todos.filter((x) => x.data >= desde));
    setFotos((f.data ?? []) as Foto[]);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  if (!lista) return <><Cabecalho titulo="Check-ins" /><Conteudo><Carregando /></Conteudo></>;
  const abertos = lista.filter((c) => !c.respondido_em);
  const respondidos = lista.filter((c) => c.respondido_em);
  const mostrar = filtro === "abertos" ? abertos : respondidos;
  const anteriorDe = (c: Checkin) => anteriores.find((x) => x.aluno_id === c.aluno_id && x.data < c.data) ?? null;

  return (
    <>
      <Cabecalho titulo="Check-ins" sub={`Os alunos recebem o lembrete toda ${DIAS[personal?.checkin_dia ?? 6]} · mude em Ajustes`} />
      <Conteudo>
        <Filtros opcoes={[{ valor: "abertos" as const, rotulo: "Para responder", qtd: abertos.length }, { valor: "respondidos" as const, rotulo: "Respondidos", qtd: respondidos.length }]}
          valor={filtro} onChange={(v) => setFiltro(v)} />
        {!mostrar.length ? (
          <Card>
            <Vazio titulo={filtro === "abertos" ? "Nenhum check-in esperando resposta" : "Nenhum check-in respondido nas últimas semanas"}
              texto={filtro === "abertos" ? "Quando um aluno enviar peso, fotos e recado da semana, aparece aqui." : undefined} />
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2 items-start">
            {mostrar.map((c) => (
              <CheckinCard key={c.id} c={c} anterior={anteriorDe(c)} fotos={fotos} aluno={alunos.find((a) => a.id === c.aluno_id)} mostrarAluno onRespondido={carregar} />
            ))}
          </div>
        )}
      </Conteudo>
    </>
  );
}
