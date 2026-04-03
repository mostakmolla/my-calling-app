import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'ConnectMeDB';
const DB_VERSION = 1;

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  type: 'text' | 'image' | 'voice' | 'video_call' | 'voice_call';
  status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  phone?: string;
  lastMessage?: string;
  lastTimestamp?: number;
  unreadCount: number;
  isOnline: boolean;
  type?: 'individual' | 'group';
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION + 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('chatId', 'chatId');
        }
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('groups')) {
          db.createObjectStore('groups', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const initDB = () => {
  getDB();
};

export const getProfile = async () => {
  const db = await getDB();
  return db.get('profile', 'user');
};

export const saveProfile = async (profile: any) => {
  const db = await getDB();
  await db.put('profile', { key: 'user', ...profile });
};

export const getMyStory = async () => {
  const db = await getDB();
  return db.get('profile', 'story');
};

export const saveMyStory = async (story: any) => {
  const db = await getDB();
  await db.put('profile', { key: 'story', ...story });
};

export const addContact = async (contact: Chat) => {
  const db = await getDB();
  await db.put('chats', { ...contact, type: 'individual' });
};

export const createGroup = async (group: any) => {
  const db = await getDB();
  await db.put('groups', group);
  // Also add to chats for the list view
  await db.put('chats', {
    id: group.id,
    name: group.name,
    avatar: group.avatar,
    lastMessage: 'Group created',
    lastTimestamp: Date.now(),
    unreadCount: 0,
    isOnline: false,
    type: 'group',
  });
};

export const saveMessage = async (message: Message) => {
  const db = await getDB();
  await db.put('messages', message);
  
  // Update chat preview
  const chat = await db.get('chats', message.chatId);
  if (chat) {
    chat.lastMessage = message.text;
    chat.lastTimestamp = message.timestamp;
    if (message.senderId !== 'me') {
      chat.unreadCount += 1;
    }
    await db.put('chats', chat);
  }
};

export const getMessages = async (chatId: string) => {
  const db = await getDB();
  return db.getAllFromIndex('messages', 'chatId', chatId);
};

export const getChats = async () => {
  const db = await getDB();
  return db.getAll('chats');
};

export const getChat = async (id: string) => {
  const db = await getDB();
  return db.get('chats', id);
};

export const upsertChat = async (chat: Chat) => {
  const db = await getDB();
  await db.put('chats', chat);
};
