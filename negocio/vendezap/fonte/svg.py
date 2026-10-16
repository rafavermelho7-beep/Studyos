"""Diagramas e gráficos vetoriais (SVG) do guia. Cores = paleta de referência (skill dataviz)."""
from html import escape as e

NAVY, BLUE, ORANGE, AQUA = "#12324a", "#2a78d6", "#eb6834", "#1baf7a"
INK, INK2, MUTED, LINE = "#0b0b0b", "#3d3c39", "#6b6a66", "#d9d8d3"
BLUE_T, ORANGE_T, AQUA_T, YEL_T, RED_T = "#e8f1fb", "#fdf0ea", "#e7f6f0", "#fff7e0", "#fbeceb"


def caixa(x, y, w, h, titulo, sub="", fill=BLUE_T, stroke=BLUE, tsize=12):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'
    ty = y + h / 2 + (-4 if sub else 4)
    s += f'<text x="{x + w/2}" y="{ty}" text-anchor="middle" font-size="{tsize}" font-weight="700" fill="{INK}">{e(titulo)}</text>'
    if sub:
        s += f'<text x="{x + w/2}" y="{ty + 15}" text-anchor="middle" font-size="9.5" fill="{INK2}">{e(sub)}</text>'
    return s


def seta(x1, y1, x2, y2, cor=MUTED, rot=""):
    s = f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{cor}" stroke-width="1.6" marker-end="url(#ponta)"/>'
    if rot:
        s += f'<text x="{(x1+x2)/2 + 6}" y="{(y1+y2)/2 + 3}" font-size="9" fill="{MUTED}">{e(rot)}</text>'
    return s


DEFS = (f'<defs><marker id="ponta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
        f'<path d="M0,0 L10,5 L0,10 z" fill="{MUTED}"/></marker></defs>')


def svg(w, h, corpo, titulo):
    return (f'<svg viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="{e(titulo)}" '
            f'xmlns="http://www.w3.org/2000/svg">{DEFS}{corpo}</svg>')


def fluxo_sistema():
    """Diagrama vertical: cliente → ... → resposta, com explicação à direita."""
    etapas = [
        ("Cliente da barbearia", "manda “tem horário amanhã?”", "#ffffff", LINE,
         "Uma pessoa comum, no celular dela. Não sabe (nem precisa saber) que fala com uma IA — mas deve ser avisada."),
        ("WhatsApp", "aplicativo / servidores da Meta", "#ffffff", LINE,
         "Transporta a mensagem até o número da barbearia."),
        ("Integração com o WhatsApp", "ponte QR Code (hoje) ou API oficial", ORANGE_T, ORANGE,
         "A “tomada” que deixa um programa ler e enviar mensagens daquele número."),
        ("Ponte Node.js (VendeZap)", "programa que fica ligado 24 h", BLUE_T, BLUE,
         "Recebe a mensagem, descobre de qual negócio ela é e repassa ao fluxo de IA."),
        ("Fluxo no Langflow", "a “receita” da atendente Bia", BLUE_T, BLUE,
         "Junta: instruções da Bia + dados do negócio + histórico da conversa."),
        ("Modelo de IA (OpenAI)", "ex.: gpt-5-mini, cobrado por uso", AQUA_T, AQUA,
         "Lê tudo e escreve a resposta. Cobra por tokens (pedaços de texto)."),
        ("Dados do negócio", "serviços, preços, horários, endereço", YEL_T, "#c98500",
         "A “ficha” da barbearia. Se estiver errada, a IA responde errado."),
        ("Resposta volta ao cliente", "pelo mesmo caminho, em segundos", "#ffffff", LINE,
         "Casos difíceis vão para um humano (o barbeiro)."),
    ]
    W, bw, bh, gap, x0 = 760, 270, 46, 20, 10
    corpo = ""
    for i, (t, sub, f, st, expl) in enumerate(etapas):
        y = 10 + i * (bh + gap)
        corpo += caixa(x0, y, bw, bh, t, sub, f, st, 11.5)
        if i < len(etapas) - 1:
            corpo += seta(x0 + bw / 2, y + bh, x0 + bw / 2, y + bh + gap - 2)
        # explicação
        corpo += f'<line x1="{x0+bw+8}" y1="{y+bh/2}" x2="{x0+bw+26}" y2="{y+bh/2}" stroke="{LINE}" stroke-width="1"/>'
        palavras, linhas, atual = expl.split(), [], ""
        for p in palavras:
            if len(atual) + len(p) > 62:
                linhas.append(atual); atual = p
            else:
                atual = (atual + " " + p).strip()
        linhas.append(atual)
        for k, l in enumerate(linhas):
            corpo += (f'<text x="{x0+bw+32}" y="{y + bh/2 - (len(linhas)-1)*6.5 + k*13 + 4}" '
                      f'font-size="10" fill="{INK2}">{e(l)}</text>')
    H = 10 + len(etapas) * (bh + gap)
    # seta de retorno
    corpo += (f'<path d="M{x0+4},{H-gap-bh/2} C {x0-6},{H/2} {x0-6},{H/2} {x0+4},{10+bh/2}" fill="none" '
              f'stroke="{AQUA}" stroke-width="1.4" stroke-dasharray="4 3"/>')
    return svg(W, H, corpo, "Fluxo completo de uma mensagem no VendeZap")


def multi_clientes():
    """Comparação: piloto (cópia por cliente) × escalável (um sistema, vários inquilinos)."""
    W, H = 760, 330
    c = ""
    c += f'<text x="185" y="18" text-anchor="middle" font-size="12.5" font-weight="700" fill="{NAVY}">A · Piloto: uma cópia por cliente</text>'
    c += f'<text x="570" y="18" text-anchor="middle" font-size="12.5" font-weight="700" fill="{NAVY}">B · Escalável: um sistema, fichas separadas</text>'
    c += f'<line x1="380" y1="5" x2="380" y2="{H-5}" stroke="{LINE}" stroke-dasharray="3 3"/>'
    nomes = ["Barbearia A", "Barbearia B", "Barbearia C"]
    for i, n in enumerate(nomes):
        y = 35 + i * 95
        c += caixa(10, y, 95, 40, n, "número próprio", "#fff", LINE, 10.5)
        c += seta(105, y + 20, 128, y + 20)
        c += caixa(130, y, 105, 40, f"Ponte {n[-1]}", "processo próprio", BLUE_T, BLUE, 10.5)
        c += seta(235, y + 20, 258, y + 20)
        c += caixa(260, y, 110, 40, f"Fluxo {n[-1]}", "dados + chave", BLUE_T, BLUE, 10.5)
    c += f'<text x="190" y="{H-12}" text-anchor="middle" font-size="9.5" fill="{INK2}">Simples de entender · cada cliente novo = mais uma cópia para manter</text>'
    for i, n in enumerate(nomes):
        y = 35 + i * 95
        c += caixa(395, y, 95, 40, n, "número próprio", "#fff", LINE, 10.5)
        c += seta(490, y + 20, 528, 150 + 20 * (i - 1))
    c += caixa(530, 105, 110, 90, "Um único", "VendeZap central", BLUE_T, BLUE, 11)
    c += f'<text x="585" y="185" text-anchor="middle" font-size="8.5" fill="{INK2}">identifica o negócio</text>'
    for i, n in enumerate(nomes):
        y = 45 + i * 85
        c += seta(640, 150, 665, y + 20)
        c += caixa(667, y, 85, 40, f"Ficha {n[-1]}", "dados isolados", YEL_T, "#c98500", 10)
    c += f'<text x="570" y="{H-12}" text-anchor="middle" font-size="9.5" fill="{INK2}">Mais trabalho no início · 1 atualização vale para todos</text>'
    return svg(W, H, c, "Arquitetura para vários clientes: piloto versus escalável")


def rota_whatsapp():
    W, H = 760, 150
    c = ""
    fases = [("Hoje", "Demonstração", "ponte QR Code no SEU chip de teste", ORANGE_T, ORANGE),
             ("Piloto pago", "1 a 3 barbearias", "API oficial, número dedicado", AQUA_T, AQUA),
             ("Produto", "4+ clientes", "API oficial (direta ou via provedor)", BLUE_T, BLUE)]
    for i, (q, t, s, f, st) in enumerate(fases):
        x = 10 + i * 252
        c += f'<text x="{x+110}" y="18" text-anchor="middle" font-size="10" font-weight="700" fill="{MUTED}">{e(q.upper())}</text>'
        c += caixa(x, 28, 220, 70, t, s, f, st, 12.5)
        if i < 2:
            c += seta(x + 222, 63, x + 250, 63)
    c += (f'<text x="380" y="125" text-anchor="middle" font-size="10" fill="{INK2}">Nunca coloque a ponte não oficial no número principal de um cliente pagante.</text>')
    return svg(W, H, c, "Rota recomendada de integração com o WhatsApp")


def barras_custo(dados):
    """Barras empilhadas: custo IA + WhatsApp por mês, para 20/50/100 conversas/dia.
    dados = [(rotulo, ia, wa)]"""
    W, H, ml, mb, mt = 760, 270, 70, 40, 30
    maxv = max(ia + wa for _, ia, wa in dados)
    topo = 100 * ((maxv // 100) + 1)
    pw, ph = W - ml - 20, H - mb - mt
    c = ""
    for k in range(0, int(topo) + 1, 100):
        y = mt + ph - ph * k / topo
        c += f'<line x1="{ml}" y1="{y}" x2="{W-20}" y2="{y}" stroke="#ecebe7" stroke-width="1"/>'
        c += f'<text x="{ml-8}" y="{y+3.5}" text-anchor="end" font-size="9.5" fill="{MUTED}">R$ {k}</text>'
    bw = 90
    for i, (rot, ia, wa) in enumerate(dados):
        cx = ml + pw * (i + 0.5) / len(dados)
        x = cx - bw / 2
        hia, hwa = ph * ia / topo, ph * wa / topo
        yb = mt + ph
        c += f'<rect x="{x}" y="{yb-hia}" width="{bw}" height="{hia}" fill="{BLUE}"/>'
        if hwa > 0:
            c += f'<rect x="{x}" y="{yb-hia-hwa}" width="{bw}" height="{max(hwa-2,0)}" rx="3" fill="{ORANGE}"/>'
        tot = ia + wa
        c += (f'<text x="{cx}" y="{yb-hia-hwa-7}" text-anchor="middle" font-size="11" font-weight="700" fill="{INK}">'
              f'R$ {tot:,.0f}</text>'.replace(",", "."))
        c += f'<text x="{cx}" y="{yb+16}" text-anchor="middle" font-size="10.5" fill="{INK2}">{e(rot)}</text>'
    c += f'<line x1="{ml}" y1="{mt+ph}" x2="{W-20}" y2="{mt+ph}" stroke="{MUTED}"/>'
    # legenda
    c += f'<rect x="{ml}" y="6" width="12" height="12" rx="2" fill="{BLUE}"/><text x="{ml+17}" y="16" font-size="10" fill="{INK2}">IA (OpenAI)</text>'
    c += f'<rect x="{ml+110}" y="6" width="12" height="12" rx="2" fill="{ORANGE}"/><text x="{ml+127}" y="16" font-size="10" fill="{INK2}">WhatsApp API oficial (acima da franquia)</text>'
    return svg(W, H, c, "Custo mensal de uso por cliente")


def linhas_lucro(series, xs):
    """Lucro operacional por nº de clientes, 3 cenários. series = [(nome, cor, [valores])]."""
    W, H, ml, mb, mt, mr = 760, 300, 80, 40, 34, 110
    vals = [v for _, _, vs in series for v in vs]
    lo, hi = min(0, min(vals)), max(vals)
    passo = 2000
    lo_t, hi_t = passo * ((lo // passo)), passo * ((hi // passo) + 1)
    pw, ph = W - ml - mr, H - mb - mt
    Y = lambda v: mt + ph - ph * (v - lo_t) / (hi_t - lo_t)
    X = lambda i: ml + pw * i / (len(xs) - 1)
    c = ""
    v = lo_t
    while v <= hi_t:
        c += f'<line x1="{ml}" y1="{Y(v)}" x2="{ml+pw}" y2="{Y(v)}" stroke="{"#9a9994" if v == 0 else "#ecebe7"}" stroke-width="1"/>'
        rot = ("−" if v < 0 else "") + f"R$ {abs(v):,.0f}".replace(",", ".")
        c += f'<text x="{ml-8}" y="{Y(v)+3.5}" text-anchor="end" font-size="9.5" fill="{MUTED}">{rot}</text>'
        v += passo
    for i, x in enumerate(xs):
        c += f'<text x="{X(i)}" y="{mt+ph+16}" text-anchor="middle" font-size="10" fill="{INK2}">{x} cliente{"s" if x > 1 else ""}</text>'
    for nome, cor, vs in series:
        pts = " ".join(f"{X(i)},{Y(v)}" for i, v in enumerate(vs))
        c += f'<polyline points="{pts}" fill="none" stroke="{cor}" stroke-width="2"/>'
        for i, v in enumerate(vs):
            c += f'<circle cx="{X(i)}" cy="{Y(v)}" r="4.5" fill="{cor}" stroke="#fff" stroke-width="2"/>'
        c += (f'<text x="{X(len(xs)-1)+10}" y="{Y(vs[-1])+4}" font-size="10.5" font-weight="700" fill="{INK}">{e(nome)}</text>')
        c += (f'<text x="{X(len(xs)-1)+10}" y="{Y(vs[-1])+17}" font-size="9.5" fill="{INK2}">R$ {vs[-1]:,.0f}</text>'
              .replace(",", "."))
    # legenda
    lx = ml
    for nome, cor, _ in series:
        c += f'<rect x="{lx}" y="8" width="12" height="12" rx="2" fill="{cor}"/><text x="{lx+17}" y="18" font-size="10" fill="{INK2}">{e(nome)}</text>'
        lx += 120
    c += f'<text x="{ml+pw}" y="18" text-anchor="end" font-size="9" fill="{MUTED}">linha cinza = R$ 0</text>'
    return svg(W, H, c, "Lucro operacional mensal por número de clientes")


def matriz_risco(riscos):
    """riscos = [(rotulo, prob 0-2, impacto 0-2)]"""
    W, H, ml, mt, cw, ch = 760, 340, 110, 20, 210, 95
    cores = [[AQUA_T, YEL_T, ORANGE_T], [YEL_T, ORANGE_T, RED_T], [ORANGE_T, RED_T, RED_T]]
    c = ""
    rot_p = ["Baixa", "Média", "Alta"]
    rot_i = ["Baixo", "Médio", "Alto"]
    for pi in range(3):
        for ii in range(3):
            x, y = ml + pi * cw, mt + (2 - ii) * ch
            c += f'<rect x="{x}" y="{y}" width="{cw-4}" height="{ch-4}" rx="6" fill="{cores[pi][ii]}"/>'
    for i in range(3):
        c += f'<text x="{ml + i*cw + cw/2}" y="{mt+3*ch+14}" text-anchor="middle" font-size="10" fill="{INK2}">{rot_p[i]}</text>'
        c += f'<text x="{ml-10}" y="{mt + (2-i)*ch + ch/2}" text-anchor="end" font-size="10" fill="{INK2}">{rot_i[i]}</text>'
    c += f'<text x="{ml + 1.5*cw}" y="{mt+3*ch+30}" text-anchor="middle" font-size="10.5" font-weight="700" fill="{NAVY}">PROBABILIDADE →</text>'
    c += f'<text x="18" y="{mt+1.5*ch}" font-size="10.5" font-weight="700" fill="{NAVY}" transform="rotate(-90 18 {mt+1.5*ch})" text-anchor="middle">IMPACTO →</text>'
    cont = {}
    for rot, p, i in riscos:
        k = cont.get((p, i), 0); cont[(p, i)] = k + 1
        x, y = ml + p * cw + 8, mt + (2 - i) * ch + 18 + k * 15
        c += f'<text x="{x}" y="{y}" font-size="9.5" fill="{INK}">• {e(rot)}</text>'
    return svg(W, H + 20, c, "Matriz de riscos")


def linha_tempo(semanas):
    """semanas = [(titulo, sub)]"""
    W, H = 760, 120
    c = f'<line x1="30" y1="40" x2="730" y2="40" stroke="{LINE}" stroke-width="3"/>'
    cores = [ORANGE, BLUE, AQUA, NAVY]
    for i, (t, s) in enumerate(semanas):
        x = 30 + i * (700 / (len(semanas) - 1)) if len(semanas) > 1 else 30
        c += f'<circle cx="{x}" cy="40" r="10" fill="{cores[i % 4]}" stroke="#fff" stroke-width="3"/>'
        anc = "start" if i == 0 else ("end" if i == len(semanas) - 1 else "middle")
        c += f'<text x="{x}" y="20" text-anchor="{anc}" font-size="11" font-weight="700" fill="{NAVY}">{e(t)}</text>'
        for k, l in enumerate(s.split("|")):
            c += f'<text x="{x}" y="{70 + k*14}" text-anchor="{anc}" font-size="9.5" fill="{INK2}">{e(l)}</text>'
    return svg(W, H, c, "Linha do tempo")
