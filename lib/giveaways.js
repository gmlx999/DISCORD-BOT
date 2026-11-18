const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder,
  SlashCommandBuilder, ChannelType, MessageFlags,
} = require('discord.js');

const EPH = MessageFlags.Ephemeral;
const FILE = path.join(__dirname, '..', 'data', 'giveaways.json');
const ROOT = path.join(__dirname, '..');

/* ───────────── Storage ───────────── */
let db = { giveaways: {} };
let dirty = false;

function load() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      db = { giveaways: parsed.giveaways || {} };
    }
  } catch (err) {
    console.error('[GIVEAWAYS] Could not load data:', err.message);
  }
}

function flush() {
  if (!dirty) return;
  dirty = false;
  try {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, FILE);
  } catch (err) {
    dirty = true;
    console.error('[GIVEAWAYS] Could not save data:', err.message);
  }
}

const save = () => { dirty = true; flush(); };
process.on('exit', flush);

/* ───────────── Helpers ───────────── */
const UNITS = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3, w: 604800e3 };

// "30m", "2h", "1d12h", "1w" -> milliseconds (null if invalid)
function parseDuration(input) {
  const s = String(input || '').toLowerCase().replace(/\s+/g, '');
  if (!/^(\d+[smhdw])+$/.test(s)) return null;
  let total = 0;
  for (const [, n, u] of s.matchAll(/(\d+)([smhdw])/g)) total += Number(n) * UNITS[u];
  return total || null;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const unix = (ms) => Math.floor(ms / 1000);
const mentions = (ids) => ids.map((id) => `<@${id}>`).join(', ');
const linkOf = (g) => `https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId}`;

/* ───────────── Module factory ───────────── */
function create({ client, config, isStaff, sendLog }) {
  const gc = config.giveaways;
  const ending = new Set();
  const refreshTimers = new Map();

  /* ── Slash command definition ── */
  const command = new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaways / Sorteos')
    .setDMPermission(false)
    .addSubcommand((s) =>
      s.setName('start')
        .setDescription('Start a giveaway / Iniciar un sorteo')
        .addStringOption((o) => o.setName('prize').setDescription('Prize / Premio').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('duration').setDescription('e.g. 30m, 2h, 1d, 1d12h / ej. 30m, 2h, 1d').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners / Número de ganadores').setMinValue(1).setMaxValue(20))
        .addAttachmentOption((o) => o.setName('image').setDescription('Big photo of the prize / Foto grande del premio'))
        .addStringOption((o) => o.setName('description').setDescription('Extra text / Texto extra').setMaxLength(500))
        .addRoleOption((o) => o.setName('required_role').setDescription('Only this role can enter / Solo este rol puede participar'))
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Channel (default: here) / Canal (por defecto: aquí)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((s) =>
      s.setName('end')
        .setDescription('End a giveaway now / Terminar un sorteo ahora')
        .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID / ID del mensaje').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('reroll')
        .setDescription('Pick new winner(s) / Elegir nuevo(s) ganador(es)')
        .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID / ID del mensaje').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('How many to reroll / Cuántos').setMinValue(1).setMaxValue(20)))
    .addSubcommand((s) =>
      s.setName('cancel')
        .setDescription('Cancel a giveaway (no winners) / Cancelar un sorteo')
        .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID / ID del mensaje').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('list').setDescription('Active giveaways / Sorteos activos'));

  /* ── Look & feel ── */
  function buildEmbed(g, guild) {
    const ts = unix(g.endsAt);
    const embed = new EmbedBuilder().setFooter({ text: config.brand }).setTimestamp(g.endsAt);
    const host = `<@${g.hostId}>`;

    if (g.status === 'active') {
      const lines = [
        `### 🎁  ${g.prize}`,
        g.description ? `\n${g.description}\n` : '',
        `**⏰  Ends · Termina** ➜ <t:${ts}:R>  •  <t:${ts}:f>`,
        `**👑  Host · Anfitrión** ➜ ${host}`,
        `**🏆  Winners · Ganadores** ➜ **${g.winnerCount}**`,
        `**👥  Entries · Participantes** ➜ **${g.entries.length}**`,
      ];
      if (g.requiredRoleId) lines.push(`**🔒  Requires · Requiere** ➜ <@&${g.requiredRoleId}>`);
      lines.push('', '**Click the button below to enter!**', '**¡Haz clic en el botón de abajo para participar!**');
      embed.setColor(gc.colors.active).setTitle('🎉 ━━  GIVEAWAY · SORTEO  ━━ 🎉');
      embed.setDescription(lines.filter((l) => l !== undefined).join('\n'));
    } else if (g.status === 'ended') {
      const lines = [
        `### 🎁  ${g.prize}`,
        '',
        `**🏆  Winner(s) · Ganador(es)** ➜ ${g.winners.length ? mentions(g.winners) : '*No valid entries · Sin participantes válidos*'}`,
        `**👑  Host · Anfitrión** ➜ ${host}`,
        `**👥  Entries · Participantes** ➜ **${g.entries.length}**`,
        `**⏰  Ended · Terminó** ➜ <t:${unix(g.endedAt || g.endsAt)}:R>`,
      ];
      embed.setColor(gc.colors.ended).setTitle('🎊 ━━  GIVEAWAY ENDED · SORTEO TERMINADO  ━━ 🎊');
      embed.setDescription(lines.join('\n'));
    } else {
      embed.setColor(gc.colors.cancelled).setTitle('🚫 ━━  GIVEAWAY CANCELLED · SORTEO CANCELADO  ━━ 🚫');
      embed.setDescription(`### 🎁  ${g.prize}\n\n*This giveaway was cancelled by staff.*\n*Este sorteo fue cancelado por el staff.*`);
    }

    if (g.imageName) embed.setImage(`attachment://${g.imageName}`);
    const icon = guild?.iconURL?.({ size: 256 });
    if (icon) embed.setThumbnail(icon);
    return embed;
  }

  function buildRow(g) {
    const active = g.status === 'active';
    const btn = new ButtonBuilder().setCustomId(`gw:join:${g.messageId}`).setStyle(active ? ButtonStyle.Primary : ButtonStyle.Secondary);
    if (active) btn.setLabel(`Enter · Participar (${g.entries.length})`).setEmoji(gc.buttonEmoji);
    else btn.setLabel(g.status === 'ended' ? 'Ended · Terminado' : 'Cancelled · Cancelado').setEmoji(g.status === 'ended' ? '🏁' : '🚫').setDisabled(true);
    return new ActionRowBuilder().addComponents(btn);
  }

  async function fetchMessage(g) {
    const ch = await client.channels.fetch(g.channelId).catch(() => null);
    if (!ch) return { ch: null, msg: null };
    const msg = await ch.messages.fetch(g.messageId).catch(() => null);
    return { ch, msg };
  }

  async function render(g) {
    const { ch, msg } = await fetchMessage(g);
    if (!msg) return false;
    const guild = ch.guild ?? (await client.guilds.fetch(g.guildId).catch(() => null));
    await msg.edit({ embeds: [buildEmbed(g, guild)], components: [buildRow(g)] }).catch((e) =>
      console.error('[GIVEAWAYS] Could not edit message:', e.message));
    return true;
  }

  // Update the entry counter at most every few seconds (avoids rate limits)
  function scheduleRefresh(g) {
    if (refreshTimers.has(g.messageId)) return;
    refreshTimers.set(g.messageId, setTimeout(async () => {
      refreshTimers.delete(g.messageId);
      const cur = db.giveaways[g.messageId];
      if (cur && cur.status === 'active') await render(cur);
    }, 4_000));
  }

  /* ── Winners ── */
  async function pickWinners(g, guild, count, exclude = []) {
    const pool = shuffle(g.entries.filter((id) => !exclude.includes(id)));
    const winners = [];
    for (const uid of pool) {
      if (winners.length >= count) break;
      const member = await guild.members.fetch(uid).catch(() => null);
      if (!member || member.user.bot) continue;
      if (g.requiredRoleId && !member.roles.cache.has(g.requiredRoleId)) continue;
      winners.push(uid);
    }
    return winners;
  }

  async function announce(g, winners, { reroll = false } = {}) {
    const ch = await client.channels.fetch(g.channelId).catch(() => null);
    if (!ch) return;
    const link = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Giveaway · Sorteo').setEmoji('🎁').setURL(linkOf(g))
    );
    const claim = gc.claimText ? `\n${gc.claimText}` : '';
    const content = winners.length
      ? `${reroll ? '🔄' : '🎊'} **Congratulations · ¡Felicidades!** ${mentions(winners)}\nYou won · Ganaste **${g.prize}** 🎁${claim}`
      : `😕 No valid entries for **${g.prize}**.\nNo hubo participantes válidos para **${g.prize}**.`;
    await ch.send({
      content,
      components: [link],
      allowedMentions: { users: winners },
      reply: { messageReference: g.messageId, failIfNotExists: false },
    }).catch((e) => console.error('[GIVEAWAYS] Could not announce:', e.message));

    // DM the winners
    for (const uid of winners) {
      const user = await client.users.fetch(uid).catch(() => null);
      if (!user) continue;
      const dm = new EmbedBuilder()
        .setColor(gc.colors.active)
        .setTitle('🎉 You won! · ¡Ganaste!')
        .setDescription(`**${g.prize}**\n\n[Giveaway · Sorteo](${linkOf(g)})${claim}`)
        .setFooter({ text: config.brand })
        .setTimestamp();
      await user.send({ embeds: [dm] }).catch(() => {});
    }
  }

  async function endGiveaway(id, { reroll = false, rerollCount = 1 } = {}) {
    const g = db.giveaways[id];
    if (!g || ending.has(id)) return null;
    if (!reroll && g.status !== 'active') return null;
    ending.add(id);
    try {
      const guild = await client.guilds.fetch(g.guildId).catch(() => null);
      if (!guild) return null;

      let winners;
      if (reroll) {
        winners = await pickWinners(g, guild, rerollCount, g.winners);
        if (!winners.length) return { winners }; // nothing left to pick, stay quiet
        g.winners = [...g.winners, ...winners];
      } else {
        const { msg } = await fetchMessage(g);
        if (!msg) { g.status = 'cancelled'; save(); return { winners: [] }; } // message was deleted
        winners = await pickWinners(g, guild, g.winnerCount);
        g.status = 'ended';
        g.endedAt = Date.now();
        g.winners = winners;
      }
      save();
      if (!reroll) await render(g);
      await announce(g, winners, { reroll });
      await sendLog({
        embeds: [
          new EmbedBuilder()
            .setColor(config.color)
            .setTitle(reroll ? '🔄 Giveaway rerolled' : '🎉 Giveaway ended')
            .addFields(
              { name: 'Prize', value: g.prize },
              { name: 'Winners', value: winners.length ? mentions(winners) : '—' },
              { name: 'Entries', value: String(g.entries.length), inline: true },
              { name: 'Host', value: `<@${g.hostId}>`, inline: true },
              { name: 'Link', value: linkOf(g) }
            )
            .setFooter({ text: config.brand })
            .setTimestamp(),
        ],
      });
      return { winners };
    } finally {
      ending.delete(id);
    }
  }

  async function sweep() {
    const now = Date.now();
    for (const g of Object.values(db.giveaways)) {
      if (g.status === 'active' && g.endsAt <= now) await endGiveaway(g.messageId);
    }
    // keep the data file small: forget giveaways finished more than 30 days ago
    for (const [id, g] of Object.entries(db.giveaways)) {
      if (g.status !== 'active' && Date.now() - (g.endedAt || g.endsAt) > 30 * 86400e3) { delete db.giveaways[id]; dirty = true; }
    }
  }

  /* ── Image from the command ── */
  async function prepareImage(attachment) {
    let source = null;
    let name = null;
    if (attachment) {
      if (!attachment.contentType?.startsWith('image/')) return { error: '❌ The file must be an image · El archivo debe ser una imagen.' };
      if (attachment.size > 8 * 1024 * 1024) return { error: '❌ Image too big (max 8 MB) · Imagen muy grande (máx. 8 MB).' };
      const ext = (attachment.contentType.split('/')[1] || 'png').split(';')[0].replace('jpeg', 'jpg');
      name = `giveaway.${ext}`;
      try {
        const res = await fetch(attachment.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        source = Buffer.from(await res.arrayBuffer()); // re-uploaded so the link never expires
      } catch (err) {
        console.error('[GIVEAWAYS] Could not download image:', err.message);
        return { error: '❌ Could not read that image, try again · No pude leer esa imagen, intenta otra vez.' };
      }
    } else if (gc.defaultImage) {
      const file = path.join(ROOT, gc.defaultImage);
      if (fs.existsSync(file)) { source = file; name = `giveaway${path.extname(file) || '.png'}`; }
    }
    return { file: source ? new AttachmentBuilder(source, { name }) : null, name };
  }

  /* ── Commands ── */
  const denyStaff = (i) => i.reply({ content: '❌ Only staff can do this · Solo el staff puede hacer esto.', flags: EPH });
  const notFound = (i) => i.editReply('❌ Giveaway not found · Sorteo no encontrado. (Use the *message ID* of the giveaway)');

  async function onCommand(interaction) {
    if (!isStaff(interaction.member)) return denyStaff(interaction);
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      await interaction.deferReply({ flags: EPH });
      const ms = parseDuration(interaction.options.getString('duration'));
      if (!ms || ms < 10_000 || ms > 60 * 86400e3) {
        return interaction.editReply('❌ Invalid duration (10s – 60d). Examples: `30m`, `2h`, `1d12h` · Duración inválida.');
      }
      const channel = interaction.options.getChannel('channel') ?? interaction.channel;
      const me = interaction.guild.members.me;
      const perms = channel.permissionsFor(me);
      if (!perms?.has(['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles'])) {
        return interaction.editReply(`❌ I need View, Send, Embed Links and Attach Files in ${channel}.`);
      }

      const img = await prepareImage(interaction.options.getAttachment('image'));
      if (img.error) return interaction.editReply(img.error);

      const role = interaction.options.getRole('required_role');
      const g = {
        guildId: interaction.guildId,
        channelId: channel.id,
        messageId: null,
        prize: interaction.options.getString('prize'),
        description: interaction.options.getString('description') || '',
        hostId: interaction.user.id,
        winnerCount: interaction.options.getInteger('winners') ?? 1,
        requiredRoleId: role?.id ?? null,
        imageName: img.name && img.file ? img.name : null,
        endsAt: Date.now() + ms,
        status: 'active',
        entries: [],
        winners: [],
      };

      // Send first (we need the message id for the button), then attach the id
      const msg = await channel.send({
        embeds: [buildEmbed({ ...g, messageId: '0' }, interaction.guild)],
        components: [],
        files: img.file ? [img.file] : [],
      });
      g.messageId = msg.id;
      db.giveaways[msg.id] = g;
      save();
      await msg.edit({ components: [buildRow(g)] });

      await sendLog({
        embeds: [
          new EmbedBuilder().setColor(config.color).setTitle('🎉 Giveaway started')
            .addFields(
              { name: 'Prize', value: g.prize },
              { name: 'Ends', value: `<t:${unix(g.endsAt)}:R>`, inline: true },
              { name: 'Winners', value: String(g.winnerCount), inline: true },
              { name: 'Host', value: `<@${g.hostId}>`, inline: true },
              { name: 'Link', value: linkOf(g) }
            ).setFooter({ text: config.brand }).setTimestamp(),
        ],
      });
      return interaction.editReply(`✅ Giveaway started in ${channel} · Sorteo iniciado.\n${linkOf(g)}`);
    }

    if (sub === 'list') {
      const active = Object.values(db.giveaways).filter((g) => g.status === 'active' && g.guildId === interaction.guildId);
      const embed = new EmbedBuilder().setColor(gc.colors.active).setTitle('🎉 Active giveaways · Sorteos activos').setFooter({ text: config.brand });
      embed.setDescription(
        active.length
          ? active.map((g) => `🎁 **[${g.prize}](${linkOf(g)})**\n⏰ <t:${unix(g.endsAt)}:R> • 👥 ${g.entries.length} • 🏆 ${g.winnerCount}\n\`${g.messageId}\``).join('\n\n')
          : '*None · Ninguno*'
      );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    // end / reroll / cancel need an existing giveaway
    await interaction.deferReply({ flags: EPH });
    const g = db.giveaways[interaction.options.getString('message_id').trim()];
    if (!g || g.guildId !== interaction.guildId) return notFound(interaction);

    if (sub === 'end') {
      if (g.status !== 'active') return interaction.editReply('❌ That giveaway already ended · Ese sorteo ya terminó.');
      await endGiveaway(g.messageId);
      return interaction.editReply('✅ Giveaway ended · Sorteo terminado.');
    }

    if (sub === 'reroll') {
      if (g.status !== 'ended') return interaction.editReply('❌ Only ended giveaways can be rerolled · Solo se pueden repetir sorteos terminados.');
      const res = await endGiveaway(g.messageId, { reroll: true, rerollCount: interaction.options.getInteger('winners') ?? 1 });
      if (!res || !res.winners.length) return interaction.editReply('⚠️ No more valid entries to pick from · No quedan participantes válidos.');
      return interaction.editReply('✅ Rerolled · Nuevo(s) ganador(es) elegido(s).');
    }

    if (sub === 'cancel') {
      if (g.status !== 'active') return interaction.editReply('❌ That giveaway is not active · Ese sorteo no está activo.');
      g.status = 'cancelled';
      g.endedAt = Date.now();
      save();
      await render(g);
      return interaction.editReply('✅ Giveaway cancelled · Sorteo cancelado.');
    }
  }

  /* ── Buttons ── */
  async function onButton(interaction) {
    const [, action, id] = interaction.customId.split(':');
    const g = db.giveaways[id];

    if (!g || g.status !== 'active' || g.endsAt <= Date.now()) {
      return interaction.reply({ content: '⏰ This giveaway is over · Este sorteo ya terminó.', flags: EPH });
    }

    if (action === 'join') {
      if (g.entries.includes(interaction.user.id)) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`gw:leave:${id}`).setLabel('Leave · Salir').setEmoji('🚪').setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ content: '✅ You are already in! · ¡Ya estás participando!', components: [row], flags: EPH });
      }
      if (g.requiredRoleId && !interaction.member.roles.cache.has(g.requiredRoleId)) {
        return interaction.reply({
          content: `🔒 You need <@&${g.requiredRoleId}> to enter · Necesitas <@&${g.requiredRoleId}> para participar.`,
          flags: EPH,
          allowedMentions: { parse: [] },
        });
      }
      g.entries.push(interaction.user.id);
      save();
      scheduleRefresh(g);
      return interaction.reply({ content: `🎉 You're in! Good luck · ¡Estás dentro! Suerte.\n🎁 **${g.prize}**`, flags: EPH });
    }

    if (action === 'leave') {
      g.entries = g.entries.filter((u) => u !== interaction.user.id);
      save();
      scheduleRefresh(g);
      return interaction.update({ content: '👋 You left the giveaway · Saliste del sorteo.', components: [] });
    }
  }

  async function handle(interaction) {
    if (interaction.isChatInputCommand() && interaction.commandName === 'giveaway') { await onCommand(interaction); return true; }
    if (interaction.isButton() && interaction.customId.startsWith('gw:')) { await onButton(interaction); return true; }
    return false;
  }

  function start() {
    load();
    setInterval(() => sweep().catch((e) => console.error('[GIVEAWAYS] sweep:', e.message)), 5_000);
    sweep().catch(() => {});
  }

  return { command, handle, start, _internal: { parseDuration } };
}

module.exports = { create, parseDuration };
