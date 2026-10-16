"""Gera VendeZap_Custos.xlsx com fórmulas vivas (edite a aba Premissas)."""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import modelo as M

wb = Workbook()
AZUL = Font(color="0000FF")              # entrada editável
NEG = Font(bold=True)
TIT = Font(bold=True, size=14, color="12324A")
CAB = PatternFill("solid", fgColor="DCE8F5")
ENT = PatternFill("solid", fgColor="FFF8DC")
fino = Side(style="thin", color="C9C9C9")
BORDA = Border(top=fino, bottom=fino, left=fino, right=fino)
BRL = 'R$ #,##0.00;[Red]-R$ #,##0.00'
BRL0 = 'R$ #,##0;[Red]-R$ #,##0'

# ---------------- Premissas ----------------
p = wb.active
p.title = "Premissas"
p["A1"] = "VendeZap — Premissas (células amarelas com texto azul são editáveis)"; p["A1"].font = TIT
p["A2"] = "Preços conferidos em 16/10/2026 em fontes secundárias. Confirme nas páginas oficiais antes de decidir."
linhas = [
    ("Câmbio (R$ por US$)", M.CAMBIO, "Meelion, 16/09/2026 — confira no Banco Central (PTAX)", "cambio"),
    ("OpenAI: preço entrada (US$ por 1 milhão de tokens)", M.PRECO_IN, "gpt-5-mini, fontes secundárias out/2026", "p_in"),
    ("OpenAI: preço saída (US$ por 1 milhão de tokens)", M.PRECO_OUT, "gpt-5-mini; saída inclui tokens de raciocínio", "p_out"),
    ("Mensagens do cliente por conversa", 6, "premissa — meça no piloto", "msgs_cli"),
    ("Tokens de entrada por resposta da IA", 2000, "instruções + dados do negócio + histórico", "tok_in"),
    ("Tokens de saída por resposta da IA", 350, "texto da resposta + raciocínio interno", "tok_out"),
    ("WhatsApp: preço por mensagem de serviço (R$)", M.WA_SERVICO, "Cloud API Brasil, desde 01/10/2026", "wa_preco"),
    ("WhatsApp: mensagens de serviço grátis por número/mês", M.WA_FRANQUIA, "franquia por número", "wa_franq"),
    ("Dias de funcionamento por mês", 30, "", "dias"),
    ("Imposto sobre a receita (%)", M.IMPOSTO, "estimativa Simples Nacional — confirme com contador", "imposto"),
    ("Taxa por cobrança (R$)", M.TAXA_COBRANCA, "estimativa — depende do banco/gateway", "taxa_cob"),
    ("Domínio por mês (R$)", round(M.DOMINIO_MES, 2), ".com.br ≈ R$ 40/ano (confirme no Registro.br)", "dominio"),
    ("VPS até 10 clientes (R$/mês)", 59.99, "Hostinger KVM 1, preço de renovação", "vps1"),
    ("VPS de 11 a 30 clientes (R$/mês)", 77.99, "Hostinger KVM 2, preço de renovação", "vps2"),
    ("VPS acima de 30 clientes (R$/mês)", 155.98, "2× KVM 2 (estimativa)", "vps3"),
    ("Contador a partir de 6 clientes (R$/mês)", 200, "estimativa", "contador"),
    ("Quanto vale 1 hora sua (R$)", M.VALOR_HORA, "edite com o seu valor", "valor_hora"),
]
p["A4"], p["B4"], p["C4"] = "Premissa", "Valor", "Origem / observação"
for c in "ABC": p[f"{c}4"].font = NEG; p[f"{c}4"].fill = CAB
NOME = {}
for i, (rot, val, obs, chave) in enumerate(linhas, start=5):
    p[f"A{i}"] = rot; p[f"B{i}"] = val; p[f"C{i}"] = obs
    p[f"B{i}"].font = AZUL; p[f"B{i}"].fill = ENT
    if chave == "imposto": p[f"B{i}"].number_format = "0.0%"
    NOME[chave] = f"Premissas!$B${i}"
p.column_dimensions["A"].width = 52; p.column_dimensions["B"].width = 14; p.column_dimensions["C"].width = 60

# custo IA por conversa (R$)
r = len(linhas) + 6
p[f"A{r}"] = "Custo de IA por conversa (R$) — calculado"; p[f"A{r}"].font = NEG
p[f"B{r}"] = (f"={NOME['msgs_cli']}*({NOME['tok_in']}*{NOME['p_in']}+{NOME['tok_out']}*{NOME['p_out']})"
              f"/1000000*{NOME['cambio']}")
p[f"B{r}"].number_format = 'R$ #,##0.0000'
NOME["ia_conv"] = f"Premissas!$B${r}"

# ---------------- Custo por cliente ----------------
u = wb.create_sheet("Custo por cliente")
u["A1"] = "Custo de uso de UM cliente por mês (IA + WhatsApp oficial)"; u["A1"].font = TIT
cab = ["Conversas por dia", "Respostas da IA (msgs) por conversa", "Conversas no mês", "Custo IA (R$)",
       "Mensagens enviadas", "Mensagens pagas (acima da franquia)", "Custo WhatsApp (R$)", "Total (R$)"]
for j, t in enumerate(cab, 1):
    c = u.cell(3, j, t); c.font = NEG; c.fill = CAB; c.alignment = Alignment(wrap_text=True)
for i, (cd, mb) in enumerate([(10, 3), (15, 3), (20, 4), (50, 4), (100, 4)], start=4):
    u[f"A{i}"] = cd; u[f"B{i}"] = mb
    u[f"A{i}"].font = AZUL; u[f"B{i}"].font = AZUL; u[f"A{i}"].fill = ENT; u[f"B{i}"].fill = ENT
    u[f"C{i}"] = f"=A{i}*{NOME['dias']}"
    u[f"D{i}"] = f"=C{i}*{NOME['ia_conv']}"
    u[f"E{i}"] = f"=C{i}*B{i}"
    u[f"F{i}"] = f"=MAX(0,E{i}-{NOME['wa_franq']})"
    u[f"G{i}"] = f"=F{i}*{NOME['wa_preco']}"
    u[f"H{i}"] = f"=D{i}+G{i}"
    for col in "DGH": u[f"{col}{i}"].number_format = BRL
u["A10"] = "Com a ponte não oficial (QR Code) o custo do WhatsApp por mensagem é R$ 0 — mas há risco de bloqueio do número."
for j, w in enumerate([14, 18, 14, 14, 14, 18, 16, 14], 1):
    u.column_dimensions[get_column_letter(j)].width = w
u.row_dimensions[3].height = 45

# ---------------- Cenários ----------------
s = wb.create_sheet("Cenários")
s["A1"] = "Cenários mensais por número de clientes (fórmulas ligadas às Premissas)"; s["A1"].font = TIT
s["A2"] = "Taxa de implantação (setup) é receita única e NÃO entra nesta tabela mensal."
linha_atual = 4
for nome, c in M.CENARIOS.items():
    s[f"A{linha_atual}"] = f"Cenário {nome}"; s[f"A{linha_atual}"].font = Font(bold=True, size=12, color="12324A")
    pr = linha_atual + 1
    rotulos = [("Mensalidade por cliente (R$)", c["preco"]), ("Conversas por dia por cliente", c["conv_dia"]),
               ("Respostas da IA por conversa", c["msgs_bot"]), ("Horas suas por cliente/mês", c["horas_cliente"]),
               ("Taxa de implantação (R$, única)", c["setup"])]
    for k, (rot, val) in enumerate(rotulos):
        s[f"A{pr+k}"] = rot; s[f"B{pr+k}"] = val; s[f"B{pr+k}"].font = AZUL; s[f"B{pr+k}"].fill = ENT
    P, CD, MB, HC = (f"$B${pr}", f"$B${pr+1}", f"$B${pr+2}", f"$B${pr+3}")
    h = pr + 6
    cols = ["Clientes", "Receita", "IA", "WhatsApp", "Cobranças", "Servidor + domínio", "Lucro bruto",
            "Impostos", "Contador", "Lucro operacional", "Horas suas/mês", "Lucro − valor do seu tempo"]
    for j, t in enumerate(cols, 1):
        cc = s.cell(h, j, t); cc.font = NEG; cc.fill = CAB; cc.alignment = Alignment(wrap_text=True); cc.border = BORDA
    for k, n in enumerate([1, 5, 10, 25, 50]):
        i = h + 1 + k
        s[f"A{i}"] = n
        conv = f"{CD}*{NOME['dias']}"
        s[f"B{i}"] = f"=A{i}*{P}"
        s[f"C{i}"] = f"=A{i}*{conv}*{NOME['ia_conv']}"
        s[f"D{i}"] = f"=A{i}*MAX(0,{conv}*{MB}-{NOME['wa_franq']})*{NOME['wa_preco']}"
        s[f"E{i}"] = f"=A{i}*{NOME['taxa_cob']}"
        s[f"F{i}"] = f"=IF(A{i}<=10,{NOME['vps1']},IF(A{i}<=30,{NOME['vps2']},{NOME['vps3']}))+{NOME['dominio']}"
        s[f"G{i}"] = f"=B{i}-C{i}-D{i}-E{i}-F{i}"
        s[f"H{i}"] = f"=B{i}*{NOME['imposto']}"
        s[f"I{i}"] = f"=IF(A{i}<=5,0,{NOME['contador']})"
        s[f"J{i}"] = f"=G{i}-H{i}-I{i}"
        s[f"K{i}"] = f"=A{i}*{HC}"
        s[f"L{i}"] = f"=J{i}-K{i}*{NOME['valor_hora']}"
        for col in "BCDEFGHIJL":
            s[f"{col}{i}"].number_format = BRL0
        for col in "ABCDEFGHIJKL":
            s[f"{col}{i}"].border = BORDA
    linha_atual = h + 8
for j, w in enumerate([30, 12, 11, 12, 11, 13, 13, 11, 11, 14, 11, 16], 1):
    s.column_dimensions[get_column_letter(j)].width = w

# ---------------- Capacidade ----------------
k = wb.create_sheet("Sua 1 hora por dia")
k["A1"] = "Quantos clientes cabem em 1 hora por dia?"; k["A1"].font = TIT
dados = [("Horas disponíveis por mês", 30), ("Horas de suporte por cliente/mês", 1.0),
         ("Horas para implantar 1 cliente novo (única)", 5), ("Clientes novos por mês", 2),
         ("Horas de prospecção por mês", 6)]
for i, (rot, val) in enumerate(dados, start=3):
    k[f"A{i}"] = rot; k[f"B{i}"] = val; k[f"B{i}"].font = AZUL; k[f"B{i}"].fill = ENT
k["A9"] = "Horas que sobram para suporte"; k["B9"] = "=B3-B5*B6-B7"
k["A10"] = "Máximo de clientes que você consegue atender"; k["B10"] = "=ROUNDDOWN(B9/B4,0)"
k["A9"].font = NEG; k["A10"].font = NEG
k["A12"] = "Acima disso: automatize o suporte, aumente o preço ou delegue (ver guia, fase 13)."
k.column_dimensions["A"].width = 50; k.column_dimensions["B"].width = 12

wb.save("../VendeZap_Custos.xlsx")
print("ok")
