"""Gera o ZIP público a partir da fonte revisável em extensao/."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

raiz = Path(__file__).resolve().parent.parent
destino = raiz / 'web/downloads/lead-finder-extensao.zip'
destino.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(destino, 'w', ZIP_DEFLATED) as z:
    for p in sorted((raiz / 'extensao').iterdir()):
        if p.is_file() and p.suffix in {'.js', '.json', '.html', '.txt'}:
            z.write(p, p.name)
print(destino.relative_to(raiz))
