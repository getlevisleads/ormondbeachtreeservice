// Cloudflare Pages Function: POST /api/click
// Logs a tap on a Call or Text button to D1 (binding DB), table "clicks".
// The table is created on first use, so no manual setup is needed.

const TYPES = new Set(["call", "text"]);

function clean(v, max) {
  return String(v ?? "").trim().slice(0, max);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return new Response(null, { status: 204 });
  let data;
  try {
    data = Object.fromEntries(await request.formData());
  } catch {
    return new Response(null, { status: 400 });
  }
  const type = clean(data.type, 10);
  if (!TYPES.has(type)) return new Response(null, { status: 400 });

  try {
    await env.DB.batch([
      env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, received_at TEXT NOT NULL, type TEXT NOT NULL, page TEXT, source TEXT)"
      ),
      env.DB.prepare("INSERT INTO clicks (received_at, type, page, source) VALUES (?, ?, ?, ?)")
        .bind(new Date().toISOString(), type, clean(data.page, 200), clean(data.source, 200)),
    ]);
  } catch (err) {
    console.error("click insert failed", err);
  }
  return new Response(null, { status: 204 });
}
