"""Refaz public/oracoes/indice.json a partir dos arquivos de oração.

Mantém título, data, resumo e tags já escritos no índice e acrescenta
as referências bíblicas encontradas no texto de cada oração.
Uso: python3 tools/indice.py
"""
import json, re, pathlib

LIVROS = ["Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute",
  "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester",
  "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações",
  "Ezequiel", "Daniel", "Oséias", "Joel", "Amós", "Obadias", "Jonas", "Miquéias", "Naum", "Habacuque",
  "Sofonias", "Ageu", "Zacarias", "Malaquias", "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos",
  "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses",
  "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus",
  "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"]
RX = re.compile(r"(?<![\wÀ-ú])(" + "|".join(sorted(map(re.escape, LIVROS), key=len, reverse=True)) + r")\s+(\d+)\.(\d+(?:-\d+)?)")

pasta = pathlib.Path(__file__).resolve().parent.parent / "public" / "oracoes"
idx_path = pasta / "indice.json"
antigo = {o["arquivo"]: o for o in json.loads(idx_path.read_text(encoding="utf-8")).get("oracoes", [])}
saida = []
for f in sorted(pasta.glob("*.json")):
    if f.name == "indice.json":
        continue
    d = json.loads(f.read_text(encoding="utf-8"))
    texto = " ".join(d.get("paragrafos", []))
    refs = []
    for m in RX.finditer(texto):
        r = f"{m.group(1)} {m.group(2)}.{m.group(3)}"
        if r not in refs:
            refs.append(r)
    a = antigo.get(f.name, {})
    saida.append({"arquivo": f.name, "titulo": a.get("titulo") or d.get("titulo") or f.stem,
                  "data": a.get("data") or d.get("data") or f.stem, "resumo": a.get("resumo", ""),
                  "tags": a.get("tags", []), "referencias": refs})
saida.sort(key=lambda o: o["data"], reverse=True)
idx_path.write_text(json.dumps({"oracoes": saida}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(len(saida), "orações;", sum(len(o["referencias"]) for o in saida), "referências")
