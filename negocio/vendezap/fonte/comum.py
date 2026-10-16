"""Utilidades compartilhadas pelos dois PDFs: formatação e renderização com o Chromium."""
import pathlib
import re
import subprocess

AQUI = pathlib.Path(__file__).parent
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"


def brl(v, casas=0):
    s = f"{abs(v):,.{casas}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return ("−" if v < 0 else "") + "R$ " + s


def tabela(cab, linhas, num=(), classe=""):
    """num = índices das colunas numéricas (alinhadas à direita)."""
    h = "".join(f'<th class="{"n" if i in num else ""}">{c}</th>' for i, c in enumerate(cab))
    corpo = ""
    for l in linhas:
        corpo += "<tr>" + "".join(
            f'<td class="{"n" if i in num else ""}">{c}</td>' for i, c in enumerate(l)) + "</tr>"
    return f'<table class="{classe}"><thead><tr>{h}</tr></thead><tbody>{corpo}</tbody></table>'


def pagina_html(titulo, corpo, css="estilo.css", extra_css=""):
    estilo = (AQUI / css).read_text(encoding="utf-8") + extra_css
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>{titulo}</title>'
            f'<style>{estilo}</style></head><body>{corpo}</body></html>')


def render_pdf(html, destino):
    tmp = AQUI / "_tmp.html"
    tmp.write_text(html, encoding="utf-8")
    subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={destino}", tmp.as_uri()], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    tmp.unlink()


def paginas_de(pdf, marcadores, a_partir=1):
    """Descobre em que página cada marcador (texto único de título) aparece. Usado no sumário."""
    out = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True).stdout
    paginas = out.split("\f")
    achados = {}
    for m in marcadores:
        for i, p in enumerate(paginas, start=1):
            if i < a_partir:
                continue
            if re.sub(r"\s+", " ", m) in re.sub(r"\s+", " ", p):
                achados[m] = i
                break
    return achados
