import test from 'node:test';
import assert from 'node:assert/strict';
import { getTextMessage, getSenderNumber, isGroupJid } from '../src/utils.js';

test('extracts plain conversation text', () => {
  assert.equal(getTextMessage({ message: { conversation: 'hello' } }), 'hello');
});

test('extracts text from extended text messages', () => {
  assert.equal(
    getTextMessage({ message: { extendedTextMessage: { text: '  .menu  ' } } }),
    '.menu'
  );
});

test('unwraps ephemeral messages', () => {
  assert.equal(
    getTextMessage({
      message: {
        ephemeralMessage: {
          message: { conversation: 'inside ephemeral' }
        }
      }
    }),
    'inside ephemeral'
  );
});

test('extracts captions from images', () => {
  assert.equal(
    getTextMessage({ message: { imageMessage: { caption: 'photo caption' } } }),
    'photo caption'
  );
});

test('normalizes sender numbers from WhatsApp JIDs', () => {
  assert.equal(getSenderNumber('212612345678:4@s.whatsapp.net'), '212612345678');
});

test('detects group JIDs', () => {
  assert.equal(isGroupJid('12345-67890@g.us'), true);
  assert.equal(isGroupJid('212612345678@s.whatsapp.net'), false);
});
