"""Gera VendeZap_Guia_Completo.pdf. Rode: python3 guia.py"""
import modelo as M
import svg as S
from comum import brl, tabela, pagina_html, render_pdf, paginas_de, AQUI

DESTINO = AQUI.parent / "VendeZap_Guia_Completo.pdf"
VER = '<span class="tag t-ver">verificado*</span>'
EST = '<span class="tag t-est">estimativa</span>'
HIP = '<span class="tag t-hip">hipótese</span>'
NAO = '<span class="tag t-nao">não verificado</span>'

base = M.CENARIOS["Base"]
u20, u50, u100 = M.custo_mes(20), M.custo_mes(50), M.custo_mes(100)
ia_conv = M.custo_conversa_ia()

# ------------------------------------------------------------------ seções
SECOES = [
    ("0", "Comece por aqui", ["Antes de tudo: o que este guia é (e o que não é)", "O resumo em uma página", "Glossário: as palavras que você vai encontrar"]),
    ("1", "Como o sistema funciona", ["O caminho de uma mensagem", "As diferenças que mais confundem", "O que pode quebrar em cada peça", "Vários clientes sem misturar nada"]),
    ("2", "A decisão do WhatsApp", ["Três jeitos de ligar o VendeZap ao WhatsApp", "Por que não usar o número principal do cliente"]),
    ("3", "Quanto custa a inteligência artificial", ["Como a OpenAI cobra", "Custo por cliente: 20, 50 e 100 conversas por dia", "Preços: o que foi conferido e o que é estimativa"]),
    ("4", "Nicho, oferta e preço", ["Qual tipo de negócio atacar primeiro", "O que vender na primeira versão", "Exemplo de conversa da Bia", "Contrato simples e checklist de entrada"]),
    ("5", "Plano financeiro", ["Receita não é lucro", "Cenários: 1, 5, 10, 25 e 50 clientes", "Orçamento mínimo e máximo", "Sua 1 hora por dia: quantos clientes cabem"]),
    ("6", "Roteiro de implantação em 13 fases", ["Fases 1 a 4", "Fases 5 a 8", "Fases 9 a 13"]),
    ("7", "Riscos, regras e manutenção", ["Matriz de riscos", "LGPD, Código de Defesa do Consumidor e regras do WhatsApp", "Rotina de manutenção", "O que NÃO fazer ainda", "Referências"]),
]


def divisoria(num, titulo, texto):
    # faixa de abertura da seção; a página seguinte começa logo abaixo dela
    return (f'<div class="band"><div class="num">{num}</div><div><div class="bt">{titulo}</div>'
            f'<div class="bd">{texto}</div></div></div><!--band-->')


def fase(n, titulo, tempo, custo, d):
    itens = "".join(f"<li>{a}</li>" for a in d["acoes"])
    erros = "".join(f"<li>{a}</li>" for a in d["erros"])
    return f'''<div class="fase"><div class="fase-cab"><b>Fase {n} — {titulo}</b><span>⏱ {tempo} · 💰 {custo}</span></div>
<div class="fase-corpo">
<div><b>Objetivo</b>{d["obj"]}</div><div><b>Por que importa</b>{d["porque"]}</div>
<div class="full"><b>Ações exatas</b><ul>{itens}</ul></div>
<div><b>Você faz</b>{d["voce"]}</div><div><b>Um assistente de IA de programação faz</b>{d["ia"]}</div>
<div><b>Precisa de acesso ou aprovação externa</b>{d["acesso"]}</div><div><b>Como saber que deu certo</b>{d["sucesso"]}</div>
<div class="full"><b>Erros comuns e como se recuperar</b><ul>{erros}</ul></div>
<div class="full"><b>Só avance quando…</b>{d["avance"]}</div>
</div></div>'''


def construir(paginas_toc=None):
    P = []
    # ---------------------------------------------------------------- capa
    P.append(f'''<section style="page:capa; height:297mm; background:#12324a; color:#fff; padding:28mm 22mm; box-sizing:border-box; display:flex; flex-direction:column;">
<div style="font-size:11pt; letter-spacing:.2em; opacity:.8;">GUIA COMPLETO · OUTUBRO DE 2026</div>
<div style="font-size:46pt; font-weight:800; margin-top:30mm; line-height:1;">VendeZap</div>
<div style="font-size:19pt; margin-top:5mm; max-width:150mm; line-height:1.25;">Como transformar o protótipo em um negócio de atendimento por WhatsApp com IA para pequenos negócios</div>
<div style="margin-top:14mm; display:flex; gap:6mm;">
  <div style="background:rgba(255,255,255,.1); border-radius:3mm; padding:4mm 5mm; width:48mm;"><div style="font-size:8pt; opacity:.75;">NICHO INICIAL</div><div style="font-size:14pt; font-weight:700;">Barbearias</div></div>
  <div style="background:rgba(255,255,255,.1); border-radius:3mm; padding:4mm 5mm; width:48mm;"><div style="font-size:8pt; opacity:.75;">SEU TEMPO</div><div style="font-size:14pt; font-weight:700;">1 hora por dia</div></div>
  <div style="background:rgba(255,255,255,.1); border-radius:3mm; padding:4mm 5mm; width:48mm;"><div style="font-size:8pt; opacity:.75;">PARA COMEÇAR</div><div style="font-size:14pt; font-weight:700;">≈ R$ 30–150</div></div>
</div>
<div style="margin-top:auto; font-size:9.5pt; opacity:.85; max-width:160mm;">Escrito para quem nunca programou. Preços conferidos em 16/10/2026, em fontes indicadas no fim do guia. Nada aqui é promessa de lucro: são contas com premissas visíveis, que você pode mudar na planilha VendeZap_Custos.xlsx.</div>
</section>''')

    # ---------------------------------------------------------------- sumário
    toc = '<section class="pg"><h1>Sumário</h1><div class="toc">'
    for num, tit, subs in SECOES:
        pg = (paginas_toc or {}).get(tit, "")
        toc += f'<div class="s"><span>{num} · {tit}</span><span>{pg}</span></div>'
        for sb in subs:
            pg = (paginas_toc or {}).get(sb, "")
            toc += f'<div class="sub"><span>{sb}</span><span>{pg}</span></div>'
    toc += '</div><p class="small" style="margin-top:6mm;">Etiquetas usadas: ' + VER + ' preço/fato conferido em fonte pública datada (*quase sempre fonte secundária — o próprio ambiente desta pesquisa não conseguiu abrir as páginas oficiais da OpenAI e da Meta; confira antes de pagar) · ' + EST + ' conta feita com premissas · ' + HIP + ' algo a testar com clientes reais · ' + NAO + ' não foi possível confirmar.</p></section>'
    P.append(toc)

    # ================================================================ 0
    P.append(divisoria("0", "Comece por aqui", "O que este guia é, a decisão principal em uma página e as palavras técnicas explicadas."))
    P.append(f'''<section class="pg"><h2>Antes de tudo: o que este guia é (e o que não é)</h2>
<p class="lead">Este guia transforma a ideia do VendeZap — a atendente virtual “Bia” da barbearia fictícia Navalha de Ouro — em um plano de negócio que cabe em <b>1 hora por dia</b>.</p>
<div class="box perigo"><h3>O que eu NÃO verifiquei</h3>
<ul><li><b>Seu computador.</b> Este guia foi produzido num ambiente na nuvem que não tem acesso ao seu PC com Windows. Eu não vi os arquivos do VendeZap, não sei qual versão do Langflow está instalada, qual modelo da OpenAI está escolhido, nem se a ponte do WhatsApp está ligada agora.</li>
<li><b>As páginas oficiais de preço.</b> O ambiente bloqueou o acesso direto a openai.com e developers.facebook.com. Os preços vieram de fontes secundárias datadas (listadas em Referências), que concordam entre si — mas confira na fonte oficial antes de pagar qualquer coisa.</li>
<li><b>Demanda real.</b> Ninguém ainda pagou pelo VendeZap. Todo preço de venda aqui é uma hipótese a testar.</li></ul></div>
<div class="box info"><h3>O que este guia entrega</h3>
<ul><li>Explicação de cada peça do sistema em linguagem comum, com diagramas.</li>
<li>Uma decisão clara de nicho (barbearias), de oferta e de rota para o WhatsApp.</li>
<li>Contas de custo com fórmulas — e uma planilha (<b>VendeZap_Custos.xlsx</b>) onde você muda as premissas e tudo recalcula.</li>
<li>Um roteiro em 13 fases, dizendo o que você faz, o que um assistente de IA de programação (como o Claude Code) faz por você, e o que exige a sua aprovação.</li>
<li>Um plano de 30 dias separado (<b>VendeZap_Plano_30_Dias.pdf</b>), tarefa por tarefa, em blocos de 1 hora.</li></ul></div>
<div class="box alerta"><h3>Uma regra para todo o projeto</h3><p>Nunca apague, reconecte ou “migre” a sessão do WhatsApp que já funciona, nem sobrescreva arquivos do projeto, antes de ter uma cópia de segurança conferida (Fase 3). Se algo parecer quebrado, pare e peça ajuda — não tente “consertar apagando”.</p></div>
</section>''')

    P.append(f'''<section class="pg"><h2>O resumo em uma página</h2>
<div class="grid3">
<div class="card"><div class="kpi-l">Nicho inicial</div><div class="kpi">Barbearias</div><p class="small">Perguntas repetitivas (preço, horário, endereço), dono com as mãos ocupadas, negócio local fácil de visitar.</p></div>
<div class="card"><div class="kpi-l">Preço a testar</div><div class="kpi">R$ 147/mês</div><p class="small">+ implantação de R$ 197 (isenta para os 3 primeiros). {HIP}</p></div>
<div class="card"><div class="kpi-l">Custo de uso por cliente</div><div class="kpi">≈ {brl(M.custo_mes(15, 3)["total"])}</div><p class="small">IA + WhatsApp oficial, com 15 conversas/dia. {EST}</p></div>
</div>
<h3>A decisão em 6 frases</h3>
<ol>
<li><b>Venda uma coisa só:</b> uma recepcionista virtual que responde dúvidas e <i>anota pedidos de horário</i> para o barbeiro confirmar. Ela não marca sozinha na agenda na primeira versão.</li>
<li><b>Use a ponte atual (QR Code) só para demonstração</b>, num chip seu. Para cliente pagante, use a <b>API oficial do WhatsApp</b> num número dedicado.</li>
<li><b>Valide antes de gastar:</b> converse com 10–15 barbearias e consiga 1 piloto. Só contrate servidor (VPS) quando houver alguém para atender.</li>
<li><b>Custos fixos pequenos:</b> servidor de ≈ R$ 30–60/mês e domínio de ≈ R$ 40/ano. O que cresce com o uso é IA + mensagens do WhatsApp.</li>
<li><b>Seu limite é o tempo:</b> com 1 hora por dia você atende cerca de <b>14 clientes</b> (ver Seção 5). Passar disso exige automatizar o suporte ou delegar.</li>
<li><b>Critério de parada:</b> se depois de 15 conversas com donos de barbearia ninguém aceitar um piloto pago (mesmo barato), mude o nicho ou a oferta antes de construir mais.</li>
</ol>
<div class="box ok"><h3>Sua primeira ação</h3><p>Abrir o VendeZap no seu PC e fazer a <b>cópia de segurança</b> descrita na Fase 3 — antes de qualquer outra mudança. Leva cerca de 30 minutos e custa R$ 0.</p></div>
<h3>Números-chave (premissas na Seção 3 e 5)</h3>
{tabela(["Item", "Valor", "Situação"], [
    ["IA por conversa (gpt-5-mini, 6 mensagens do cliente)", brl(ia_conv, 3), EST],
    ["WhatsApp oficial: mensagens de serviço grátis por número/mês", "1.000", VER],
    ["WhatsApp oficial: cada mensagem de serviço acima da franquia", "R$ 0,035", VER],
    ["Servidor (VPS) com 4 GB de memória, preço de renovação", "R$ 59,99/mês", VER],
    ["Ponto de equilíbrio no cenário base", f"{M.equilibrio(base)} cliente", EST],
    ["Ponto de equilíbrio no cenário conservador (R$ 97/mês)", f"{M.equilibrio(M.CENARIOS['Conservador'])} clientes", EST],
], num=(1,))}
</section>''')

    glos = [
        ("API", "“Porta de serviço” que deixa um programa usar outro. Ex.: o VendeZap usa a API da OpenAI para pedir uma resposta."),
        ("Chave de API", "Senha que identifica você nessa porta — e é usada para cobrar. Quem tiver sua chave gasta no seu cartão."),
        ("Token", "Pedaço de texto (≈ ¾ de uma palavra em inglês; em português, um pouco menos). A OpenAI cobra por milhão de tokens lidos (entrada) e escritos (saída)."),
        ("Modelo de IA", "O “cérebro” que escreve a resposta (ex.: gpt-5-mini). Modelos maiores são mais caros."),
        ("Langflow", "Programa visual onde se monta, com blocos, a “receita” da Bia: instruções + dados + chamada à IA."),
        ("Node.js", "Plataforma que roda programas escritos em JavaScript. A ponte do WhatsApp do VendeZap é um programa Node.js."),
        ("Ponte (bridge)", "O programa que fica entre o WhatsApp e o Langflow, levando e trazendo mensagens."),
        ("API oficial / Cloud API", "Jeito autorizado pela Meta de um programa usar um número de WhatsApp. Cobra por mensagem em algumas categorias."),
        ("Integração não oficial", "Imita o WhatsApp Web lendo um QR Code (bibliotecas como Baileys ou whatsapp-web.js). Grátis, mas viola os termos e pode levar ao bloqueio do número."),
        ("BSP", "Provedor de soluções de negócio: empresa parceira da Meta que revende o acesso à API oficial com painel e suporte (ex.: 360dialog)."),
        ("VPS", "Computador alugado num datacenter, ligado 24 h, que você acessa pela internet. Substitui deixar o seu PC ligado."),
        ("Servidor / processo", "Programa que fica rodando esperando trabalho. “Processo caiu” = programa parou."),
        ("Webhook", "Endereço na internet para onde a Meta envia cada mensagem nova. Exige um servidor sempre ligado com HTTPS."),
        ("Domínio / HTTPS", "Nome do site (ex.: vendezap.com.br) e a conexão com cadeado. A API oficial exige HTTPS."),
        ("Multi-inquilino (multi-tenant)", "Um único sistema que atende vários clientes, cada um com sua “ficha” isolada."),
        ("Handoff", "Passar a conversa da IA para um humano."),
        ("LGPD", "Lei Geral de Proteção de Dados (Lei 13.709/2018): regras para coletar e guardar dados de pessoas."),
        ("Backup", "Cópia de segurança guardada em outro lugar, que permite voltar ao estado anterior."),
    ]
    P.append('<section class="pg"><h2>Glossário: as palavras que você vai encontrar</h2>' +
             tabela(["Termo", "O que significa, em linguagem comum"], [[f"<b>{a}</b>", b] for a, b in glos]) + '</section>')

    # ================================================================ 1
    P.append(divisoria("1", "Como o sistema funciona", "Cada peça explicada sem jargão — e o que acontece quando uma delas falha."))
    P.append(f'''<section class="pg"><h2>O caminho de uma mensagem</h2>
<p>Pense numa recepção: o <b>WhatsApp</b> é o telefone, a <b>ponte</b> é a telefonista que atende e passa o recado, o <b>Langflow</b> é o manual de atendimento, o <b>modelo de IA</b> é a pessoa que redige a resposta, e os <b>dados do negócio</b> são a tabela de preços pregada na parede.</p>
<figure>{S.fluxo_sistema()}<figcaption>Figura 1 — Uma mensagem leva normalmente poucos segundos para fazer esse caminho de ida e volta. A seta tracejada é a resposta voltando.</figcaption></figure>
<div class="box nota"><p><b>Importante:</b> este é o desenho do conceito. Eu não inspecionei o seu VendeZap; a ordem exata (por exemplo, se os dados do negócio estão dentro do fluxo do Langflow ou num arquivo separado) é algo a confirmar na Fase 2.</p></div>
</section>''')

    dif = [
        ["ChatGPT Plus × API da OpenAI", "Plus é a assinatura do site/app para <i>você</i> conversar. A API é cobrada à parte, por uso, e é o que o VendeZap usa. A OpenAI confirma: são sistemas de cobrança separados — a assinatura Plus não inclui uso da API. " + VER],
        ["WhatsApp Business (app) × Cloud API", "O app é o que o barbeiro usa no celular, grátis. A Cloud API é o acesso para programas, com cadastro na Meta, webhook e cobrança por mensagem em certas categorias."],
        ["Integração oficial × não oficial", "Oficial: autorizada, estável, com custo por mensagem. Não oficial (QR Code): grátis, mas imita um celular e viola os termos — o número pode ser bloqueado sem aviso."],
        ["Langflow × ponte Node.js", "A ponte só transporta mensagens. O Langflow decide <i>o que</i> responder. Se a ponte cai, ninguém recebe nada; se o Langflow cai, mensagens chegam mas ficam sem resposta."],
        ["PC local × VPS", "No seu PC, o atendimento para quando o PC desliga, hiberna, atualiza o Windows ou a internet cai. Uma VPS fica ligada 24 h num datacenter, por uma mensalidade."],
        ["Protótipo × serviço em produção", "Protótipo: funciona na sua frente, numa demonstração. Produção: funciona sozinho de madrugada, avisa quando quebra, tem backup e não mistura clientes."],
        ["Resposta da IA × horário confirmado", "Quando a Bia diz “anotei seu pedido para 15h”, nada foi marcado em agenda nenhuma — a não ser que exista uma integração real. Na versão 1, o barbeiro confirma. A Bia nunca deve dizer “está confirmado” sem essa confirmação."],
    ]
    P.append('<section class="pg"><h2>As diferenças que mais confundem</h2>' + tabela(["Par", "A diferença, em uma frase ou duas"], dif) +
             '<div class="box alerta"><p><b>Por que isso importa para o dinheiro:</b> pelo Código de Defesa do Consumidor, a informação de preço dada ao cliente final obriga o negócio (art. 30). Se a Bia disser um preço errado, a barbearia pode ter que honrá-lo. Por isso a ficha de preços precisa estar sempre atualizada e a Bia deve dizer “valores sujeitos a confirmação” em casos especiais.</p></div></section>')

    falhas = [
        ["Integração WhatsApp (QR Code)", "Sessão desconecta; número bloqueado pela Meta", "Mensagens param de chegar", "Alerta de “desconectado”; número reserva; migrar para a API oficial"],
        ["Integração WhatsApp (API oficial)", "Webhook fora do ar; conta Meta sem verificação; cartão recusado", "Mensagens não chegam ou não saem", "Monitor do endereço; cartão válido; avisos da Meta no e-mail"],
        ["Ponte Node.js", "Programa trava ou fecha após erro", "Ninguém recebe resposta", "Gerenciador de processos que reinicia sozinho (ex.: PM2) + alerta"],
        ["Langflow", "Falta de memória; atualização muda o fluxo; banco de dados corrompido", "Mensagens sem resposta ou respostas estranhas", "Servidor com ≥ 4 GB; fixar a versão; exportar o fluxo após cada mudança"],
        ["OpenAI", "Créditos acabam; chave revogada; instabilidade; modelo descontinuado", "Erro na resposta", "Recarga automática com teto; limite de gasto; mensagem padrão de “já te respondo”"],
        ["Dados do negócio", "Preço ou horário desatualizado", "Informação errada ao cliente final", "Revisão mensal com o dono; data de atualização na ficha"],
        ["Servidor (VPS)", "Disco cheio; reinício; ataque por senha fraca", "Tudo para", "Backup automático; senha forte/chave SSH; atualizações"],
    ]
    P.append('<section class="pg"><h2>O que pode quebrar em cada peça</h2><p>Todo sistema falha às vezes. Um serviço profissional não é o que nunca falha — é o que <b>percebe rápido e volta rápido</b>.</p>' +
             tabela(["Peça", "Como falha", "O que o cliente final sente", "Como se proteger"], falhas) + '</section>')

    P.append(f'''<section class="pg"><h2>Vários clientes sem misturar nada</h2>
<figure>{S.multi_clientes()}<figcaption>Figura 2 — Duas formas de atender vários negócios.</figcaption></figure>
{tabela(["", "A · Uma cópia por cliente (piloto)", "B · Um sistema multi-inquilino (escalável)"], [
    ["Bom para", "1 a 3 clientes, para aprender", "4+ clientes"],
    ["Esforço inicial", "Baixo: duplicar o que já existe", "Médio: reescrever a ponte para ler a “ficha” certa"],
    ["Custo de manutenção", "Cresce a cada cliente (cada cópia precisa de atualização)", "Quase fixo: corrigir uma vez vale para todos"],
    ["Uso de memória do servidor", "Alto: um Langflow/ponte por cliente pode esgotar 4 GB rápido", "Baixo"],
    ["Risco de misturar clientes", "Baixo se as cópias forem bem separadas", "Exige cuidado no código (testes automáticos)"],
])}
<div class="box info"><h3>Regras para nunca misturar clientes</h3><ul class="check">
<li>Cada negócio tem um identificador próprio (ex.: <code>barbearia-joao</code>) e todo dado guardado leva esse identificador.</li>
<li>Cada número de WhatsApp aponta para exatamente um negócio — o sistema descobre o negócio pelo número que recebeu a mensagem, nunca pelo texto.</li>
<li>Histórico de conversa separado por negócio <i>e</i> por cliente final.</li>
<li>Avisos ao dono (handoff) vão só para o telefone daquele dono, cadastrado na ficha dele.</li>
<li>Chaves e senhas ficam no servidor, nunca na ficha de dados nem em mensagens.</li>
<li>Antes de cada atualização: teste com dois negócios fictícios e confira que um não vê nada do outro.</li></ul></div>
</section>''')

    # ================================================================ 2
    P.append(divisoria("2", "A decisão do WhatsApp", "A escolha que mais afeta o risco do negócio. Spoiler: a ponte atual serve para demonstrar, não para cobrar."))
    comp = [
        ["Dificuldade de configurar", "Baixa (já funciona)", "Alta: conta Meta Business, app de desenvolvedor, webhook HTTPS", "Média: painel guiado"],
        ["Custo inicial", "R$ 0", "R$ 0 + um número (chip) dedicado", "R$ 0 + chip"],
        ["Custo mensal fixo", "R$ 0", "R$ 0", "360dialog: a partir de € 49 por número/mês " + VER],
        ["Cobrança por mensagem", "Nenhuma", "Serviço: 1.000 grátis/mês por número, depois R$ 0,035; utilidade R$ 0,035; marketing R$ 0,3217 " + VER, "Repassa os preços da Meta (+ mensalidade)"],
        ["Confiabilidade", "Média-baixa: quebra quando o WhatsApp muda", "Alta", "Alta"],
        ["Risco de bloqueio", "<b>Real</b> — viola os termos; não existe risco zero", "Baixo, se seguir as regras (sem spam, com opt-in)", "Baixo"],
        ["Exige conta empresarial", "Não", "Sim (Meta Business, idealmente verificada)", "Sim"],
        ["Vários clientes", "Uma sessão por número; frágil", "Vários números na mesma conta", "Fácil"],
        ["Manutenção", "Alta (reconectar QR, atualizar biblioteca)", "Baixa-média", "Baixa"],
        ["Bom para piloto?", "Só demonstração no seu chip", "<b>Sim</b>", "Sim, se a mensalidade couber"],
        ["Bom para produto comercial?", "Não", "<b>Sim</b>", "Sim"],
    ]
    P.append('<section class="pg"><h2>Três jeitos de ligar o VendeZap ao WhatsApp</h2>' +
             tabela(["Critério", "A · Ponte atual (QR Code)", "B · Cloud API oficial (direto)", "C · Provedor (BSP)"], comp) +
             f'<p class="small">Preços em reais da Meta para o Brasil a partir de 01/10/2026, segundo vários fornecedores brasileiros (Letalk, Chat2Desk, E-Commerce Brasil); a Meta cobra por mensagem desde julho de 2025. Também existe a <b>coexistência</b>: o mesmo número no app WhatsApp Business e na API ao mesmo tempo, relatada como disponível no Brasil — com limitações (listas de transmissão viram só-leitura, grupos não sincronizam). Confirme na documentação da Meta. {VER}</p>'
             '<div class="box info"><p><b>Regra da Meta desde 15/01/2026:</b> a API oficial proíbe assistentes de IA “de uso geral” (tipo ChatGPT dentro do WhatsApp), mas a própria Meta disse que <b>empresas usando IA para atender os próprios clientes não são afetadas</b>. A Bia, que só fala da barbearia, está do lado permitido — mantenha-a assim (ela deve recusar assuntos fora do negócio).</p></div></section>')

    P.append(f'''<section class="pg"><h2>Por que não usar o número principal do cliente</h2>
<p>O número de WhatsApp de uma barbearia é, na prática, a lista de clientes dela. Ligar uma integração não oficial a esse número é arriscar o maior ativo do cliente:</p>
<ul><li><b>Bloqueio:</b> se a Meta detectar automação não autorizada, o número pode ser banido — e o histórico e os contatos vão junto.</li>
<li><b>Reputação:</b> uma resposta errada da IA sai com o nome da barbearia; o cliente culpa o barbeiro, e o barbeiro culpa você.</li>
<li><b>Conflito de uso:</b> o barbeiro continua respondendo pelo celular ao mesmo tempo; os dois falam por cima um do outro.</li>
<li><b>Responsabilidade:</b> se der problema, a conversa “quem paga o prejuízo?” é péssima para um fornecedor iniciante.</li></ul>
<h3>Rota recomendada</h3>
<figure>{S.rota_whatsapp()}<figcaption>Figura 3 — Da demonstração ao produto.</figcaption></figure>
<div class="box ok"><h3>Para o primeiro piloto pago</h3>
<p>Um <b>número novo e dedicado</b> (“WhatsApp de agendamento da Barbearia X”) ligado à <b>API oficial</b>. O barbeiro divulga esse número no Instagram, no Google e num cartaz no balcão. O número principal continua só dele, intocado. Com 15 conversas por dia e 3 respostas por conversa, o custo de WhatsApp fica perto de {brl(M.custo_mes(15,3)["wa"])} por mês. {EST}</p>
<p><b>Troca consciente:</b> configurar a API oficial é a parte mais técnica do projeto (Fase 6). Um assistente de IA de programação faz a maior parte, mas você vai precisar criar contas, receber códigos por SMS e aprovar cada passo.</p></div>
<div class="box alerta"><p><b>Se você quiser usar a ponte atual com um cliente real</b> mesmo assim: só num número dedicado, com o dono ciente por escrito de que o número pode ser bloqueado, sem envio em massa, e com o plano de migrar para a API oficial em até 30 dias.</p></div>
</section>''')

    # ================================================================ 3
    P.append(divisoria("3", "Quanto custa a inteligência artificial", "Como a OpenAI cobra, com exemplos e fórmulas que você pode refazer quando os preços mudarem."))
    P.append(f'''<section class="pg"><h2>Como a OpenAI cobra</h2>
<p>A API funciona como <b>conta de luz pré-paga</b>: você compra créditos (ou cadastra cartão) e cada resposta consome um pouquinho. O “medidor” conta <b>tokens</b>:</p>
<ul><li><b>Entrada</b> — tudo que a IA precisa ler para responder: as instruções da Bia, a ficha da barbearia e o histórico da conversa. É relido <i>a cada resposta</i>.</li>
<li><b>Saída</b> — o texto que ela escreve, incluindo o “raciocínio” interno dos modelos GPT-5, que também é cobrado como saída.</li></ul>
<div class="box info"><h3>A fórmula</h3>
<p style="font-size:10.5pt;"><b>Custo por conversa (R$)</b> = respostas por conversa × (tokens de entrada × preço de entrada + tokens de saída × preço de saída) ÷ 1.000.000 × câmbio</p>
<p style="font-size:10.5pt;"><b>Custo de IA no mês</b> = conversas por dia × dias × custo por conversa</p></div>
<h3>Premissas usadas</h3>
{tabela(["Premissa", "Valor", "Situação"], [
    ["Modelo", "gpt-5-mini", "escolha recomendada para atendimento simples"],
    ["Preço de entrada", "US$ 0,25 por 1 milhão de tokens", VER],
    ["Preço de saída", "US$ 2,00 por 1 milhão de tokens", VER],
    ["Câmbio", f"R$ {M.CAMBIO:.2f}".replace(".", ",") + " por US$", VER + " (16/09/2026)"],
    ["Mensagens do cliente por conversa (= respostas da IA)", "6", HIP],
    ["Tokens de entrada por resposta", "2.000 (instruções + ficha + histórico)", EST],
    ["Tokens de saída por resposta", "350 (texto + raciocínio)", EST],
], num=())}
<p><b>Resultado:</b> 6 × (2.000 × 0,25 + 350 × 2,00) ÷ 1.000.000 × {str(M.CAMBIO).replace(".", ",")} = <b>{brl(ia_conv, 3)} por conversa</b> — menos de 4 centavos. {EST}</p>
<p class="small">Para comparar: o gpt-5-nano custa US$ 0,05 / US$ 0,40 (cerca de 5× mais barato, mas erra mais em conversas com nuance). Os modelos mais novos (ex.: série 5.4) custam mais. A OpenAI desconta entrada repetida (“cached input”), o que tende a baratear — as contas aqui não contam com esse desconto, para ficar do lado conservador.</p>
<div class="box nota"><h3>Como ver o modelo e o gasto reais (no seu PC e na sua conta)</h3>
<ol><li><b>Modelo escolhido:</b> abra o Langflow, abra o fluxo da Bia e clique no bloco da OpenAI. Procure o campo com o nome do modelo (algo como “Model Name”). Anote o que estiver lá.</li>
<li><b>Gasto:</b> entre em platform.openai.com com a conta dona da chave → menu de <i>Usage</i> (uso). Lá aparece o gasto por dia e por modelo.</li>
<li><b>Limite:</b> em <i>Settings → Billing</i> (cobrança) e <i>Limits</i>, defina um teto de gasto mensal e desligue a recarga automática ou limite o valor dela. Os nomes dos menus podem mudar; procure por “Billing”, “Usage” e “Limits”.</li></ol></div>
</section>''')

    P.append(f'''<section class="pg"><h2>Custo por cliente: 20, 50 e 100 conversas por dia</h2>
<p>Aqui se somam as duas contas que crescem com o uso: <b>IA</b> (OpenAI) e <b>WhatsApp oficial</b> (Meta). Premissa: 4 mensagens enviadas pela Bia por conversa e 30 dias por mês. Com a ponte não oficial, a parte do WhatsApp seria R$ 0 — com o risco da Seção 2.</p>
<figure>{S.barras_custo([("20 conversas/dia", u20["ia"], u20["wa"]), ("50 conversas/dia", u50["ia"], u50["wa"]), ("100 conversas/dia", u100["ia"], u100["wa"])])}<figcaption>Figura 4 — Custo de uso de UM cliente por mês. O WhatsApp passa a pesar mais que a IA quando a franquia de 1.000 mensagens acaba. {EST}</figcaption></figure>
{tabela(["Conversas/dia", "Conversas/mês", "Custo IA", "Mensagens enviadas", "Pagas (acima de 1.000)", "Custo WhatsApp", "Total/mês"], [
    [d, f'{u["conv"]:,}'.replace(",", "."), brl(u["ia"], 2), f'{u["msgs"]:,}'.replace(",", "."), f'{max(0,u["msgs"]-1000):,}'.replace(",", "."), brl(u["wa"], 2), f'<b>{brl(u["total"], 2)}</b>']
    for d, u in ((20, u20), (50, u50), (100, u100))], num=(0, 1, 2, 3, 4, 5, 6))}
<div class="box alerta"><h3>O que esta conta ensina</h3>
<ul><li><b>Cobrar valor fixo sem limite de uso é perigoso.</b> Um cliente com 100 conversas por dia custaria ≈ {brl(u100["total"])} por mês — mais que a mensalidade sugerida. Por isso o plano inclui uma franquia de conversas (Seção 4).</li>
<li><b>Menos mensagens por conversa = menos custo.</b> Respostas completas em 1 mensagem, em vez de 3 picadas, reduzem a conta do WhatsApp.</li>
<li><b>Meça no piloto.</b> Peça ao barbeiro para contar, por uma semana, quantas conversas novas chegam por dia. Esse número muda tudo.</li></ul></div>
</section>''')

    precos = [
        ["OpenAI gpt-5-mini (por 1M tokens)", "US$ 0,25 entrada / US$ 2,00 saída", VER, "Por uso", "platform.openai.com → Pricing"],
        ["WhatsApp: mensagem de serviço (Brasil, desde 01/10/2026)", "1.000 grátis/mês por número, depois R$ 0,035", VER, "Por uso", "developers.facebook.com → WhatsApp → Pricing"],
        ["WhatsApp: utilidade / marketing", "R$ 0,035 / R$ 0,3217 por mensagem", VER, "Por uso (opcional)", "idem"],
        ["VPS Hostinger KVM 1 (4 GB)", "R$ 29,99 promo (24 meses) · R$ 59,99 renovação", VER, "Mensal", "hostinger.com.br → VPS"],
        ["VPS Hostinger KVM 2 (8 GB)", "R$ 43,99 promo · R$ 77,99 renovação", VER, "Mensal", "idem"],
        ["VPS Hetzner CX22 (Europa)", "≈ € 4,15 + € 0,50 do IPv4 (sem impostos)", VER, "Mensal", "hetzner.com → Cloud"],
        ["Provedor 360dialog", "a partir de € 49 por número/mês", VER, "Mensal (opcional)", "docs.360dialog.com"],
        ["Domínio .com.br", "≈ R$ 40/ano", NAO, "Anual", "registro.br"],
        ["Chip/número dedicado", "≈ R$ 10–20 + recarga mínima", NAO, "Única + recarga", "operadora"],
        ["DAS do MEI 2026 (serviços)", "R$ 86,05/mês", VER, "Mensal", "Portal do Empreendedor — confirme se a atividade cabe no MEI"],
        ["Imposto se não couber no MEI", "≈ 6% (Simples, Anexo III) ou mais", EST, "Sobre receita", "contador"],
        ["Taxa de cobrança (Pix/boleto por intermediário)", "≈ R$ 2 por cobrança", EST, "Por cobrança", "seu banco/gateway"],
        ["Seu tempo", "R$ 30/hora (edite)", HIP, "—", "você"],
    ]
    P.append('<section class="pg"><h2>Preços: o que foi conferido e o que é estimativa</h2><p>Conferidos em 16/10/2026. Promoções de servidor exigem contrato longo e sobem na renovação — as contas deste guia usam o preço de <b>renovação</b>.</p>' +
             tabela(["Item", "Preço", "Situação", "Tipo", "Onde conferir"], precos) +
             '<p class="small">Custos únicos: chip, domínio (anual) e eventual taxa de implantação de um provedor. Custos recorrentes: servidor, domínio, MEI/contador. Custos por uso: OpenAI e WhatsApp oficial. Opcionais: provedor (BSP), servidor maior, backup externo.</p></section>')

    # ================================================================ 4
    P.append(divisoria("4", "Nicho, oferta e preço", "Um tipo de negócio, uma oferta, um preço para testar. Nada de “atendo todo mundo”."))
    nichos = [
        ["<b>Barbearias</b>", "9", "7", "5", "6", "8", "<b>7,1</b>"],
        ["Salões de beleza/estética", "7", "7", "6", "6", "7", "6,6"],
        ["Restaurantes/lanchonetes", "4", "8", "7", "3", "6", "5,6"],
        ["Lojas de varejo", "4", "6", "6", "5", "6", "5,4"],
    ]
    P.append('<section class="pg"><h2>Qual tipo de negócio atacar primeiro</h2><p>Notas de 0 a 10 (minha avaliação, com base nas evidências abaixo). Peso igual para os cinco critérios.</p>' +
             tabela(["Nicho", "Simplicidade de implantar", "Dor do cliente", "Disposição a pagar", "Concorrência (10 = pouca)", "Custo de conquistar", "Média"], nichos, num=(1, 2, 3, 4, 5, 6)) +
             f'''<div class="grid2">
<div class="card"><h3>Por que barbearias</h3><ul>
<li>As perguntas se repetem: “quanto é?”, “tem horário?”, “onde fica?”. Cabem numa ficha curta.</li>
<li>O barbeiro está com as mãos ocupadas cortando cabelo; responder WhatsApp atrapalha o trabalho.</li>
<li>Para mais de 80% dos pequenos negócios de serviço, o WhatsApp é o principal canal com clientes (Sebrae, 2025). {VER}</li>
<li>São locais, muitas e visitáveis a pé: prospectar custa R$ 0.</li></ul></div>
<div class="card"><h3>Por que não começar pelos outros</h3><ul>
<li><b>Restaurantes:</b> pedidos têm itens, adicionais, troco e entrega — muita chance de erro. Concorrente forte: Anota AI (do iFood), a partir de ≈ R$ 179–300/mês. {VER}</li>
<li><b>Varejo:</b> dúvidas de estoque que a IA não tem como saber.</li>
<li><b>Salões:</b> bom 2º passo — mesma lógica da barbearia, com mais serviços e profissionais.</li></ul></div></div>
<div class="box alerta"><h3>O ponto fraco do nicho (não ignore)</h3><p>Barbeiros tendem a pagar pouco. Um desenvolvedor relatou que barbeiros entrevistados preferiam papel e caneta a pagar mais de R$ 70/mês por um sistema de agenda (relato isolado no TabNews, sem data). Apps de agenda como AppBarber, Trinks e Booksy (a partir de US$ 29,99/mês) já existem. Por isso o VendeZap não deve competir como “agenda”, e sim como <b>recepcionista que responde por ele</b> — e o preço de R$ 147 é uma <b>hipótese a testar</b>, com R$ 97 como plano B. {HIP}</p></div></section>''')

    ofertas = [
        ["1 · Respostas automáticas (FAQ)", "Preço, horário, endereço, formas de pagamento", "Baixa", "Fácil de copiar; valor percebido baixo"],
        ["<b>2 · Recepcionista com ficha + passagem para humano</b>", "FAQ + anota pedido de horário (nome, serviço, dia/hora) e avisa o barbeiro para confirmar", "<b>Média</b>", "<b>Recomendada para começar</b>"],
        ["3 · Agendamento integrado", "Marca direto na agenda (Google Agenda ou app de barbearia)", "Alta", "Só depois de 3+ clientes pagando"],
    ]
    P.append(f'''<section class="pg"><h2>O que vender na primeira versão</h2>
{tabela(["Oferta", "O que faz", "Complexidade", "Veredito"], ofertas)}
<div class="grid2">
<div class="card"><h3>✅ O cliente recebe (Plano Recepcionista)</h3><ul>
<li>Atendente virtual com o nome e o jeito de falar da barbearia.</li>
<li>Respostas sobre serviços, preços, horários, endereço e pagamento.</li>
<li>Pedido de horário anotado e enviado ao barbeiro, que confirma.</li>
<li>Passagem para humano quando a Bia não souber ou o cliente pedir.</li>
<li>Até <b>450 conversas por mês</b> (≈ 15/dia).</li>
<li>Até 2 atualizações de preços/horários por mês.</li>
<li>Suporte por WhatsApp em dias úteis, resposta em até 1 dia útil.</li></ul></div>
<div class="card"><h3>❌ Não está incluído (por enquanto)</h3><ul>
<li>Marcação automática na agenda.</li>
<li>Pagamentos ou sinal pelo WhatsApp.</li>
<li>Envio de promoções em massa.</li>
<li>Atendimento por áudio ou fotos.</li>
<li>Uso do número principal do cliente com a ponte não oficial.</li>
<li>Garantia de 100% de funcionamento.</li></ul></div></div>
<h3>Como cobrar {HIP}</h3>
{tabela(["Componente", "Proposta para testar", "Por quê"], [
    ["Implantação (única)", "R$ 197 — grátis para os 3 primeiros pilotos", "Paga suas ≈ 5 horas de configuração; isentar no início reduz atrito"],
    ["Mensalidade", "R$ 147/mês (teste também R$ 97 para comparar)", "Previsível para o dono; cobre o uso de ≈ 450 conversas com folga"],
    ["Uso acima da franquia", "+ R$ 30 a cada 150 conversas extras", "Protege você do cliente que estoura a conta da Meta/OpenAI"],
    ["Integrações (agenda, pagamento)", "Cobrar à parte, só quando existirem", "Nunca venda o que ainda não está pronto"],
])}
<div class="box perigo"><p><b>Nunca venda funcionalidade que não existe.</b> Se o dono pedir algo fora da lista, a resposta é: “Ainda não faz isso. Anoto como pedido e aviso quando tiver.” Prometer e não entregar é o jeito mais rápido de perder o primeiro cliente — e a indicação dos próximos.</p></div>
</section>''')

    P.append(f'''<section class="pg"><h2>Exemplo de conversa da Bia</h2>
<p class="small">Exemplo ilustrativo escrito para este guia — não é captura de tela do sistema e não comprova que o VendeZap atual responde assim. Use-o como roteiro de teste na Fase 10.</p>
<div class="grid2"><div class="chat">
<div class="msg c"><small>Cliente</small>Oi, quanto tá o corte com barba?</div>
<div class="msg b"><small>Bia · Navalha de Ouro</small>Oi! Sou a Bia, assistente virtual da Navalha de Ouro 💈 Corte + barba sai por R$ 60. Quer que eu anote um pedido de horário?</div>
<div class="msg c"><small>Cliente</small>Quero, amanhã depois das 18h</div>
<div class="msg b"><small>Bia</small>Perfeito! Qual seu nome? Vou passar para o Rafael confirmar o horário certinho — ele responde por aqui ainda hoje.</div>
<div class="msg c"><small>Cliente</small>Carlos</div>
<div class="msg b"><small>Bia</small>Anotado, Carlos: corte + barba, amanhã após 18h. ⚠️ Ainda <b>não está confirmado</b> — o Rafael te chama aqui para fechar.</div>
</div>
<div class="chat">
<div class="msg c"><small>Cliente</small>Vocês fazem luzes? E aceita parcelar em 3x?</div>
<div class="msg b"><small>Bia</small>Luzes não aparece na minha lista de serviços, e sobre parcelamento eu não tenho essa informação. Vou chamar o Rafael para te responder, tudo bem?</div>
<div class="msg c"><small>Cliente</small>Me conta uma piada sobre política</div>
<div class="msg b"><small>Bia</small>Haha, eu só sei falar da barbearia 😄 Posso te ajudar com preços, horários ou endereço!</div>
</div></div>
<h3>O que este exemplo mostra</h3>
<ul><li><b>Ela se apresenta como assistente virtual.</b> Transparência evita a sensação de enganação (e é boa prática de LGPD/CDC).</li>
<li><b>Ela nunca confirma horário sozinha</b> na versão 1, e diz isso com clareza.</li>
<li><b>Na dúvida, chama um humano</b> em vez de inventar (“luzes”, “parcelamento”).</li>
<li><b>Ela recusa assuntos fora do negócio</b> — isso protege a conta perante a regra da Meta de 2026.</li></ul>
<div class="box nota"><p>Aviso ao barbeiro (handoff), enviado ao número pessoal dele: <i>“Pedido de horário: Carlos — corte + barba — amanhã após 18h. Responda o cliente no número de agendamento.”</i></p></div>
</section>''')

    P.append(f'''<section class="pg"><h2>Contrato simples e checklist de entrada</h2>
<div class="box nota"><p><b>Isto é um roteiro, não um contrato pronto.</b> Os itens marcados ⚖️ devem ser revisados por um advogado antes de você ter vários clientes. Para os 1–3 pilotos, um termo simples assinado pelos dois já é muito melhor que nada.</p></div>
<div class="grid2"><div class="card"><h3>Itens do contrato</h3><ol>
<li>Quem são as partes (você e a barbearia, com CPF/CNPJ).</li>
<li>O que está incluído e excluído (copie a página anterior).</li>
<li>Preço, vencimento, reajuste anual e franquia de conversas.</li>
<li>Prazo mensal; cancelamento a qualquer momento com aviso de 15 dias, sem multa.</li>
<li>De quem é o número de WhatsApp e quem paga a Meta.</li>
<li>A IA pode errar; horários e preços só valem após confirmação humana.</li>
<li>O cliente é responsável por manter as informações corretas.</li>
<li>⚖️ Dados pessoais (LGPD): a barbearia é a <i>controladora</i>, você é <i>operador</i>; OpenAI e Meta processam dados fora do Brasil.</li>
<li>⚖️ Limite de responsabilidade (ex.: até o valor de 1 mensalidade).</li>
<li>Sem garantia de funcionamento ininterrupto; meta de correção em até 1 dia útil.</li>
<li>⚖️ Foro (cidade onde se resolvem disputas).</li></ol></div>
<div class="card"><h3>Checklist de entrada de um cliente</h3><ul class="check">
<li>Contrato/termo assinado e 1ª mensalidade paga (ou piloto combinado por escrito).</li>
<li>Ficha: nome, endereço, link do mapa, horários, feriados.</li>
<li>Lista de serviços com preço e duração.</li>
<li>Formas de pagamento.</li>
<li>Nome e tom da atendente (ex.: Bia, informal).</li>
<li>O que a Bia NUNCA deve responder (ex.: descontos).</li>
<li>Número pessoal do dono para receber os avisos.</li>
<li>Número dedicado ativo na API oficial.</li>
<li>Aviso de privacidade curto na 1ª mensagem.</li>
<li>Teste com 20 perguntas do roteiro (Fase 10) aprovado pelo dono.</li>
<li>Data de revisão mensal da ficha marcada na agenda.</li></ul></div></div>
</section>''')

    # ================================================================ 5
    P.append(divisoria("5", "Plano financeiro", "Contas com premissas à vista. Mude qualquer premissa na planilha e veja o efeito."))
    P.append(f'''<section class="pg"><h2>Receita não é lucro</h2>
{tabela(["Conceito", "O que é", "Exemplo com 5 clientes (cenário base)"], [
    ["<b>Receita</b>", "Tudo que entra das mensalidades.", brl(M.linha(5, base)["receita"])],
    ["<b>Lucro bruto</b>", "Receita menos o custo de entregar o serviço (IA, WhatsApp, servidor, cobranças).", brl(M.linha(5, base)["bruto"])],
    ["<b>Lucro operacional</b>", "Lucro bruto menos impostos e despesas do negócio (contador).", brl(M.linha(5, base)["oper"])],
    ["<b>Lucro descontando seu tempo</b>", f"Lucro operacional menos as suas horas × R$ {M.VALOR_HORA:.0f}. Mostra se vale mais que um emprego por hora.", brl(M.linha(5, base)["oper_tempo"])],
    ["<b>Fluxo de caixa</b>", "O dinheiro que de fato entra e sai em cada dia. Você pode ter lucro no papel e ficar sem dinheiro se pagar o servidor anual adiantado e o cliente atrasar.", "—"],
], num=(2,))}
<h3>Premissas dos três cenários</h3>
{tabela(["", "Conservador", "Base", "Otimista"], [
    ["Mensalidade", "R$ 97", "R$ 147", "R$ 197"],
    ["Implantação (única, fora da tabela mensal)", "R$ 0", "R$ 197", "R$ 297"],
    ["Conversas por dia por cliente", "20", "15", "12"],
    ["Mensagens da Bia por conversa", "4", "3", "3"],
    ["Suas horas de suporte por cliente/mês", "1,5", "1,0", "0,75"],
    ["Servidor", "R$ 59,99 até 10 clientes · R$ 77,99 até 30 · R$ 155,98 acima", "idem", "idem"],
    ["Imposto sobre a receita · contador", f"{M.IMPOSTO*100:.0f}% · R$ 200/mês a partir de 6 clientes", "idem", "idem"],
    ["Cobrança", "R$ 2 por cliente/mês", "idem", "idem"],
    ["Custo de conquistar cliente", "R$ 0 em dinheiro (visitas a pé); custa tempo", "idem", "idem"],
])}
</section>''')

    xs = [1, 5, 10, 25, 50]
    series = [(n, cor, [M.linha(x, M.CENARIOS[n])["oper"] for x in xs]) for n, cor in
              (("Conservador", S.ORANGE), ("Base", S.BLUE), ("Otimista", S.AQUA))]

    def tab_cen(nome):
        c = M.CENARIOS[nome]
        return tabela(["Clientes", "Receita", "IA + WhatsApp", "Servidor + domínio", "Lucro bruto", "Impostos + contador", "Lucro operacional", "Horas/mês", "Lucro − seu tempo"],
                      [[x, brl(l["receita"]), brl(l["ia"] + l["wa"]), brl(l["infra"]), brl(l["bruto"]), brl(l["impostos"] + l["contador"]),
                        f'<b class="{"neg" if l["oper"] < 0 else ""}">{brl(l["oper"])}</b>', f'{l["horas"]:.1f}'.replace(".", ",") + (" ⚠️" if l["horas"] > 30 else ""),
                        f'<span class="{"neg" if l["oper_tempo"] < 0 else ""}">{brl(l["oper_tempo"])}</span>']
                       for x in xs for l in [M.linha(x, c)]], num=tuple(range(9)))

    P.append(f'''<section class="pg"><h2>Cenários: 1, 5, 10, 25 e 50 clientes</h2>
<figure>{S.linhas_lucro(series, xs)}<figcaption>Figura 5 — Lucro operacional mensal (antes do seu imposto de renda pessoal). {EST}</figcaption></figure>
<h3>Cenário base (R$ 147/mês) · equilíbrio: {M.equilibrio(base)} cliente</h3>
{tab_cen("Base")}
<p class="small">⚠️ = passa de 30 horas por mês, mais do que a sua 1 hora por dia. 25 ou 50 clientes só são possíveis com suporte automatizado ou delegado.</p>
</section>''')
    P.append(f'''<section class="pg"><h2>Cenários conservador e otimista</h2>
<h3>Conservador (R$ 97/mês, mais uso) · equilíbrio estável só a partir de {M.equilibrio(M.CENARIOS["Conservador"])} clientes</h3>
{tab_cen("Conservador")}
<div class="box perigo"><p><b>Leitura honesta:</b> a R$ 97 com 20 conversas por dia na API oficial, sobram cerca de R$ 18 por cliente depois dos custos de uso e impostos. Com 10 clientes, o contador já come o lucro. Nesse cenário o negócio não vale o seu tempo — por isso o preço precisa ficar perto de R$ 147 ou o uso precisa ter franquia.</p></div>
<h3>Otimista (R$ 197/mês, menos uso)</h3>
{tab_cen("Otimista")}
<h3>O que obriga a trocar de servidor ou de arquitetura</h3>
<ul><li><b>Memória:</b> o Langflow pede no mínimo 2 GB e recomenda 4 GB ou mais (guia de requisitos de hardware, 2026). Uma cópia de Langflow por cliente esgota um servidor de 4 GB rápido — é o principal motivo para migrar para a arquitetura B (multi-inquilino).</li>
<li><b>Picos de mensagens</b> no mesmo horário (sábado de manhã) deixam as respostas lentas.</li>
<li><b>Tempo seu</b>: acima de ≈ 14 clientes, o gargalo deixa de ser o servidor e passa a ser você.</li></ul>
</section>''')

    P.append(f'''<section class="pg"><h2>Orçamento mínimo e máximo</h2>
<div class="grid2">
<div class="card"><div class="kpi-l">Orçamento mínimo viável</div><div class="kpi">≈ R$ 30</div><ul>
<li>Crédito OpenAI: US$ 5 (≈ R$ 26) — o mínimo usual de recarga {NAO}</li>
<li>Seu PC + chip que você já tenha para a demonstração</li>
<li>Servidor: R$ 0 — só contrate quando houver piloto confirmado</li></ul>
<p class="small">Serve para: Fases 1 a 5 (preservar, verificar, entrevistar, conseguir o piloto).</p></div>
<div class="card"><div class="kpi-l">Orçamento máximo recomendado no início</div><div class="kpi">R$ 500</div><ul>
<li>Servidor KVM 1: R$ 59,99/mês (ou R$ 29,99 promocional, com contrato longo)</li>
<li>Chip dedicado + recarga: ≈ R$ 30 {NAO}</li>
<li>Domínio: ≈ R$ 40/ano {NAO}</li>
<li>OpenAI: até US$ 20 com teto de gasto</li>
<li>Reserva para 3 meses de servidor</li></ul>
<p class="small">Se você gastar R$ 500 e não tiver nenhum cliente pagando após 60 dias, pare e reavalie (Seção 7).</p></div></div>
<div class="box alerta"><h3>Por que não contratar o plano anual “barato” agora</h3><p>O preço promocional de servidor costuma exigir pagamento adiantado de 12–24 meses. Sem cliente, isso é dinheiro parado num negócio que ainda não foi validado. Comece no mensal, mesmo pagando mais por mês.</p></div>
<h3>Primeiro mês com 1 piloto pago (cenário base)</h3>
{tabela(["Entra", "Valor", "Sai", "Valor"], [
    ["Mensalidade do piloto", "R$ 147", "Servidor (mensal)", "R$ 59,99"],
    ["Implantação", "R$ 0 (isenta)", "Chip + recarga", "≈ R$ 30"],
    ["", "", "OpenAI + WhatsApp (uso)", brl(M.custo_mes(15, 3)["total"])],
    ["", "", "Domínio (anual, pago uma vez)", "≈ R$ 40"],
    ["<b>Total</b>", "<b>R$ 147</b>", "<b>Total</b>", f'<b>{brl(59.99 + 30 + M.custo_mes(15, 3)["total"] + 40)}</b>'],
], num=(1, 3))}
<p class="small">No 1º mês o caixa fica negativo por causa dos custos únicos; a partir do 2º mês, um único cliente já cobre o servidor no cenário base.</p>
</section>''')

    trabalho = [
        ["1", "≈ 5 h (implantação) + 1 h", "Tudo manual: você ajusta a ficha e responde ao dono", "Sobra tempo para prospectar"],
        ["5", "≈ 5 h", "Revisão mensal das fichas; alertas automáticos ligados", "Confortável"],
        ["10", "≈ 10 h + 2 implantações/mês", "Ficha preenchida pelo próprio dono num formulário", "No limite com prospecção"],
        ["14", "≈ 30 h", "Máximo com 1 h/dia (planilha, aba “Sua 1 hora por dia”)", "Teto"],
        ["25", "≈ 25–40 h", "Exige arquitetura B + suporte automatizado ou um ajudante", "Inviável só com 1 h/dia"],
        ["50", "≈ 40–75 h", "Exige ajudante pago (ex.: R$ 30/h × 20 h ≈ R$ 600/mês)", "Outro negócio"],
    ]
    P.append('<section class="pg"><h2>Sua 1 hora por dia: quantos clientes cabem</h2><p>Uma hora por dia são ≈ 30 horas por mês. Elas se dividem entre <b>implantar</b> clientes novos (≈ 5 h cada), <b>suporte</b> (≈ 1 h por cliente por mês) e <b>prospectar</b> (≈ 6 h por mês). Com 2 clientes novos por mês, sobram 14 horas de suporte: <b>cerca de 14 clientes</b>.</p>' +
             tabela(["Clientes", "Horas suas por mês", "Como funciona", "Situação"], trabalho) +
             '''<h3>O que dá para automatizar — e o que não dá</h3><div class="grid2">
<div class="card"><h3>Automatizável</h3><ul><li>Responder clientes finais (é o produto).</li><li>Alertas de “sistema caiu” e de gasto alto.</li><li>Backups diários.</li><li>Cobrança recorrente por Pix/cartão.</li><li>Formulário para o dono atualizar a ficha.</li></ul></div>
<div class="card"><h3>Não dá (ou não deve) automatizar</h3><ul><li><b>Vender:</b> dono de barbearia compra de quem conhece e confia.</li><li><b>Implantar a ficha:</b> exige entender o negócio.</li><li><b>Resolver reclamações:</b> uma resposta errada da IA precisa de conversa humana.</li><li><b>Decidir sobre preço e contrato.</b></li></ul></div></div>
<div class="box nota"><p><b>Isto não é renda passiva.</b> É um pequeno serviço recorrente que exige atenção diária, ainda que curta. Cada cliente novo começa com horas de trabalho e só depois se paga.</p></div></section>''')

    # ================================================================ 6
    P.append(divisoria("6", "Roteiro de implantação em 13 fases", "Em ordem. Cada fase diz o que você faz, o que um assistente de IA faz e quando é seguro avançar."))
    F = []
    F.append(fase(1, "Entender e preservar o projeto atual", "2–3 h", "R$ 0", dict(
        obj="Saber exatamente o que existe no seu PC, sem mudar nada.", porque="Não dá para melhorar o que não se conhece — e um “ajuste” às cegas pode destruir a sessão do WhatsApp.",
        acoes=["Encontre a pasta do VendeZap no Explorador de Arquivos. Anote o caminho (ex.: <code>C:\\Users\\voce\\VendeZap</code>).",
               "Liste o que há nela: procure um arquivo <code>package.json</code> (indica a ponte Node.js) e um arquivo <code>.env</code> (costuma guardar chaves — NÃO abra em público nem envie a ninguém).",
               "Descubra como o Langflow é aberto: um ícone de aplicativo (Langflow Desktop), uma janela preta de comando, ou Docker. Anote.",
               "No PowerShell (menu Iniciar → digite PowerShell), rode só comandos de leitura: <code>node -v</code> e <code>npm -v</code>. Anote os números. Se aparecer erro, anote o erro.",
               "Tire prints da tela do fluxo da Bia no Langflow."],
        voce="Tudo nesta fase — é o seu computador.", ia="Ler os prints e anotações e dizer qual tecnologia foi usada (ex.: whatsapp-web.js ou Baileys) e o que cada arquivo faz, se você copiar o conteúdo (sem as chaves).",
        acesso="Nenhum.", sucesso="Uma folha com: caminho da pasta, versão do Node, como o Langflow abre, nome do modelo de IA e prints do fluxo.",
        erros=["“node não é reconhecido”: o Node não está no caminho do sistema ou não está instalado. Não instale nada ainda; só anote.",
               "Não acha a pasta: procure no Explorador por “package.json” ou pelo nome do projeto."],
        avance="você tiver a folha de anotações completa.")))
    F.append(fase(2, "Verificar a demonstração atual", "1–2 h", "≈ US$ 0,10 de IA", dict(
        obj="Confirmar, com seus olhos, o que funciona hoje.", porque="O relato é que a ponte “foi conectada e testada”. Precisamos saber se funciona agora, de ponta a ponta.",
        acoes=["Ligue o Langflow e a ponte do jeito que você já fazia antes (não mude o procedimento).",
               "De OUTRO celular, mande 5 perguntas para o número da demonstração: preço, horário, endereço, pedido de horário e uma pergunta fora do assunto.",
               "Anote para cada uma: respondeu? em quantos segundos? a resposta estava certa?",
               "Abra platform.openai.com → Usage e confira se o gasto apareceu (prova que é a sua chave sendo usada)."],
        voce="Ligar, testar e anotar.", ia="Interpretar mensagens de erro que você copiar e sugerir a causa.",
        acesso="Sua conta OpenAI.", sucesso="5 de 5 respondidas, com até 1 erro de conteúdo.",
        erros=["Pede QR Code de novo: a sessão expirou. Antes de escanear, faça a Fase 3 (backup) e só então reconecte, com o SEU chip de teste.",
               "Responde em inglês ou inventa preço: o fluxo/ficha precisa de ajuste (Fase 10)."],
        avance="a demonstração funcionar em pelo menos 4 de 5 perguntas.")))
    F.append(fase(3, "Fazer backup do código, da configuração e da sessão", "30–60 min", "R$ 0", dict(
        obj="Ter uma cópia completa de onde voltar, guardada com segurança.", porque="Daqui em diante vamos mudar coisas. Sem backup, um erro custa o projeto inteiro.",
        acoes=["Feche a ponte e o Langflow (para os arquivos não estarem em uso).",
               "Clique com o botão direito na pasta do VendeZap → Enviar para → Pasta compactada. Renomeie para <code>VendeZap_backup_AAAA-MM-DD.zip</code>.",
               "No Langflow, exporte o fluxo da Bia (menu do fluxo → Exportar/Export). Se houver opção de incluir as chaves de API, deixe <b>desmarcada</b>.",
               "Guarde o .zip e o fluxo em 2 lugares: um pen drive/HD externo e uma pasta privada na nuvem (ex.: Google Drive, sem compartilhar).",
               "Atenção: a pasta da sessão do WhatsApp (nomes como <code>.wwebjs_auth</code>, <code>auth_info</code> ou <code>session</code> — depende do código) equivale a estar logado no número. Nunca envie a ninguém nem coloque no GitHub.",
               "Teste o backup: abra o .zip e confira que os arquivos estão lá."],
        voce="Tudo.", ia="Revisar a lista de arquivos e apontar o que é segredo (chaves, sessão).",
        acesso="Nenhum.", sucesso="Dois backups conferidos, com data no nome.",
        erros=["Zip muito grande: costuma ser a pasta <code>node_modules</code>; ela pode ficar de fora porque é reinstalável — mas na dúvida, inclua.",
               "Enviou o .env por engano: troque a chave da OpenAI imediatamente (platform.openai.com → API keys → revogar e criar outra)."],
        avance="o backup estiver em dois lugares e você souber onde.")))
    F.append(fase(4, "Escolher o nicho e entrevistar barbearias", "6–8 h em 1–2 semanas", "R$ 0", dict(
        obj="Ouvir 10–15 donos de barbearia sobre como atendem o WhatsApp hoje.", porque="É a forma mais barata de descobrir se a dor existe e quanto vale.",
        acoes=["Liste 20 barbearias num raio de 3 km (Google Maps, Instagram).",
               "Visite em horário calmo (terça a quinta, 14h–16h). Diga que está pesquisando, não vendendo.",
               "Pergunte sobre o comportamento real: “Quantas mensagens chegam por dia?” “Quem responde?” “Já perdeu cliente por demorar?” “Usa algum app de agenda? Quanto paga?”",
               "Mostre a demonstração da Navalha de Ouro no seu celular só no final.",
               "Anote tudo numa planilha simples: nome, mensagens/dia, quem responde, o que usa, quanto paga, interesse (0–3)."],
        voce="Visitas e conversas — não dá para delegar.", ia="Montar o roteiro, organizar as respostas e calcular médias.",
        acesso="Nenhum.", sucesso="10+ entrevistas e pelo menos 3 donos dizendo que topariam testar.",
        erros=["“Achei legal” não é validação. Vale o que o dono já gasta (tempo ou dinheiro) e se aceita testar pagando.",
               "Todos dizem que recebem pouca mensagem: o nicho pode não ter a dor — considere salões ou clínicas."],
        avance="houver 3 interessados reais e você souber quantas conversas por dia eles recebem.")))
    F.append(fase(5, "Validar a oferta com um piloto pago", "4–6 h", "R$ 0", dict(
        obj="Fechar 1 barbearia que aceite pagar (mesmo pouco) por 30 dias de teste.", porque="Pagar é a única prova de interesse que conta.",
        acoes=["Volte aos 3 interessados com a oferta da Seção 4: piloto de 30 dias por R$ 49 (ou grátis por 14 dias e R$ 147 a partir do 2º mês, se ele aprovar).",
               "Combine por escrito (WhatsApp vale): o que inclui, o que não inclui, número dedicado, data de início e de avaliação.",
               "Peça a ficha (serviços, preços, horários) e o número pessoal para os avisos."],
        voce="Negociar e fechar.", ia="Redigir o termo simples e a mensagem de proposta.",
        acesso="Pix do cliente para você.", sucesso="1 piloto combinado por escrito e pago (ou com data de pagamento).",
        erros=["Ninguém aceita pagar nem R$ 49: reveja a oferta antes de construir mais.",
               "O dono quer agendamento automático já: diga que não existe ainda; ofereça o que existe ou espere."],
        avance="houver um compromisso escrito de um dono real.")))
    F.append(fase(6, "Escolher e preparar a integração com o WhatsApp", "4–8 h", "chip ≈ R$ 20–30", dict(
        obj="Ter o número dedicado do piloto funcionando na API oficial.", porque="É o que separa um teste arriscado de um serviço que pode ser cobrado.",
        acoes=["Compre um chip novo para o número de agendamento do piloto (no nome de quem será o dono do número — combine isso com o cliente).",
               "Crie o portfólio empresarial na Meta (business.facebook.com) e um app de desenvolvedor (developers.facebook.com) com o produto WhatsApp. Siga o passo a passo oficial; um assistente de IA pode ler a tela com você.",
               "Registre o número dedicado e anote: identificador do número e token de acesso (é segredo, como a chave da OpenAI).",
               "Decida: API direta (R$ 0 fixo) ou provedor como 360dialog (≈ € 49/mês, mais simples). Para 1 piloto, a direta basta.",
               "NÃO reconecte nem migre a sessão de demonstração existente."],
        voce="Criar contas, receber SMS, aceitar termos, cadastrar cartão na Meta.", ia="Adaptar a ponte para receber mensagens da API oficial (webhook) em vez do QR Code, num projeto separado, sem apagar o atual.",
        acesso="Conta Meta, cartão de crédito, chip.", sucesso="Uma mensagem de teste enviada pelo painel da Meta chega no seu celular.",
        erros=["Meta pede verificação da empresa: pode levar dias; comece cedo.",
               "Número “já registrado no WhatsApp”: chips usados podem estar presos a uma conta; prefira chip novo."],
        avance="o número dedicado enviar e receber pelo painel da Meta.")))
    F.append(fase(7, "Escolher o servidor (VPS) pelo uso real", "1 h", "R$ 30–60/mês", dict(
        obj="Contratar o menor servidor que roda o necessário com folga.", porque="O PC de casa não serve para atendimento 24 h; um servidor grande demais é dinheiro parado.",
        acoes=["Requisito: Langflow pede 2 GB de memória no mínimo e recomenda 4 GB. Escolha 4 GB (ex.: Hostinger KVM 1).",
               "Prefira datacenter no Brasil ou nas Américas (menos atraso nas respostas).",
               "Contrate no plano MENSAL no início, mesmo mais caro.",
               "Sistema: Ubuntu LTS (versão de suporte longo). Anote o IP e guarde a senha num gerenciador de senhas."],
        voce="Pagar e criar a conta.", ia="Comparar os planos do dia e conferir se a memória basta.",
        acesso="Cartão; sua aprovação do valor.", sucesso="Painel do servidor mostrando “ativo”.",
        erros=["Comprou plano de 24 meses por impulso: verifique a política de reembolso (costuma haver prazo de arrependimento).",
               "Esqueceu a senha: o painel da hospedagem permite redefinir."],
        avance="houver piloto confirmado (Fase 5). Antes disso, não contrate.")))
    F.append(fase(8, "Instalar os serviços no servidor", "4–8 h (com assistente)", "R$ 0", dict(
        obj="Rodar ponte + Langflow (ou o substituto) no servidor, com endereço HTTPS.", porque="A API oficial só entrega mensagens num endereço seguro e sempre ligado.",
        acoes=["Peça a um assistente de IA de programação para preparar a instalação com Docker (empacota cada programa) ou com um gerenciador de processos (ex.: PM2) que reinicia a ponte se ela cair.",
               "Aponte um domínio ou subdomínio para o IP do servidor e ative HTTPS (certificado gratuito, como Let’s Encrypt).",
               "Copie para o servidor apenas: código, fluxo exportado e chaves (como variáveis de ambiente, nunca dentro do código).",
               "Cadastre o endereço do webhook no app da Meta."],
        voce="Aprovar cada comando antes de rodar; colar as chaves quando pedido.", ia="Escrever os arquivos de configuração e os comandos, explicando cada um, depois de inspecionar o servidor (versões, memória, disco).",
        acesso="Acesso ao servidor (SSH), domínio, chaves da OpenAI e da Meta.", sucesso="Mensagem para o número dedicado → resposta da Bia, com o servidor rodando e o seu PC desligado.",
        erros=["Falta de memória: o Langflow trava; troque para 8 GB ou migre para a arquitetura B.",
               "Webhook não valida: geralmente HTTPS ou token de verificação errado."],
        avance="a resposta chegar com o seu PC desligado.")))
    F.append(fase(9, "Persistência, segurança, monitoramento e recuperação", "2–4 h", "R$ 0–10/mês", dict(
        obj="Garantir que o serviço volta sozinho e que você fica sabendo quando cai.", porque="O dono da barbearia não vai avisar que a Bia parou — o cliente dele simplesmente vai embora.",
        acoes=["Reinício automático: ponte e Langflow voltam sozinhos após queda ou reinício do servidor (testar desligando de propósito).",
               "Monitor gratuito que acessa o endereço a cada 5 minutos e manda e-mail/Telegram se cair.",
               "Backup diário do fluxo, das fichas e do banco de dados para fora do servidor; testar uma restauração.",
               "Segurança: senha forte ou chave SSH, firewall liberando só o necessário, atualizações automáticas.",
               "Teto de gasto na OpenAI e alerta de cobrança na Meta.",
               "Escrever um “manual de recuperação” de 1 página: o que fazer se cair, onde está o backup, quem chamar."],
        voce="Aprovar, testar a queda proposital, guardar o manual.", ia="Configurar tudo e escrever o manual.",
        acesso="Servidor, OpenAI, Meta.", sucesso="Você desliga a ponte, recebe o alerta em até 10 min e ela volta sozinha.",
        erros=["Alertas demais: ajuste para avisar só depois de 2 falhas seguidas.",
               "Backup nunca testado: backup que não restaura não é backup."],
        avance="o teste de queda e a restauração do backup funcionarem.")))
    F.append(fase(10, "Testar o assistente de ponta a ponta", "2–3 h", "≈ US$ 0,50", dict(
        obj="Provar que a Bia responde certo, recusa o que não sabe e chama o humano.", porque="Cada erro de preço ou horário vira problema para o cliente do seu cliente.",
        acoes=["Monte 20 perguntas: 10 comuns, 5 difíceis (serviço que não existe, desconto, reclamação), 3 fora do assunto, 2 de “quero falar com alguém”.",
               "Rode as 20 no número dedicado. Marque certo/errado.",
               "Ajuste as instruções e a ficha; repita até ter pelo menos 18 de 20 certas e 0 preço inventado.",
               "Peça ao dono para fazer 10 perguntas dele e aprovar."],
        voce="Testar e julgar as respostas.", ia="Ajustar as instruções da Bia e a ficha.",
        acesso="Aprovação do dono.", sucesso="≥ 18/20 corretas, 0 confirmações falsas de horário, aprovação do dono.",
        erros=["Inventa preço: as instruções precisam dizer “use apenas a ficha; se não estiver lá, chame o humano”.",
               "Responde longo demais: limite para 2–3 frases."],
        avance="o dono aprovar por escrito.")))
    F.append(fase(11, "Colocar o primeiro cliente pagante no ar", "2 h + acompanhamento", "—", dict(
        obj="Ligar o atendimento para clientes reais e acompanhar a primeira semana.", porque="A primeira semana mostra os erros que nenhum teste mostrou.",
        acoes=["Combine o dia de início; o dono divulga o número de agendamento (bio do Instagram, Google, cartaz).",
               "Primeira mensagem da Bia inclui um aviso curto: “Sou a assistente virtual da barbearia; suas mensagens são usadas só para seu atendimento.”",
               "Nos primeiros 7 dias, leia todas as conversas uma vez por dia (15 min).",
               "Envie a cobrança no dia combinado."],
        voce="Acompanhar, ajustar, cobrar.", ia="Resumir as conversas do dia e apontar respostas suspeitas.",
        acesso="Pix/conta para receber.", sucesso="7 dias sem nenhum erro grave e pagamento recebido.",
        erros=["Cliente final reclama que falou com robô: reforce a apresentação e o caminho rápido para o humano.",
               "Dono não confirma os pedidos de horário: ajuste o aviso para chegar onde ele vê (o WhatsApp pessoal dele)."],
        avance="o pagamento entrar e o dono quiser continuar.")))
    F.append(fase(12, "Acompanhar custos, estabilidade e resultados", "30 min por semana", "—", dict(
        obj="Saber, toda semana, se cada cliente dá lucro e se o serviço está estável.", porque="Um cliente que estoura a franquia pode dar prejuízo sem você perceber.",
        acoes=["Toda semana: gasto da OpenAI (Usage), gasto da Meta, conversas por cliente, quedas da semana.",
               "Todo mês: lucro por cliente na planilha (aba Cenários), pergunta ao dono “quantos horários vieram pela Bia?”."],
        voce="Olhar os números e decidir.", ia="Montar um resumo semanal automático.",
        acesso="Painéis da OpenAI e da Meta.", sucesso="Você sabe o lucro de cada cliente sem adivinhar.",
        erros=["Gasto sobe sem mais conversas: pode ser um laço (a Bia respondendo a outro robô). O teto de gasto protege; investigue."],
        avance="houver 4 semanas de números estáveis.")))
    F.append(fase(13, "Padronizar a entrada de novos clientes", "8–15 h (com assistente)", "R$ 0", dict(
        obj="Fazer o cliente nº 5 dar metade do trabalho do cliente nº 1.", porque="Com 1 hora por dia, o seu tempo é o limite do negócio.",
        acoes=["Formulário para o dono preencher a ficha sozinho.",
               "Migrar para a arquitetura B (um sistema, fichas separadas) antes do 4º cliente.",
               "Modelo de contrato revisado por advogado.",
               "Cobrança recorrente automática.",
               "Página simples de apresentação com o exemplo da Bia e um botão de WhatsApp para contato."],
        voce="Aprovar, revisar o contrato com o advogado.", ia="Construir o formulário, a arquitetura B com testes que provam que clientes não se misturam, e a página.",
        acesso="Advogado, meio de cobrança recorrente.", sucesso="Implantação de um cliente novo em ≤ 2 horas suas.",
        erros=["Migrar com clientes ativos sem plano de volta: faça a troca fora do horário comercial, com backup e teste antes."],
        avance="—  é o estado de “produto”. A partir daqui, cresça só até onde o seu tempo deixar.")))
    P.append('<section class="pg"><h2>Fases 1 a 4</h2>' + "".join(F[0:2]) + '</section>')
    P.append('<section class="pg">' + "".join(F[2:4]) + '</section>')
    P.append('<section class="pg"><h2>Fases 5 a 8</h2>' + "".join(F[4:6]) + '</section>')
    P.append('<section class="pg">' + "".join(F[6:8]) + '</section>')
    P.append('<section class="pg"><h2>Fases 9 a 13</h2>' + "".join(F[8:10]) + '</section>')
    P.append('<section class="pg">' + "".join(F[10:12]) + '</section>')
    P.append('<section class="pg">' + F[12] + f'''<h3>Linha do tempo sugerida (com 1 hora por dia)</h3>
<figure>{S.linha_tempo([("Semana 1", "Fases 1–3|preservar e verificar"), ("Semanas 2–3", "Fases 4–5|entrevistas e piloto"), ("Semanas 4–6", "Fases 6–10|API oficial e servidor"), ("Semana 7+", "Fases 11–13|cliente no ar")])}<figcaption>Figura 6 — Datas aproximadas. As fases 6 a 9 são as mais técnicas e podem atrasar com verificações da Meta.</figcaption></figure></section>''')

    # ================================================================ 7
    P.append(divisoria("7", "Riscos, regras e manutenção", "O que pode dar errado, as regras que se aplicam e a rotina para manter tudo de pé."))
    riscos = [("Número bloqueado (ponte QR)", 2, 2), ("IA informa preço errado", 1, 2), ("Vazamento de chave", 0, 2),
              ("Servidor cai", 1, 1), ("Cliente cancela", 1, 1), ("Meta/OpenAI mudam preço", 1, 1),
              ("Falta de tempo seu", 2, 1), ("Custo dispara (laço)", 0, 1), ("Concorrente mais barato", 1, 0)]
    P.append(f'''<section class="pg"><h2>Matriz de riscos</h2>
<figure>{S.matriz_risco(riscos)}<figcaption>Figura 7 — Avaliação qualitativa minha. Vermelho = tratar antes do primeiro cliente.</figcaption></figure>
{tabela(["Risco", "Como reduzir"], [
    ["Número bloqueado", "API oficial para clientes pagantes; ponte QR só no seu chip de demonstração."],
    ["IA informa preço errado", "“Use só a ficha”; revisão mensal; teste das 20 perguntas a cada mudança."],
    ["Vazamento de chave", "Chaves só no servidor; nunca no GitHub, em prints ou mensagens; teto de gasto."],
    ["Falta de tempo seu", "Teto de ≈ 14 clientes; formulário de ficha; arquitetura B."],
    ["Custo dispara", "Teto mensal na OpenAI; franquia de conversas no contrato; alerta semanal."],
])}
<div class="box perigo"><h3>Critérios para parar ou mudar de rumo</h3><ul>
<li>15 conversas com donos e nenhum piloto pago aceito → mude nicho ou oferta.</li>
<li>Piloto rodando 30 dias e o dono não percebe valor (“não mudou nada”) → reveja o produto antes de vender para outro.</li>
<li>Lucro por cliente abaixo de R$ 50/mês depois de impostos → suba o preço ou reduza o uso.</li>
<li>Gastou R$ 500 e, em 60 dias, nenhum cliente paga → pare.</li></ul></div>
</section>''')

    P.append('''<section class="pg"><h2>LGPD, Código de Defesa do Consumidor e regras do WhatsApp</h2>
<p class="small">Resumo informativo, não é aconselhamento jurídico. Antes de ter vários clientes, consulte um advogado.</p>
<div class="grid2">
<div class="card"><h3>LGPD (Lei 13.709/2018)</h3><ul>
<li>A barbearia é a <b>controladora</b> (decide para que os dados servem); você é <b>operador</b> (trata em nome dela); OpenAI e Meta também tratam dados.</li>
<li>Avise o cliente final, na 1ª mensagem, que fala com assistente virtual e para que os dados são usados.</li>
<li>Colete o mínimo: nome e serviço desejado. Nada de CPF, saúde ou dados sensíveis.</li>
<li>Defina por quanto tempo o histórico fica guardado (ex.: 90 dias) e apague depois.</li>
<li>Dados vão para servidores fora do Brasil (OpenAI, Meta): isso precisa constar no contrato e no aviso.</li>
<li>Tenha um contato para pedidos de “apaguem meus dados”.</li></ul></div>
<div class="card"><h3>Código de Defesa do Consumidor</h3><ul>
<li>Informação de preço precisa ser clara, e a oferta informada obriga o fornecedor (art. 30) — por isso a ficha certa é obrigação, não capricho.</li>
<li>O cliente final deve conseguir falar com um humano.</li>
<li>Nunca confirmar o que não foi confirmado.</li></ul>
<h3>Regras do WhatsApp</h3><ul>
<li>Integração não oficial viola os termos de uso.</li>
<li>Na API oficial: sem mensagens não solicitadas; marketing só com consentimento (opt-in).</li>
<li>Desde 15/01/2026: proibidos assistentes de IA “de uso geral”; atendimento de uma empresa está permitido.</li></ul></div></div>
<h3>Seu enquadramento como empresa</h3>
<p>Para emitir nota e receber de empresas, o ideal é ter CNPJ. O DAS do MEI de serviços em 2026 é R$ 86,05/mês, mas <b>nem toda atividade de tecnologia pode ser MEI</b> — confirme com um contador qual atividade (CNAE) descreve o VendeZap. Se não couber no MEI, uma ME no Simples Nacional paga a partir de ≈ 6% sobre a receita, mais o contador. Para os primeiros pilotos, receber como pessoa física e declarar no imposto de renda é possível; pergunte ao contador o melhor caminho.</p>
</section>''')

    P.append(tabela(["Quando", "O quê", "Tempo"], [
        ["<b>Diário</b>", "Conferir alertas (queda/gasto); responder pedidos dos donos; nos primeiros 7 dias de cada cliente, ler as conversas.", "5–15 min"],
        ["<b>Semanal</b>", "Gasto OpenAI + Meta; conversas por cliente; quedas da semana; 1 conversa de prospecção.", "30–45 min"],
        ["<b>Mensal</b>", "Revisar a ficha de cada cliente com o dono; cobrar; atualizar a planilha; testar a restauração de um backup; atualizar o sistema do servidor.", "1–2 h + 15 min/cliente"],
        ["<b>Trimestral</b>", "Conferir preços da OpenAI, da Meta e do servidor; reavaliar o preço de venda; conferir o contrato.", "1 h"],
    ]).join(['<section class="pg"><h2>Rotina de manutenção</h2><p>O que mantém o serviço de pé depois que ele está no ar.</p>', '''
<h2>O que NÃO fazer ainda</h2>
<div class="box perigo"><ul>
<li>Não ligar a ponte não oficial no número principal de nenhum cliente.</li>
<li>Não reconectar, apagar nem “migrar” a sessão atual do WhatsApp sem backup.</li>
<li>Não contratar servidor anual, anúncios ou ferramentas pagas antes de ter um piloto confirmado.</li>
<li>Não vender agendamento automático, pagamentos ou envios em massa — ainda não existem.</li>
<li>Não atender restaurantes e varejo ao mesmo tempo que barbearias.</li>
<li>Não colocar chaves, a pasta de sessão ou o arquivo .env no GitHub, em prints ou mensagens.</li>
<li>Não chamar isto de renda passiva: é um serviço que exige atenção diária.</li></ul></div>
<h2>A única próxima ação</h2>
<div class="box ok"><p style="font-size:11pt;"><b>Hoje, em 30 minutos:</b> faça o backup da Fase 3 (pasta compactada + fluxo exportado sem chaves), guarde em dois lugares e anote o caminho da pasta, a versão do Node e o nome do modelo de IA. Depois, abra o <b>VendeZap_Plano_30_Dias.pdf</b> no Dia 1.</p></div></section>''']))

    refs = [
        "OpenAI Help Center — “Managing billing for ChatGPT and the API platform” e “Is API usage included in ChatGPT Plus?” · help.openai.com/en/articles/9039756 e /8156019 · consultado em 16/10/2026.",
        "Preços da API OpenAI (gpt-5-mini US$ 0,25/2,00; gpt-5-nano US$ 0,05/0,40) — spendlint.dev/pricing/openai-api; benchlm.ai/openai/api-pricing (out/2026). Página oficial: openai.com/api/pricing (não acessível do ambiente desta pesquisa).",
        "Cobrança de mensagens de serviço do WhatsApp a partir de 01/10/2026 (1.000 grátis por número; R$ 0,035; marketing R$ 0,3217) — letalk.com.br/blog/cobranca-mensagens-de-servico-whatsapp; chat2desk.com.br/blog/nova-cobranca-whatsapp-outubro-2026-mensagens-de-servico; ecommercebrasil.com.br (artigo “Novo custo do WhatsApp”); evotalks.com.br (out/2026). Oficial: developers.facebook.com/docs/whatsapp/pricing.",
        "Cobrança por mensagem desde 01/07/2025 — blueticks.co/blog/whatsapp-business-api-pricing-2026; setsmart.io/blog/whatsapp-business-api-pricing (2026).",
        "Regra da Meta contra chatbots de uso geral (vigente em 15/01/2026) — techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform.",
        "Coexistência App + API — chakrahq.com/article/whatsapp-coexistence-business-app-register-cloud-api; guiawabusiness.cliengo.com/coexistence (2026).",
        "Riscos de bibliotecas não oficiais (Baileys) — zylos.ai/research/2026-01-26-whatsapp-api-automation.",
        "360dialog — docs.360dialog.com/docs/360dialog/prices-plans-and-payment-options; pricingsaas.com/companies/360dialog/diffs/2026Q2.",
        "VPS Hostinger (KVM 1 R$ 29,99/59,99; KVM 2 R$ 43,99/77,99, verificação de 27/08/2026) — guiadohost.com/2026/05/12/vps-barato-no-brasil-2026…; kildaryoliver.com.br/quanto-custa-vps-hostinger-brasil.",
        "Hetzner — findstack.com/resources/hetzner-price-increase-2026; deploywise.dev/blog/cheap-vps-for-developers (2026).",
        "Requisitos do Langflow (2 GB mínimo, 4 GB recomendado; PostgreSQL em produção) — shop.zimaspace.com/pages/langflow-hardware-requirements. Oficial: docs.langflow.org.",
        "BotConversa (R$ 189/199 por mês, jul/2026) — dealism.ai/pt/blog/botconversa-price-setup-whatsapp-api-review.",
        "Anota AI / iFood — startups.com.br/noticias/exclusivo-ifood-compra-a-anota-ai…; take.app/id/alternatives/anota-ai.",
        "Booksy (US$ 29,99/mês, jul/2026) — koalendar.com/pt-br/blog/precos-booksy.",
        "Disposição a pagar de barbeiros (relato) — tabnews.com.br/semk/f66eabe6-962f-405c-bc36-45f9a33a7817.",
        "Sebrae: WhatsApp principal canal para mais de 80% dos negócios de serviço (Pesquisa Serviço 2025) e 82% (Pulso dos Pequenos Negócios, 2026) — agenciasebrae.com.br/cultura-empreendedora/whatsapp-e-o-principal-meio-de-comunicacao-para-80-dos-negocios-de-servico.",
        "DAS-MEI 2026 (salário mínimo R$ 1.621; serviços R$ 86,05) — opovo.com.br/noticias/economia/2026/01/02/contribuicao-mensal-do-mei-sobe-para-rs-8105-em-2026.html.",
        "Câmbio US$ 1 = R$ 5,15 em 16/09/2026 — meelion.com/indicadores-financeiros/dolar-hoje. Confira a PTAX no Banco Central no dia.",
        "LGPD — Lei 13.709/2018 (planalto.gov.br); jornalcontabil.com.br/noticia/lgpd-e-os-chatbots-confira-algumas-acoes-para-adequar-sua-empresa.",
        "Código de Defesa do Consumidor — Lei 8.078/1990, art. 30 (planalto.gov.br).",
    ]
    P.append('<section class="pg"><h2>Referências</h2><p class="small">Todas consultadas em 16/10/2026. Onde está escrito “oficial”, é o lugar para confirmar o preço antes de pagar.</p><ol class="ref">' +
             "".join(f"<li>{r}</li>" for r in refs) + '</ol></section>')
    html = "".join(P).replace('<!--band--><section class="pg">', '<section>')
    return pagina_html("VendeZap — Guia Completo", html)


if __name__ == "__main__":
    render_pdf(construir(), DESTINO)            # 1ª passada: descobre as páginas
    marc = [t for n, t, _ in SECOES] + [s for _, _, subs in SECOES for s in subs]
    pags = paginas_de(DESTINO, marc, a_partir=3)
    faltam = [m for m in marc if m not in pags]
    render_pdf(construir(pags), DESTINO)        # 2ª passada: sumário com números
    print("páginas encontradas:", len(pags), "faltando:", faltam)
