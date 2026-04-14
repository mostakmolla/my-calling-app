import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Phone, 
  Video, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  MessageSquare, 
  Users, 
  Pencil, 
  UserPlus, 
  Settings,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getChats, Chat, getProfile, addContact } from '@/src/lib/db';

interface HomeScreenProps {
  onChatSelect: (chatId: string) => void;
  onCallSelect: (chatId: string, type: 'video' | 'audio') => void;
  onProfileOpen: () => void;
  onCreateGroup: () => void;
  socket: any;
  onlineUsers: any[];
  isConnected: boolean;
  isConnecting: boolean;
  onReconnect: () => void;
}

export default function HomeScreen({ 
  onChatSelect, 
  onCallSelect, 
  onProfileOpen, 
  onCreateGroup, 
  socket, 
  onlineUsers, 
  isConnected,
  isConnecting,
  onReconnect
}: HomeScreenProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [swipedChatId, setSwipedChatId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    const [storedChats, profile] = await Promise.all([
      getChats(),
      getProfile()
    ]);
    setUserProfile(profile);
    setChats(storedChats.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0)));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => fetchData();
    const handleStatusChange = () => fetchData();
    const handleUserList = () => fetchData();

    socket.on('receive_message', handleUpdate);
    socket.on('message_read', handleUpdate);
    socket.on('user_status_change', handleStatusChange);
    socket.on('user_list', handleUserList);

    return () => {
      socket.off('receive_message', handleUpdate);
      socket.off('message_read', handleUpdate);
      socket.off('user_status_change', handleStatusChange);
      socket.off('user_list', handleUserList);
    };
  }, [socket, fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const formatSmartTime = (timestamp: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) {
      const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return daysArr[new Date(timestamp).getDay()];
    }
    return new Date(timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const handleGlobalUserClick = async (user: any) => {
    const newContact: Chat = {
      id: user.phone,
      name: user.username,
      phone: user.phone,
      avatar: `https://picsum.photos/seed/${user.phone}/100`,
      unreadCount: 0,
      isOnline: true,
      status: 'friend',
      statusMessage: user.statusMessage,
      type: 'individual'
    };
    await addContact(newContact);
    onChatSelect(user.phone);
  };

  const filteredChats = chats.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTouchStart = (chatId: string) => {
    longPressTimer.current = setTimeout(() => {
      setSwipedChatId(chatId);
      // Haptic feedback simulation
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FD] relative overflow-hidden font-sans">
      {/* Connection Status Banner */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-amber-400 text-amber-900 py-1.5 px-4 flex items-center justify-center gap-2 shadow-sm backdrop-blur-md bg-opacity-95"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">⚠️ Connecting...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-gradient-to-r from-primary to-primary-dark pt-6 pb-4 px-4 rounded-b-[28px] shadow-lg shadow-primary/20"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 72 72" fill="none">
                <path d="M36 18C36 18 20 26 20 42" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.3"/>
                <path d="M36 12C36 12 14 22 14 44" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.15"/>
                <path d="M30 26 C22 32 22 50 30 56 L36 50 C34 48 33 44 34 41 L39 36 C37 32 36.5 29 34.5 27 Z" fill="white"/>
                <circle cx="46" cy="28" r="5" fill="white" opacity="0.9"/>
                <path d="M43 24 Q52 17 58 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M40 20 Q52 10 62 20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              </svg>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight italic">TikRing</h1>
          </div>
          <div className="relative group" onClick={onProfileOpen}>
            <div className="w-9 h-9 rounded-full border-2 border-white/50 p-0.5 overflow-hidden cursor-pointer active:scale-95 transition-transform">
              <img 
                src={userProfile?.avatar || `https://picsum.photos/seed/tikring-user/100`} 
                className="w-full h-full rounded-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-primary animate-pulse" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Search className="w-3.5 h-3.5 text-white/60" />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-white/10 border border-white/20 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:bg-white/20 transition-all backdrop-blur-sm shadow-inner"
          />
        </div>
      </motion.header>

      {/* Chat List Section */}
      <div className="flex-1 bg-white rounded-t-[40px] shadow-2xl shadow-black/5 overflow-hidden flex flex-col">
        {/* Pull to Refresh Indicator */}
        <div className="h-0 relative">
          <AnimatePresence>
            {isRefreshing && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 10 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-0 left-0 right-0 flex justify-center z-10"
              >
                <div className="bg-white p-2 rounded-full shadow-lg border border-gray-100">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div 
          className="flex-1 overflow-y-auto no-scrollbar pt-1 pb-24"
          onScroll={(e) => {
            if (e.currentTarget.scrollTop < -50 && !isRefreshing) {
              handleRefresh();
            }
          }}
        >
          {filteredChats.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full px-10 text-center"
            >
              <div className="w-48 h-48 bg-primary/5 rounded-full flex items-center justify-center mb-8">
                <MessageSquare className="w-24 h-24 text-primary/20" />
              </div>
              <h3 className="text-xl font-black text-text-primary mb-2">No conversations yet</h3>
              <p className="text-sm text-text-secondary mb-8 leading-relaxed">
                Start chatting with your contacts or find global users to connect with!
              </p>
              <button 
                onClick={onProfileOpen}
                className="px-8 py-3.5 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-95 transition-transform flex items-center gap-2"
                style={{ touchAction: 'manipulation' }}
              >
                <UserPlus className="w-5 h-5" />
                Find Contacts
              </button>
            </motion.div>
          ) : (
            filteredChats.map((chat, index) => (
              <motion.div
                key={`chat-${chat.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative overflow-hidden"
              >
                {/* Swipe Actions Background (Revealed on Swipe Right) */}
                <div className="absolute inset-0 flex items-center justify-start px-6 gap-4 bg-gray-50">
                  <motion.button 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ 
                      x: swipedChatId === chat.id ? 0 : -20, 
                      opacity: swipedChatId === chat.id ? 1 : 0 
                    }}
                    onClick={() => {
                      onCallSelect(chat.id, 'audio');
                      setSwipedChatId(null);
                    }}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 active:scale-90 transition-transform">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">Audio</span>
                  </motion.button>
                  <motion.button 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ 
                      x: swipedChatId === chat.id ? 0 : -20, 
                      opacity: swipedChatId === chat.id ? 1 : 0 
                    }}
                    transition={{ delay: 0.05 }}
                    onClick={() => {
                      onCallSelect(chat.id, 'video');
                      setSwipedChatId(null);
                    }}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 active:scale-90 transition-transform">
                      <Video className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Video</span>
                  </motion.button>
                </div>

                {/* Chat Item Content */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 140 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 80) setSwipedChatId(chat.id);
                    else if (info.offset.x < -20) setSwipedChatId(null);
                  }}
                  animate={{ x: swipedChatId === chat.id ? 140 : 0 }}
                  onClick={() => {
                    if (swipedChatId === chat.id) {
                      setSwipedChatId(null);
                    } else {
                      onChatSelect(chat.id);
                    }
                  }}
                  onTouchStart={() => handleTouchStart(chat.id)}
                  onTouchEnd={handleTouchEnd}
                  className="relative bg-white flex items-center px-4 py-2 active:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50/50 z-10"
                  style={{ touchAction: 'pan-y' }}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md">
                      <img 
                        src={chat.avatar} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {(chat.isOnline || onlineUsers.some(u => u.phone === chat.phone)) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[16px] font-bold text-text-primary truncate">
                          {chat.name}
                        </h3>
                        {chat.type === 'group' && (
                          <div className="bg-primary/10 text-primary text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            {chat.members?.length || 0}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-text-secondary">
                        {formatSmartTime(chat.lastTimestamp || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {chat.lastSender === 'me' && (
                          <div className="flex-shrink-0">
                            {chat.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </div>
                        )}
                        <p className={cn(
                          "text-[13px] truncate",
                          chat.unreadCount > 0 ? "text-text-primary font-bold" : "text-text-secondary"
                        )}>
                          {chat.type === 'group' && chat.lastSenderName ? `${chat.lastSenderName}: ` : ''}
                          {chat.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                      
                      {chat.unreadCount > 0 && (
                        <div className="ml-2 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isFabOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFabOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[-1]"
              />
              <div className="flex flex-col items-end gap-3 mb-4">
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  onClick={onCreateGroup}
                  className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-gray-100 active:scale-95 transition-transform"
                >
                  <span className="text-sm font-bold text-text-primary">New Group</span>
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                    <Users className="w-5 h-5" />
                  </div>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  onClick={onProfileOpen}
                  className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-gray-100 active:scale-95 transition-transform"
                >
                  <span className="text-sm font-bold text-text-primary">New Chat</span>
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                    <UserPlus className="w-5 h-5" />
                  </div>
                </motion.button>
              </div>
            </>
          )}
        </AnimatePresence>
        
        <motion.button
          onClick={() => setIsFabOpen(!isFabOpen)}
          animate={{ rotate: isFabOpen ? 45 : 0 }}
          className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/40 active:scale-90 transition-transform"
          style={{ touchAction: 'manipulation' }}
        >
          {isFabOpen ? <Plus className="w-8 h-8" /> : <Pencil className="w-7 h-7" />}
        </motion.button>
      </div>
    </div>
  );
}
