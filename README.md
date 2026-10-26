# Leitor Multilíngue

Leitor de PDFs, Bíblia e orações com o original de um lado e a tradução do outro, e leitura em voz alta em vários idiomas.

- `public/` é a raiz do site (publicado no Cloudflare Workers).
- `public/oracoes/indice.json` lista as orações; cada oração fica em `public/oracoes/AAAA-MM-DD.json` no formato `{"titulo", "data", "paragrafos": [...]}`.
- `public/aula.json` é a "Aula ao vivo".
