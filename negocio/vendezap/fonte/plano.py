"""Gera VendeZap_Plano_30_Dias.pdf. Rode: python3 plano.py"""
import svg as S
from comum import tabela, pagina_html, render_pdf, AQUI

DESTINO = AQUI.parent / "VendeZap_Plano_30_Dias.pdf"
EXTRA = """
@page{ @bottom-left{ content:"VendeZap · Plano de 30 dias · 1 hora por dia"; } }
.dias td:first-child{ font-weight:800; color:var(--navy); white-space:nowrap; }
.gate{ background:var(--navy); color:#fff; border-radius:3mm; padding:3mm 4.5mm; margin:2mm 0 4mm; break-inside:avoid; }
.gate b{ color:#9fd0ff; }
.msgbox{ border:1px solid var(--line); border-left:1.4mm solid var(--aqua); border-radius:2mm; padding:3mm 4mm; margin:2mm 0 4mm; background:#fbfffd; break-inside:avoid; }
.msgbox .q{ font-size:7.8pt; font-weight:700; color:var(--navy); text-transform:uppercase; letter-spacing:.03em; margin-bottom:1mm; }
"""


def semana(titulo, sub, dias, gate):
    linhas = [[f"Dia {d}", t, ok] for d, t, ok in dias]
    return (f'<h2>{titulo}</h2><p class="small">{sub}</p>' +
            tabela(["Dia", "O que fazer na sua 1 hora", "Pronto quando…"], linhas, classe="dias") +
            f'<div class="gate">🚦 <b>Portão da semana:</b> {gate}</div>')


def construir():
    P = []
    P.append(f'''<section>
<div class="band" style="break-before:auto;"><div class="num">30</div><div><div class="bt">Plano de 30 dias do VendeZap</div><div class="bd">Uma tarefa por dia, cabendo em 1 hora. Acompanha o Guia Completo — os números de fase (F1…F13) apontam para lá.</div></div></div>
<h2>Como usar este plano</h2>
<ul><li><b>Uma tarefa por dia, 60 minutos.</b> Se terminar antes, pare. Se não terminar, continue no dia seguinte — não faça duas horas para “compensar”.</li>
<li><b>Os portões (🚦) mandam mais que o calendário.</b> Se o portão da semana não foi cumprido, repita a semana em vez de avançar.</li>
<li><b>Nada é pago antes do Dia 21</b>, e só se houver piloto fechado. Até lá o gasto máximo é ≈ R$ 30 (crédito na OpenAI, se ainda não tiver).</li>
<li><b>Atenção ao realismo:</b> a parte técnica (Dias 22 a 27) pode demorar mais, principalmente se a Meta pedir verificação da empresa. Se o piloto só entrar no ar no dia 35 ou 45, está tudo bem — o importante é não pular os portões.</li></ul>
<figure>{S.linha_tempo([("Semana 1", "preservar e|verificar (F1–F3)"), ("Semana 2", "entrevistar|barbearias (F4)"), ("Semana 3", "oferta e|piloto (F5–F6)"), ("Semana 4", "preparar e|ligar (F6–F10)")])}<figcaption>Visão geral das quatro semanas.</figcaption></figure>
<h2>Os quatro portões</h2>
{tabela(["Fim da", "Passa se…", "Se não passar…"], [
    ["Semana 1", "Backup em 2 lugares + demonstração respondendo 4 de 5 perguntas", "Peça ajuda a um assistente de IA com as mensagens de erro; repita a semana"],
    ["Semana 2", "10+ entrevistas e 3+ donos dispostos a testar", "Mais 10 visitas; se ainda não, teste salões de beleza"],
    ["Semana 3", "1 piloto combinado por escrito, com valor e data", "Reveja preço/oferta (Guia, Seção 4). Não contrate servidor"],
    ["Semana 4", "Bia respondendo no número dedicado, com o PC desligado, aprovada pelo dono", "Continue as Fases 8–10 nos próximos dias; avise o dono da nova data"],
])}
</section>''')

    P.append('<section class="pg">' + semana(
        "Semana 1 · Preservar e verificar", "Objetivo: saber o que você tem e não perder nada. Gasto: R$ 0.",
        [(1, "<b>Backup (F3).</b> Feche ponte e Langflow → compacte a pasta do VendeZap → exporte o fluxo da Bia sem chaves → guarde no pen drive e numa pasta privada da nuvem.", "Os 2 backups existem e você abriu o .zip para conferir."),
         (2, "<b>Inventário (F1).</b> Anote o caminho da pasta, se existem <code>package.json</code> e <code>.env</code>, como o Langflow abre. No PowerShell: <code>node -v</code> e <code>npm -v</code>.", "Folha de anotações preenchida."),
         (3, "<b>Conta OpenAI.</b> Em platform.openai.com: veja o gasto (Usage), ponha um teto mensal baixo (ex.: US$ 10) e anote o nome do modelo no bloco OpenAI do fluxo.", "Teto configurado e modelo anotado."),
         (4, "<b>Testar a demonstração (F2).</b> Ligue tudo como sempre fez; de outro celular, mande as 5 perguntas (preço, horário, endereço, pedido de horário, assunto aleatório).", "Tabela com: respondeu? tempo? certo?"),
         (5, "<b>Resolver o que falhou.</b> Copie as mensagens de erro (sem chaves) para um assistente de IA de programação e peça a causa. Não apague nada. Se pedir QR Code, só reconecte com o SEU chip de teste e com o backup feito.", "Demonstração respondendo 4 de 5, ou lista clara do que falta."),
         (6, "<b>Roteiro de 20 perguntas (F10).</b> Escreva 10 comuns, 5 difíceis, 3 fora do assunto, 2 “quero falar com alguém”. Rode na demonstração e marque certo/errado.", "Nota de 0 a 20 registrada."),
         (7, "<b>Revisão.</b> Leia de novo as Seções 1 e 2 do guia. Grave um vídeo de tela da demonstração funcionando (para mostrar nas visitas mesmo se a internet falhar).", "Vídeo salvo no celular.")],
        "backup em 2 lugares e demonstração respondendo pelo menos 4 de 5 perguntas.") + '</section>')

    P.append('<section class="pg">' + semana(
        "Semana 2 · Entrevistar barbearias", "Objetivo: descobrir se a dor existe e quanto vale. Você está pesquisando, não vendendo. Gasto: R$ 0 (só deslocamento).",
        [(8, "<b>Lista.</b> No Google Maps, 20 barbearias num raio de 3 km. Planilha: nome, endereço, Instagram, telefone, nota no Google.", "20 linhas preenchidas."),
         (9, "<b>Preparar.</b> Imprima ou salve no celular as perguntas da p. 6. Ensaie a abertura em voz alta 3 vezes.", "Você fala a abertura sem ler."),
         (10, "<b>Visitas 1–3</b> (terça a quinta, 14h–16h). Pergunte sobre comportamento real; mostre o vídeo só no fim.", "3 entrevistas anotadas."),
         (11, "<b>Visitas 4–6.</b>", "6 entrevistas."),
         (12, "<b>Visitas 7–9.</b>", "9 entrevistas."),
         (13, "<b>Visitas 10–12</b> + mensagem de agradecimento por WhatsApp para todos (modelo na p. 6).", "12 entrevistas."),
         (14, "<b>Analisar.</b> Média de conversas por dia, quem responde, o que já pagam, interesse 0–3. Separe os donos com interesse 2 ou 3.", "Lista dos interessados.")],
        "pelo menos 10 entrevistas e 3 donos com interesse real (nota 2–3). “Achei legal” não conta; conta “eu testaria”.") + '</section>')

    P.append('<section class="pg">' + semana(
        "Semana 3 · Oferta e piloto", "Objetivo: um dono que aceite pagar (mesmo pouco). Gasto: R$ 0.",
        [(15, "<b>Proposta.</b> Com um assistente de IA, adapte o texto de proposta (p. 7) e o termo simples (Guia, Seção 4) para o seu nome e o seu Pix.", "Proposta e termo prontos."),
         (16, "<b>Volta ao interessado nº 1.</b> Ofereça o piloto de 30 dias por R$ 49 (ou 14 dias grátis e R$ 147 a partir do 2º mês).", "Resposta sim/não/talvez anotada."),
         (17, "<b>Interessado nº 2.</b>", "Idem."),
         (18, "<b>Interessado nº 3</b> + follow-up dos “talvez” (modelo na p. 7).", "Idem."),
         (19, "<b>Coletar a ficha</b> do piloto: serviços, preços, duração, horários, endereço, pagamento, o que a Bia nunca deve dizer, número pessoal para os avisos.", "Ficha completa e conferida pelo dono."),
         (20, "<b>Começar a conta da Meta (F6).</b> Crie o portfólio empresarial em business.facebook.com. A verificação pode levar dias — por isso começa já.", "Conta criada; verificação solicitada se pedida."),
         (21, "<b>Decisão.</b> Piloto fechado e combinado por escrito? Então, e só então, siga para a Semana 4.", "Mensagem do dono confirmando valor e data.")],
        "1 piloto combinado por escrito (valor + data de início). Sem isso, não contrate servidor nem chip — volte à Semana 2 com o que aprendeu.") + '</section>')

    P.append('<section class="pg">' + semana(
        "Semana 4 · Preparar e ligar o piloto", "Objetivo: a Bia atendendo no número dedicado, com o seu PC desligado. Gasto: ≈ R$ 90–130 (servidor mensal + chip + uso).",
        [(22, "<b>Número dedicado (F6).</b> Compre o chip; registre-o no app de desenvolvedor da Meta com o produto WhatsApp; envie a mensagem de teste pelo painel.", "A mensagem de teste chega no seu celular."),
         (23, "<b>Servidor (F7).</b> Contrate VPS de 4 GB no plano MENSAL (ex.: Hostinger KVM 1). Guarde IP e senha num gerenciador de senhas.", "Painel mostra o servidor “ativo”."),
         (24, "<b>Instalação, parte 1 (F8)</b> com um assistente de IA de programação: ele inspeciona o servidor e propõe os passos; você aprova cada comando.", "Ponte e Langflow (ou substituto) rodando no servidor."),
         (25, "<b>Instalação, parte 2.</b> Domínio/subdomínio + HTTPS + webhook cadastrado na Meta.", "Mensagem no número dedicado chega ao servidor."),
         (26, "<b>Segurança e alertas (F9).</b> Reinício automático, monitor gratuito, backup diário, teto de gasto. Faça o teste de queda proposital.", "Você recebe o alerta e o serviço volta sozinho."),
         (27, "<b>Teste das 20 perguntas (F10)</b> com a ficha real do piloto. Ajuste até ter 18/20 e zero preço inventado.", "≥ 18/20."),
         (28, "<b>Aprovação do dono.</b> Ele faz 10 perguntas dele e aprova por escrito. Combine o dia de divulgar o número.", "“Pode ligar” por escrito."),
         (29, "<b>No ar (F11).</b> O dono divulga o número; você lê todas as conversas do dia (15 min) e corrige o que precisar.", "Primeiras conversas reais respondidas."),
         (30, "<b>Revisão do mês.</b> Preencha a planilha com os números reais (conversas/dia, gasto OpenAI, gasto Meta). Decida: seguir, ajustar preço ou mudar o nicho.", "Decisão anotada, com o motivo.")],
        "Bia respondendo no número dedicado com o PC desligado, aprovada pelo dono. Se a parte técnica atrasar, avise o dono da nova data — não ligue nada às pressas.") + '</section>')

    perguntas = ["Quantas mensagens novas de clientes chegam por dia no WhatsApp? E no sábado?",
                 "Quem responde? Em que momento — entre um corte e outro?",
                 "Alguma vez você perdeu cliente porque demorou a responder? Lembra da última vez?",
                 "Usa algum app de agenda? Qual? Quanto paga por mês? O que te irrita nele?",
                 "Quais perguntas você mais responde? (preço, horário, endereço…)",
                 "Se alguém respondesse essas perguntas por você e só te chamasse para confirmar horário, o que mudaria no seu dia?",
                 "Quanto você acha justo pagar por isso por mês? (anote o número que ele disser, sem discutir)",
                 "Toparia testar por 30 dias com um número de agendamento separado?"]
    P.append(f'''<section class="pg"><h2>Mensagens prontas</h2>
<p class="small">Adapte ao seu jeito de falar. Nunca mande mensagem em massa nem para quem não conversou com você antes — além de irritar, é o tipo de uso que faz a Meta bloquear números.</p>
<div class="msgbox"><div class="q">Abertura na visita (falada)</div>“Oi, tudo bem? Meu nome é ___, moro aqui no bairro. Estou fazendo uma pesquisa rápida com barbearias sobre como vocês dão conta do WhatsApp no dia a dia. Não estou vendendo nada hoje — são 5 minutinhos, pode ser agora ou volto noutro horário?”</div>
<h3>Perguntas da entrevista (sobre o que ele já faz, não sobre o futuro)</h3><ol>{"".join(f"<li>{p}</li>" for p in perguntas)}</ol>
<div class="msgbox"><div class="q">WhatsApp depois da visita (mesmo dia)</div>“Oi ___, aqui é o ___, da pesquisa de hoje na barbearia. Obrigado pelos minutos! Como prometi, este é o vídeo da assistente que eu mostrei: [vídeo]. Se fizer sentido testar, me avisa por aqui. Abraço!”</div>
<div class="msgbox"><div class="q">Se ele pedir para saber mais</div>“Funciona assim: a barbearia ganha um número de agendamento. A assistente responde preço, horário e endereço na hora, anota quem quer marcar e te manda um aviso para você confirmar. Ela nunca confirma horário sozinha e te chama quando não sabe responder. Nada muda no seu WhatsApp pessoal.”</div>
</section>''')

    P.append('''<section class="pg">
<div class="msgbox"><div class="q">Proposta do piloto (Semana 3)</div>“Oi ___! Montei a proposta do teste que conversamos:<br>
• 30 dias de teste por R$ 49 (pagamento no início, por Pix).<br>
• Um número só para agendamento, que você divulga no Instagram e no balcão.<br>
• A assistente responde serviços, preços, horários e endereço, e anota pedidos de horário para VOCÊ confirmar.<br>
• O que ela ainda NÃO faz: marcar sozinha na agenda, receber pagamento, mandar promoção.<br>
• Se gostar, a partir do 2º mês fica R$ 147/mês, sem fidelidade — cancela quando quiser.<br>
Posso começar a configurar com os seus preços esta semana?”</div>
<div class="msgbox"><div class="q">Follow-up para quem disse “talvez” (3 a 5 dias depois)</div>“Oi ___, tudo certo? Passando só para saber se ficou alguma dúvida sobre o teste da assistente. Se não for o momento, sem problema — só me fala que eu não insisto 🙂”</div>
<div class="msgbox"><div class="q">Primeira mensagem da Bia para o cliente final (aviso de privacidade)</div>“Oi! Sou a Bia, assistente virtual da [Barbearia]. Respondo dúvidas e anoto pedidos de horário — quem confirma é o [nome do barbeiro]. Suas mensagens são usadas só para o seu atendimento. Como posso ajudar?”</div>
<div class="msgbox"><div class="q">Aviso para o barbeiro (handoff)</div>“📅 Pedido de horário: [nome] — [serviço] — [dia/horário desejado]. Responda o cliente no número de agendamento para confirmar.”</div>
<h2>Rotina depois do Dia 30</h2>''' + tabela(["Quando", "Tarefa", "Tempo"], [
        ["Todo dia", "Olhar alertas; responder o dono; na 1ª semana de cada cliente, ler as conversas do dia", "5–15 min"],
        ["Toda semana", "Gasto OpenAI + Meta; conversas por cliente; 1 nova conversa de prospecção", "30–45 min"],
        ["Todo mês", "Revisar a ficha com o dono; cobrar; atualizar a planilha; testar a restauração de um backup", "1–2 h"],
    ]) + '''<div class="box perigo"><h3>Pare e reavalie se…</h3><ul>
<li>15 donos ouviram a oferta e nenhum aceitou um piloto pago;</li>
<li>o piloto rodou 30 dias e o dono não percebeu diferença;</li>
<li>você gastou R$ 500 sem nenhum cliente pagando depois de 60 dias.</li></ul></div>
<div class="box ok"><h3>Sua próxima ação</h3><p>Dia 1: backup. Pasta compactada + fluxo exportado sem chaves, em dois lugares. 30 minutos, R$ 0.</p></div>
</section>''')
    return pagina_html("VendeZap — Plano de 30 Dias", "".join(P), extra_css=EXTRA)


if __name__ == "__main__":
    render_pdf(construir(), DESTINO)
    print("ok")
