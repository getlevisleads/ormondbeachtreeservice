// Cloudflare Pages Function: POST /api/lead
// Saves each lead to D1 (binding DB) and emails it through Resend.
// Settings (Pages > Settings > Variables and Secrets):
//   RESEND_API_KEY  secret
//   LEAD_TO         where leads are emailed, e.g. your Gmail or leads@ormondbeachtreeservice.com
//   LEAD_FROM       e.g. "Ormond Beach Tree Service <leads@ormondbeachtreeservice.com>"

const MAX = { name: 100, email: 200, phone: 40, message: 2000 };

function clean(v, max) {
  return String(v ?? "").trim().slice(0, max);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    const type = request.headers.get("content-type") || "";
    data = type.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return Response.json({ ok: false, error: "Could not read the form." }, { status: 400 });
  }

  // Honeypot: real people never fill the hidden "company" field.
  if (clean(data.company, 100)) return Response.json({ ok: true });

  const lead = {
    name: clean(data.name, MAX.name),
    email: clean(data.email, MAX.email),
    phone: clean(data.phone, MAX.phone),
    message: clean(data.message, MAX.message),
  };
  if (!lead.name || !lead.phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return Response.json({ ok: false, error: "Please fill in your name, email and phone." }, { status: 400 });
  }

  const receivedAt = new Date().toISOString();
  let saved = false;
  let emailed = false;

  if (env.DB) {
    try {
      await env.DB.prepare(
        "INSERT INTO leads (received_at, name, email, phone, message, page) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(receivedAt, lead.name, lead.email, lead.phone, lead.message, request.headers.get("referer") || "").run();
      saved = true;
    } catch (err) {
      console.error("D1 insert failed", err);
    }
  }

  if (env.RESEND_API_KEY && env.LEAD_TO && env.LEAD_FROM) {
    const rows = [["Name", lead.name], ["Phone", lead.phone], ["Email", lead.email], ["Message", lead.message || "(none)"]]
      .map(([k, v]) => `<p><strong>${k}:</strong> ${escapeHtml(v).replace(/\n/g, "<br>")}</p>`).join("");
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.LEAD_FROM,
          to: env.LEAD_TO.split(",").map((s) => s.trim()),
          reply_to: lead.email,
          subject: `New tree lead: ${lead.name}, ${lead.phone}`,
          html: `${rows}<p style="color:#777">Received ${receivedAt} from ormondbeachtreeservice.com</p>`,
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.error("Resend failed", res.status, await res.text());
    } catch (err) {
      console.error("Resend request failed", err);
    }
  }

  if (!saved && !emailed) {
    return Response.json({ ok: false, error: "Something went wrong sending your request. Please call or text us instead." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
