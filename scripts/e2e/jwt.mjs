// Gera chaves JWT locais (anon/service_role) para a stack de testes.
import crypto from "node:crypto";
const secret = process.argv[2];
const role = process.argv[3];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const head = b64({ alg: "HS256", typ: "JWT" });
const body = b64({ role, iss: "supabase-local", iat: 1700000000, exp: 2000000000 });
const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
process.stdout.write(`${head}.${body}.${sig}`);
