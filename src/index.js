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

      // Baileys emits the QR update when the socket is ready for pairing.
      // In numeric-code mode, use that event as the trigger but do not print the QR.
      if (
        qr &&
        config.pairingNumber &&
        !state.creds.registered &&
        !pairingCodeRequested
      ) {
        pairingCodeRequested = true;
        try {
          const code = await sock.requestPairingCode(config.pairingNumber);
          logger.info({ pairingCode: code }, 'WhatsApp pairing code generated. Enter it in Linked devices > Link with phone number.');
        } catch (error) {
          pairingCodeRequested = false;
          logger.error({ error }, 'Could not generate WhatsApp pairing code. Check PAIRING_NUMBER and try again.');
        }
      } else if (qr && !config.pairingNumber) {
        logger.info('A WhatsApp pairing QR was generated. Scan it from Linked devices.');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'connecting') {
        logger.info('Connecting to WhatsApp...');
      }

      if (connection === 'open') {
        clearTimeout(reconnectTimer);
        isConnecting = false;
        logger.info(`${config.botName} connected to WhatsApp successfully.`);
      }

      if (connection === 'close') {
        isConnecting = false;
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ||
          new Boom(lastDisconnect?.error).output.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.warn({ statusCode, shouldReconnect }, 'WhatsApp connection closed');

        if (shouldReconnect) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            connectWhatsApp().catch((error) => {
              logger.error({ error }, 'Reconnect attempt failed');
            });
          }, 3000);
        } else {
          logger.error('WhatsApp session logged out. Delete the auth folder only if you intend to pair again.');
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages) {
        if (!message.message) continue;

        const chatId = message.key.remoteJid;
        const isSelfChat =
          Boolean(message.key.fromMe) &&
          Boolean(sock.user?.id) &&
          areJidsSameUser(chatId, sock.user.id);

        // Only handle this account's own messages in the dedicated self-chat.
        // Baileys can emit those as "append", so accept recent self-chat appends
        // while ignoring old history entries and all appends from other chats.
        if (message.key.fromMe && !isSelfChat) continue;
        if (type === 'append' && !isSelfChat) continue;
        if (!chatId || chatId === 'status@broadcast') continue;

        const messageId = message.key.id;
        if (messageId && processedMessageIds.has(messageId)) continue;
        if (messageId) {
          processedMessageIds.add(messageId);
          if (processedMessageIds.size > 500) {
            const oldestId = processedMessageIds.values().next().value;
            processedMessageIds.delete(oldestId);
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

        const text = getTextMessage(message);
        if (!text) continue;

        try {
          await handleCommand(
            sock,
            message,
            text,
            message.key.participant || message.key.remoteJid
          );
        } catch (error) {
          logger.error({ error }, 'Command handler failed');
          try {
            await sock.sendMessage(
              chatId,
              { text: 'حدث خطأ أثناء تنفيذ الأمر. حاول مرة أخرى.' },
              { quoted: message }
            );
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

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

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

healthServer.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'HTTP health server listening');
});

logger.info(`Starting ${config.botName}...`);
connectWhatsApp();
