import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Camera, Send, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Message, saveMessage, getMessages, getChat, Chat } from '@/src/lib/db';

interface ChatScreenProps {
  chatId: string;
  onBack: () => void;
  onCall: (type: 'video' | 'audio') => void;
  onViewProfile: () => void;
}

export default function ChatScreen({ chatId, onBack, onCall, onViewProfile }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [storedMessages, chatData] = await Promise.all([
        getMessages(chatId),
        getChat(chatId)
      ]);
      setMessages(storedMessages as Message[]);
      setChat(chatData);
    };
    fetchData();
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      chatId,
      senderId: 'me',
      text: inputText,
      timestamp: Date.now(),
      type: 'text',
      status: 'sent',
    };

    await saveMessage(newMessage);
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack}>
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div className="relative">
            <img 
              src={chat?.avatar || `https://picsum.photos/seed/${chatId}/100`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            {chat?.isOnline && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-online rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{chat?.name || 'Loading...'}</h3>
            <span className="text-[10px] text-online font-medium">{chat?.isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => onCall('audio')}>
            <Phone className="w-5 h-5 text-primary" />
          </button>
          <button onClick={() => onCall('video')}>
            <Video className="w-5 h-5 text-primary" />
          </button>
          <button onClick={onViewProfile}>
            <MoreVertical className="w-5 h-5 text-primary" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface/30"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={cn(
              "flex flex-col max-w-[80%]",
              msg.senderId === 'me' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className={cn(
              "px-4 py-2 rounded-2xl text-sm shadow-sm",
              msg.senderId === 'me' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-white text-text-primary rounded-tl-none"
            )}>
              {msg.text}
            </div>
            <span className="text-[10px] text-text-secondary mt-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {msg.senderId === 'me' && " ✓✓"}
            </span>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-3">
        <button className="text-text-secondary">
          <Smile className="w-6 h-6" />
        </button>
        <div className="flex-1 bg-surface rounded-full px-4 py-2 flex items-center gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Write a message..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-text-primary"
          />
          <button className="text-text-secondary">
            <Paperclip className="w-5 h-5" />
          </button>
        </div>
        {inputText.trim() ? (
          <button 
            onClick={handleSendMessage}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button className="text-text-secondary">
              <Camera className="w-6 h-6" />
            </button>
            <button className="text-text-secondary">
              <Mic className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
