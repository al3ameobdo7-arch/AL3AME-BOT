import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
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

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
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
        if (!message.message || message.key.fromMe) continue;

        const chatId = message.key.remoteJid;
        if (!chatId || chatId === 'status@broadcast') continue;

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

logger.info(`Starting ${config.botName}...`);
connectWhatsApp();
