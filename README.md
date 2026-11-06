# AL3AME BOT

AL3AME BOT is a WhatsApp automation worker built with Node.js 20+ and Baileys.

## Current features
- WhatsApp pairing by QR code or numeric pairing code
- Multi-file authentication state
- Configurable authentication directory for persistent storage
- Automatic reconnect after temporary disconnections
- Commands: `.menu`, `.ai`, `.ask`, `.resetai`, `.ping`, `.status`, `.owner`, `.id`, `.info`
- Groq Responses API integration with independent, persistent memory per private WhatsApp user
- Per-user daily AI usage limit (default: 20 successful requests)
- AI conversation data stored separately from WhatsApp authentication

## Deploy on Railway

1. Connect this GitHub repository to a Railway service.
2. Keep the existing persistent volume mounted at `/data`; do not delete it.
3. In **Variables**, set:
   - `BOT_NAME=AL3AME BOT`
   - `PREFIX=.`
   - `AUTH_DIR=/data/auth_info_baileys`
   - `LOG_LEVEL=info`
   - `GROQ_API_KEY` to your private Groq API key (create it at https://console.groq.com/keys; never commit it to GitHub)
   - `GROQ_MODEL=openai/gpt-oss-20b` (optional; choose a model enabled for your Groq account)
   - `AI_DAILY_LIMIT=20` (optional per-user daily limit)
   - `AI_DATA_FILE=/data/al3ame-ai-state.json` (persistent AI memory on the Railway volume)
   - `OWNER_NUMBER` to the owner's full international number using digits only.
4. Deploy/restart the service and check **Deployments > View Logs**.
5. Keep `AUTH_DIR` pointing to the existing mounted volume so the saved WhatsApp session is reused.

**Security:** Treat API keys, pairing codes, QR codes, and authentication files as secrets. Never commit them to GitHub or share them in screenshots. Do not delete the Railway volume or its authentication folder after pairing.

## Run locally

1. Install Node.js 20 or later.
2. Clone or download the repository.
3. Copy `.env.example` to `.env`.
4. Set `GROQ_API_KEY` and `OWNER_NUMBER`.
5. Install and run:

```bash
npm install
npm test
npm start
```

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

- Keep `.env`, API keys, pairing codes, QR codes, and authentication files private.
- Do not use the bot for spam or unsolicited bulk messaging.
- Baileys is an unofficial WhatsApp Web client, is not affiliated with WhatsApp, and may carry account or service risks. Follow WhatsApp's terms.
- AI is opt-in by command (`.ai` / `.ask`) rather than automatically answering every message. AI currently works in private chats only.
- AI memory is keyed by a one-way SHA-256 hash of the sender JID and stored on the configured data volume. Users can clear their own memory with `.resetai`.
- Groq's free access is subject to model-specific rate limits and availability; 20 requests per user per day is the bot's own limit, not a guarantee that Groq will always accept every request.
