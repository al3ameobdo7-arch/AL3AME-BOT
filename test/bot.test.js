import test from 'node:test';
import assert from 'node:assert/strict';
import { getTextMessage, getSenderNumber, isGroupJid } from '../src/utils.js';
import { handleCommand } from '../src/commands.js';

test('extracts normal text commands', () => {
  assert.equal(getTextMessage({ message: { conversation: '.ping' } }), '.ping');
  assert.equal(getTextMessage({ message: { extendedTextMessage: { text: '.menu' } } }), '.menu');
});

test('extracts selected WhatsApp list row as a command', () => {
  assert.equal(getTextMessage({
    message: { listResponseMessage: { singleSelectReply: { selectedRowId: '.ping' } } }
  }), '.ping');
});

test('unwraps ephemeral messages', () => {
  assert.equal(getTextMessage({
    message: { ephemeralMessage: { message: { conversation: '.status' } } }
  }), '.status');
});

test('normalizes sender number and detects groups', () => {
  assert.equal(getSenderNumber('212600000000:12@s.whatsapp.net'), '212600000000');
  assert.equal(isGroupJid('12345@g.us'), true);
  assert.equal(isGroupJid('212600000000@s.whatsapp.net'), false);
});

test('.menu always returns a readable text command list', async () => {
  const sent = [];
  const sock = { sendMessage: async (...args) => sent.push(args) };
  const message = { key: { remoteJid: '212600000000@s.whatsapp.net' } };
  await handleCommand(sock, message, '.menu', '212600000000@s.whatsapp.net');
  assert.equal(sent.length, 1);
  assert.match(sent[0][1].text, /\.ping/);
  assert.match(sent[0][1].text, /\.status/);
  assert.match(sent[0][1].text, /\.owner/);
});

test('.ping replies with pong', async () => {
  const sent = [];
  const sock = { sendMessage: async (...args) => sent.push(args) };
  const message = { key: { remoteJid: '212600000000@s.whatsapp.net' } };
  await handleCommand(sock, message, '.ping', '212600000000@s.whatsapp.net');
  assert.match(sent[0][1].text, /Pong/);
});
