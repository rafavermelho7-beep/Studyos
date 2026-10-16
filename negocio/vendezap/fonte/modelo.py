"""Modelo financeiro do VendeZap — fonte única dos números do PDF e da planilha.
Todos os valores são PREMISSAS editáveis; ver GUIA (seção Custos) para as fontes."""

CAMBIO = 5.15            # R$ por US$ (Meelion, 16/09/2026 — confirmar no dia)
# OpenAI gpt-5-mini (fontes secundárias, out/2026): US$ por 1 milhão de tokens
PRECO_IN = 0.25
PRECO_OUT = 2.00
# WhatsApp Cloud API, Brasil, a partir de 01/10/2026 (fontes secundárias)
WA_SERVICO = 0.035       # R$ por mensagem de serviço após a franquia
WA_FRANQUIA = 1000       # mensagens de serviço grátis por número por mês

def custo_conversa_ia(msgs_cliente=6, tokens_in=2000, tokens_out=350,
                      p_in=PRECO_IN, p_out=PRECO_OUT, cambio=CAMBIO):
    usd = msgs_cliente * (tokens_in * p_in + tokens_out * p_out) / 1_000_000
    return usd * cambio

def custo_mes(conv_dia, msgs_bot=4, dias=30, **kw):
    conv = conv_dia * dias
    ia = conv * custo_conversa_ia(**kw)
    msgs = conv * msgs_bot
    wa = max(0, msgs - WA_FRANQUIA) * WA_SERVICO
    return dict(conv=conv, ia=ia, msgs=msgs, wa=wa, total=ia + wa)

CENARIOS = {
    "Conservador": dict(preco=97, setup=0, conv_dia=20, msgs_bot=4, horas_cliente=1.5),
    "Base":        dict(preco=147, setup=197, conv_dia=15, msgs_bot=3, horas_cliente=1.0),
    "Otimista":    dict(preco=197, setup=297, conv_dia=12, msgs_bot=3, horas_cliente=0.75),
}
IMPOSTO = 0.06           # estimativa Simples Nacional (confirmar com contador)
TAXA_COBRANCA = 2.00     # R$ por cobrança (estimativa; varia por banco/gateway)
DOMINIO_MES = 40 / 12    # .com.br ~R$ 40/ano (confirmar no Registro.br)
VALOR_HORA = 30.0        # quanto vale 1 hora sua (edite)

def vps(n):
    # Hostinger, preço de RENOVAÇÃO (conservador): KVM 1 R$ 59,99; KVM 2 R$ 77,99
    if n <= 10: return 59.99
    if n <= 30: return 77.99
    return 2 * 77.99

def contador(n):
    return 0 if n <= 5 else 200.0

def linha(n, c):
    uso = custo_mes(c["conv_dia"], c["msgs_bot"])
    receita = n * c["preco"]
    variaveis = n * (uso["ia"] + uso["wa"] + TAXA_COBRANCA)
    infra = vps(n) + DOMINIO_MES
    bruto = receita - variaveis - infra
    impostos = receita * IMPOSTO
    oper = bruto - impostos - contador(n)
    horas = n * c["horas_cliente"]
    return dict(n=n, receita=receita, ia=n*uso["ia"], wa=n*uso["wa"],
                cobranca=n*TAXA_COBRANCA, infra=infra, bruto=bruto,
                impostos=impostos, contador=contador(n), oper=oper,
                horas=horas, oper_tempo=oper - horas*VALOR_HORA)

def equilibrio(c, limite=60):
    """Menor nº de clientes a partir do qual o lucro operacional fica >= 0
    em todos os tamanhos seguintes (até `limite`)."""
    for n in range(1, limite + 1):
        if all(linha(m, c)["oper"] >= 0 for m in range(n, limite + 1)):
            return n
    return None

if __name__ == "__main__":
    print("IA por conversa R$", round(custo_conversa_ia(), 4))
    for d in (20, 50, 100):
        print(d, {k: round(v, 2) for k, v in custo_mes(d).items()})
    for nome, c in CENARIOS.items():
        print(nome, "equilíbrio:", equilibrio(c))
        for n in (1, 5, 10, 25, 50):
            l = linha(n, c)
            print("  ", n, round(l["receita"]), round(l["bruto"]), round(l["oper"]), round(l["horas"],1), round(l["oper_tempo"]))
