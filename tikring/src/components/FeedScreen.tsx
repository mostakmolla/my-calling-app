import React, { useState, useEffect, useCallback } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Plus, 
  Image as ImageIcon,
  Send,
  Pencil,
  X,
  Film,
  Filter,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getPosts, savePost, Post, getProfile, saveProfile, addContact, Chat } from '@/src/lib/db';

interface FeedScreenProps {
  socket: any;
  onlineUsers: any[];
  isConnected: boolean;
  onChatSelect: (chatId: string) => void;
}

export default function FeedScreen({ socket, onlineUsers, isConnected, onChatSelect }: FeedScreenProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<{ url: string; type: 'image' | 'video'; duration?: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<Post['type'] | 'all'>('all');
  const [activeUserFilter, setActiveUserFilter] = useState<string | 'all'>('all');
  const [isFilterSectionOpen, setIsFilterSectionOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [storedPosts, profile] = await Promise.all([
      getPosts(),
      getProfile()
    ]);
    setUserProfile(profile);
    setTempStatus(profile?.status || '');
    
    // If no posts, add some dummy ones for initial view
    if (storedPosts.length === 0) {
      const dummyPosts: Post[] = [
        {
          id: '1',
          userId: 'system',
          username: 'TikRing Team',
          userAvatar: 'https://picsum.photos/seed/tikring/100',
          content: 'Welcome to the new TikRing Home! Share your moments with friends here. 🚀',
          type: 'text',
          timestamp: Date.now() - 3600000,
          likes: 12,
          comments: 2,
          shares: 5
        },
        {
          id: '2',
          userId: 'user1',
          username: 'Mostaq',
          userAvatar: 'https://picsum.photos/seed/mostaq/100',
          content: 'Just finished setting up the new feed feature! What do you guys think? 😍',
          image: 'https://picsum.photos/seed/nature/800/600',
          type: 'photo',
          timestamp: Date.now() - 7200000,
          likes: 45,
          comments: 8,
          shares: 3
        }
      ];
      for (const p of dummyPosts) await savePost(p);
      setPosts(dummyPosts);
    } else {
      setPosts(storedPosts);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleSaveStatus = async () => {
    if (!userProfile) return;
    const updatedProfile = { ...userProfile, status: tempStatus };
    await saveProfile(updatedProfile);
    setUserProfile(updatedProfile);
    setIsStatusModalOpen(false);
    if (socket) socket.emit('update_status', { statusMessage: tempStatus });
  };

  useEffect(() => {
    if (!socket) return;
    
    const handleNewPost = (post: Post) => {
      setPosts(prev => [post, ...prev]);
    };
    
    socket.on('new_post', handleNewPost);
    return () => socket.off('new_post', handleNewPost);
  }, [socket]);

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postMedia) return;
    
    let postType: Post['type'] = 'text';
    if (postMedia) {
      if (postMedia.type === 'image') {
        postType = 'photo';
      } else if (postMedia.type === 'video') {
        postType = (postMedia.duration && postMedia.duration < 60) ? 'reel' : 'video';
      }
    }

    const newPost: Post = {
      id: Date.now().toString(),
      userId: userProfile?.phone || 'me',
      username: userProfile?.name || 'Me',
      userAvatar: userProfile?.avatar || 'https://picsum.photos/seed/me/100',
      content: postContent,
      image: postMedia?.type === 'image' ? postMedia.url : undefined,
      video: postMedia?.type === 'video' ? postMedia.url : undefined,
      videoDuration: postMedia?.duration,
      type: postType,
      timestamp: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0
    };
    
    await savePost(newPost);
    setPosts(prev => [newPost, ...prev]);
    setPostContent('');
    setPostMedia(null);
    setIsPostModalOpen(false);

    if (socket) {
      socket.emit('create_post', newPost);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (file.type.startsWith('image/')) {
        setPostMedia({ url, type: 'image' });
      } else if (file.type.startsWith('video/')) {
        // For video duration, we'd normally need to load it into a video element
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setPostMedia({ url, type: 'video', duration: video.duration });
        };
        video.src = url;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLike = async (postId: string) => {
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likes: isLiked ? p.likes + 1 : p.likes - 1
        };
      }
      return p;
    });
    setPosts(updatedPosts);
    const post = updatedPosts.find(p => p.id === postId);
    if (post) await savePost(post);
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderContentWithHashtags = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#') && part.length > 1) {
        const tag = part.replace(/[.,!?;:]+$/, '');
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setActiveHashtag(tag === activeHashtag ? null : tag);
            }}
            className="text-primary font-bold cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const filteredPosts = posts.filter(post => {
    const matchesHashtag = activeHashtag 
      ? post.content.toLowerCase().includes(activeHashtag.toLowerCase())
      : true;
    
    const matchesType = activeTypeFilter === 'all' 
      ? true 
      : post.type === activeTypeFilter;
    
    const matchesUser = activeUserFilter === 'all'
      ? true
      : post.userId === activeUserFilter;

    return matchesHashtag && matchesType && matchesUser;
  });

  const uniqueUsers = Array.from(new Set(posts.map(p => JSON.stringify({ id: p.userId, name: p.username }))))
    .map(s => JSON.parse(s as string));

  return (
    <div className="flex flex-col h-full bg-[#F0F2F5] overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-primary italic tracking-tight">TikRing</h1>
          <div className={cn(
            "w-2 h-2 rounded-full mt-1",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} title={isConnected ? "Connected" : "Disconnected"} />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsFilterSectionOpen(!isFilterSectionOpen)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isFilterSectionOpen || activeTypeFilter !== 'all' || activeUserFilter !== 'all' 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-gray-100 text-gray-500"
            )}
          >
            <Filter className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsPostModalOpen(true)}
            className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary active:scale-90 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {/* Collapsible Filter Section */}
        <AnimatePresence>
          {isFilterSectionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border-b border-gray-100 overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Type Filter */}
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Content Type</span>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'text', 'photo', 'video', 'reel'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setActiveTypeFilter(type as any)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                          activeTypeFilter === type 
                            ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                            : "bg-white border-gray-200 text-gray-500 hover:border-primary/30"
                        )}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Filter */}
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Filter by User</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveUserFilter('all')}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                        activeUserFilter === 'all' 
                          ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                          : "bg-white border-gray-200 text-gray-500 hover:border-primary/30"
                      )}
                    >
                      All Users
                    </button>
                    {uniqueUsers.map((user: any) => (
                      <button
                        key={user.id}
                        onClick={() => setActiveUserFilter(user.id)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2",
                          activeUserFilter === user.id 
                            ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                            : "bg-white border-gray-200 text-gray-500 hover:border-primary/30"
                        )}
                      >
                        <User className="w-3 h-3" />
                        {user.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setActiveTypeFilter('all');
                    setActiveUserFilter('all');
                    setActiveHashtag(null);
                  }}
                  className="w-full py-2 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 rounded-lg transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Status Section */}
        <div className="bg-white mb-2 py-4 shadow-sm relative z-0">
          <div className="px-4 mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
              Recent Status
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full border",
                isConnected ? "bg-green-50 border-green-100/50" : "bg-red-50 border-red-100/50"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )} />
                <span className={cn(
                  "text-[9px] font-black tracking-tight",
                  isConnected ? "text-green-600" : "text-red-600"
                )}>
                  {isConnected ? `${onlineUsers.length} Friends Online` : 'Offline'}
                </span>
              </div>
            </h3>
          </div>
          <div className="flex overflow-x-auto gap-4 px-4 no-scrollbar">
            {/* My Status */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative group">
                <div 
                  onClick={() => setIsStatusModalOpen(true)}
                  className="w-[52px] h-[52px] rounded-full border-2 border-dashed border-primary/20 flex items-center justify-center bg-white shadow-sm active:scale-95 transition-transform cursor-pointer overflow-hidden relative"
                >
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
                  ) : (
                    <Plus className="w-4 h-4 text-primary/40" />
                  )}
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-primary rounded-full border-2 border-white flex items-center justify-center shadow-md">
                  <Plus className="w-2 h-2 text-white" />
                </div>
              </div>
              <span className="text-[9px] font-black text-text-primary/70 truncate w-full text-center tracking-tight">My Status</span>
            </div>

            {/* Online Users List */}
            {onlineUsers
              .filter((user, index, self) => index === self.findIndex((u) => u.phone === user.phone))
              .map((user) => (
                <div 
                  key={`online-${user.phone}`} 
                  className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                  onClick={() => handleGlobalUserClick(user)}
                >
                  <div className="relative">
                    <div className="w-[52px] h-[52px] rounded-full p-0.5 border-2 border-primary/5">
                      <img 
                        src={`https://picsum.photos/seed/${user.phone}/100`} 
                        className="w-full h-full rounded-full object-cover border-2 border-white"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                  </div>
                  <span className="text-[9px] font-bold text-text-primary/80 truncate w-12 text-center">
                    {user.username?.split(' ')[0] || 'User'}
                  </span>
                  {user.statusMessage && (
                    <span className="text-[7px] text-text-secondary w-12 truncate text-center leading-none">
                      {user.statusMessage}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Create Post Card */}
        <div className="bg-white px-4 py-4 mb-2 shadow-sm flex items-center gap-3">
          <img 
            src={userProfile?.avatar || `https://picsum.photos/seed/me/100`} 
            className="w-10 h-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={() => setIsPostModalOpen(true)}
            className="flex-1 bg-gray-100 rounded-full py-2.5 px-5 text-left text-gray-500 text-sm font-medium"
          >
            What's on your mind?
          </button>
          <button onClick={() => setIsPostModalOpen(true)} className="text-green-500">
            <ImageIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Active Hashtag Filter */}
        <AnimatePresence>
          {activeHashtag && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-primary/10 px-4 py-2 mb-2 flex items-center justify-between overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">Showing posts with:</span>
                <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {activeHashtag}
                </span>
              </div>
              <button 
                onClick={() => setActiveHashtag(null)}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Clear Filter
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts Feed */}
        <div className="space-y-4 pb-6">
          {filteredPosts.map((post) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border-y border-gray-100 sm:border sm:rounded-[24px] sm:mx-4 overflow-hidden"
            >
              {/* Post Header */}
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-primary/20 to-primary/5">
                      <img src={post.userAvatar} className="w-full h-full rounded-full object-cover border-2 border-white" referrerPolicy="no-referrer" />
                    </div>
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-black text-text-primary leading-tight tracking-tight">{post.username}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-bold text-text-secondary/50 uppercase tracking-widest">{formatTime(post.timestamp)}</span>
                      <span className="w-1 h-1 bg-gray-200 rounded-full" />
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full">
                        {post.type === 'photo' && <ImageIcon className="w-2.5 h-2.5 text-primary/60" />}
                        {post.type === 'video' && <Film className="w-2.5 h-2.5 text-primary/60" />}
                        {post.type === 'reel' && <Film className="w-2.5 h-2.5 text-primary/60" />}
                        {post.type === 'text' && <Pencil className="w-2.5 h-2.5 text-primary/60" />}
                        <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{post.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-full transition-all">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Post Content */}
              {post.content && (
                <div className="px-5 pb-4">
                  <p className="text-[16px] text-text-primary leading-[1.6] whitespace-pre-wrap tracking-tight font-medium">
                    {renderContentWithHashtags(post.content)}
                  </p>
                </div>
              )}

              {/* Post Image/Video */}
              {post.image && (
                <div className="w-full bg-gray-50 overflow-hidden border-y border-gray-50/50">
                  <img 
                    src={post.image} 
                    className="w-full h-auto max-h-[600px] object-cover hover:scale-[1.02] transition-transform duration-700" 
                    referrerPolicy="no-referrer" 
                    alt="Post content"
                  />
                </div>
              )}
              {post.video && (
                <div className="w-full aspect-video bg-black overflow-hidden relative group border-y border-gray-900">
                  <video 
                    src={post.video} 
                    className="w-full h-full object-contain" 
                    controls 
                    poster={post.image}
                  />
                  {post.type === 'reel' && (
                    <div className="absolute top-5 right-5 bg-black/40 backdrop-blur-2xl px-3.5 py-2 rounded-2xl flex items-center gap-2 border border-white/10 shadow-2xl">
                      <Film className="w-4 h-4 text-white" />
                      <span className="text-[11px] font-black text-white uppercase tracking-[0.15em]">Reel</span>
                    </div>
                  )}
                </div>
              )}

              {/* Post Stats & Actions Container */}
              <div className="px-5">
                {/* Post Stats */}
                <div className="py-3 flex items-center justify-between border-b border-gray-50/80">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1">
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-white z-10 shadow-sm">
                        <Heart className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white z-0 shadow-sm">
                        <Share2 className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    </div>
                    <span className="text-[13px] font-black text-text-primary tracking-tight">
                      {post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="text-[11px] font-bold text-text-secondary/50 hover:text-primary transition-colors uppercase tracking-wider">
                      {post.comments} comments
                    </button>
                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                    <button className="text-[11px] font-bold text-text-secondary/50 hover:text-primary transition-colors uppercase tracking-wider">
                      {post.shares} shares
                    </button>
                  </div>
                </div>

                {/* Post Actions */}
                <div className="py-2 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2.5 py-3 rounded-2xl transition-all active:scale-95",
                      post.isLiked ? "text-primary bg-primary/5" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <Heart className={cn("w-5 h-5 transition-all duration-300", post.isLiked && "fill-primary scale-110")} />
                    <span className="text-[13px] font-black tracking-tight">Like</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-2xl text-gray-500 hover:bg-gray-50 transition-all active:scale-95">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-[13px] font-black tracking-tight">Comment</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-2xl text-gray-500 hover:bg-gray-50 transition-all active:scale-95">
                    <Share2 className="w-5 h-5" />
                    <span className="text-[13px] font-black tracking-tight">Share</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Status Modal */}
      <AnimatePresence>
        {isStatusModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-text-primary">Set Status</h3>
                <button onClick={() => setIsStatusModalOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-6">
                <input 
                  type="text"
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button 
                  onClick={handleSaveStatus}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform"
                >
                  Update Status
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isPostModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-text-primary">Create Post</h3>
                <button onClick={() => setIsPostModalOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <textarea 
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full h-32 bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />

                {postMedia && (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100">
                    {postMedia.type === 'image' ? (
                      <img src={postMedia.url} className="w-full h-full object-cover" />
                    ) : (
                      <video src={postMedia.url} className="w-full h-full object-cover" />
                    )}
                    <button 
                      onClick={() => setPostMedia(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    id="post-media" 
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                  />
                  <label 
                    htmlFor="post-media"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-text-secondary hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold">Photo/Video</span>
                  </label>
                </div>

                <button 
                  onClick={handleCreatePost}
                  disabled={!postContent.trim() && !postMedia}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                >
                  Post Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
