import 'dotenv/config';

export const config = {
  botName: process.env.BOT_NAME || 'AL3AME BOT',
  prefix: process.env.PREFIX || '.',
  ownerNumber: (process.env.OWNER_NUMBER || '').replace(/\D/g, ''),
  pairingNumber: (process.env.PAIRING_NUMBER || '').replace(/\D/g, ''),
  logLevel: process.env.LOG_LEVEL || 'info',
  authDir: process.env.AUTH_DIR || './auth_info_baileys',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  aiDailyLimit: Math.max(1, Number(process.env.AI_DAILY_LIMIT || 20)),
  aiDataFile: process.env.AI_DATA_FILE || './data/al3ame-ai-state.json'
};
