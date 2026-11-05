import { config } from './config.js';
import { getSenderNumber, isGroupJid } from './utils.js';

const commandList = [
  ['menu', 'القائمة الرئيسية'],
  ['ping', 'اختبار استجابة البوت'],
  ['status', 'حالة التشغيل والذاكرة'],
  ['owner', 'معلومات مالك البوت'],
  ['id', 'معرّف المحادثة'],
  ['info', 'معلومات البوت']
];

async function sendMenu(sock, chatId, message) {
  const lines = [
    '╭━━━〔 ⚡ 𝐀𝐋3𝐀𝐌𝐄 〕━━━╮',
    '   𓆩 👑 𝐁𝐎𝐓 𝐒𝐘𝐒𝐓𝐄𝐌 𓆪',
    '',
    '✦ أهـلاً بـك فـي AL3AME ✦',
    '',
    '╰━━━━━━━━━━━━━━━━━━╯',
    '',
    ...commandList.map(([name]) => `◈ ${name === 'menu' ? '⚡' : name === 'ping' ? '🚀' : name === 'status' ? '📡' : name === 'owner' ? '👑' : name === 'id' ? '🆔' : '💠'}  ${config.prefix}${name}`),
    '',
    '╭━━━━━━━━━━━━━━━━━━╮',
    '𖤍 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘',
    '𝐀𝐋3𝐀𝐌𝐄 ⚡',
    '╰━━━━━━━━━━━━━━━━━━╯'
  ];

  await sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: message });
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
        text: ['📊 AL3AME BOT STATUS', 'Status: Running',
          'Uptime: ' + hours + 'h ' + minutes + 'm ' + seconds + 's',
          'Memory: ' + memoryMb + ' MB', 'Node.js: ' + process.version].join('\n')
      }, { quoted: message });
      break;
    }

    case 'owner':
      if (!config.ownerNumber) {
        await sock.sendMessage(chatId, {
          text: 'رقم المالك غير مضبوط. أضف OWNER_NUMBER في متغيرات Railway بصيغة دولية بدون +.'
        }, { quoted: message });
        break;
      }
      await sock.sendMessage(chatId, {
        text: '👑 Bot owner: @' + config.ownerNumber,
        mentions: [config.ownerNumber + '@s.whatsapp.net']
      }, { quoted: message });
      break;

    case 'id':
      await sock.sendMessage(chatId, {
        text: 'Chat ID: ' + chatId + '\nType: ' + (isGroupJid(chatId) ? 'Group' : 'Private')
      }, { quoted: message });
      break;

    case 'info':
      await sock.sendMessage(chatId, {
        text: ['🤖 ' + config.botName, 'Version: 1.2.0', 'Runtime: Node.js',
          'WhatsApp library: Baileys', 'Sender: ' + (senderNumber || 'Unknown')].join('\n')
      }, { quoted: message });
      break;

    default:
      await sock.sendMessage(chatId, {
        text: 'أمر غير معروف. أرسل ' + prefix + 'menu لعرض الأوامر.'
      }, { quoted: message });
  }
}
