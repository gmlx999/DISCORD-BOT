const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'tickets.json');
let data = { counter: 0, tickets: {} };
let dirty = false;

function load() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      data = { counter: parsed.counter || 0, tickets: parsed.tickets || {} };
    }
  } catch (err) {
    console.error('[STORE] Could not load data:', err.message);
  }
}

function flush() {
  if (!dirty) return;
  dirty = false;
  try {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, FILE);
  } catch (err) {
    dirty = true;
    console.error('[STORE] Could not save data:', err.message);
  }
}

setInterval(flush, 15_000).unref();
process.on('exit', flush);

module.exports = {
  load,
  flush,
  nextNumber() {
    data.counter += 1;
    dirty = true;
    flush();
    return data.counter;
  },
  get: (channelId) => data.tickets[channelId] || null,
  all: () => Object.values(data.tickets),
  total: () => data.counter,
  set(channelId, ticket) {
    data.tickets[channelId] = ticket;
    dirty = true;
    flush();
    return ticket;
  },
  update(channelId, patch, immediate = false) {
    const t = data.tickets[channelId];
    if (!t) return null;
    Object.assign(t, patch);
    dirty = true;
    if (immediate) flush();
    return t;
  },
  delete(channelId) {
    if (!data.tickets[channelId]) return;
    delete data.tickets[channelId];
    dirty = true;
    flush();
  },
};
