// ─────────────────────────────────────────────────────────────
//  Bot configuration. Server-specific IDs live in your .env file
//  (see .env.example) so this file is safe to publish.
//  Everything marked "optional" can be left empty.
// ─────────────────────────────────────────────────────────────
const env = (name, fallback = null) => (process.env[name] || '').trim() || fallback;

const brand = env('BRAND_NAME', 'GG/GMLX');

module.exports = {
  brand,
  color: 0x111111,

  // Categories where tickets are created (optional: empty = no category)
  categories: {
    help: env('HELP_CATEGORY_ID'), // Help / Ayuda
    buy: env('BUY_CATEGORY_ID'),   // Buy / Comprar
  },

  // Button emojis: a unicode emoji ("🎫") or the ID of a custom emoji of YOUR server
  emojis: {
    help: env('EMOJI_HELP', '🎫'),
    buy: env('EMOJI_BUY', '💸'),
    close: env('EMOJI_CLOSE', '🔒'),
  },

  // Reaction roles (/rolespanel) — optional, needs both role IDs
  reactionRoles: {
    girlRoleId: env('GIRL_ROLE_ID'),
    boyRoleId: env('BOY_ROLE_ID'),
    girlEmoji: env('GIRL_EMOJI', '👧'), // unicode or custom emoji ID
    boyEmoji: env('BOY_EMOJI', '👦'),
    image: 'assets/GMLX_ROLES_banner_v2.png',
    exclusive: true, // picking Girl removes Boy (and vice versa). false = allow both
  },

  // Giveaways (/giveaway start | end | reroll | cancel | list)
  giveaways: {
    buttonEmoji: '🎉',
    // Drop a picture at assets/giveaway.png to use it when /giveaway start has no image (optional)
    defaultImage: 'assets/giveaway.png',
    // Extra line under the winner announcement + DM ('' to disable)
    claimText: '📩 Open a ticket to claim your prize! · ¡Abre un ticket para reclamar tu premio!',
    colors: { active: 0xF5C542, ended: 0x2B2D31, cancelled: 0xED4245 },
  },

  // 24/7 voice channel (optional: empty = the bot does not join voice)
  voiceChannelId: env('VOICE_CHANNEL_ID'),

  // Streaming status text
  streamName: env('STREAM_NAME', brand),

  // Panel
  panelText:
    '**¡Abra un ticket para recibir ayuda o realizar una compra!**\n' +
    '**Open a ticket to get help or make a purchase.**',
  panelImage: 'assets/make-ticket.png',

  // Seconds between "closing" and the channel actually being deleted
  closeDelaySeconds: 3,

  // Send the HTML transcript to the ticket owner by DM + ask for a rating
  transcript: { dmUser: true },
  rating: { enabled: true },

  // Auto-close: only when STAFF replied last and the customer went silent.
  autoClose: { enabled: false, warnAfterHours: 24, closeAfterHours: 48 },
};
