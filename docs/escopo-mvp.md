# Escopo da primeira versão (MVP)

*Etapa 1 da skill app-da-dor-ao-ar. Decisões tomadas em 03/10/2026. Nome provisório: **C-Level Personal**.*

## A dor

Hoje o personal trainer usa uma ferramenta para cada parte do trabalho:
- treino na MFIT ou numa planilha;
- conversa no WhatsApp;
- cobrança na Hotmart (cerca de 10% por venda), em Pix manual ou numa carteira cara (2,59% no Pix da MFIT);
- acompanhamento em formulários soltos.

O app junta **treino, acompanhamento, conversa e cobrança do aluno** num lugar só. O diferencial é a cobrança recorrente com taxa baixa e o bloqueio automático do treino quando o aluno atrasa.

## Quem usa

| Perfil | O que faz | Como entra |
|---|---|---|
| **Administrador (agência)** | Libera personais durante o beta | Código de primeiro acesso |
| **Personal** (sozinho, sem equipe) | Cadastra alunos, monta treinos, responde chat e check-ins, cobra | Convite do administrador |
| **Aluno** | Vê e registra o treino, assiste aos vídeos, faz check-in, conversa e paga | Convite do personal, com mensagem pronta para mandar no WhatsApp |

O app é o mesmo para os três perfis, instalável no celular. Cada perfil vê a sua parte.

## Preços e taxas (decididos)

**Assinatura do personal**

| Plano | Alunos | Preço |
|---|---|---|
| Grátis | 1 | R$ 0 |
| Ilimitado anual | ilimitado | R$ 49,90/mês (R$ 598,80/ano, em 12x no cartão ou à vista no Pix) |
| Ilimitado mensal | ilimitado | R$ 59,90/mês, sem fidelidade |

**Taxa sobre o que o personal recebe dos alunos** (descontada do valor recebido, via Asaas)

| Meio | Asaas cobra | Nossa comissão (split) | Personal paga no total |
|---|---|---|---|
| Pix e boleto | R$ 1,99 | R$ 1,99 | **R$ 3,98** (sempre o dobro do Asaas) |
| Cartão | 2,99% + R$ 0,49 | 1,5% | **4,49% + R$ 0,49** |

Exemplo: numa mensalidade de R$ 200, o personal paga R$ 3,98 no Pix. Na MFIT pagaria R$ 5,18; na Hotmart, cerca de R$ 22.

*Assumido:* nos 3 primeiros meses de cada subconta o Asaas cobra R$ 0,99 no Pix. Nesse período nossa comissão acompanha e fica em R$ 0,99, mantendo a regra do "dobro".

## O que entra na primeira versão

1. **Alunos:** cadastro com objetivo, observações e WhatsApp; convite para o app; status de cada aluno (em dia, atrasado, bloqueado, check-in pendente).
2. **Biblioteca de exercícios com vídeo do próprio personal:**
   - lista base em português, separada por grupo muscular (vem das Fichas de treino);
   - o personal pode criar exercícios próprios;
   - o vídeo de cada exercício entra por upload ou por link (YouTube);
   - um filtro mostra os exercícios "sem vídeo".
3. **Montagem de treino:**
   - fichas A, B, C… com séries × repetições, carga, descanso e observação;
   - duplicar uma ficha e copiar para outro aluno;
   - enviar pelo WhatsApp continua disponível.
4. **App do aluno:**
   - treino do dia com o vídeo de cada exercício;
   - registro de carga e repetições por série;
   - cronômetro de descanso;
   - histórico de cargas.
5. **Anamnese e avaliação física:**
   - questionário de entrada (PAR-Q, lesões, rotina, objetivo);
   - medidas (peso, % de gordura, circunferências);
   - fotos padronizadas (frente, lado, costas).
   - A primeira avaliação vira o **marco zero** da evolução do aluno.
6. **Check-in semanal:**
   - o aluno responde peso, sono, adesão e energia e manda fotos;
   - o personal recebe e responde numa caixa de entrada;
   - o personal escolhe o dia do check-in.
7. **Linha do tempo e evolução (time-lapse)**, acessível para todos os alunos e também visível para o personal:
   - **Linha do tempo:** do marco zero até hoje, com os marcos em ordem de data: avaliações, check-ins com foto, recordes de carga e metas atingidas.
   - **Time-lapse das fotos:** um player passa as fotos em sequência (frente, lado ou costas), com a data e as medidas mudando junto. O aluno vê o corpo mudando semana a semana.
   - **Antes e depois:** um controle deslizante compara quaisquer duas datas, lado a lado ou sobrepostas.
   - **Painel "Minha evolução":**
     - destaques desde o início (ex.: −6,2 kg, −4,1% de gordura, −8 cm de cintura);
     - gráficos de peso, % de gordura e medidas;
     - frequência de treinos, com sequência de semanas;
     - recordes de carga por exercício.
   - **Foto sempre no mesmo ângulo:** a câmera mostra a silhueta da foto anterior em transparência, para o aluno repetir a mesma pose e distância e o time-lapse ficar alinhado.
   - **Card de evolução:** o aluno pode salvar ou compartilhar a própria imagem de antes e depois.
   - **Privacidade:** as fotos ficam privadas. Só o aluno e o seu personal veem.
8. **Chat** entre personal e aluno:
   - texto, foto e áudio, em tempo real;
   - do chat, o personal abre direto o treino e o último check-in daquele aluno.
9. **Cobrança recorrente (Asaas):**
   - **Conta de recebimento:** o personal abre a subconta Asaas dentro do app, com CPF ou CNPJ, e faz a verificação de identidade por um link.
   - **Planos para alunos:** o personal cria os próprios planos (ex.: Consultoria mensal, R$ 200) e assina cada aluno num plano.
   - **Meios de pagamento:**

     | Meio | Para quem |
     |---|---|
     | Pix Automático | personal com CNPJ |
     | Cartão recorrente | qualquer personal |
     | Pix ou boleto mensal com lembretes | qualquer personal |

   - **Avisos de vencimento:** antes e depois do vencimento, no app e por e-mail.
   - **Bloqueio automático:** o treino do aluno trava 5 dias após o vencimento e destrava sozinho quando ele paga. O personal pode mudar o prazo ou desligar o bloqueio.
   - **Financeiro:** recebido, a receber, em atraso e extrato com a taxa de cada cobrança.
10. **Assinatura do personal:**
    - tela de planos e limite de 1 aluno no plano grátis;
    - a cobrança real da assinatura entra quando o beta terminar.
11. **Notificações no celular:** mensagem nova, check-in recebido e pagamento, com o app instalado na tela de início.

## Fora da primeira versão (fica para depois do beta)

- Nutrição/dieta. Prescrever dieta é atribuição do nutricionista; o caminho é o modelo multiprofissional.
- Agenda de aulas presenciais.
- Copiloto IA para montar treino.
- Studio com vários personais.
- Vídeo da execução no chat.
- WhatsApp pela API oficial.
- Integração com relógios (Apple Health, Health Connect).
- App com a marca do personal.
- Marketplace para captar alunos.
- Biblioteca de vídeos licenciada.
- Exportar o time-lapse como vídeo (na primeira versão ele roda dentro do app e o card sai como imagem).
- O personal usar fotos de alunos na própria divulgação (exige autorização do aluno registrada no app).

## Telas

### Personal
1. **Início:** alunos ativos, check-ins para responder, mensagens novas, recebido no mês, a receber, em atraso e o cartão "Comece por aqui".
2. **Alunos:** lista com busca e status.
3. **Aluno:** abas Evolução · Treinos · Avaliação · Check-ins · Financeiro · Conversa. A aba Evolução mostra o mesmo painel com time-lapse que o aluno vê.
4. **Montar treino:** a ficha e o seletor de exercícios com vídeo.
5. **Exercícios:** a biblioteca, os vídeos e o filtro "sem vídeo".
6. **Avaliação:** anamnese, medidas e fotos padronizadas, com a câmera guiada pela silhueta da foto anterior.
7. **Check-ins:** caixa de entrada e configuração do questionário.
8. **Conversas:** lista de conversas e o chat.
9. **Financeiro:** planos para alunos, cobranças do mês, atrasos e extrato.
10. **Conta de recebimento:** abertura da subconta Asaas e status da verificação.
11. **Minha assinatura:** Grátis · Anual · Mensal.
12. **Ajustes:** perfil, regra de bloqueio, instalar o app e convites (só o administrador).

### Aluno
1. **Hoje:** treino do dia, check-in pendente, próxima mensalidade e um destaque da evolução.
2. **Treino em execução:** vídeo, séries com carga e repetições, descanso.
3. **Minha evolução:**
   - painel com os destaques desde o marco zero e os gráficos;
   - time-lapse das fotos;
   - antes e depois;
   - linha do tempo com os marcos;
   - recordes de carga;
   - card para compartilhar.
4. **Check-in semanal:** a câmera com a silhueta guia.
5. **Conversa com o personal.**
6. **Pagamentos:** Pix copia e cola ou QR, autorizar o Pix Automático, cartão e histórico.
7. **Treino pausado:** tela de bloqueio com o botão para pagar.

## Riscos e pontos a confirmar

- **Asaas:**
  - a conta principal precisa ser PJ;
  - há uma taxa por subconta criada (valor só aparece no painel);
  - é preciso confirmar se o Pix Automático funciona em subconta com split;
  - o modo white label precisa ser alinhado com o gerente de contas;
  - o contrato precisa estar adequado à Resolução Conjunta 16/2025 até 31/12/2026.
- **Pix Automático:** o recebedor provavelmente precisa ter CNPJ. Para o personal só com CPF, a cobrança automática é pelo cartão.
- **Armazenamento:** vídeos, fotos e áudios ocupam espaço. Na etapa 3 vamos definir limites (ex.: vídeo de exercício com até 60 s) e o custo.
- **Bloqueio do treino:** precisa estar no contrato entre personal e aluno. O app oferece um texto pronto.
- **Fotos do corpo e medidas** contam como dados de saúde pela LGPD (dados sensíveis):
  - guardadas em área privada, com acesso só do aluno e do seu personal;
  - consentimento do aluno no primeiro acesso;
  - opção de apagar as fotos.
