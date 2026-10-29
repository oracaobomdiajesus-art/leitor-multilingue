// Protege o site inteiro com senha (autenticação básica do navegador).
// A senha fica no Cloudflare, como segredo chamado SENHA, e não no código.

const enc = new TextEncoder();

async function iguais(a, b) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

function senhaDoPedido(req) {
  const h = req.headers.get("Authorization") || "";
  if (!h.startsWith("Basic ")) return null;
  try {
    const bytes = Uint8Array.from(atob(h.slice(6)), (c) => c.charCodeAt(0));
    const txt = new TextDecoder().decode(bytes);
    const i = txt.indexOf(":");
    return i < 0 ? null : txt.slice(i + 1);
  } catch (e) {
    return null;
  }
}

// Fundo musical: /musica/<id> entrega um arquivo do Drive que esteja em public/musicas/indice.json.
// Só os ids da lista são aceitos, para o site não virar um repassador de qualquer arquivo.
async function musica(req, env, id) {
  const lista = await env.ASSETS.fetch(new URL("/musicas/indice.json", req.url));
  const dados = lista.ok ? await lista.json() : { musicas: [] };
  if (!(dados.musicas || []).some((m) => m.id === id)) return new Response("Música não encontrada.", { status: 404 });
  const cab = {};
  const range = req.headers.get("Range");
  if (range) cab.Range = range;
  const r = await fetch("https://drive.usercontent.google.com/download?id=" + encodeURIComponent(id) + "&export=download&confirm=t", {
    headers: cab,
    cf: { cacheEverything: true, cacheTtl: 604800 },
  });
  const tipo = r.headers.get("content-type") || "";
  if (!r.ok || tipo.includes("text/html")) return new Response("O Drive não entregou a música (" + r.status + ").", { status: 502 });
  const h = new Headers();
  ["content-length", "content-range", "accept-ranges", "etag", "last-modified"].forEach((k) => { const v = r.headers.get(k); if (v) h.set(k, v); });
  h.set("content-type", tipo.startsWith("audio/") ? tipo : "audio/mpeg");
  h.set("Cache-Control", "private, max-age=86400");
  return new Response(r.body, { status: r.status, headers: h });
}

async function servir(req, env) {
  const u = new URL(req.url);
  const m = u.pathname.match(/^\/musica\/([A-Za-z0-9_-]{10,80})$/);
  if (m) return musica(req, env, m[1]);
  return env.ASSETS.fetch(req);
}

export default {
  async fetch(req, env) {
    // Enquanto o segredo SENHA não for criado no Cloudflare, o site abre sem senha.
    if (!env.SENHA) return servir(req, env);
    const enviada = senhaDoPedido(req);
    if (enviada === null || !(await iguais(enviada, env.SENHA))) {
      return new Response("Senha necessária.", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Leitor Multilingue", charset="UTF-8"',
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }
    const resp = await servir(req, env);
    const r = new Response(resp.body, resp);
    if (!new URL(req.url).pathname.startsWith("/musica/")) r.headers.set("Cache-Control", "private, no-store");
    return r;
  },
};
