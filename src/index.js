import { createServer } from 'node:http';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  areJidsSameUser
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import { config } from './config.js';
import { logger } from './logger.js';
import { getTextMessage } from './utils.js';
import { handleCommand } from './commands.js';

let isConnecting = false;
let reconnectTimer;

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

async function resolvePnJid(sock, jid) {
  if (!jid) return '';
  const clean = cleanJid(jid);
  if (clean.endsWith('@s.whatsapp.net')) return clean;
  if (!clean.endsWith('@lid')) return clean;

  try {
    const mapped = await sock.signalRepository?.lidMapping?.getPNForLID(clean);
    return mapped ? cleanJid(mapped) : clean;
  } catch (error) {
    logger.debug({ error }, 'Could not resolve WhatsApp LID to PN');
    return clean;
  }
}

// A self-chat can expose the same account as PN in remoteJid and LID in
// remoteJidAlt (or the reverse). Compare both forms before rejecting fromMe.
async function isOwnChat(sock, messageKey = {}) {
  const ownIds = [sock.user?.id, sock.user?.lid]
    .filter(Boolean)
    .map(cleanJid);
  const chatIds = [messageKey.remoteJid, messageKey.remoteJidAlt]
    .filter(Boolean)
    .map(cleanJid);

  if (!ownIds.length || !chatIds.length) return false;

  if (chatIds.some((chat) =>
    ownIds.some((own) => areJidsSameUser(chat, own))
  )) return true;

  const resolved = await Promise.all([
    ...chatIds.map((jid) => resolvePnJid(sock, jid)),
    ...ownIds.map((jid) => resolvePnJid(sock, jid))
  ]);
  const resolvedChats = resolved.slice(0, chatIds.length);
  const resolvedOwn = resolved.slice(chatIds.length);

  return resolvedChats.some((chat) =>
    resolvedOwn.some((own) => areJidsSameUser(chat, own))
  );
}

async function connectWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const sock = makeWASocket({
      auth: state,
      logger,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      getMessage: async () => undefined
    });

    let pairingCodeRequested = false;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && config.pairingNumber && !state.creds.registered && !pairingCodeRequested) {
        pairingCodeRequested = true;
        try {
          const code = await sock.requestPairingCode(config.pairingNumber);
          logger.info({ pairingCode: code }, 'WhatsApp pairing code generated. Enter it in Linked devices > Link with phone number.');
        } catch (error) {
          pairingCodeRequested = false;
          logger.error({ error }, 'Could not generate WhatsApp pairing code. Check PAIRING_NUMBER.');
        }
      } else if (qr && !config.pairingNumber) {
        logger.info('A WhatsApp pairing QR was generated. Scan it from Linked devices.');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'connecting') logger.info('Connecting to WhatsApp...');

      if (connection === 'open') {
        clearTimeout(reconnectTimer);
        isConnecting = false;
        logger.info({ ownJid: sock.user?.id, ownLid: sock.user?.lid }, `${config.botName} connected to WhatsApp successfully.`);
      }

      if (connection === 'close') {
        isConnecting = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode ||
          new Boom(lastDisconnect?.error).output.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        logger.warn({ statusCode, shouldReconnect }, 'WhatsApp connection closed');

        if (shouldReconnect) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            connectWhatsApp().catch((error) => logger.error({ error }, 'Reconnect attempt failed'));
          }, 3000);
        } else {
          logger.error('WhatsApp session logged out. Re-pair only if intended.');
        }
      }
    });

    const processedMessageIds = new Set();
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify' && type !== 'append') return;

      for (const message of messages) {
        const chatId = message.key?.remoteJid;
        const fromMe = Boolean(message.key?.fromMe);
        const diagnosticText = message.message ? getTextMessage(message) : '';

        // Temporary diagnostics: log message routing metadata, never message text or full phone identifiers.
        logger.info({
          messageType: type,
          fromMe,
          hasMessagePayload: Boolean(message.message),
          hasText: Boolean(diagnosticText),
          hasCommandPrefix: Boolean(diagnosticText && diagnosticText.startsWith(config.prefix)),
          remoteJidType: String(chatId || '').split('@')[1] || 'none',
          remoteJidAltType: String(message.key?.remoteJidAlt || '').split('@')[1] || 'none',
          participantType: String(message.key?.participant || '').split('@')[1] || 'none'
        }, 'WhatsApp message event diagnostic');

        if (!message.message) continue;
        if (!chatId || chatId === 'status@broadcast') continue;

        const ownChat = fromMe ? await isOwnChat(sock, message.key) : false;

        if (fromMe) {
          logger.info({
            messageType: type,
            selfChat: ownChat,
            remoteJidType: String(message.key.remoteJid || '').split('@')[1] || 'none',
            remoteJidAltType: String(message.key.remoteJidAlt || '').split('@')[1] || 'none',
            ownJidType: String(sock.user?.id || '').split('@')[1] || 'none',
            ownLidType: String(sock.user?.lid || '').split('@')[1] || 'none',
            hasRemoteJid: Boolean(message.key.remoteJid),
            hasRemoteJidAlt: Boolean(message.key.remoteJidAlt),
            hasOwnJid: Boolean(sock.user?.id),
            hasOwnLid: Boolean(sock.user?.lid)
          }, 'Self-chat identity comparison');
        }

        // Never execute sent messages in another person's chat.
        if (fromMe && !ownChat) {
          logger.debug({
            messageType: type,
            remoteJidType: String(chatId).split('@')[1] || 'unknown',
            remoteJidAltType: String(message.key.remoteJidAlt || '').split('@')[1] || 'none'
          }, 'Ignoring outgoing message outside the bot self-chat');
          continue;
        }
        // WhatsApp may emit self-chat outgoing messages as append events.
        if (type === 'append' && !ownChat) continue;

        const messageId = message.key.id;
        if (messageId && processedMessageIds.has(messageId)) continue;
        if (messageId) {
          processedMessageIds.add(messageId);
          if (processedMessageIds.size > 500) {
            processedMessageIds.delete(processedMessageIds.values().next().value);
          }
        }

        if (type === 'append') {
          const rawTimestamp = message.messageTimestamp;
          const timestamp = typeof rawTimestamp?.toNumber === 'function'
            ? rawTimestamp.toNumber()
            : Number(rawTimestamp || 0);
          const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
          if (!timestamp || ageSeconds < -30 || ageSeconds > 90) continue;
        }

        const text = diagnosticText;
        if (!text) continue;

        logger.info({
          messageType: type,
          fromMe,
          selfChat: ownChat,
          chatType: chatId.endsWith('@g.us') ? 'group' : 'private',
          hasCommandPrefix: text.startsWith(config.prefix)
        }, 'Incoming WhatsApp message');

        try {
          await handleCommand(sock, message, text, message.key.participant || chatId);
        } catch (error) {
          logger.error({ error }, 'Command handler failed');
          try {
            await sock.sendMessage(chatId, { text: 'حدث خطأ أثناء تنفيذ الأمر. حاول مرة أخرى.' }, { quoted: message });
          } catch (sendError) {
            logger.error({ sendError }, 'Could not send command error reply');
          }
        }
      }
    });
  } catch (error) {
    isConnecting = false;
    logger.error({ error }, 'Could not start WhatsApp connection');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connectWhatsApp(), 5000);
  }
}

process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled promise rejection'));
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

const port = Number(process.env.PORT || 3000);
const healthServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', service: config.botName }));
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not found' }));
});
healthServer.listen(port, '0.0.0.0', () => logger.info({ port }, 'HTTP health server listening'));

logger.info(`Starting ${config.botName}...`);
connectWhatsApp();
