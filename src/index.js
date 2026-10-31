import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import { config } from './config.js';
import { logger } from './logger.js';
import { getTextMessage, isGroupJid } from './utils.js';
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
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('Scan this QR using WhatsApp > Linked devices > Link a device');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        logger.info(`${config.botName} connected to WhatsApp successfully.`);
        isConnecting = false;
      }

      if (connection === 'close') {
        isConnecting = false;
        const statusCode = new Boom(lastDisconnect?.error).output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.warn({ statusCode, shouldReconnect }, 'WhatsApp connection closed');

        if (shouldReconnect) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectWhatsApp, 3000);
        } else {
          logger.error('WhatsApp session logged out. Remove the auth folder and pair again.');
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
          await handleCommand(sock, message, text, message.key.participant || chatId);
        } catch (error) {
          logger.error({ error }, 'Command handler failed');
          await sock.sendMessage(chatId, {
            text: 'حدث خطأ أثناء تنفيذ الأمر. حاول مرة أخرى.'
          }, { quoted: message });
        }
      }
    });

  } catch (error) {
    isConnecting = false;
    logger.error({ error }, 'Could not start WhatsApp connection');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWhatsApp, 5000);
  }
}

process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled rejection'));
process.on('uncaughtException', (error) => logger.error({ error }, 'Uncaught exception'));

logger.info(`Starting ${config.botName}...`);
connectWhatsApp();
