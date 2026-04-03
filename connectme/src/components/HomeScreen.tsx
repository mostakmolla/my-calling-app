import React, { useState, useEffect } from 'react';
import { Search, Menu, Camera, MessageSquare, Compass, Users, X, Upload, Play, Pause, Volume2, VolumeX, Music, Star, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getChats, Chat, getProfile, getMyStory, saveMyStory, addContact } from '@/src/lib/db';

interface HomeScreenProps {
  onChatSelect: (chatId: string) => void;
  onCallSelect: (chatId: string, type: 'video' | 'audio') => void;
  onProfileOpen: () => void;
}

export default function HomeScreen({ onChatSelect, onCallSelect, onProfileOpen }: HomeScreenProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeTab, setActiveTab] = useState('chats');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myStory, setMyStory] = useState<any>(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyStates, setStoryStates] = useState<Record<string, { index: number, progress: number }>>({});
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (isPaused || !isStoryViewerOpen) {
        audio.pause();
      } else {
        // Sync audio time with story progress if it's significantly off
        const targetTime = (storyProgress / 100) * (audio.duration || 5);
        if (Math.abs(audio.currentTime - targetTime) > 0.5) {
          audio.currentTime = targetTime;
        }
        audio.play().catch(() => {
          // Handle autoplay restrictions
        });
      }
    }
    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, [isPaused, isStoryViewerOpen, currentStoryIndex]);

  // Story Progress Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStoryViewerOpen && !isPaused && selectedStory) {
      const duration = 5000; // 5 seconds per story
      const step = 50; // update every 50ms
      
      interval = setInterval(() => {
        setStoryProgress((prev) => {
          const next = prev + (step / duration) * 100;
          if (next >= 100) {
            if (currentStoryIndex < selectedStory.items.length - 1) {
              setCurrentStoryIndex(prevIdx => prevIdx + 1);
              return 0;
            } else {
              setIsStoryViewerOpen(false);
              return 0;
            }
          }
          return next;
        });
      }, step);
    }
    return () => clearInterval(interval);
  }, [isStoryViewerOpen, isPaused, selectedStory, currentStoryIndex]);

  // Save story state when it changes
  useEffect(() => {
    if (selectedStory && isStoryViewerOpen) {
      setStoryStates(prev => ({
        ...prev,
        [selectedStory.id]: { index: currentStoryIndex, progress: storyProgress }
      }));
    }
  }, [currentStoryIndex, storyProgress, selectedStory, isStoryViewerOpen]);

  useEffect(() => {
    const fetchData = async () => {
      const [storedChats, profile, story] = await Promise.all([
        getChats(),
        getProfile(),
        getMyStory()
      ]);

      setUserProfile(profile);
      setMyStory(story);

      if (storedChats.length === 0) {
        const mockChats: Chat[] = [
          { id: '1', name: 'Adam', avatar: 'https://picsum.photos/seed/adam/100', lastMessage: 'Make sure you call her back', lastTimestamp: Date.now() - 1000 * 60 * 5, unreadCount: 0, isOnline: true, type: 'individual' },
          { id: '2', name: 'Sara', avatar: 'https://picsum.photos/seed/sara/100', lastMessage: '📷 See this photo of him', lastTimestamp: Date.now() - 1000 * 60 * 60 * 2, unreadCount: 0, isOnline: false, type: 'individual' },
          { id: '3', name: 'Vici', avatar: 'https://picsum.photos/seed/vici/100', lastMessage: '📹 You were in a Video call', lastTimestamp: Date.now() - 1000 * 60 * 60 * 5, unreadCount: 0, isOnline: true, type: 'individual' },
          { id: '4', name: 'Amanda', avatar: 'https://picsum.photos/seed/amanda/100', lastMessage: 'Looks like you won\'t come', lastTimestamp: Date.now() - 1000 * 60 * 60 * 12, unreadCount: 1, isOnline: false, type: 'individual' },
          { id: '5', name: 'Dean', avatar: 'https://picsum.photos/seed/dean/100', lastMessage: 'Call me ASAP.. I have something for ..', lastTimestamp: Date.now() - 1000 * 60 * 60 * 24, unreadCount: 0, isOnline: true, type: 'individual' },
        ];
        
        // Save mock chats to DB so they persist and are available in Contacts
        for (const chat of mockChats) {
          await addContact(chat);
        }
        setChats(mockChats);
      } else {
        setChats(storedChats);
      }
    };
    fetchData();
  }, []);

  const handleAddStory = async () => {
    const newStoryItem = {
      id: `me-${Date.now()}`,
      image: `https://picsum.photos/seed/${Math.random()}/400/600`,
      timestamp: Date.now(),
      music: {
        title: 'New Story Vibes',
        artist: 'Me',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      }
    };
    
    const updatedStories = Array.isArray(myStory) ? [...myStory, newStoryItem] : [newStoryItem];
    await saveMyStory(updatedStories);
    setMyStory(updatedStories);
    setIsStoryModalOpen(false);
  };

  const stories = React.useMemo(() => [
    { 
      id: 'me', 
      name: 'My story', 
      avatar: userProfile?.avatar || 'https://picsum.photos/seed/me/100', 
      isMe: true, 
      hasStory: Array.isArray(myStory) && myStory.length > 0, 
      items: Array.isArray(myStory) ? myStory : []
    },
    { 
      id: '1', 
      name: 'Lara', 
      avatar: 'https://picsum.photos/seed/lara/100', 
      unread: 5, 
      items: [
        {
          id: 'lara-1',
          image: 'https://picsum.photos/seed/lara_story_1/400/700',
          music: {
            title: 'Summer Breeze',
            artist: 'Chill Beats',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
          }
        },
        {
          id: 'lara-2',
          image: 'https://picsum.photos/seed/lara_story_2/400/700',
          music: {
            title: 'Sunset Vibes',
            artist: 'Chill Beats',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
          }
        },
        {
          id: 'lara-3',
          image: 'https://picsum.photos/seed/lara_story_3/400/700',
          music: {
            title: 'Night Drive',
            artist: 'Chill Beats',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'
          }
        }
      ]
    },
    { 
      id: '2', 
      name: 'Tim', 
      avatar: 'https://picsum.photos/seed/tim/100', 
      unread: 0, 
      items: [
        {
          id: 'tim-1',
          image: 'https://picsum.photos/seed/tim_story_1/400/700',
          music: {
            title: 'Midnight City',
            artist: 'Synth Wave',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
          }
        }
      ]
    },
    { 
      id: '3', 
      name: 'Nadiah', 
      avatar: 'https://picsum.photos/seed/nadiah/100', 
      unread: 0, 
      items: [
        {
          id: 'nadiah-1',
          image: 'https://picsum.photos/seed/nadiah_story_1/400/700',
          music: {
            title: 'Ocean Waves',
            artist: 'Nature Sounds',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
          }
        }
      ]
    },
    { 
      id: '4', 
      name: 'Adam', 
      avatar: 'https://picsum.photos/seed/adam/100', 
      unread: 2, 
      items: [
        {
          id: 'adam-1',
          image: 'https://picsum.photos/seed/adam_story_1/400/700',
          music: {
            title: 'Urban Jungle',
            artist: 'Street Vibes',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
          }
        },
        {
          id: 'adam-2',
          image: 'https://picsum.photos/seed/adam_story_2/400/700',
          music: {
            title: 'City Lights',
            artist: 'Street Vibes',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'
          }
        }
      ]
    },
  ], [userProfile, myStory]);

  const handleStoryClick = (story: any) => {
    if (story.isMe && !story.hasStory) {
      setIsStoryModalOpen(true);
    } else if (story.items?.length > 0 || (story.isMe && story.hasStory)) {
      const savedState = storyStates[story.id] || { index: 0, progress: 0 };
      setSelectedStory(story);
      setCurrentStoryIndex(savedState.index);
      setStoryProgress(savedState.progress);
      setIsPaused(false);
      setIsMuted(false);
      setIsStoryViewerOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Top App Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button className="p-1" onClick={onProfileOpen}>
          <Menu className="w-6 h-6 text-primary" />
        </button>
        <div className="flex items-center gap-1 cursor-pointer group" onClick={onProfileOpen}>
          <h1 className="text-2xl font-bold text-primary lowercase tracking-tighter group-hover:scale-105 transition-transform">imo</h1>
        </div>
        <button className="p-1">
          <Search className="w-6 h-6 text-primary" />
        </button>
      </header>

      {/* Story Bar */}
      <div className="flex overflow-x-auto py-4 px-4 gap-4 no-scrollbar border-b border-gray-50">
        {stories.map((story) => (
          <div key={`story-bar-${story.id}`} className="flex flex-col items-center flex-shrink-0 gap-1">
            <div className="relative" onClick={() => handleStoryClick(story)}>
              <div className={cn(
                "w-14 h-14 rounded-full p-0.5 border-2 cursor-pointer transition-transform active:scale-90",
                (story.unread || (story.isMe && story.hasStory)) ? "border-primary" : "border-gray-200"
              )}>
                <img 
                  src={story.avatar} 
                  alt={story.name} 
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {story.isMe && !story.hasStory && (
                <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1 border-2 border-white">
                  <Camera className="w-3 h-3 text-white" />
                </div>
              )}
              {story.unread > 0 && (
                <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {story.unread}
                </div>
              )}
            </div>
            <span className="text-[11px] text-text-secondary font-medium">{story.name}</span>
          </div>
        ))}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* Shortcuts Section */}
        <div className="px-4 py-4 border-b border-gray-50 bg-surface/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-current" />
              Shortcuts
            </h3>
            <button className="text-[10px] font-bold text-text-secondary hover:text-primary transition-colors">EDIT</button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {chats.slice(0, 4).map((chat) => (
              <div 
                key={`shortcut-${chat.id}`}
                onClick={() => onChatSelect(chat.id)}
                className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <img 
                    src={chat.avatar} 
                    alt={chat.name} 
                    className="w-12 h-12 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform border-2 border-white"
                    referrerPolicy="no-referrer"
                  />
                  {chat.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-online rounded-full border-2 border-white shadow-sm" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-text-primary truncate w-12 text-center">{chat.name}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center text-text-secondary group-hover:border-primary group-hover:text-primary transition-all">
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-text-secondary">More</span>
            </div>
          </div>
        </div>

        {chats.map((chat) => (
          <div 
            key={`chat-list-${chat.id}`}
            onClick={() => onChatSelect(chat.id)}
            className="flex items-center px-4 py-3 hover:bg-surface transition-colors cursor-pointer border-b border-gray-50 last:border-0"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={chat.avatar} 
                alt={chat.name} 
                className="w-14 h-14 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              {chat.isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-online rounded-full border-2 border-white" />
              )}
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="text-[16px] font-bold text-text-primary truncate">{chat.name}</h3>
                <span className="text-[12px] text-text-secondary">
                  {new Date(chat.lastTimestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className={cn(
                "text-[14px] truncate mt-0.5",
                chat.unreadCount > 0 ? "text-text-primary font-semibold" : "text-text-secondary"
              )}>
                {chat.lastMessage}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {isStoryViewerOpen && selectedStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col"
          >
            {/* Progress Bar */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
              {selectedStory.items.map((_: any, idx: number) => (
                <div key={`progress-${selectedStory.id}-${idx}`} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    style={{ 
                      width: idx < currentStoryIndex ? '100%' : (idx === currentStoryIndex ? `${storyProgress}%` : '0%'),
                      transition: idx === currentStoryIndex && !isPaused ? 'width 50ms linear' : 'none'
                    }}
                    className="h-full bg-white"
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 flex flex-col gap-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={selectedStory.avatar} className="w-10 h-10 rounded-full border-2 border-white" />
                  <div className="text-white">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm">{selectedStory.name}</p>
                      {selectedStory.items[currentStoryIndex]?.music && (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Music className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </div>
                    {selectedStory.items[currentStoryIndex]?.music ? (
                      <div className="flex items-center gap-1 overflow-hidden">
                        <p className="text-[10px] font-medium text-white/90 truncate max-w-[150px]">
                          {selectedStory.items[currentStoryIndex].music.title} • {selectedStory.items[currentStoryIndex].music.artist}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] opacity-70">Just now</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors border border-white/20"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                  </button>
                  <button 
                    onClick={() => setIsPaused(!isPaused)} 
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors border border-white/20"
                  >
                    {isPaused ? <Play className="w-5 h-5 text-white fill-white" /> : <Pause className="w-5 h-5 text-white fill-white" />}
                  </button>
                  <button 
                    onClick={() => {
                      setIsStoryViewerOpen(false);
                      setIsPaused(false);
                    }} 
                    className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors border border-white/20"
                  >
                    <span className="text-white text-xs font-bold">Close</span>
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Story Image */}
            <div 
              className="flex-1 flex items-center justify-center cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (x < rect.width / 3) {
                  // Previous story
                  if (currentStoryIndex > 0) {
                    setCurrentStoryIndex(prev => prev - 1);
                    setStoryProgress(0);
                  }
                } else if (x > (rect.width * 2) / 3) {
                  // Next story
                  if (currentStoryIndex < selectedStory.items.length - 1) {
                    setCurrentStoryIndex(prev => prev + 1);
                    setStoryProgress(0);
                  } else {
                    setIsStoryViewerOpen(false);
                  }
                } else {
                  // Toggle pause
                  setIsPaused(!isPaused);
                }
              }}
            >
              <audio 
                key={`story-audio-${currentStoryIndex}`}
                ref={audioRef}
                autoPlay 
                muted={isMuted}
                src={selectedStory.items[currentStoryIndex]?.music?.url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"}
                onEnded={() => {
                  // Optional: handle if music ends before story
                }}
              />
              <motion.img 
                key={`story-img-${currentStoryIndex}`}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                src={selectedStory.items[currentStoryIndex]?.image || selectedStory.avatar} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-6 bg-black/40 rounded-full backdrop-blur-sm"
                  >
                    <Play className="w-12 h-12 text-white fill-white" />
                  </motion.div>
                </div>
              )}
              {isMuted && !isPaused && (
                <div className="absolute top-24 right-4 pointer-events-none">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-2 bg-black/40 rounded-full backdrop-blur-sm"
                  >
                    <VolumeX className="w-4 h-4 text-white" />
                  </motion.div>
                </div>
              )}
            </div>

            {/* Carousel Navigation */}
            <div className="absolute bottom-24 left-0 right-0 px-4 z-10">
              <div className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar py-4 px-2">
                {selectedStory.items.map((item: any, idx: number) => (
                  <button
                    key={`carousel-${selectedStory.id}-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStoryIndex(idx);
                      setStoryProgress(0);
                      setIsPaused(false);
                    }}
                    className={cn(
                      "relative w-14 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 shadow-xl",
                      idx === currentStoryIndex 
                        ? "border-primary scale-110 ring-4 ring-primary/20 z-20" 
                        : "border-white/30 opacity-60 hover:opacity-100 hover:scale-105 z-10"
                    )}
                  >
                    <img src={item.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {item.music && (
                      <div className="absolute top-1 right-1 bg-black/40 backdrop-blur-sm rounded-full p-0.5">
                        <Music className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {idx === currentStoryIndex && !isPaused && (
                      <div className="absolute inset-0 bg-primary/10 flex items-end p-1">
                        <div className="h-0.5 w-full bg-white/30 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${storyProgress}%` }}
                            className="h-full bg-white transition-[width] duration-50 linear"
                          />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4">
              <input 
                type="text" 
                placeholder="Reply to story..." 
                className="flex-1 bg-white/10 border border-white/20 rounded-full px-6 py-3 text-white placeholder:text-white/50 focus:outline-none backdrop-blur-md"
              />
              <button className="p-3 bg-primary rounded-full text-white shadow-lg">
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Modal (Update/Add) */}
      <AnimatePresence>
        {isStoryModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl w-full max-w-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-text-primary">Update Story</h3>
                <button onClick={() => setIsStoryModalOpen(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="p-6 flex flex-col items-center gap-6">
                {Array.isArray(myStory) && myStory.length > 0 ? (
                  <div className="w-full flex flex-col gap-4">
                    <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg">
                      <img src={myStory[myStory.length - 1].image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-white text-xs">Active Stories: {myStory.length}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[2/3] bg-surface rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200">
                    <Camera className="w-10 h-10 text-text-secondary" />
                    <p className="text-sm text-text-secondary">No active story</p>
                  </div>
                )}
                
                <button 
                  onClick={handleAddStory}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <Upload className="w-5 h-5" />
                  {Array.isArray(myStory) && myStory.length > 0 ? 'Add Another Story' : 'Add New Story'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
