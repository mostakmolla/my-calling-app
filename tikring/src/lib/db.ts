import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'ConnectMeDB';
const DB_VERSION = 10;

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  timestamp: number;
  type: 'text' | 'image' | 'voice' | 'video_call' | 'voice_call';
  status: 'sent' | 'delivered' | 'read';
}

export interface CallLog {
  id: string;
  chatId: string;
  callerName: string;
  callerAvatar: string;
  type: 'video' | 'audio';
  direction: 'incoming' | 'outgoing' | 'missed';
  duration: number; // in seconds
  timestamp: number;
}

export interface Group {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  members: string[]; // Array of phone numbers or IDs
  createdBy: string;
  createdAt: number;
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
  status?: 'friend' | 'pending' | 'blocked' | 'request_received';
  isBlocked?: boolean;
  isVerified?: boolean;
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
        if (!db.objectStoreNames.contains('calls')) {
          db.createObjectStore('calls', { keyPath: 'id' });
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

export const createGroup = async (group: Group) => {
  const db = await getDB();
  await db.put('groups', group);
  // Also add to chats for the list view
  await db.put('chats', {
    id: group.id,
    name: group.name,
    avatar: group.avatar,
    lastMessage: 'Group created',
    lastTimestamp: group.createdAt,
    unreadCount: 0,
    isOnline: false,
    type: 'group',
  });
};

export const getGroup = async (id: string): Promise<Group | undefined> => {
  const db = await getDB();
  return db.get('groups', id);
};

export const updateGroup = async (group: Group) => {
  const db = await getDB();
  await db.put('groups', group);
  
  // Update chat entry too
  const chat = await db.get('chats', group.id);
  if (chat) {
    chat.name = group.name;
    chat.avatar = group.avatar;
    await db.put('chats', chat);
  }
};

export const deleteGroup = async (id: string) => {
  const db = await getDB();
  await db.delete('groups', id);
  await db.delete('chats', id);
  // Also delete messages
  const tx = db.transaction('messages', 'readwrite');
  const index = tx.store.index('chatId');
  let cursor = await index.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
};

export const updateMessageStatus = async (messageId: string, status: 'sent' | 'delivered' | 'read') => {
  const db = await getDB();
  const message = await db.get('messages', messageId);
  if (message) {
    message.status = status;
    await db.put('messages', message);
  }
};

export const markAllMessagesAsRead = async (chatId: string) => {
  const db = await getDB();
  const tx = db.transaction(['messages', 'chats'], 'readwrite');
  const messageStore = tx.objectStore('messages');
  const chatStore = tx.objectStore('chats');
  
  const index = messageStore.index('chatId');
  let cursor = await index.openCursor(IDBKeyRange.only(chatId));
  
  while (cursor) {
    const message = cursor.value;
    if (message.senderId !== 'me' && message.status !== 'read') {
      message.status = 'read';
      await cursor.update(message);
    }
    cursor = await cursor.continue();
  }
  
  const chat = await chatStore.get(chatId);
  if (chat) {
    chat.unreadCount = 0;
    await chatStore.put(chat);
  }
  
  await tx.done;
};

export const saveMessage = async (message: Message) => {
  const db = await getDB();
  await db.put('messages', message);
  
  // Update chat preview
  const chat = await db.get('chats', message.chatId);
  if (chat) {
    chat.lastMessage = message.text;
    chat.lastTimestamp = message.timestamp;
    if (message.senderId !== 'me' && message.status !== 'read') {
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

export const deleteContact = async (id: string) => {
  const db = await getDB();
  await db.delete('chats', id);
  // Also delete messages for this chat
  const tx = db.transaction('messages', 'readwrite');
  const index = tx.store.index('chatId');
  let cursor = await index.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
};

export const blockContact = async (id: string) => {
  const db = await getDB();
  const chat = await db.get('chats', id);
  if (chat) {
    chat.isBlocked = true;
    chat.status = 'blocked';
    await db.put('chats', chat);
  }
};

export const unblockContact = async (id: string) => {
  const db = await getDB();
  const chat = await db.get('chats', id);
  if (chat) {
    chat.isBlocked = false;
    chat.status = 'friend';
    await db.put('chats', chat);
  }
};

export const updateContactStatus = async (id: string, status: 'friend' | 'pending' | 'blocked' | 'request_received') => {
  const db = await getDB();
  const chat = await db.get('chats', id);
  if (chat) {
    chat.status = status;
    await db.put('chats', chat);
  }
};

export const upsertChat = async (chat: Chat) => {
  const db = await getDB();
  await db.put('chats', chat);
};

export const saveCallLog = async (call: CallLog) => {
  const db = await getDB();
  await db.put('calls', call);
};

export const getCallLogs = async () => {
  const db = await getDB();
  return db.getAll('calls');
};

export const deleteCallLog = async (id: string) => {
  const db = await getDB();
  await db.delete('calls', id);
};
