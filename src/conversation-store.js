import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const emptyState = () => ({ conversations: {}, usage: {} });

export function createConversationStore(filePath) {
  let state = emptyState();
  let loaded = false;
  let writeQueue = Promise.resolve();

  async function load() {
    if (loaded) return;
    await mkdir(dirname(filePath), { recursive: true });
    try {
      state = JSON.parse(await readFile(filePath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      state = emptyState();
    }
    state.conversations ||= {};
    state.usage ||= {};
    loaded = true;
  }

  async function persist() {
    const temporaryPath = filePath + '.tmp';
    await writeFile(temporaryPath, JSON.stringify(state), { mode: 0o600 });
    await rename(temporaryPath, filePath);
  }

  function mutate(operation) {
    const next = writeQueue.then(async () => {
      await load();
      const result = await operation();
      await persist();
      return result;
    });
    writeQueue = next.catch(() => {});
    return next;
  }

  function userKey(senderId) {
    return createHash('sha256').update(String(senderId)).digest('hex');
  }

  return {
    async getHistory(senderId) {
      await load();
      return [...(state.conversations[userKey(senderId)] || [])];
    },
    async saveTurn(senderId, userText, assistantText) {
      return mutate(async () => {
        const key = userKey(senderId);
        const history = state.conversations[key] || [];
        history.push({ role: 'user', content: userText });
        history.push({ role: 'assistant', content: assistantText });
        state.conversations[key] = history.slice(-12);
      });
    },
    async getUsage(senderId, day) {
      await load();
      const record = state.usage[userKey(senderId)];
      return record?.day === day ? record.count : 0;
    },
    async incrementUsage(senderId, day) {
      return mutate(async () => {
        const key = userKey(senderId);
        const current = state.usage[key];
        const count = current?.day === day ? current.count : 0;
        state.usage[key] = { day, count: count + 1 };
        return count + 1;
      });
    },
    async clearHistory(senderId) {
      return mutate(async () => {
        delete state.conversations[userKey(senderId)];
      });
    }
  };
}
