# AL3AME BOT

AL3AME BOT is a WhatsApp automation starter built with Node.js 20+ and Baileys.

## Current features (v1.1.0)
- WhatsApp QR pairing
- Multi-file authentication state
- Automatic reconnect after temporary disconnections
- Commands: `.menu`, `.ping`, `.status`, `.owner`, `.id`, `.info`
- Common message wrapper and caption text extraction
- Structured logs with Pino
- Basic automated tests for message utilities

## Requirements
- Node.js 20 or later
- A separate WhatsApp test number is recommended
- Persistent storage for the WhatsApp authentication folder when hosted in the cloud

## Run locally
1. Install Node.js 20+.
2. Clone or download this repository.
3. Copy `.env.example` to `.env`.
4. Set `OWNER_NUMBER` to the owner's full international number using digits only (example format: `2126XXXXXXXX`).
5. Install and run:

```bash
npm install
npm test
npm start
```

6. Scan the QR code using WhatsApp > Linked devices > Link a device.

## Railway deployment
1. Deploy this repository as a Railway service.
2. Set the start command to `npm start`.
3. Add the variables from `.env.example` in the Railway service Variables tab.
4. Add a Railway Volume mounted at `/data`.
5. Set `AUTH_DIR=/data/auth_info_baileys` in the service variables.
6. Deploy and inspect the private service logs for the pairing QR.

Do not mount a volume over the application root; use a dedicated data path such as `/data`. Never share pairing QR codes or authentication files.

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

## Environment variables
See `.env.example`. Never commit the real `.env` file or the authentication folder.

## Security and limitations
- Keep `.env`, QR codes, and `auth_info_baileys/` private.
- Do not use the bot for spam or unsolicited bulk messaging.
- Baileys is an unofficial WhatsApp Web client, is not affiliated with WhatsApp, and may carry account or service risks. Follow WhatsApp's terms.
- This is an MVP foundation, not a production-certified service. Test pairing, reconnects, and persistent storage before relying on it.
- AI integration, plugin management, database features, and a protected web dashboard are not included yet.
