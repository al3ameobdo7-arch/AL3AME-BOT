function unwrapMessage(message) {
  let current = message?.message;

  // Unwrap common WhatsApp message wrappers (ephemeral/view-once).
  for (let i = 0; i < 5 && current; i += 1) {
    const wrapped =
      current.ephemeralMessage?.message ||
      current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message ||
      current.documentWithCaptionMessage?.message;

    if (!wrapped) break;
    current = wrapped;
  }

  return current;
}

export function getTextMessage(message) {
  const m = unwrapMessage(message);
  if (!m) return '';

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.listResponseMessage?.title ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.templateButtonReplyMessage?.selectedId ||
    m.templateButtonReplyMessage?.selectedDisplayText ||
    ''
  ).trim();
}

export function getSenderNumber(jid = '') {
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

export function isGroupJid(jid = '') {
  return jid.endsWith('@g.us');
}
