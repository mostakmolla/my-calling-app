import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Camera, Send, Mic, X, Play, Pause, ExternalLink, MapPin, Volume2, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Message, saveMessage, getMessages, getChat, Chat, getGroup, Group, markAllMessagesAsRead, updateMessageStatus, deleteMessage } from '@/src/lib/db';
import { Socket } from 'socket.io-client';
import { Check, CheckCheck, Trash2 } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ChatScreenProps {
  chatId: string;
  socket: Socket | null;
  isConnected: boolean;
  onBack: () => void;
  onCall: (type: 'video' | 'audio') => void;
  onViewProfile: () => void;
  onlineUsers?: any[];
}

export default function ChatScreen({ chatId, socket, isConnected, onBack, onCall, onViewProfile, onlineUsers = [] }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recordingDurationRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [storedMessages, chatData] = await Promise.all([
        getMessages(chatId),
        getChat(chatId)
      ]);
      setMessages(storedMessages as Message[]);
      setChat(chatData);
      
      if (chatData?.type === 'group') {
        const groupData = await getGroup(chatId);
        setGroup(groupData || null);
      }

      // Mark messages as read when opening the chat
      await markAllMessagesAsRead(chatId);
      if (socket && chatData?.phone) {
        socket.emit('message_read', { to: chatData.phone, chatId });
      }
    };
    fetchData();
  }, [chatId, socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = async (data: { from: string, message: Message, senderPhone?: string }) => {
      // Check if the message is for this chat
      if (data.from === chatId) {
        const receivedMessage = {
          ...data.message,
          chatId: data.from,
          senderId: data.senderPhone || 'other',
          status: 'read' as const // Mark as read since we are in the chat
        };
        
        // Save as read in DB
        await saveMessage(receivedMessage);
        
        // Notify sender
        if (socket && chat?.phone) {
          socket.emit('message_read', { 
            to: chat.phone, 
            messageId: receivedMessage.id,
            chatId 
          });
        }

        setMessages(prev => [...prev, receivedMessage]);
      }
    };

    const handleMessageRead = async (data: { from: string, messageId?: string, chatId: string, isSelfUpdate?: boolean }) => {
      const targetChatId = data.chatId || data.from;
      if (targetChatId === chatId || data.from === chat?.phone) {
        if (data.isSelfUpdate) {
          // I read messages on another device
          setMessages(prev => prev.map(msg => 
            msg.senderId !== 'me' ? { ...msg, status: 'read' } : msg
          ));
        } else {
          // The other person read my messages
          if (data.messageId) {
            // Single message read
            await updateMessageStatus(data.messageId, 'read');
            setMessages(prev => prev.map(msg => 
              msg.id === data.messageId ? { ...msg, status: 'read' } : msg
            ));
          } else {
            // All messages read
            setMessages(prev => prev.map(msg => 
              msg.senderId === 'me' ? { ...msg, status: 'read' } : msg
            ));
            // Update all sent messages in DB for this chat
            const allMessages = await getMessages(chatId);
            for (const msg of allMessages) {
              if (msg.senderId === 'me' && msg.status !== 'read') {
                await updateMessageStatus(msg.id, 'read');
              }
            }
          }
        }
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_read', handleMessageRead);
    
    socket.on('typing', (data: { from: string }) => {
      if (data.from === chat?.phone) {
        setIsTyping(true);
      }
    });

    socket.on('stop_typing', (data: { from: string }) => {
      if (data.from === chat?.phone) {
        setIsTyping(false);
      }
    });

    socket.on('message_deleted', async (data: { messageId: string, from: string }) => {
      if (data.from === chatId) {
        await deleteMessage(data.messageId);
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    });

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_read', handleMessageRead);
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket, chatId, chat]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (socket && chat?.phone) {
      socket.emit('typing', { to: chat.phone });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { to: chat.phone });
      }, 2000);
    }
  };

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
    
    // Emit via socket
    if (socket && chatId) {
      socket.emit('send_message', {
        to: chatId,
        message: newMessage,
        isGroup: chat?.type === 'group'
      });
    }

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean = false) => {
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setSelectedMessageId(null);

      if (deleteForEveryone && socket && chat?.phone) {
        socket.emit('delete_message', { to: chat.phone, messageId, chatId });
      }

      const toast = document.createElement('div');
      toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold';
      toast.innerText = deleteForEveryone ? "Message deleted for everyone" : "Message deleted for you";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      
      let mediaUrl = '';
      if (isImage || isAudio) {
        const reader = new FileReader();
        mediaUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        chatId,
        senderId: 'me',
        text: isImage ? `Sent a photo: ${file.name}` : isAudio ? `Sent a voice note: ${file.name}` : `Sent a file: ${file.name}`,
        mediaUrl: mediaUrl || undefined,
        timestamp: Date.now(),
        type: isImage ? 'image' : isAudio ? 'voice' : 'text',
        status: 'sent',
      };
      await saveMessage(newMessage);

      // Emit via socket
      if (socket && chat?.phone) {
        socket.emit('send_message', {
          to: chat.phone,
          message: newMessage
        });
      }

      setMessages(prev => [...prev, newMessage]);
      
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold';
      toast.innerText = `${isImage ? 'Photo' : isAudio ? 'Audio' : 'File'} "${file.name}" sent!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  useEffect(() => {
    if (isRecording && recordingDuration >= 120) {
      toggleRecording();
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold';
      toast.innerText = "Maximum recording limit (2 min) reached!";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }, [recordingDuration, isRecording]);

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Mobile compatibility: try different mime types
        const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];
        let selectedMimeType = '';
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
          }
        }

        const mediaRecorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        recordingDurationRef.current = 0;
        setRecordingDuration(0);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const duration = recordingDurationRef.current;
            const durationStr = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
            
            const newMessage: Message = {
              id: Date.now().toString(),
              chatId,
              senderId: 'me',
              text: `🎤 Voice Message (${durationStr})`,
              mediaUrl: base64Audio,
              timestamp: Date.now(),
              type: 'voice',
              status: 'sent',
            };

            await saveMessage(newMessage);
            if (socket && chat?.phone) {
              socket.emit('send_message', { to: chat.phone, message: newMessage });
            }
            setMessages(prev => [...prev, newMessage]);
            setRecordingDuration(0);
            recordingDurationRef.current = 0;
          };
          
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        
        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => {
            const next = prev + 1;
            recordingDurationRef.current = next;
            return next;
          });
        }, 1000);

      } catch (err) {
        console.error('Error accessing microphone:', err);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold';
        toast.innerText = "Microphone access denied!";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const generateVoice = async (messageId: string, text: string) => {
    if (isGeneratingVoice) return;
    setIsGeneratingVoice(messageId);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioUrl = `data:audio/wav;base64,${base64Audio}`;
        handlePlayAudio(messageId, audioUrl);
      }
    } catch (err) {
      console.error('Error generating voice:', err);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold';
      toast.innerText = "Voice generation failed!";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setIsGeneratingVoice(null);
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      
      const newMessage: Message = {
        id: Date.now().toString(),
        chatId,
        senderId: 'me',
        text: `📍 My Location: ${mapsUrl}`,
        timestamp: Date.now(),
        type: 'text',
        status: 'sent',
      };

      await saveMessage(newMessage);
      if (socket && chat?.phone) {
        socket.emit('send_message', { to: chat.phone, message: newMessage });
      }
      setMessages(prev => [...prev, newMessage]);
    }, (err) => {
      console.error('Error getting location:', err);
      alert("Unable to retrieve your location");
    });
  };

  const handlePlayAudio = (messageId: string, url: string) => {
    if (playingMessageId === messageId) {
      if (audioRef.current?.paused) {
        audioRef.current.play();
      } else {
        audioRef.current?.pause();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.ontimeupdate = null;
        audioRef.current.onloadedmetadata = null;
        audioRef.current.onended = null;
      }
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };
      
      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime);
      };
      
      audio.onended = () => {
        setPlayingMessageId(null);
        setAudioCurrentTime(0);
      };
      
      audio.play();
      setPlayingMessageId(messageId);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-200 underline flex items-center gap-1 inline-flex"
            onClick={(e) => e.stopPropagation()}
          >
            {part} <ExternalLink className="w-3 h-3" />
          </a>
        );
      }
      return part;
    });
  };

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
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
            {(chat?.isOnline || (chat?.phone && onlineUsers.some(u => u.phone === chat.phone))) && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-online rounded-full border-2 border-white animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-bold text-text-primary truncate">{chat?.name || 'Loading...'}</h3>
              {isConnected ? (
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" title="Connected" />
              ) : (
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" title="Disconnected" />
              )}
            </div>
            <span className="text-[10px] text-online font-medium block truncate">
              {isTyping ? 'Typing...' : (chat?.type === 'group' ? `${group?.members.length || 0} members` : (chat?.isOnline ? 'Online' : 'Offline'))}
            </span>
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
              "flex flex-col relative",
              msg.senderId === 'me' ? "ml-auto items-end max-w-[70%]" : "mr-auto items-start max-w-[80%]"
            )}
            onContextMenu={(e) => {
              e.preventDefault();
              setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id);
            }}
            onClick={() => setSelectedMessageId(null)}
          >
            <AnimatePresence>
              {selectedMessageId === msg.id && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  className={cn(
                    "absolute z-50 bg-white shadow-2xl rounded-xl border border-gray-100 p-1 flex flex-col min-w-[150px]",
                    msg.senderId === 'me' ? "right-full mr-2 top-0" : "left-full ml-2 top-0"
                  )}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(msg.id, false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-xs font-bold text-text-primary transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                    Delete for Me
                  </button>
                  {msg.senderId === 'me' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMessage(msg.id, true);
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-red-50 rounded-lg text-xs font-bold text-red-500 transition-colors border-t border-gray-50 text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete for Everyone
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div 
              className={cn(
                "rounded-2xl text-sm shadow-sm overflow-hidden relative group",
                msg.senderId === 'me' 
                  ? "bg-primary text-white rounded-tr-none" 
                  : "bg-white text-text-primary rounded-tl-none",
                msg.type === 'voice' && "italic font-medium",
                msg.type === 'image' && "bg-opacity-90 p-1"
              )}
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id);
                }}
                className={cn(
                  "absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-black/10 z-10",
                  msg.senderId === 'me' ? "left-1" : "right-1"
                )}
              >
                <MoreVertical className={cn("w-3.5 h-3.5", msg.senderId === 'me' ? "text-white" : "text-gray-400")} />
              </button>

              {chat?.type === 'group' && msg.senderId !== 'me' && (
                <div className="px-3 pt-2 text-[10px] font-black text-primary uppercase tracking-tighter">
                  {msg.senderId}
                </div>
              )}
              {msg.type === 'image' && msg.mediaUrl && (
                <img 
                  src={msg.mediaUrl} 
                  alt="Sent photo" 
                  className="max-w-full rounded-xl mb-1"
                  referrerPolicy="no-referrer"
                />
              )}
              {msg.type === 'voice' && (
                <div className="flex flex-col gap-1 p-3 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => msg.mediaUrl && handlePlayAudio(msg.id, msg.mediaUrl)}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors shrink-0"
                    >
                      {playingMessageId === msg.id && !audioRef.current?.paused ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                    
                    <div className="flex-1 flex flex-col gap-1">
                      <input 
                        type="range"
                        min="0"
                        max={playingMessageId === msg.id ? audioDuration : 100}
                        value={playingMessageId === msg.id ? audioCurrentTime : 0}
                        onChange={handleSeek}
                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex justify-between text-[8px] opacity-80">
                        <span>{playingMessageId === msg.id ? formatTime(audioCurrentTime) : '0:00'}</span>
                        <span>
                          {playingMessageId === msg.id 
                            ? `-${formatTime(audioDuration - audioCurrentTime)}` 
                            : (msg.text.match(/\((.*?)\)/)?.[1] || '0:00')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {msg.type !== 'image' && msg.type !== 'voice' && (
                <div className="px-3 py-2 flex items-start gap-2">
                  <div className="flex-1">
                    {renderMessageText(msg.text)}
                  </div>
                  <button 
                    onClick={() => generateVoice(msg.id, msg.text)}
                    className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isGeneratingVoice === msg.id}
                  >
                    {isGeneratingVoice === msg.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Volume2 className={cn("w-3.5 h-3.5", msg.senderId === 'me' ? "text-white/70" : "text-primary/70")} />
                    )}
                  </button>
                </div>
              )}
              {msg.type === 'image' && (
                <div className="px-3 py-1 text-[10px] opacity-70">
                  {msg.text}
                </div>
              )}
            </div>
            <span className="text-[10px] text-text-secondary mt-1 flex items-center gap-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {msg.senderId === 'me' && (
                <span className="flex items-center">
                  {msg.status === 'read' ? (
                    <CheckCheck className="w-3 h-3 text-blue-500" />
                  ) : msg.status === 'delivered' ? (
                    <CheckCheck className="w-3 h-3 text-text-secondary" />
                  ) : (
                    <Check className="w-3 h-3 text-text-secondary" />
                  )}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-gray-100 flex flex-col gap-2">
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-4 p-3 bg-surface rounded-2xl overflow-x-auto no-scrollbar"
            >
              {['😊', '😂', '❤️', '👍', '🔥', '🙌', '🎉', '😎', '🤔', '😢'].map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn("transition-colors flex-shrink-0", showEmojiPicker ? "text-primary" : "text-text-secondary")}
          >
            <Smile className="w-6 h-6" />
          </button>
          
          <div className="flex-1 bg-surface rounded-2xl px-3 py-1.5 flex items-center gap-2 min-w-0">
            <input 
              type="text" 
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isRecording ? `Recording... ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}` : "Message..."}
              className={cn(
                "flex-1 bg-transparent border-none focus:outline-none text-sm text-text-primary min-w-0",
                isRecording && "text-red-500 font-bold animate-pulse"
              )}
              disabled={isRecording}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={handleShareLocation}
                className="text-text-secondary hover:text-primary transition-colors"
                title="Share Location"
              >
                <MapPin className="w-5 h-5" />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-text-secondary hover:text-primary transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />

          <input 
            type="file" 
            ref={cameraInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            accept="image/*"
            capture="environment"
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            {inputText.trim() ? (
              <button 
                onClick={handleSendMessage}
                className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-text-secondary hover:text-primary transition-colors p-1"
                >
                  <Camera className="w-6 h-6" />
                </button>
                <button 
                  onClick={toggleRecording}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isRecording ? "bg-red-500 text-white animate-pulse scale-110 shadow-lg" : "text-text-secondary hover:text-primary"
                  )}
                >
                  <Mic className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
