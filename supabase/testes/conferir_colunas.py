import re, glob, json
COL = {
"alunos":"id,personal_id,user_id,nome,email,whatsapp,cpf,nascimento,objetivo,observacoes,status,plano_id,dia_vencimento,forma_pagamento,inicio_cobranca,consentimento_em,convidado_em,criado_em",
"anamneses":"aluno_id,personal_id,parq_ok,parq_obs,lesoes,rotina,objetivo_texto,medicamentos,atualizado_em",
"avaliacoes":"id,personal_id,aluno_id,data,peso,gordura,cintura,quadril,braco,coxa,massa_magra,observacoes,criado_em",
"checkins":"id,personal_id,aluno_id,data,peso,sono,energia,treinos_feitos,dor,dor_texto,recado,resposta,respondido_em,criado_em",
"cobrancas":"id,personal_id,aluno_id,plano_id,descricao,valor,vencimento,competencia,status,forma,taxa,pago_em,asaas_id,pix_copia_cola,link_pagamento,criado_em",
"exercicios":"id,personal_id,nome,grupo,video_caminho,video_link,dica,proprio,ativo,criado_em",
"ficha_itens":"id,personal_id,ficha_id,exercicio_id,ordem,series,repeticoes,carga,descanso,observacao",
"fichas":"id,personal_id,aluno_id,nome,dias,ordem,valida_ate,ativa,criado_em,atualizado_em",
"fotos":"id,personal_id,aluno_id,data,angulo,caminho,origem,criado_em",
"mensagens":"id,personal_id,aluno_id,autor_id,tipo,texto,arquivo,duracao_seg,checkin_id,lida_em,criado_em",
"metas":"id,personal_id,aluno_id,medida,inicio,alvo,criado_em",
"perfis":"id,nome,papel,trocar_senha,onboarding_ok,criado_em",
"personais":"id,plano,bloqueio_ativo,bloqueio_dias,lembrete_antes,lembrete_dia,lembrete_depois,avisar_whatsapp,checkin_dia,asaas_status,asaas_conta_id,asaas_wallet_id,asaas_onboarding_url,asaas_tipo,asaas_doc_final,asaas_criada_em,criado_em",
"planos":"id,personal_id,nome,valor,descricao,ativo,criado_em",
"push_inscricoes":"id,user_id,endpoint,p256dh,auth,criado_em",
"series_feitas":"id,personal_id,aluno_id,treino_id,exercicio_id,serie,carga,repeticoes,criado_em",
"treinos_feitos":"id,personal_id,aluno_id,ficha_id,data,concluido,duracao_min,criado_em",
}
COL = {k:set(v.split(",")) for k,v in COL.items()}
# colunas que o app pode gravar (permissões por coluna)
GRAV = {
 "personais": {"bloqueio_ativo","bloqueio_dias","lembrete_antes","lembrete_dia","lembrete_depois","avisar_whatsapp","checkin_dia"},
 "alunos_ins": {"personal_id","nome","email","whatsapp","cpf","nascimento","objetivo","observacoes","status","plano_id","dia_vencimento","forma_pagamento","inicio_cobranca"},
 "alunos_upd": {"nome","email","whatsapp","cpf","nascimento","objetivo","observacoes","status","plano_id","dia_vencimento","forma_pagamento","inicio_cobranca"},
 "checkins_upd": {"resposta","respondido_em"},
 "mensagens_upd": {"lida_em"},
 "cobrancas_ins": {"personal_id","aluno_id","plano_id","descricao","valor","vencimento","forma","competencia"},
 "cobrancas_upd": {"descricao","valor","vencimento","status","forma","pago_em"},
 "perfis_upd": {"nome","trocar_senha","onboarding_ok"},
}
problemas = []
arquivos = [f for f in glob.glob("app/**/*.tsx", recursive=True) + glob.glob("components/**/*.tsx", recursive=True) + glob.glob("lib/**/*.ts*", recursive=True)]
for f in arquivos:
    s = open(f).read()
    for m in re.finditer(r'\.from\("([a-z_]+)"\)', s):
        t = m.group(1)
        if t not in COL: problemas.append(f"{f}: tabela {t} não existe"); continue
        # cadeia até o fim da expressão (até ; ou linha em branco), limitada
        trecho = s[m.end(): m.end()+1200]
        cortes = [x.start() for x in [re.search(r'\.from\("', trecho), re.search(r';', trecho), re.search(r'\),\s*\n', trecho), re.search(r'\]\)', trecho)] if x]
        if cortes: trecho = trecho[:min(cortes)]
        for op, col in re.findall(r'\.(eq|neq|is|in|gte|lte|lt|gt|order|not)\("([a-z_]+)"', trecho):
            if col not in COL[t]: problemas.append(f"{f}: {t}.{col} ({op}) não existe")
        for sel in re.findall(r'\.select\("([^"]+)"', trecho):
            for c in [x.strip() for x in sel.split(",")]:
                if c in ("*",) or "(" in c or c == "id": continue
                c = c.split(":")[0]
                if c not in COL[t]: problemas.append(f"{f}: {t}.{c} (select) não existe")
        for oc in re.findall(r'onConflict: "([^"]+)"', trecho):
            for c in oc.split(","):
                if c not in COL[t]: problemas.append(f"{f}: {t}.{c} (onConflict) não existe")
        for op in ("insert", "update", "upsert"):
            for mm in re.finditer(r'\.' + op + r'\(\{', trecho):
                # pega o objeto literal (nível 1)
                i = mm.end(); prof = 1; j = i
                while j < len(trecho) and prof:
                    if trecho[j] == "{": prof += 1
                    elif trecho[j] == "}": prof -= 1
                    j += 1
                obj = trecho[i:j-1]
                chaves = set()
                prof = 0; tok = ""
                for parte in re.split(r',(?![^{(\[]*[})\]])', obj):
                    km = re.match(r'\s*\.\.\.', parte)
                    if km: continue
                    km = re.match(r'\s*([a-z_]+)\s*(:|$)', parte)
                    if km: chaves.add(km.group(1))
                for c in chaves:
                    if c not in COL[t]: problemas.append(f"{f}: {t}.{c} ({op}) não existe")
                chave_perm = {"personais": "personais", "alunos": f"alunos_{'ins' if op=='insert' else 'upd'}", "checkins": "checkins_upd" if op=="update" else None,
                              "mensagens": "mensagens_upd" if op=="update" else None, "cobrancas": f"cobrancas_{'ins' if op=='insert' else 'upd'}", "perfis": "perfis_upd"}.get(t)
                if chave_perm and chave_perm in GRAV:
                    for c in chaves:
                        if c in COL[t] and c not in GRAV[chave_perm]: problemas.append(f"{f}: {t}.{c} ({op}) sem permissão de gravação")
print("\n".join(sorted(set(problemas))) or "nenhum problema")
print(len(arquivos), "arquivos conferidos")
