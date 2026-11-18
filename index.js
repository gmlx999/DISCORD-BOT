require('dotenv').config();
const path = require('path');
const {
  Client, GatewayIntentBits, ActivityType, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, AttachmentBuilder, ChannelType, PermissionFlagsBits,
  SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder,
  TextInputStyle, EmbedBuilder, Events, Partials,
} = require('discord.js');
const {
  joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState,
} = require('@discordjs/voice');
const config = require('./config');
const store = require('./lib/store');
const { FORMS, buildModal } = require('./lib/forms');
const { fetchAll, renderHtml } = require('./lib/transcript');
const giveawayLib = require('./lib/giveaways');

if (!process.env.TOKEN) {
  console.error('Missing TOKEN in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages, // used only to track ticket activity (no message content needed)
    GatewayIntentBits.GuildMessageReactions, // reaction roles
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || null;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || null;
const STREAM_URL = process.env.STREAM_URL || 'https://www.twitch.tv/gmlx';

const EPH = MessageFlags.Ephemeral;
const t = (lang, es, en) => (lang === 'es' ? es : en);
const pad = (n) => String(n).padStart(4, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CLAIM_FIELDS = ['Claimed by', 'Atendido por'];

const isStaff = (member) =>
  !!member &&
  (member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    (STAFF_ROLE_ID && member.roles.cache.has(STAFF_ROLE_ID)));

/* ───────────── Giveaways ───────────── */
const giveaways = giveawayLib.create({ client, config, isStaff, sendLog });

/* ───────────── Slash commands ───────────── */
const commands = [
  giveaways.command,
  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Send the ticket panel / Envía el panel de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('rolespanel')
    .setDescription('Send the reaction roles panel / Envía el panel de roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to this ticket / Añadir un usuario al ticket')
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('User / Usuario').setRequired(true)),
  new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from this ticket / Quitar un usuario del ticket')
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('User / Usuario').setRequired(true)),
  new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename this ticket / Renombrar el ticket')
    .setDMPermission(false)
    .addStringOption((o) => o.setName('name').setDescription('New name / Nuevo nombre').setRequired(true).setMaxLength(80)),
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this ticket / Cerrar el ticket')
    .setDMPermission(false)
    .addStringOption((o) => o.setName('reason').setDescription('Reason / Razón').setMaxLength(500)),
  new SlashCommandBuilder()
    .setName('ticketstats')
    .setDescription('Ticket statistics / Estadísticas de tickets')
    .setDMPermission(false),
].map((c) => c.toJSON());

/* ───────────── Panel buttons ───────────── */
const BUTTONS = {
  help_en: { label: 'Help', emoji: config.emojis.help, type: 'help', lang: 'en' },
  help_es: { label: 'Ayuda', emoji: config.emojis.help, type: 'help', lang: 'es' },
  buy_en: { label: 'Buy', emoji: config.emojis.buy, type: 'buy', lang: 'en' },
  buy_es: { label: 'Comprar', emoji: config.emojis.buy, type: 'buy', lang: 'es' },
};

function panelRow() {
  return new ActionRowBuilder().addComponents(
    Object.entries(BUTTONS).map(([id, b]) =>
      new ButtonBuilder()
        .setCustomId(`ticket:${id}`)
        .setLabel(b.label)
        .setEmoji({ id: b.emoji })
        .setStyle(ButtonStyle.Secondary)
    )
  );
}

function controlRow(lang, claimedBy) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(claimedBy ? t(lang, 'Liberar', 'Unclaim') : t(lang, 'Reclamar', 'Claim'))
      .setEmoji('🙋')
      .setStyle(claimedBy ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel(t(lang, 'Cerrar', 'Close'))
      .setEmoji(config.emojis.close)
      .setStyle(ButtonStyle.Danger)
  );
}

function closeModal(lang) {
  return new ModalBuilder()
    .setCustomId('ticketclose')
    .setTitle(t(lang, 'Cerrar ticket', 'Close ticket'))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel(t(lang, 'Razón (opcional)', 'Reason (optional)'))
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );
}

function ratingRow(ticket) {
  return new ActionRowBuilder().addComponents(
    [1, 2, 3, 4, 5].map((n) =>
      new ButtonBuilder()
        .setCustomId(`rate:${ticket.number}:${n}:${ticket.claimedBy || 0}`)
        .setLabel(String(n))
        .setEmoji('⭐')
        .setStyle(ButtonStyle.Secondary)
    )
  );
}

/* ───────────── Ticket helpers ───────────── */
// Returns the stored ticket for a channel. Tickets created by older versions
// (identified by their channel topic) are adopted automatically.
function getTicket(channel) {
  if (!channel) return null;
  const saved = store.get(channel.id);
  if (saved) return saved;
  const m = /^ticket:(\d+):(help|buy)$/.exec(channel.topic ?? '');
  if (!m) return null;
  return store.set(channel.id, {
    channelId: channel.id,
    number: store.nextNumber(),
    ownerId: m[1],
    type: m[2],
    lang: 'es',
    createdAt: channel.createdTimestamp ?? Date.now(),
    claimedBy: null,
    waitingSince: null,
    warned: false,
  });
}

function findOpenTicketChannel(guild, ownerId, type) {
  const saved = store.all().find((x) => x.ownerId === ownerId && x.type === type && guild.channels.cache.has(x.channelId));
  if (saved) return guild.channels.cache.get(saved.channelId);
  return guild.channels.cache.find((c) => c.topic === `ticket:${ownerId}:${type}`) ?? null;
}

async function sendLog(payload) {
  if (!LOG_CHANNEL_ID) return;
  try {
    const ch = await client.channels.fetch(LOG_CHANNEL_ID);
    await ch.send(payload);
  } catch (err) {
    console.error('[LOG] Could not send log:', err.message);
  }
}

function logEmbed(title, fields) {
  return new EmbedBuilder()
    .setColor(config.color)
    .setTitle(title)
    .addFields(fields)
    .setFooter({ text: config.brand })
    .setTimestamp();
}

/* ───────────── Create ticket ───────────── */
async function createTicket(interaction, key) {
  const btn = BUTTONS[key];
  if (!btn) return;
  const { guild, user } = interaction;
  const lang = btn.lang;
  const form = FORMS[btn.type][lang];

  await interaction.deferReply({ flags: EPH });

  const existing = findOpenTicketChannel(guild, user.id, btn.type);
  if (existing) {
    return interaction.editReply(
      t(lang, `❌ Ya tienes un ticket abierto: ${existing}`, `❌ You already have an open ticket: ${existing}`)
    );
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles,
      ],
    },
  ];
  if (STAFF_ROLE_ID) {
    overwrites.push({
      id: STAFF_ROLE_ID,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  const number = store.nextNumber();
  const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const channel = await guild.channels.create({
    name: `${btn.type}-${pad(number)}${safeName ? '-' + safeName : ''}`,
    type: ChannelType.GuildText,
    parent: config.categories[btn.type] || undefined,
    topic: `ticket:${user.id}:${btn.type}`,
    permissionOverwrites: overwrites,
  });

  const ticket = store.set(channel.id, {
    channelId: channel.id,
    number,
    ownerId: user.id,
    type: btn.type,
    lang,
    createdAt: Date.now(),
    claimedBy: null,
    waitingSince: null,
    warned: false,
  });

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(`${form.title} • #${pad(number)}`)
    .setAuthor({ name: interaction.member?.displayName ?? user.username, iconURL: user.displayAvatarURL() })
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      form.fields.map((f) => ({
        name: f.label.replace(/\s*\((optional|opcional)\)/i, ''),
        value: interaction.fields.getTextInputValue(f.id)?.trim() || t(lang, '_No especificado_', '_Not specified_'),
      }))
    )
    .setFooter({ text: config.brand })
    .setTimestamp();

  const staffPing = STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}>` : null;
  await channel.send({
    content: t(
      lang,
      `${user} ¡Bienvenido! ${staffPing ?? 'El staff'} te atenderá pronto.`,
      `${user} Welcome! ${staffPing ?? 'Staff'} will assist you shortly.`
    ),
    embeds: [embed],
    components: [controlRow(lang, null)],
    allowedMentions: { users: [user.id], roles: STAFF_ROLE_ID ? [STAFF_ROLE_ID] : [] },
  });

  await interaction.editReply(t(lang, `✅ Ticket creado: ${channel}`, `✅ Ticket created: ${channel}`));

  sendLog({
    embeds: [
      logEmbed('🎫 Ticket opened', [
        { name: 'Ticket', value: `#${pad(ticket.number)} (${channel})`, inline: true },
        { name: 'Type', value: btn.type, inline: true },
        { name: 'Opened by', value: `${user} (${user.id})`, inline: true },
      ]),
    ],
  });
}

/* ───────────── Close ticket (+ transcript, logs, DM, rating) ───────────── */
const closing = new Set();

async function closeTicket(channel, closer, reason, { auto = false } = {}) {
  const ticket = getTicket(channel);
  if (!ticket || closing.has(channel.id)) return false;
  closing.add(channel.id);

  try {
    const messages = await fetchAll(channel);
    const closedAt = Date.now();
    const closerName = auto ? 'Auto-close' : closer.username;
    const html = renderHtml({ ticket, channel, guild: channel.guild, messages, closedAt, closedBy: closerName, reason });
    const fileName = `transcript-${ticket.type}-${pad(ticket.number)}.html`;
    const file = () => new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: fileName });

    const minutes = Math.max(1, Math.round((closedAt - ticket.createdAt) / 60000));
    const duration = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;

    await sendLog({
      embeds: [
        logEmbed('🔒 Ticket closed', [
          { name: 'Ticket', value: `#${pad(ticket.number)} (${ticket.type})`, inline: true },
          { name: 'Opened by', value: `<@${ticket.ownerId}>`, inline: true },
          { name: 'Claimed by', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : '—', inline: true },
          { name: 'Closed by', value: auto ? 'Auto-close' : `${closer}`, inline: true },
          { name: 'Duration', value: duration, inline: true },
          { name: 'Messages', value: String(messages.length), inline: true },
          { name: 'Reason', value: reason || '—' },
        ]),
      ],
      files: [file()],
    });

    if (config.transcript.dmUser) {
      try {
        const lang = ticket.lang;
        const owner = await client.users.fetch(ticket.ownerId);
        const dm = new EmbedBuilder()
          .setColor(config.color)
          .setTitle(t(lang, `Tu ticket #${pad(ticket.number)} fue cerrado`, `Your ticket #${pad(ticket.number)} was closed`))
          .setDescription(
            (reason ? `**${t(lang, 'Razón', 'Reason')}:** ${reason}\n\n` : '') +
              t(lang, 'Adjuntamos la transcripción de tu ticket.', 'Your ticket transcript is attached.') +
              (config.rating.enabled
                ? '\n\n' + t(lang, '¿Cómo calificarías la atención?', 'How would you rate the support?')
                : '')
          )
          .setFooter({ text: config.brand })
          .setTimestamp();
        await owner.send({
          embeds: [dm],
          files: [file()],
          components: config.rating.enabled ? [ratingRow(ticket)] : [],
        });
      } catch {
        // DMs closed — ignore
      }
    }

    store.delete(channel.id);
    await sleep(config.closeDelaySeconds * 1000);
    await channel.delete(`Ticket #${pad(ticket.number)} closed by ${closerName}`);
    return true;
  } catch (err) {
    console.error('[CLOSE] Error closing ticket:', err);
    channel.send('❌ Error closing the ticket / Error al cerrar el ticket.').catch(() => {});
    return false;
  } finally {
    closing.delete(channel.id);
  }
}

/* ───────────── Presence + voice 24/7 ───────────── */
function setPresence() {
  client.user.setPresence({
    status: 'online',
    activities: [{ name: config.streamName, type: ActivityType.Streaming, url: STREAM_URL }],
  });
}

let voiceTimer = null;
function scheduleVoice(ms) {
  if (voiceTimer) return;
  voiceTimer = setTimeout(() => {
    voiceTimer = null;
    connectVoice();
  }, ms);
}

async function connectVoice() {
  if (!config.voiceChannelId) return; // 24/7 voice is optional
  try {
    const channel = await client.channels.fetch(config.voiceChannelId);
    if (!channel || !channel.isVoiceBased()) {
      return console.error('[VOICE] Channel does not exist or is not a voice channel.');
    }

    const existing = getVoiceConnection(channel.guild.id);
    if (
      existing &&
      existing.state.status !== VoiceConnectionStatus.Destroyed &&
      existing.joinConfig.channelId === channel.id
    ) return;

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    if (!connection._gmlxHooked) {
      connection._gmlxHooked = true;
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
        }
      });
      connection.on(VoiceConnectionStatus.Destroyed, () => scheduleVoice(5_000));
    }

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    console.log(`[VOICE] Connected to ${channel.name}`);
  } catch (err) {
    console.error('[VOICE] Error, retrying in 10s:', err.message);
    scheduleVoice(10_000);
  }
}

/* ───────────── Auto-close sweeper ───────────── */
async function sweepInactive() {
  const ac = config.autoClose;
  if (!ac.enabled) return;
  const now = Date.now();
  for (const tk of store.all()) {
    if (!tk.waitingSince) continue;
    const channel = client.channels.cache.get(tk.channelId);
    if (!channel) continue;
    const hours = (now - tk.waitingSince) / 3_600_000;
    if (hours >= ac.closeAfterHours) {
      await closeTicket(channel, client.user, 'Auto-closed: no reply from the customer.', { auto: true });
    } else if (hours >= ac.warnAfterHours && !tk.warned) {
      store.update(tk.channelId, { warned: true });
      channel
        .send({
          content: t(
            tk.lang,
            `<@${tk.ownerId}> ⏰ Este ticket se cerrará automáticamente si no respondes pronto.`,
            `<@${tk.ownerId}> ⏰ This ticket will be closed automatically if you don't reply soon.`
          ),
          allowedMentions: { users: [tk.ownerId] },
        })
        .catch(() => {});
    }
  }
}

/* ───────────── Ready ───────────── */
client.once(Events.ClientReady, async () => {
  console.log(`Bot ready as ${client.user.tag}`);
  store.load();
  giveaways.start();

  setPresence();
  setInterval(setPresence, 10 * 60_000);

  for (const guild of client.guilds.cache.values()) {
    await guild.commands.set(commands).catch((e) =>
      console.error(`Could not register commands in ${guild.name}:`, e.message)
    );
  }

  // Forget tickets whose channel was deleted while the bot was offline
  for (const tk of store.all()) {
    await client.channels.fetch(tk.channelId).catch((e) => {
      if (e.code === 10003) store.delete(tk.channelId);
    });
  }

  connectVoice();
  setInterval(connectVoice, 60_000);
  setInterval(sweepInactive, 10 * 60_000);
});

client.on(Events.GuildCreate, (guild) => guild.commands.set(commands).catch(() => {}));
client.on(Events.ChannelDelete, (channel) => store.delete(channel.id));

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (config.voiceChannelId && newState.id === client.user.id && newState.channelId !== config.voiceChannelId) scheduleVoice(2_000);
});

// Track who spoke last (used by auto-close)
client.on(Events.MessageCreate, (msg) => {
  if (!msg.guild || msg.author.bot) return;
  const tk = store.get(msg.channelId);
  if (!tk) return;
  if (msg.author.id === tk.ownerId) store.update(tk.channelId, { waitingSince: null, warned: false });
  else if (isStaff(msg.member)) store.update(tk.channelId, { waitingSince: Date.now(), warned: false });
});

/* ───────────── Interactions ───────────── */
async function denyStaffOnly(interaction, lang) {
  return interaction.reply({
    content: t(lang, '❌ Solo el staff puede hacer esto.', '❌ Only staff can do this.'),
    flags: EPH,
  });
}

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    /* ── Rating buttons (arrive in the user's DM) ── */
    if (interaction.isButton() && interaction.customId.startsWith('rate:')) {
      const [, number, stars, staffId] = interaction.customId.split(':');
      await interaction.update({
        content: `${'⭐'.repeat(Number(stars))}\n**Thanks for your feedback! / ¡Gracias por tu opinión!**`,
        components: [],
      });
      return sendLog({
        embeds: [
          logEmbed('⭐ New rating', [
            { name: 'Ticket', value: `#${pad(Number(number))}`, inline: true },
            { name: 'Rating', value: '⭐'.repeat(Number(stars)) + ` (${stars}/5)`, inline: true },
            { name: 'Staff', value: staffId !== '0' ? `<@${staffId}>` : '—', inline: true },
            { name: 'User', value: `${interaction.user} (${interaction.user.id})` },
          ]),
        ],
      });
    }

    if (!interaction.guild) return;

    /* ── Giveaways ── */
    if (await giveaways.handle(interaction)) return;

    /* ── Slash commands ── */
    if (interaction.isChatInputCommand()) {
      const name = interaction.commandName;

      if (name === 'ticketpanel') {
        const file = new AttachmentBuilder(path.join(__dirname, config.panelImage));
        await interaction.channel.send({ content: config.panelText, files: [file], components: [panelRow()] });
        return interaction.reply({ content: '✅ Panel sent / Panel enviado.', flags: EPH });
      }

      if (name === 'rolespanel') {
        await interaction.deferReply({ flags: EPH });
        const rr = config.reactionRoles;
        if (!rr.girlRoleId || !rr.boyRoleId) {
          return interaction.editReply('❌ Set GIRL_ROLE_ID and BOY_ROLE_ID in your .env first · Configura GIRL_ROLE_ID y BOY_ROLE_ID en tu .env.');
        }
        const file = new AttachmentBuilder(path.join(__dirname, rr.image));
        const msg = await interaction.channel.send({ content: rrPanelText(), files: [file] });
        await msg.react(rr.girlEmoji);
        await msg.react(rr.boyEmoji);
        return interaction.editReply('✅ Roles panel sent / Panel de roles enviado.');
      }

      if (name === 'ticketstats') {
        if (!isStaff(interaction.member)) return denyStaffOnly(interaction, 'en');
        const all = store.all();
        const count = (type) => all.filter((x) => x.type === type).length;
        const claimed = all.filter((x) => x.claimedBy).length;
        const embed = logEmbed('📊 Ticket stats', [
          { name: 'Open', value: String(all.length), inline: true },
          { name: 'Claimed', value: String(claimed), inline: true },
          { name: 'Unclaimed', value: String(all.length - claimed), inline: true },
          { name: 'Help', value: String(count('help')), inline: true },
          { name: 'Buy', value: String(count('buy')), inline: true },
          { name: 'Total created', value: String(store.total()), inline: true },
        ]);
        return interaction.reply({ embeds: [embed], flags: EPH });
      }

      // The rest only work inside a ticket
      const ticket = getTicket(interaction.channel);
      if (!ticket) {
        return interaction.reply({ content: '❌ This is not a ticket channel.', flags: EPH });
      }
      const lang = ticket.lang;
      if (!isStaff(interaction.member)) return denyStaffOnly(interaction, lang);

      if (name === 'add') {
        const user = interaction.options.getUser('user');
        await interaction.channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
        });
        return interaction.reply({ content: t(lang, `✅ ${user} fue añadido al ticket.`, `✅ ${user} was added to the ticket.`) });
      }

      if (name === 'remove') {
        const user = interaction.options.getUser('user');
        if (user.id === ticket.ownerId) {
          return interaction.reply({ content: t(lang, '❌ No puedes quitar al dueño del ticket.', '❌ You cannot remove the ticket owner.'), flags: EPH });
        }
        await interaction.channel.permissionOverwrites.delete(user.id);
        return interaction.reply({ content: t(lang, `✅ ${user} fue quitado del ticket.`, `✅ ${user} was removed from the ticket.`) });
      }

      if (name === 'rename') {
        await interaction.deferReply({ flags: EPH });
        const clean = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 90);
        await interaction.channel.setName(clean);
        return interaction.editReply(t(lang, `✅ Renombrado a **${clean}**.`, `✅ Renamed to **${clean}**.`));
      }

      if (name === 'close') {
        const reason = interaction.options.getString('reason');
        await interaction.reply(t(lang, '🔒 Generando transcripción y cerrando el ticket...', '🔒 Generating transcript and closing the ticket...'));
        return closeTicket(interaction.channel, interaction.user, reason);
      }
      return;
    }

    /* ── Panel button -> open the form ── */
    if (interaction.isButton() && interaction.customId.startsWith('ticket:')) {
      const key = interaction.customId.split(':')[1];
      const btn = BUTTONS[key];
      if (!btn) return;
      const existing = findOpenTicketChannel(interaction.guild, interaction.user.id, btn.type);
      if (existing) {
        return interaction.reply({
          content: t(btn.lang, `❌ Ya tienes un ticket abierto: ${existing}`, `❌ You already have an open ticket: ${existing}`),
          flags: EPH,
        });
      }
      return interaction.showModal(buildModal(key, btn.type, btn.lang));
    }

    /* ── Form submitted -> create the ticket ── */
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticketmodal:')) {
      return createTicket(interaction, interaction.customId.split(':')[1]);
    }

    /* ── Claim / unclaim ── */
    if (interaction.isButton() && interaction.customId === 'ticket_claim') {
      const ticket = getTicket(interaction.channel);
      if (!ticket) return;
      const lang = ticket.lang;
      if (!isStaff(interaction.member)) return denyStaffOnly(interaction, lang);

      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id && !isAdmin) {
        return interaction.reply({
          content: t(lang, `❌ Este ticket ya fue reclamado por <@${ticket.claimedBy}>.`, `❌ This ticket is already claimed by <@${ticket.claimedBy}>.`),
          flags: EPH,
        });
      }

      const claiming = !ticket.claimedBy;
      const claimedBy = claiming ? interaction.user.id : null;
      store.update(ticket.channelId, { claimedBy }, true);

      const base = interaction.message.embeds[0];
      const embed = EmbedBuilder.from(base);
      const fields = (base.fields ?? []).filter((f) => !CLAIM_FIELDS.includes(f.name));
      if (claimedBy) fields.push({ name: t(lang, 'Atendido por', 'Claimed by'), value: `<@${claimedBy}>`, inline: true });
      embed.setFields(fields);

      await interaction.update({ embeds: [embed], components: [controlRow(lang, claimedBy)] });

      if (claiming) {
        await interaction.channel.send({
          content: t(
            lang,
            `👋 <@${ticket.ownerId}>, ${interaction.user} atenderá tu ticket.`,
            `👋 <@${ticket.ownerId}>, ${interaction.user} will assist you.`
          ),
          allowedMentions: { users: [ticket.ownerId] },
        });
      }
      return sendLog({
        embeds: [
          logEmbed(claiming ? '🙋 Ticket claimed' : '↩️ Ticket unclaimed', [
            { name: 'Ticket', value: `#${pad(ticket.number)} (${interaction.channel})`, inline: true },
            { name: 'Staff', value: `${interaction.user}`, inline: true },
          ]),
        ],
      });
    }

    /* ── Close button -> reason form ── */
    if (interaction.isButton() && interaction.customId === 'ticket_close') {
      const ticket = getTicket(interaction.channel);
      const lang = ticket?.lang ?? 'en';
      if (!isStaff(interaction.member)) return denyStaffOnly(interaction, lang);
      return interaction.showModal(closeModal(lang));
    }

    /* ── Close form submitted ── */
    if (interaction.isModalSubmit() && interaction.customId === 'ticketclose') {
      const ticket = getTicket(interaction.channel);
      if (!ticket) return;
      if (!isStaff(interaction.member)) return denyStaffOnly(interaction, ticket.lang);
      const reason = interaction.fields.getTextInputValue('reason')?.trim() || null;
      await interaction.reply(t(ticket.lang, '🔒 Generando transcripción y cerrando el ticket...', '🔒 Generating transcript and closing the ticket...'));
      return closeTicket(interaction.channel, interaction.user, reason);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const msg = { content: '❌ An error occurred / Ocurrió un error.', flags: EPH };
    if (interaction.deferred || interaction.replied) interaction.editReply(msg).catch(() => {});
    else interaction.reply(msg).catch(() => {});
  }
});

/* ───────────── Reaction roles ───────────── */
// Custom emoji IDs are rendered as <:name:id>, unicode emojis are used as they are
const rrEmojiText = (e) => (/^\d{17,20}$/.test(e) ? `<:emoji:${e}>` : e);
const sameEmoji = (emoji, key) => emoji.id === key || emoji.name === key;

const rrPanelText = () => {
  const rr = config.reactionRoles;
  return (
    '**Reacciona según el rol que quieras**\n' +
    '**React according to the role you want**\n\n' +
    `**Girl:** ${rrEmojiText(rr.girlEmoji)}\n` +
    `**Boy:** ${rrEmojiText(rr.boyEmoji)}`
  );
};

// The role linked to a reaction emoji (null if it is not one of ours)
const rrRoleFor = (emoji) => {
  const rr = config.reactionRoles;
  if (!rr.girlRoleId || !rr.boyRoleId) return null;
  if (sameEmoji(emoji, rr.girlEmoji)) return rr.girlRoleId;
  if (sameEmoji(emoji, rr.boyEmoji)) return rr.boyRoleId;
  return null;
};

// Checks that the reacted message is the panel sent by this bot
async function isRolesPanel(reaction) {
  if (reaction.partial) await reaction.fetch();
  const msg = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
  return msg.author?.id === client.user.id && msg.content.includes('React according to the role you want');
}

async function handleRoleReaction(reaction, user, adding) {
  try {
    if (user.bot || !reaction.message.guildId) return;
    const roleId = rrRoleFor(reaction.emoji);
    if (!roleId || !(await isRolesPanel(reaction))) return;

    const guild = reaction.message.guild ?? (await client.guilds.fetch(reaction.message.guildId));
    const member = await guild.members.fetch(user.id);
    const rr = config.reactionRoles;

    if (adding) {
      await member.roles.add(roleId);
      // Exclusive: picking one role removes the other one + its reaction
      if (rr.exclusive) {
        const otherRole = roleId === rr.girlRoleId ? rr.boyRoleId : rr.girlRoleId;
        const otherEmoji = roleId === rr.girlRoleId ? rr.boyEmoji : rr.girlEmoji;
        if (member.roles.cache.has(otherRole)) await member.roles.remove(otherRole);
        const other = reaction.message.reactions.cache.get(otherEmoji);
        if (other) await other.users.remove(user.id).catch(() => {});
      }
    } else {
      await member.roles.remove(roleId);
    }
  } catch (err) {
    console.error('[ReactionRoles]', err.message);
  }
}

client.on(Events.MessageReactionAdd, (reaction, user) => handleRoleReaction(reaction, user, true));
client.on(Events.MessageReactionRemove, (reaction, user) => handleRoleReaction(reaction, user, false));

/* ───────────── Safety nets ───────────── */
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    store.flush();
    client.destroy();
    process.exit(0);
  });
}

client.login(process.env.TOKEN);
