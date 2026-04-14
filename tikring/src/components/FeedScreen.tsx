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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getPosts, savePost, Post, getProfile, saveProfile, addContact, Chat } from '@/src/lib/db';

interface FeedScreenProps {
  socket: any;
  onlineUsers: any[];
  onChatSelect: (chatId: string) => void;
}

export default function FeedScreen({ socket, onlineUsers, onChatSelect }: FeedScreenProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    if (!postContent.trim()) return;
    
    const newPost: Post = {
      id: Date.now().toString(),
      userId: 'me',
      username: userProfile?.username || 'Me',
      userAvatar: userProfile?.avatar || 'https://picsum.photos/seed/me/100',
      content: postContent,
      timestamp: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0
    };
    
    await savePost(newPost);
    setPosts([newPost, ...posts]);
    setPostContent('');
    setIsPostModalOpen(false);

    if (socket) {
      socket.emit('create_post', newPost);
    }
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

  return (
    <div className="flex flex-col h-full bg-[#F0F2F5] overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <h1 className="text-2xl font-black text-primary italic tracking-tight">TikRing</h1>
        <button 
          onClick={() => setIsPostModalOpen(true)}
          className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {/* Status Section */}
        <div className="bg-white mb-2 py-4 shadow-sm">
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

        {/* Posts Feed */}
        <div className="space-y-2">
          {posts.map((post) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white shadow-sm"
            >
              {/* Post Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={post.userAvatar} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{post.username}</h4>
                    <span className="text-[10px] text-text-secondary">{formatTime(post.timestamp)}</span>
                  </div>
                </div>
                <button className="text-gray-400">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              {/* Post Image */}
              {post.image && (
                <div className="w-full aspect-video bg-gray-100 overflow-hidden">
                  <img src={post.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}

              {/* Post Stats */}
              <div className="px-4 py-2 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Heart className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span className="text-[11px] text-text-secondary">{post.likes}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-secondary">{post.comments} comments</span>
                  <span className="text-[11px] text-text-secondary">{post.shares} shares</span>
                </div>
              </div>

              {/* Post Actions */}
              <div className="px-2 py-1 flex items-center justify-around">
                <button 
                  onClick={() => handleLike(post.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-colors",
                    post.isLiked ? "text-primary bg-primary/5" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Heart className={cn("w-5 h-5", post.isLiked && "fill-primary")} />
                  <span className="text-xs font-bold">Like</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs font-bold">Comment</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="text-xs font-bold">Share</span>
                </button>
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
                <button 
                  onClick={handleCreatePost}
                  disabled={!postContent.trim()}
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
