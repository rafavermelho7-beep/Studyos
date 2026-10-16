# VendeZap — guia de negócio

| Arquivo | O que é |
|---|---|
| `VendeZap_Guia_Completo.pdf` | Guia visual (34 páginas): sistema, decisão do WhatsApp, custos de IA, nicho e oferta, finanças, roteiro em 13 fases, riscos e LGPD |
| `VendeZap_Plano_30_Dias.pdf` | Plano operacional, uma tarefa de 1 hora por dia, com mensagens prontas |
| `VendeZap_Custos.xlsx` | Planilha com premissas editáveis (células amarelas) e fórmulas |

Preços conferidos em 16/10/2026, quase todos em fontes secundárias. Confira nas páginas oficiais antes de pagar.

## Regenerar os arquivos

Requer Python 3 com `openpyxl` e o Chromium em `/opt/pw-browsers` (ver `fonte/comum.py`).

```
cd fonte
python3 planilha.py   # VendeZap_Custos.xlsx
python3 guia.py       # VendeZap_Guia_Completo.pdf (duas passadas, para o sumário)
python3 plano.py      # VendeZap_Plano_30_Dias.pdf
```

`fonte/modelo.py` é a fonte única das premissas financeiras usadas no PDF e na planilha.
