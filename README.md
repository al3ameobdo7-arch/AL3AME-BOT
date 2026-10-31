# AL3AME BOT

AL3AME BOT is a WhatsApp automation worker built with Node.js 20+ and Baileys.

## Current features (v1.1.0)
- WhatsApp QR pairing
- Multi-file authentication state
- Automatic reconnect after temporary disconnections
- Commands: `.menu`, `.ping`, `.status`, `.owner`, `.id`, `.info`
- Common message wrapper and caption text extraction
- Structured logs with Pino
- Basic automated tests for message utilities

## Deploy on Render (recommended setup)

This repository includes a `render.yaml` Blueprint for a **Background Worker** with a persistent disk.

1. Sign in to Render and choose **New > Blueprint**.
2. Connect GitHub and select `al3ameobdo7-arch/AL3AME-BOT`.
3. Render reads `render.yaml`. Review the worker and disk settings, then apply.
4. Open the created worker and go to **Environment**.
5. Set `OWNER_NUMBER` to your WhatsApp number in international digits only (example format: `2126XXXXXXXX`).
6. Confirm these values exist:
   - `BOT_NAME=AL3AME BOT`
   - `PREFIX=.`
   - `AUTH_DIR=/var/data/auth_info_baileys`
   - `LOG_LEVEL=info`
7. Save and deploy. Open **Logs** for the worker and scan the QR code using WhatsApp > Linked devices > Link a device.

**Important:** Persistent disks require a paid Render service. The disk in this Blueprint is mounted at `/var/data`; the bot's WhatsApp session is stored at `/var/data/auth_info_baileys`. Do not remove the disk or change `AUTH_DIR` after pairing unless you intend to create a new session.

## Run locally

1. Install Node.js 20 or later.
2. Clone or download this repository.
3. Copy `.env.example` to `.env`.
4. Set `OWNER_NUMBER` to the owner's full international number using digits only.
5. Install and run:

```bash
npm install
npm test
npm start
```

6. Scan the QR code using WhatsApp > Linked devices > Link a device.

## Commands

| Command | Description |
|---|---|
| `.menu` | List commands |
| `.ping` | Check bot response |
| `.status` | Show uptime and memory usage |
| `.owner` | Mention the configured owner |
| `.id` | Show the current chat ID and type |
| `.info` | Show bot information |

Change the command prefix with the `PREFIX` environment variable.

## Security and limitations

- Keep `.env`, QR codes, and `auth_info_baileys/` private.
- Never paste WhatsApp session files or QR codes into GitHub, chat, or public logs.
- Do not use the bot for spam or unsolicited bulk messaging.
- Baileys is an unofficial WhatsApp Web client, is not affiliated with WhatsApp, and may carry account or service risks. Follow WhatsApp's terms.
- This is an MVP foundation, not a production-certified service. Test pairing, reconnects, and persistent storage before relying on it.
- AI integration, plugin management, database features, and a protected web dashboard are not included yet.
