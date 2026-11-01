// Gateway mínimo (papel do Kong no Supabase): /auth/v1 -> GoTrue, /rest/v1 -> PostgREST.
import http from "node:http";
const routes = [
  ["/auth/v1", "http://127.0.0.1:9999"],
  ["/rest/v1", "http://127.0.0.1:3000"],
];
http
  .createServer((req, res) => {
    const r = routes.find(([p]) => req.url.startsWith(p));
    if (!r) { res.writeHead(404); return res.end(); }
    const target = new URL(req.url.slice(r[0].length) || "/", r[1]);
    const headers = { ...req.headers, host: target.host };
    const up = http.request(target, { method: req.method, headers }, (u) => {
      res.writeHead(u.statusCode, u.headers);
      u.pipe(res);
    });
    up.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
    req.pipe(up);
  })
  .listen(54321, "127.0.0.1", () => console.log("gateway :54321"));
