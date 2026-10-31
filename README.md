# AL3AME BOT

Starter MVP for a WhatsApp bot using Node.js 20+ and Baileys 6.7.24 (legacy stable line).

## Included
- WhatsApp QR login
- Persistent local session folder (`auth_info_baileys/`)
- Automatic reconnect (except after logout)
- `.ping`, `.menu`, `.owner`, `.info` commands
- Owner-only command example
- Environment-based configuration

## Requirements
- Node.js 20 or later
- A separate WhatsApp test number is recommended
- For cloud hosting, attach persistent storage at the project root so `auth_info_baileys/` survives restarts.

## Run locally
1. Install Node.js 20+.
2. Extract this project.
3. Copy `.env.example` to `.env`.
4. Edit `.env` and set `OWNER_NUMBER` using country code and digits only, e.g. `2126XXXXXXXX`.
5. Run:

```bash
npm install
npm start
```

6. Scan the QR code from WhatsApp > Linked devices > Link a device.

## Railway deployment
1. Create a Railway project and deploy this GitHub repository.
2. Set the service start command to `npm start` (or leave the detected start command).
3. Add environment variables from `.env.example`.
4. Attach a persistent volume mounted at the project root (or update `AUTH_DIR` in `src/config.js` to the mounted path).
5. Check the deployment logs and scan the QR code shown there.

**Important:** QR display in hosted logs may be inconvenient or unsupported by some log viewers. For production, implement a protected pairing flow rather than exposing QR codes publicly. Never share the QR code or session folder.

## Commands
- `.menu`
- `.ping`
- `.owner`
- `.info`

## Security
- Do not commit `.env`, `auth_info_baileys/`, or any session credentials.
- Do not expose QR codes in public logs.
- Do not use this bot for spam, bulk unsolicited messaging, or automated abuse.
- Baileys is an unofficial WhatsApp Web client and is not affiliated with WhatsApp. Use at your own risk and follow WhatsApp's terms.

## Notes
This is a working starter scaffold, not a finished production system. It does not yet include an admin dashboard, database, AI provider, or plugin marketplace.
