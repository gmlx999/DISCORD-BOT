<div align="center">

<img src="assets/make-ticket.png" alt="GG/GMLX Ticket Bot" width="560">

# 🎫 GG/GMLX Ticket Bot

**All-in-one Discord bot: tickets with forms, transcripts, ratings, giveaways, reaction roles and a 24/7 voice channel.**

*Bilingual (EN/ES) · No privileged intents · Easy to set up*

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.1.0-blueviolet)](package.json)
[![Stars](https://img.shields.io/github/stars/TU-USUARIO/gmlx-ticket-bot?style=social)](https://github.com/TU-USUARIO/gmlx-ticket-bot/stargazers)

[🇪🇸 Español](README.md) · [🛒 GMLX Store](https://gmlx-store.vercel.app/) · [🐛 Report a bug](https://github.com/TU-USUARIO/gmlx-ticket-bot/issues)

</div>

---

## 📑 Table of contents

- [✨ Features](#-features)
- [🧾 Commands](#-commands)
- [🚀 Quick start](#-quick-start)
- [🤖 Create the bot on Discord](#-create-the-bot-on-discord)
- [🔗 Invite the bot](#-invite-the-bot)
- [⚙️ Configuration](#️-configuration)
- [🎉 Giveaway guide](#-giveaway-guide)
- [☁️ 24/7 hosting](#️-247-hosting)
- [🛠️ Troubleshooting](#️-troubleshooting)
- [🔒 Data & privacy](#-data--privacy)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [💜 Credits](#-credits)

---

## ✨ Features

### 🎫 Ticket system
- **Panel** with an image and 4 buttons: *Help / Ayuda / Buy / Comprar* (EN + ES).
- **Form before the ticket opens**: Help (problem + description + extra) or Buy (product + payment method + notes). Answers are posted inside the ticket.
- **Numbered tickets** (`help-0007-user`), one open ticket per user per type.
- **Staff-only controls**: Claim / Unclaim and Close (with optional reason). Members cannot close tickets.
- **HTML transcript** on close, sent to the log channel and DMed to the ticket owner.
- **1–5 ⭐ rating** sent by DM after closing, logged with the staff member who handled it.
- **Auto-close** (off by default): warns and closes only when staff replied last and the customer went silent.
- **Log channel**: opened, claimed, closed tickets and ratings.

### 🎉 Giveaways
- Gold embed with a **big prize photo**, live countdown and an entry counter on the button.
- Optional **required role**, multiple winners, `reroll`, cancel and list.
- Winners announced in the channel and by **DM**. Giveaways survive bot restarts.

### 🧩 Extras
- **Reaction roles** (`/rolespanel`), with optional exclusive mode.
- **"Streaming" status** (purple) with your Twitch/YouTube link.
- **24/7 voice channel** with auto-reconnect and a watchdog.
- **No privileged intents** (no *Message Content*, *Members* or *Presence* needed).

---

## 🧾 Commands

| Command | Who | What it does |
|---|---|---|
| `/ticketpanel` | Administrator | Sends the ticket panel to the current channel |
| `/rolespanel` | Administrator | Sends the reaction roles panel |
| `/add <user>` | Staff | Adds someone to the ticket |
| `/remove <user>` | Staff | Removes someone from the ticket |
| `/rename <name>` | Staff | Renames the ticket |
| `/close [reason]` | Staff | Closes the ticket |
| `/ticketstats` | Staff | Ticket statistics |
| `/giveaway start` | Staff | Starts a giveaway |
| `/giveaway end <message_id>` | Staff | Ends a giveaway now |
| `/giveaway reroll <message_id> [winners]` | Staff | Picks new winner(s) |
| `/giveaway cancel <message_id>` | Staff | Cancels a giveaway |
| `/giveaway list` | Staff | Lists active giveaways |

> **Staff** = anyone with the *Manage Channels* permission or the role set in `STAFF_ROLE_ID`.

---

## 🚀 Quick start

**Requirements:** [Node.js 18 or newer](https://nodejs.org/) and a Discord account.

```bash
# 1. Clone the repository
git clone https://github.com/TU-USUARIO/gmlx-ticket-bot.git
cd gmlx-ticket-bot

# 2. Install dependencies
npm install

# 3. Create your config file
cp .env.example .env        # on Windows: copy .env.example .env
# Open .env and paste your TOKEN (see next section)

# 4. Start the bot
npm start
```

Once the bot is online, go to the channel where you want the panel and run **`/ticketpanel`**.

---

## 🤖 Create the bot on Discord

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Open **Bot** → **Reset Token** → copy the token into `TOKEN=` in your `.env`.
   - ⚠️ **Never share your token.** If it leaks, hit *Reset Token* immediately.
3. Under **Bot → Privileged Gateway Intents** you don't need to enable anything.
4. Copy the **Application ID** (*General Information*): you need it for the invite link.

---

## 🔗 Invite the bot

Replace `YOUR_CLIENT_ID` with your Application ID and open the link:

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=269610064&scope=bot%20applications.commands
```

Included permissions: *View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Manage Channels, Manage Messages, Manage Roles, Add Reactions and Connect (voice)*.

> 💡 For reaction roles, the bot's role must be **above** the roles it hands out.

---

## ⚙️ Configuration

### Environment variables (`.env`)

| Variable | Required | Description |
|---|:---:|---|
| `TOKEN` | ✅ | Bot token |
| `STAFF_ROLE_ID` | Recommended | Staff role that can see and close tickets |
| `LOG_CHANNEL_ID` | Recommended | Channel for logs and transcripts |
| `BRAND_NAME` | — | Name shown in embed footers (default `GG/GMLX`) |
| `HELP_CATEGORY_ID` / `BUY_CATEGORY_ID` | — | Categories where tickets are created |
| `VOICE_CHANNEL_ID` | — | 24/7 voice channel (empty = bot does not join voice) |
| `STREAM_NAME` / `STREAM_URL` | — | Text and link for the "Streaming" status |
| `EMOJI_HELP` / `EMOJI_BUY` / `EMOJI_CLOSE` | — | Unicode emoji (`🎫`) or a custom emoji ID from **your** server |
| `GIRL_ROLE_ID` / `BOY_ROLE_ID` | — | Roles for `/rolespanel` |
| `GIRL_EMOJI` / `BOY_EMOJI` | — | Reaction emojis (unicode or ID) |

> 💡 To get an ID: Discord → Settings → Advanced → **Developer Mode**, then right-click the role/channel → **Copy ID**.

### Customization (`config.js`)

- `panelText` and `panelImage`: panel text and image (`assets/make-ticket.png`).
- `autoClose`: set `enabled: true` to turn auto-close on (warns at 24 h, closes at 48 h).
- `giveaways`: colors, button emoji and the "claim your prize" line.
- Images live in `assets/`; swap them for your own.

---

## 🎉 Giveaway guide

```text
/giveaway start prize:Nitro 1 month duration:1d winners:2 image:[photo] required_role:@Member
```

| Option | Example | Description |
|---|---|---|
| `prize` | `Nitro 1 month` | Prize (required) |
| `duration` | `30m`, `2h`, `1d12h`, `1w` | Duration (10 s – 60 days) |
| `winners` | `3` | Number of winners (1–20) |
| `image` | *(file)* | Big prize photo |
| `description` | `Members only` | Extra text |
| `required_role` | `@Member` | Only this role can enter |
| `channel` | `#giveaways` | Channel (default: current one) |

- To **end, reroll or cancel** a giveaway use its *message ID* (right-click → *Copy Message ID*, or see `/giveaway list`).
- Put a picture at `assets/giveaway.png` and it's used whenever you don't attach one.

---

## ☁️ 24/7 hosting

The bot has to stay online all the time. Common options: a VPS, a Discord-bot hosting service or your own PC.

Example with [PM2](https://pm2.keymetrics.io/) on a VPS:

```bash
npm install -g pm2
pm2 start index.js --name gmlx-ticket-bot
pm2 save && pm2 startup
```

> ⚠️ If your host has a **temporary disk**, `data/tickets.json` and `data/giveaways.json` will reset (ticket counter and active giveaways). Use a persistent volume if that matters.

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `/` commands don't show up | Invite the bot with the `applications.commands` scope and restart it. Give it a few seconds. |
| `Missing Permissions` when creating tickets | Check the bot's permissions in the ticket category and that its role is high enough in the hierarchy. |
| Invalid emoji error | Use unicode emojis or IDs of emojis from **your own** server. |
| Bot doesn't join voice | Set `VOICE_CHANNEL_ID` and give it *Connect* permission in that channel. |
| DMs don't arrive (transcript / rating / prize) | The user has DMs closed; that's normal and the bot ignores it. |
| `/rolespanel` doesn't work | Set `GIRL_ROLE_ID` and `BOY_ROLE_ID` and move the bot's role above them. |

Still stuck? [Open an issue](https://github.com/TU-USUARIO/gmlx-ticket-bot/issues) with the full error (**without your token**).

---

## 🔒 Data & privacy

- The bot only stores what it needs in `data/*.json`: channel/user IDs of open tickets and giveaways.
- Transcripts are sent to the log channel and DMed to the ticket owner; they are **not saved to disk**.
- The token lives only in your `.env`, which is in `.gitignore`. **Never push it to GitHub.**

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a branch: `git checkout -b my-improvement`.
3. Make your changes and commit: `git commit -m "Add my improvement"`.
4. Push the branch and open a Pull Request.

You can also help by reporting bugs or suggesting ideas in [Issues](https://github.com/TU-USUARIO/gmlx-ticket-bot/issues). If you like the project, give it a ⭐!

---

## 📄 License

Released under the **MIT** license. See [LICENSE](LICENSE) for details.

---

## 💜 Credits

- Created by **GG/GMLX** — [gmlx-store.vercel.app](https://gmlx-store.vercel.app/)
- Built with [discord.js](https://discord.js.org/), [@discordjs/voice](https://github.com/discordjs/discord.js/tree/main/packages/voice), [dotenv](https://github.com/motdotla/dotenv) and [libsodium-wrappers](https://github.com/jedisct1/libsodium.js).
- Badges by [Shields.io](https://shields.io/).

<div align="center">

**Made with 💜 by GG/GMLX · Hecho con 💜 por GG/GMLX**

</div>
