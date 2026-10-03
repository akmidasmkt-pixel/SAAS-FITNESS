#!/usr/bin/env python3
"""Publica um app na Vercel pelo MCP quando o sandbox não alcança a API da Vercel.

Divide os arquivos do projeto em lotes de texto (~38 mil caracteres) para caberem numa
chamada `create_deployment` cada, e gera as referências {file, sha, size} dos lotes já
enviados. A Vercel guarda cada arquivo pelo SHA1 do conteúdo: se um arquivo foi transcrito
com qualquer diferença, a próxima publicação que o referenciar pelo SHA local falha com
`missing_files` apontando exatamente qual arquivo corrigir.

Uso (rodar na raiz do projeto, depois de `next build` passar):
  python3 lotes_deploy.py plano            # lista os lotes e os binários
  python3 lotes_deploy.py inline 0         # objetos {file, encoding, data} do lote 0
  python3 lotes_deploy.py refs 2           # referências {file, sha, size} dos lotes 0 e 1
  python3 lotes_deploy.py todos            # referências de TODOS os arquivos (+ binários)
  python3 lotes_deploy.py manifesto        # sha1, tamanho e caminho de cada arquivo

Caracteres fora do ASCII e do Latin-1 (−, —, …, “ ”, →, ·) saem como \\uXXXX no JSON:
o JSON decodifica para o caractere certo e evita trocar "−" (U+2212) por "-" ao copiar.
"""
import hashlib
import json
import os
import re
import sys

LIMITE = 38000  # caracteres de JSON por lote
IGNORAR_DIRS = {"node_modules", ".next", ".git", ".vercel", "out"}
IGNORAR_ARQS = {"package-lock.json", "next-env.d.ts", ".DS_Store"}
BINARIOS = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf", ".pdf", ".mp4")

RAIZ = os.getcwd()


def arquivos():
    lista = []
    for base, dirs, nomes in os.walk(RAIZ):
        dirs[:] = sorted(d for d in dirs if d not in IGNORAR_DIRS)
        for n in sorted(nomes):
            if n in IGNORAR_ARQS or n.endswith(".tsbuildinfo"):
                continue
            lista.append(os.path.relpath(os.path.join(base, n), RAIZ).replace(os.sep, "/"))
    return lista


def info(caminho):
    b = open(os.path.join(RAIZ, caminho), "rb").read()
    return hashlib.sha1(b).hexdigest(), len(b), b


def escapar(texto):
    j = json.dumps(texto, ensure_ascii=False)
    return re.sub(r"[^\x00-\x7eÀ-ÿ]", lambda m: "\\u%04x" % ord(m.group(0)), j)


def lotes():
    textos = [a for a in arquivos() if not a.lower().endswith(BINARIOS)]
    grupos, atual, tamanho = [], [], 0
    for a in textos:
        t = len(escapar(info(a)[2].decode("utf-8")))
        if atual and tamanho + t > LIMITE:
            grupos.append(atual)
            atual, tamanho = [], 0
        atual.append(a)
        tamanho += t
    if atual:
        grupos.append(atual)
    return grupos


def binarios():
    return [a for a in arquivos() if a.lower().endswith(BINARIOS)]


def ref(a):
    sha, tam, _ = info(a)
    return {"file": a, "sha": sha, "size": tam}


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "plano"
    g = lotes()
    if cmd == "plano":
        for i, l in enumerate(g):
            tam = sum(len(escapar(info(a)[2].decode("utf-8"))) for a in l)
            print(f"lote {i}: {len(l)} arquivos, {tam} caracteres")
            for a in l:
                print("   ", a)
        bs = binarios()
        if bs:
            print("binários (enviar à parte com upload_file ou trocar por SVG/código):")
            for a in bs:
                print("   ", a, ref(a))
    elif cmd == "inline":
        for a in g[int(sys.argv[2])]:
            corpo = info(a)[2].decode("utf-8")
            print('{"file": ' + json.dumps(a) + ', "encoding": "utf-8", "data": ' + escapar(corpo) + "},")
    elif cmd == "refs":
        n = int(sys.argv[2])
        print(json.dumps([ref(a) for l in g[:n] for a in l], ensure_ascii=False))
    elif cmd == "todos":
        print(json.dumps([ref(a) for l in g for a in l] + [ref(a) for a in binarios()], ensure_ascii=False))
    elif cmd == "manifesto":
        for a in arquivos():
            sha, tam, _ = info(a)
            print(sha, tam, a)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
