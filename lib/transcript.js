const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmt = (ts) => new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

// Fetch every message of a channel in chronological order
async function fetchAll(channel, max = 5000) {
  const out = [];
  let before;
  while (out.length < max) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    out.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  return out.reverse();
}

function renderEmbed(e) {
  const parts = [];
  if (e.title) parts.push(`<div class="et">${esc(e.title)}</div>`);
  if (e.description) parts.push(`<div>${esc(e.description).replace(/\n/g, '<br>')}</div>`);
  for (const f of e.fields || []) {
    parts.push(`<div class="ef"><b>${esc(f.name)}</b><br>${esc(f.value).replace(/\n/g, '<br>')}</div>`);
  }
  return `<div class="embed">${parts.join('')}</div>`;
}

function renderHtml({ ticket, channel, guild, messages, closedAt, closedBy, reason }) {
  const rows = messages
    .map((m) => {
      const name = m.member?.displayName ?? m.author.username;
      const content = m.cleanContent ? `<div class="c">${esc(m.cleanContent).replace(/\n/g, '<br>')}</div>` : '';
      const files = [...m.attachments.values()]
        .map((a) => `<div class="a">📎 <a href="${esc(a.url)}">${esc(a.name)}</a></div>`)
        .join('');
      const embeds = m.embeds.map(renderEmbed).join('');
      return `<div class="m">
  <img src="${esc(m.author.displayAvatarURL({ size: 64 }))}" alt="">
  <div class="b">
    <div class="h"><span class="n">${esc(name)}</span>${m.author.bot ? '<span class="bot">BOT</span>' : ''}<span class="t">${fmt(m.createdTimestamp)}</span></div>
    ${content}${files}${embeds}
  </div>
</div>`;
    })
    .join('\n');

  const num = String(ticket.number).padStart(4, '0');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Ticket #${num} - ${esc(guild.name)}</title>
<style>
body{background:#0e0e10;color:#dcddde;font-family:Segoe UI,Arial,sans-serif;margin:0;padding:24px}
.wrap{max-width:900px;margin:0 auto}
.head{background:#18181b;border:1px solid #2a2a2e;border-radius:10px;padding:16px 20px;margin-bottom:20px}
.head h1{margin:0 0 8px;font-size:20px;color:#fff}
.head div{font-size:13px;color:#a0a0a8;margin:2px 0}
.m{display:flex;gap:12px;padding:8px 4px}
.m img{width:40px;height:40px;border-radius:50%;flex:none}
.h{display:flex;align-items:center;gap:8px}
.n{font-weight:600;color:#fff}
.t{font-size:11px;color:#72767d}
.bot{background:#5865f2;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px}
.c{margin-top:2px;line-height:1.4;word-break:break-word}
.a{margin-top:4px}.a a{color:#00a8fc}
.embed{margin-top:6px;border-left:4px solid #3f3f46;background:#18181b;padding:8px 12px;border-radius:4px;max-width:520px}
.et{font-weight:700;color:#fff;margin-bottom:4px}
.ef{margin-top:6px;font-size:14px}
</style></head><body><div class="wrap">
<div class="head">
  <h1>Ticket #${num} — ${esc(ticket.type)}</h1>
  <div>Server: ${esc(guild.name)} • Channel: #${esc(channel.name)}</div>
  <div>Opened: ${fmt(ticket.createdAt)} • Closed: ${fmt(closedAt)}</div>
  <div>Closed by: ${esc(closedBy)}${reason ? ' • Reason: ' + esc(reason) : ''}</div>
  <div>Messages: ${messages.length}</div>
</div>
${rows}
</div></body></html>`;
}

module.exports = { fetchAll, renderHtml };
