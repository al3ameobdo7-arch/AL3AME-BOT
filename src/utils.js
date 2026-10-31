export function getTextMessage(message) {
  const m = message?.message;
  if (!m) return '';

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  ).trim();
}

export function getSenderNumber(jid = '') {
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

export function isGroupJid(jid = '') {
  return jid.endsWith('@g.us');
}
