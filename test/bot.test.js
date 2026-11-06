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


import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConversationStore } from '../src/conversation-store.js';

test('AI conversation memory is isolated per WhatsApp user', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'al3ame-ai-'));
  try {
    const store = createConversationStore(join(dir, 'state.json'));
    await store.saveTurn('user-A', 'My name is Ali', 'Nice to meet you, Ali.');
    assert.equal((await store.getHistory('user-A')).length, 2);
    assert.equal((await store.getHistory('user-B')).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('AI memory persists across store instances and can be cleared', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'al3ame-ai-'));
  try {
    const path = join(dir, 'state.json');
    const first = createConversationStore(path);
    await first.saveTurn('user-A', 'Remember this', 'I will remember it in this chat.');
    const second = createConversationStore(path);
    assert.equal((await second.getHistory('user-A')).length, 2);
    await second.clearHistory('user-A');
    assert.equal((await second.getHistory('user-A')).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('AI daily usage is tracked independently for each user', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'al3ame-ai-'));
  try {
    const store = createConversationStore(join(dir, 'state.json'));
    await store.incrementUsage('user-A', '2026-11-06');
    assert.equal(await store.getUsage('user-A', '2026-11-06'), 1);
    assert.equal(await store.getUsage('user-B', '2026-11-06'), 0);
    assert.equal(await store.getUsage('user-A', '2026-11-07'), 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
