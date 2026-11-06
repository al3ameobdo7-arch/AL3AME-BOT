# AL3AME BOT

AL3AME BOT is a WhatsApp automation worker built with Node.js 20+ and Baileys.

## Current features (v1.2.0)
- WhatsApp pairing by QR code or numeric pairing code
- Multi-file authentication state
- Configurable authentication directory for persistent storage
- Automatic reconnect after temporary disconnections
- Commands: `.menu`, `.ai`, `.ask`, `.resetai`, `.ping`, `.status`, `.owner`, `.id`, `.info`
- OpenAI Responses API integration with independent, persistent memory per private WhatsApp user
- Per-user daily AI usage limit (default: 20 requests)
- AI conversation data stored separately from WhatsApp authentication
- Common message wrapper and caption text extraction
- Structured logs with Pino
- Basic automated tests for message utilities

## Deploy on Railway

1. Connect this GitHub repository to a Railway service.
2. In the service, open **Settings > Volumes** and create a volume mounted at `/data`.
3. In **Variables**, set:
   - `BOT_NAME=AL3AME BOT`
   - `PREFIX=.`
   - `AUTH_DIR=/data/auth_info_baileys`
   - `LOG_LEVEL=info`
   - `OPENAI_API_KEY` to enable real AI replies (create/manage the key in your OpenAI Platform account; never commit it to GitHub)
   - `OPENAI_MODEL=gpt-4.1-mini` (optional; can be changed to a model available to your API project)
   - `AI_DAILY_LIMIT=20` (optional per-user daily limit)
   - `AI_DATA_FILE=/data/al3ame-ai-state.json` (persistent AI memory on the Railway volume)
   - `OWNER_NUMBER` to the owner's full international number using digits only.
4. To pair with a numeric code, set `PAIRING_NUMBER` to the WhatsApp number you want to link, in international digits only (for Morocco, for example, `2126XXXXXXXX`; do not include `+` or spaces).
5. Deploy/restart the service and open **Deployments > View Logs**. A numeric pairing code should appear in the logs.
6. On the phone with that WhatsApp account, open **WhatsApp > Settings > Linked devices > Link a device > Link with phone number instead**, then enter the code shown in Railway logs.
7. After the account is linked, remove the `PAIRING_NUMBER` variable from Railway and redeploy. Keep `AUTH_DIR` pointing to the mounted volume so the saved session is reused.

**Security:** Treat the pairing code like a password. Do not share it or post it in screenshots. Only request a code for your own WhatsApp account. Do not delete the volume or its authentication folder after pairing unless you intend to link the account again.

## Run locally

1. Install Node.js 20 or later.
2. Clone or download this repository.
3. Copy `.env.example` to `.env`.
4. Set `OWNER_NUMBER`, and optionally `PAIRING_NUMBER`, using international digits only.
5. Install and run:

```bash
npm install
npm test
npm start
```

If `PAIRING_NUMBER` is empty, the bot uses QR pairing. If it is set, the bot requests a numeric pairing code.

## Commands

| Command | Description |
|---|---|
| `.menu` | List commands |
| `.ai your question` | Ask AL3AME AI; follow-up turns use your private conversation memory |
| `.ask your question` | Alias for `.ai` |
| `.resetai` | Clear only your own AI conversation memory |
| `.ping` | Check bot response |
| `.status` | Show runtime status |
| `.owner` | Mention the configured owner |
| `.id` | Show the current chat ID and type |
| `.info` | Show bot information |

Change the command prefix with the `PREFIX` environment variable.

## Security and limitations

- Keep `.env`, pairing codes, QR codes, and authentication files private.
- Never paste WhatsApp session files or pairing codes into GitHub, chat, or public logs.
- Do not use the bot for spam or unsolicited bulk messaging.
- Baileys is an unofficial WhatsApp Web client, is not affiliated with WhatsApp, and may carry account or service risks. Follow WhatsApp's terms.
- This is an MVP foundation, not a production-certified service. Test pairing, reconnects, and persistent storage before relying on it.
- Sticker creation, social/video downloads, a protected web dashboard, and admin analytics are planned for later phases and are not included yet.
- AI is opt-in by command (`.ai` / `.ask`) rather than automatically answering every message. AI currently works in private chats only.
- AI memory is keyed by a one-way SHA-256 hash of the sender JID and stored on the configured data volume. Users can clear their own memory with `.resetai`. Keep the volume private and configure backups/access appropriately.
