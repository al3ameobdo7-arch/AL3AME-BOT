import { config } from './config.js';
import { getSenderNumber, isGroupJid } from './utils.js';

const commandList = [
  ['menu', 'Show available commands'],
  ['ping', 'Check bot response'],
  ['status', 'Show runtime status'],
  ['owner', 'Show the bot owner'],
  ['id', 'Show this chat ID'],
  ['info', 'Show bot information']
];

async function sendMenu(sock, chatId, message) {
  await sock.sendMessage(chatId, {
    text: 'مرحبا بك في ' + config.botName + '! 👋\\nاختار الخدمة اللي بغيتي من القائمة:',
    title: '╭━━〔 AL3AME BOT 〕━━╮',
    footer: 'AL3AME BOT • اختر أمراً للمتابعة',
    buttonText: 'عرض الأوامر',
    sections: [{
      title: 'الخدمات المتاحة',
      rows: commandList.map(([name, description]) => ({
        title: name === 'menu' ? '📋 القائمة الرئيسية'
          : name === 'ping' ? '🏓 اختبار الاستجابة'
          : name === 'status' ? '📊 حالة البوت'
          : name === 'owner' ? '👑 مالك البوت'
          : name === 'id' ? '🆔 معلومات المحادثة'
          : 'ℹ️ معلومات البوت',
        description,
        rowId: config.prefix + name
      }))
    }]
  }, { quoted: message });
}

export async function handleCommand(sock, message, text, senderJid) {
  const prefix = config.prefix;
  if (!text.startsWith(prefix)) return;

  const input = text.slice(prefix.length).trim();
  if (!input) return;

  const [rawCommand] = input.split(/\s+/);
  const command = rawCommand.toLowerCase();
  const chatId = message.key.remoteJid;
  const senderNumber = getSenderNumber(senderJid || message.key.participant || chatId);

  switch (command) {
    case 'menu':
    case 'help':
      await sendMenu(sock, chatId, message);
      break;

    case 'ping':
      await sock.sendMessage(chatId, { text: '🏓 Pong! AL3AME BOT is online.' }, { quoted: message });
      break;

    case 'status': {
      const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      const uptimeSeconds = Math.floor(process.uptime());
      const hours = Math.floor(uptimeSeconds / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = uptimeSeconds % 60;

      await sock.sendMessage(chatId, {
        text: [
          '📊 AL3AME BOT STATUS',
          'Status: Running',
          'Uptime: ' + hours + 'h ' + minutes + 'm ' + seconds + 's',
          'Memory: ' + memoryMb + ' MB',
          'Node.js: ' + process.version
        ].join('\n')
      }, { quoted: message });
      break;
    }

    case 'owner': {
      if (!config.ownerNumber) {
        await sock.sendMessage(chatId, {
          text: 'Owner number is not configured. Set OWNER_NUMBER in environment variables.'
        }, { quoted: message });
        break;
      }

      await sock.sendMessage(chatId, {
        text: '👑 Bot owner: @' + config.ownerNumber,
        mentions: [config.ownerNumber + '@s.whatsapp.net']
      }, { quoted: message });
      break;
    }

    case 'id':
      await sock.sendMessage(chatId, {
        text: 'Chat ID: ' + chatId + '\nType: ' + (isGroupJid(chatId) ? 'Group' : 'Private')
      }, { quoted: message });
      break;

    case 'info':
      await sock.sendMessage(chatId, {
        text: [
          '🤖 ' + config.botName,
          'Version: 1.1.0',
          'Runtime: Node.js',
          'WhatsApp library: Baileys',
          'Sender: ' + (senderNumber || 'Unknown')
        ].join('\n')
      }, { quoted: message });
      break;

    default:
      await sock.sendMessage(chatId, {
        text: 'Unknown command. Send ' + prefix + 'menu to see available commands.'
      }, { quoted: message });
  }
}
