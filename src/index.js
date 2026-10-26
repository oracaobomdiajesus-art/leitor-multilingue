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

export default {
  async fetch(req, env) {
    // Enquanto o segredo SENHA não for criado no Cloudflare, o site abre sem senha.
    if (!env.SENHA) return env.ASSETS.fetch(req);
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
    const resp = await env.ASSETS.fetch(req);
    const r = new Response(resp.body, resp);
    r.headers.set("Cache-Control", "private, no-store");
    return r;
  },
};
