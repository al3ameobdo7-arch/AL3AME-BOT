import 'dotenv/config';

export const config = {
  botName: process.env.BOT_NAME || 'AL3AME BOT',
  prefix: process.env.PREFIX || '.',
  ownerNumber: (process.env.OWNER_NUMBER || '').replace(/\D/g, ''),
  logLevel: process.env.LOG_LEVEL || 'info',
  authDir: process.env.AUTH_DIR || './auth_info_baileys'
};
