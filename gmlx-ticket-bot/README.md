<div align="center">

<img src="assets/make-ticket.png" alt="GG/GMLX Ticket Bot" width="560">

# 🎫 GG/GMLX Ticket Bot

**Bot de Discord todo en uno: tickets con formularios, transcripciones, calificaciones, sorteos, roles por reacción y canal de voz 24/7.**

*Bilingüe (ES/EN) · Sin intents privilegiados · Fácil de instalar*

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-yellow.svg)](LICENSE)
[![Versión](https://img.shields.io/badge/versi%C3%B3n-2.1.0-blueviolet)](package.json)
[![Stars](https://img.shields.io/github/stars/TU-USUARIO/gmlx-ticket-bot?style=social)](https://github.com/TU-USUARIO/gmlx-ticket-bot/stargazers)

[🇺🇸 English](README.en.md) · [🛒 GMLX Store](https://gmlx-store.vercel.app/) · [🐛 Reportar un error](https://github.com/TU-USUARIO/gmlx-ticket-bot/issues)

</div>

---

## 📑 Índice

- [✨ Características](#-características)
- [🧾 Comandos](#-comandos)
- [🚀 Instalación rápida](#-instalación-rápida)
- [🤖 Crear el bot en Discord](#-crear-el-bot-en-discord)
- [🔗 Invitar el bot a tu servidor](#-invitar-el-bot-a-tu-servidor)
- [⚙️ Configuración](#️-configuración)
- [🎉 Guía de sorteos](#-guía-de-sorteos)
- [☁️ Hosting 24/7](#️-hosting-247)
- [🛠️ Solución de problemas](#️-solución-de-problemas)
- [🔒 Datos y privacidad](#-datos-y-privacidad)
- [🤝 Contribuir](#-contribuir)
- [📄 Licencia](#-licencia)
- [💜 Créditos](#-créditos)

---

## ✨ Características

### 🎫 Sistema de tickets
- **Panel** con imagen y 4 botones: *Help / Ayuda / Buy / Comprar* (EN + ES).
- **Formulario antes de abrir el ticket**: Ayuda (problema + descripción + extra) o Compra (producto + método de pago + notas). Las respuestas se publican dentro del ticket.
- **Tickets numerados** (`help-0007-usuario`), un ticket abierto por usuario y tipo.
- **Controles solo para staff**: Reclamar / Liberar y Cerrar (con razón opcional). Los miembros no pueden cerrar tickets.
- **Transcripción HTML** al cerrar: se envía al canal de logs y por DM al dueño del ticket.
- **Calificación de 1 a 5 ⭐** por DM al cerrar, registrada junto al staff que atendió.
- **Auto-cierre** (desactivado por defecto): avisa y cierra solo si el staff respondió de último y el cliente dejó de contestar.
- **Canal de logs**: tickets abiertos, reclamados, cerrados y calificaciones.

### 🎉 Sorteos (Giveaways)
- Embed dorado con **foto grande del premio**, cuenta regresiva en vivo y contador de participantes en el botón.
- **Rol requerido** opcional, varios ganadores, `reroll`, cancelar y listar.
- Ganadores anunciados en el canal y por **DM**. Sobreviven a reinicios del bot.

### 🧩 Extras
- **Roles por reacción** (`/rolespanel`), con modo exclusivo opcional.
- **Estado "Streaming"** (morado) con tu enlace de Twitch/YouTube.
- **Canal de voz 24/7** con reconexión automática y vigilante (watchdog).
- **Sin intents privilegiados** (no necesita *Message Content*, *Members* ni *Presence*).

---

## 🧾 Comandos

| Comando | Quién | Qué hace |
|---|---|---|
| `/ticketpanel` | Administrador | Envía el panel de tickets al canal actual |
| `/rolespanel` | Administrador | Envía el panel de roles por reacción |
| `/add <usuario>` | Staff | Agrega a alguien al ticket |
| `/remove <usuario>` | Staff | Quita a alguien del ticket |
| `/rename <nombre>` | Staff | Cambia el nombre del ticket |
| `/close [razón]` | Staff | Cierra el ticket |
| `/ticketstats` | Staff | Estadísticas de tickets |
| `/giveaway start` | Staff | Inicia un sorteo |
| `/giveaway end <message_id>` | Staff | Termina un sorteo ahora |
| `/giveaway reroll <message_id> [winners]` | Staff | Elige nuevo(s) ganador(es) |
| `/giveaway cancel <message_id>` | Staff | Cancela un sorteo |
| `/giveaway list` | Staff | Lista los sorteos activos |

> **Staff** = quien tenga el permiso *Gestionar canales* o el rol definido en `STAFF_ROLE_ID`.

---

## 🚀 Instalación rápida

**Requisitos:** [Node.js 18 o superior](https://nodejs.org/) y una cuenta de Discord.

```bash
# 1. Clona el repositorio
git clone https://github.com/TU-USUARIO/gmlx-ticket-bot.git
cd gmlx-ticket-bot

# 2. Instala las dependencias
npm install

# 3. Crea tu archivo de configuración
cp .env.example .env        # en Windows: copy .env.example .env
# Abre .env y pega tu TOKEN (ver la sección siguiente)

# 4. Inicia el bot
npm start
```

Cuando el bot esté en línea, ve al canal donde quieres el panel y ejecuta **`/ticketpanel`**.

---

## 🤖 Crear el bot en Discord

1. Entra al [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Ve a **Bot** → **Reset Token** → copia el token y pégalo en `TOKEN=` de tu `.env`.
   - ⚠️ **Nunca compartas el token.** Si se filtra, haz *Reset Token* de inmediato.
3. En **Bot → Privileged Gateway Intents** no necesitas activar nada.
4. Copia el **Application ID** (en *General Information*): lo necesitas para el enlace de invitación.

---

## 🔗 Invitar el bot a tu servidor

Reemplaza `TU_CLIENT_ID` por tu Application ID y abre el enlace:

```
https://discord.com/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=269610064&scope=bot%20applications.commands
```

Permisos incluidos: *Ver canales, Enviar mensajes, Insertar enlaces, Adjuntar archivos, Leer historial, Gestionar canales, Gestionar mensajes, Gestionar roles, Añadir reacciones y Conectar (voz)*.

> 💡 Para los roles por reacción, el rol del bot debe estar **por encima** de los roles que va a dar.

---

## ⚙️ Configuración

### Variables de entorno (`.env`)

| Variable | Obligatoria | Descripción |
|---|:---:|---|
| `TOKEN` | ✅ | Token del bot |
| `STAFF_ROLE_ID` | Recomendada | Rol del staff que verá y cerrará los tickets |
| `LOG_CHANNEL_ID` | Recomendada | Canal de logs y transcripciones |
| `BRAND_NAME` | — | Nombre en los pies de los embeds (por defecto `GG/GMLX`) |
| `HELP_CATEGORY_ID` / `BUY_CATEGORY_ID` | — | Categorías donde se crean los tickets |
| `VOICE_CHANNEL_ID` | — | Canal de voz 24/7 (vacío = no entra a voz) |
| `STREAM_NAME` / `STREAM_URL` | — | Texto y enlace del estado "Streaming" |
| `EMOJI_HELP` / `EMOJI_BUY` / `EMOJI_CLOSE` | — | Emoji unicode (`🎫`) o ID de un emoji de **tu** servidor |
| `GIRL_ROLE_ID` / `BOY_ROLE_ID` | — | Roles para `/rolespanel` |
| `GIRL_EMOJI` / `BOY_EMOJI` | — | Emojis de las reacciones (unicode o ID) |

> 💡 Para obtener un ID: Discord → Ajustes → Avanzado → **Modo desarrollador**, luego clic derecho sobre el rol/canal → **Copiar ID**.

### Personalización (`config.js`)

- `panelText` y `panelImage`: texto e imagen del panel (`assets/make-ticket.png`).
- `autoClose`: pon `enabled: true` para activar el auto-cierre (avisa a las 24 h, cierra a las 48 h).
- `giveaways`: colores, emoji del botón y mensaje para reclamar premios.
- Las imágenes están en `assets/`; cámbialas por las tuyas.

---

## 🎉 Guía de sorteos

```text
/giveaway start prize:Nitro 1 mes duration:1d winners:2 image:[foto] required_role:@Miembro
```

| Opción | Ejemplo | Descripción |
|---|---|---|
| `prize` | `Nitro 1 mes` | Premio (obligatorio) |
| `duration` | `30m`, `2h`, `1d12h`, `1w` | Duración (10 s – 60 días) |
| `winners` | `3` | Número de ganadores (1–20) |
| `image` | *(archivo)* | Foto grande del premio |
| `description` | `Solo miembros` | Texto extra |
| `required_role` | `@Miembro` | Solo ese rol puede participar |
| `channel` | `#sorteos` | Canal (por defecto, el actual) |

- Para **terminar, repetir o cancelar** un sorteo usa el *ID del mensaje* (clic derecho → *Copiar ID del mensaje*, o míralo en `/giveaway list`).
- Si pones una imagen en `assets/giveaway.png`, se usa cuando no adjuntas ninguna.

---

## ☁️ Hosting 24/7

El bot necesita estar encendido todo el tiempo. Opciones comunes: un VPS, un hosting para bots de Discord o tu propia PC.

Ejemplo con [PM2](https://pm2.keymetrics.io/) en un VPS:

```bash
npm install -g pm2
pm2 start index.js --name gmlx-ticket-bot
pm2 save && pm2 startup
```

> ⚠️ Si tu hosting tiene **disco temporal**, `data/tickets.json` y `data/giveaways.json` se reiniciarán (contador de tickets y sorteos activos). Usa un volumen persistente si te importa conservarlos.

---

## 🛠️ Solución de problemas

| Problema | Solución |
|---|---|
| Los comandos `/` no aparecen | Invita el bot con el scope `applications.commands` y reinícialo. Espera unos segundos. |
| `Missing Permissions` al crear tickets | Revisa los permisos del bot en la categoría de tickets y que el rol del bot esté arriba en la jerarquía. |
| Error de emoji inválido | Usa emojis unicode o IDs de emojis de **tu mismo servidor**. |
| El bot no entra a voz | Define `VOICE_CHANNEL_ID` y dale permiso de *Conectar* en ese canal. |
| No llegan los DM (transcripción / calificación / premio) | El usuario tiene los mensajes directos cerrados; es normal y el bot lo ignora. |
| `/rolespanel` no funciona | Define `GIRL_ROLE_ID` y `BOY_ROLE_ID` y sube el rol del bot sobre ellos. |

¿Sigues atascado? [Abre un issue](https://github.com/TU-USUARIO/gmlx-ticket-bot/issues) con el error completo (**sin tu token**).

---

## 🔒 Datos y privacidad

- El bot guarda solo lo necesario para funcionar en `data/*.json`: IDs de canales/usuarios de tickets abiertos y de sorteos.
- Las transcripciones se envían al canal de logs y por DM al dueño del ticket; **no se guardan en disco**.
- El token vive solo en tu `.env`, que está en `.gitignore`. **Nunca lo subas a GitHub.**

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas!

1. Haz un *fork* del repositorio.
2. Crea una rama: `git checkout -b mi-mejora`.
3. Haz tus cambios y un commit: `git commit -m "Agrega mi mejora"`.
4. Sube la rama y abre un *Pull Request*.

También puedes ayudar reportando errores o proponiendo ideas en [Issues](https://github.com/TU-USUARIO/gmlx-ticket-bot/issues). Si te gusta el proyecto, ¡dale una ⭐!

---

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más información.

---

## 💜 Créditos

- Creado por **GG/GMLX** — [gmlx-store.vercel.app](https://gmlx-store.vercel.app/)
- Construido con [discord.js](https://discord.js.org/), [@discordjs/voice](https://github.com/discordjs/discord.js/tree/main/packages/voice), [dotenv](https://github.com/motdotla/dotenv) y [libsodium-wrappers](https://github.com/jedisct1/libsodium.js).
- Insignias por [Shields.io](https://shields.io/).

<div align="center">

**Hecho con 💜 por GG/GMLX · Made with 💜 by GG/GMLX**

</div>
