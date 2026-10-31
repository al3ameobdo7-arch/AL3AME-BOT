import { config } from './config.js';

export async function handleCommand(sock, message, text, senderJid) {
  const prefix = config.prefix;
  if (!text.startsWith(prefix)) return;

  const [rawCommand] = text.slice(prefix.length).trim().split(/\s+/);
  const command = (rawCommand || '').toLowerCase();
  const chatId = message.key.remoteJid;

  switch (command) {
    case 'ping':
      await sock.sendMessage(chatId, { text: '🏓 Pong! AL3AME BOT is online.' }, { quoted: message });
      break;

    case 'menu':
    case 'help':
      await sock.sendMessage(chatId, {
        text: [
          `╭━━━〔 ${config.botName} 〕━━━╮`,
          '',
          `${prefix}ping  — Check bot status`,
          `${prefix}menu  — Show this menu`,
          `${prefix}owner — Contact the owner`,
          `${prefix}info  — Bot information`,
          '',
          '╰━━━━━━━━━━━━━━━━━━━━╯'
        ].join('\n')
      }, { quoted: message });
      break;

    case 'owner': {
      if (!config.ownerNumber) {
        await sock.sendMessage(chatId, { text: 'Owner number is not configured yet.' }, { quoted: message });
        break;
      }
      await sock.sendMessage(chatId, {
        text: `👑 Bot owner: @${config.ownerNumber}`,
        mentions: [`${config.ownerNumber}@s.whatsapp.net`]
      }, { quoted: message });
      break;
    }

    case 'info':
      await sock.sendMessage(chatId, {
        text: `🤖 ${config.botName}\nVersion: 1.0.0\nRuntime: Node.js\nLibrary: Baileys`
      }, { quoted: message });
      break;

    default:
      await sock.sendMessage(chatId, {
        text: `Unknown command. Send ${prefix}menu to see available commands.`
      }, { quoted: message });
  }
}
