"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sb, mensagemErro } from "@/lib/supabase";
import { useDados } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { Exercicio, Grupo } from "@/lib/types";
import { GRUPOS } from "@/lib/types";
import { apagar, enviar, idYoutube, nomeArquivo } from "@/lib/arquivos";
import { Cabecalho, Conteudo } from "@/components/Cabecalho";
import { AreaTexto, Aviso, Barra, Botao, Campo, Card, Entrada, Filtros, Folha, Segmentado, Selecao, Vazio } from "@/components/ui";
import { VideoExercicio } from "@/components/Midia";
import { IconBusca, IconMais, IconVideo } from "@/lib/icons";

type Filtro = "todos" | "sem_video" | "com_video" | "ocultos";
const LIMITE_MB = 50;

export default function Exercicios() {
  const { exercicios } = useDados();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [grupo, setGrupo] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Exercicio | "novo" | null>(null);

  const ativos = exercicios.filter((e) => e.ativo);
  const comVideo = ativos.filter((e) => e.video_caminho || e.video_link).length;
  const termo = busca.trim().toLowerCase();
  const lista = useMemo(() => exercicios.filter((e) => {
    const tem = !!(e.video_caminho || e.video_link);
    if (filtro === "ocultos" ? e.ativo : !e.ativo) return false;
    if (filtro === "sem_video" && tem) return false;
    if (filtro === "com_video" && !tem) return false;
    if (grupo !== "Todos" && e.grupo !== grupo) return false;
    return !termo || e.nome.toLowerCase().includes(termo);
  }), [exercicios, filtro, grupo, termo]);

  const porGrupo = GRUPOS.map((g) => ({ g, itens: lista.filter((e) => e.grupo === g) })).filter((x) => x.itens.length);

  return (
    <>
      <Cabecalho titulo="Exercícios e vídeos" sub={`${comVideo} de ${ativos.length} com vídeo`}
        acoes={<Botao onClick={() => setEditando("novo")}><IconMais size={18} /> <span className="hidden sm:inline">Novo exercício</span></Botao>} />
      <Conteudo>
        <Card className="p-4 sm:p-5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">Vídeos gravados por você</p>
            <span className="text-sm font-extrabold tabular-nums">{ativos.length ? Math.round((comVideo / ativos.length) * 100) : 0}%</span>
          </div>
          <Barra pct={ativos.length ? (comVideo / ativos.length) * 100 : 0} />
          <p className="text-xs text-mudo">
            Grave de 10 a 30 segundos mostrando a execução, na vertical. Envie o arquivo do celular (até {LIMITE_MB} MB) ou cole um link do YouTube.
            No iPhone, para o vídeo abrir em qualquer celular, use Ajustes › Câmera › Formatos › “Mais compatível”.
          </p>
        </Card>
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <IconBusca size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mudo" />
            <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício" className="pl-10" aria-label="Buscar exercício" />
          </div>
          <Filtros opcoes={[
            { valor: "todos" as Filtro, rotulo: "Todos", qtd: ativos.length },
            { valor: "sem_video" as Filtro, rotulo: "Sem vídeo", qtd: ativos.length - comVideo },
            { valor: "com_video" as Filtro, rotulo: "Com vídeo", qtd: comVideo },
            { valor: "ocultos" as Filtro, rotulo: "Ocultos", qtd: exercicios.length - ativos.length },
          ]} valor={filtro} onChange={(v) => setFiltro(v)} />
          <Filtros opcoes={["Todos", ...GRUPOS].map((g) => ({ valor: g, rotulo: g }))} valor={grupo} onChange={(v) => setGrupo(v)} />
        </div>
        {!porGrupo.length ? (
          <Card><Vazio titulo="Nenhum exercício com esse filtro" acao={<Botao onClick={() => setEditando("novo")}>Cadastrar exercício</Botao>} /></Card>
        ) : (
          porGrupo.map(({ g, itens }) => (
            <Card key={g}>
              <div className="px-4 sm:px-5 pt-4 pb-1 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold">{g}</h2>
                <span className="text-xs font-bold text-mudo">{itens.filter((e) => e.video_caminho || e.video_link).length}/{itens.length} com vídeo</span>
              </div>
              <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-4 px-2 sm:px-3 pb-3">
                {itens.map((e) => {
                  const tem = !!(e.video_caminho || e.video_link);
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => setEditando(e)} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left hover:bg-fundo cursor-pointer">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tem ? "bg-azul-cl text-azul-esc" : "bg-linha2 text-[#b0afa9]"}`}><IconVideo size={18} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold truncate">{e.nome}</span>
                          <span className={`block text-xs ${tem ? "text-mudo" : "text-ambar-txt font-semibold"}`}>{e.video_caminho ? "Vídeo enviado" : e.video_link ? (idYoutube(e.video_link) ? "YouTube" : "Link") : "Gravar vídeo"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))
        )}
      </Conteudo>
      <ExercicioFolha alvo={editando} onFechar={() => setEditando(null)} />
    </>
  );
}

function ExercicioFolha({ alvo, onFechar }: { alvo: Exercicio | "novo" | null; onFechar: () => void }) {
  const { perfil, recarregar } = useDados();
  const { avisar } = useUi();
  const atual = alvo && alvo !== "novo" ? alvo : null;
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<Grupo>("Peito");
  const [dica, setDica] = useState("");
  const [modo, setModo] = useState<"arquivo" | "link">("arquivo");
  const [link, setLink] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tirarVideo, setTirarVideo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previaUrl, setPreviaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!alvo) return;
    setNome(atual?.nome ?? ""); setGrupo(atual?.grupo ?? "Peito"); setDica(atual?.dica ?? "");
    setLink(atual?.video_link ?? ""); setModo(atual?.video_link ? "link" : "arquivo"); setArquivo(null); setTirarVideo(false); setErro("");
  }, [alvo, atual]);

  useEffect(() => {
    if (!arquivo) { setPreviaUrl(null); return; }
    const u = URL.createObjectURL(arquivo);
    setPreviaUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  function escolherArquivo(f: File | undefined) {
    setErro("");
    if (!f) return;
    if (f.size > LIMITE_MB * 1024 * 1024) return setErro(`O vídeo tem ${Math.round(f.size / 1024 / 1024)} MB. O limite é ${LIMITE_MB} MB: grave mais curto ou use um link do YouTube.`);
    if (!/^video\/(mp4|quicktime|webm|x-m4v)$/.test(f.type)) return setErro("Formato não aceito. Use MP4, MOV ou WEBM.");
    setArquivo(f);
  }

  async function salvar() {
    setErro("");
    const n = nome.trim();
    if (!n) return setErro("Dê um nome ao exercício.");
    const l = link.trim();
    if (modo === "link" && l && !/^https:\/\//.test(l)) return setErro("O link precisa começar com https://");
    setSalvando(true);
    try {
      const s = sb();
      let video_caminho = atual?.video_caminho ?? null;
      let video_link = atual?.video_link ?? null;
      const antigo = video_caminho;
      if (modo === "arquivo" && arquivo) {
        const ext = arquivo.type === "video/quicktime" ? "mov" : arquivo.type === "video/webm" ? "webm" : "mp4";
        video_caminho = await enviar("videos", `${perfil!.id}/${nomeArquivo(ext)}`, arquivo, arquivo.type);
        video_link = null;
      } else if (modo === "link") {
        video_link = l || null;
        if (l) video_caminho = null;
      }
      if (tirarVideo) { video_caminho = null; video_link = null; }
      const linha = { nome: n, grupo, dica: dica.trim(), video_caminho, video_link };
      const r = atual ? await s.from("exercicios").update(linha).eq("id", atual.id) : await s.from("exercicios").insert(linha);
      if (r.error) {
        if (video_caminho && video_caminho !== antigo) await apagar("videos", [video_caminho]);
        throw r.error;
      }
      if (antigo && antigo !== video_caminho) await apagar("videos", [antigo]);
      await recarregar();
      avisar(atual ? "Exercício salvo." : "Exercício cadastrado.");
      onFechar();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function ocultar(ativo: boolean) {
    if (!atual) return;
    const { error } = await sb().from("exercicios").update({ ativo }).eq("id", atual.id);
    if (error) return setErro(mensagemErro(error));
    await recarregar();
    avisar(ativo ? "Exercício de volta à lista." : "Exercício oculto. Treinos que já usam continuam funcionando.");
    onFechar();
  }

  async function excluir() {
    if (!atual || !confirm(`Excluir ${atual.nome}?`)) return;
    const { error } = await sb().from("exercicios").delete().eq("id", atual.id);
    if (error) return setErro(/foreign key|23503/.test(error.message) ? "Esse exercício está em algum treino. Use “Ocultar” para tirar da lista sem quebrar os treinos." : mensagemErro(error));
    if (atual.video_caminho) await apagar("videos", [atual.video_caminho]);
    await recarregar();
    avisar("Exercício excluído.");
    onFechar();
  }

  const mostrar = tirarVideo ? null : arquivo ? { video_caminho: null, video_link: null, nome } : modo === "link" && link.trim() ? { video_caminho: null, video_link: link.trim(), nome } : atual;

  return (
    <Folha aberta={!!alvo} titulo={atual ? "Editar exercício" : "Novo exercício"} onFechar={onFechar} largura="max-w-xl"
      rodape={<><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao onClick={salvar} disabled={salvando}>{salvando ? (arquivo ? "Enviando vídeo…" : "Salvando…") : "Salvar"}</Botao></>}>
      <div className="flex flex-col gap-3.5">
        <div className="grid sm:grid-cols-[1fr_160px] gap-3">
          <Campo rotulo="Nome"><Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Agachamento búlgaro" /></Campo>
          <Campo rotulo="Grupo">
            <Selecao value={grupo} onChange={(e) => setGrupo(e.target.value as Grupo)}>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</Selecao>
          </Campo>
        </div>
        <Campo rotulo="Vídeo demonstrativo">
          <Segmentado rotulo="Origem do vídeo" opcoes={[{ valor: "arquivo", rotulo: "Enviar do celular" }, { valor: "link", rotulo: "Link do YouTube" }]} valor={modo} onChange={(v) => setModo(v as "arquivo" | "link")} />
        </Campo>
        {modo === "arquivo" ? (
          <>
            <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*" className="hidden" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
            <Botao variante="secundario" onClick={() => inputRef.current?.click()}><IconVideo size={18} /> {arquivo ? "Trocar vídeo" : atual?.video_caminho ? "Substituir vídeo" : "Gravar ou escolher vídeo"}</Botao>
            {arquivo ? <p className="text-xs text-mudo">{arquivo.name} · {(arquivo.size / 1024 / 1024).toFixed(1)} MB</p> : null}
          </>
        ) : (
          <Entrada value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/shorts/…" inputMode="url" />
        )}
        {previaUrl ? (
          <video src={previaUrl} controls playsInline muted className="w-full max-h-80 rounded-xl bg-black" />
        ) : mostrar && (mostrar.video_caminho || mostrar.video_link) ? (
          <VideoExercicio exercicio={mostrar} compacto />
        ) : null}
        {atual && (atual.video_caminho || atual.video_link) && !arquivo ? (
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" checked={tirarVideo} onChange={(e) => setTirarVideo(e.target.checked)} className="w-5 h-5 accent-[#b3261e]" /> Remover o vídeo atual
          </label>
        ) : null}
        <Campo rotulo="Dica de execução (aparece para o aluno)"><AreaTexto value={dica} onChange={(e) => setDica(e.target.value)} placeholder="Ex.: joelho alinhado com o pé, desça em 3 segundos" /></Campo>
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        {atual ? (
          <div className="flex gap-2 pt-2 border-t border-linha2">
            <Botao variante="fantasma" className="flex-1" onClick={() => ocultar(!atual.ativo)}>{atual.ativo ? "Ocultar da lista" : "Mostrar na lista"}</Botao>
            <Botao variante="perigo" className="flex-1" onClick={excluir}>Excluir</Botao>
          </div>
        ) : null}
      </div>
    </Folha>
  );
}
