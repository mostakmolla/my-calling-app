import React, { useState } from 'react';
import { Chat, deleteContact, blockContact, updateContactStatus, addContact, getProfile } from '@/src/lib/db';
import { ArrowLeft, MoreVertical, MessageSquare, Phone, Video, Grid, Film, Image as ImageIcon, PlayCircle, Heart, Share2, MessageCircle, Play, Send, Copy, CheckCircle2, X, UserPlus2, ShieldAlert, Trash2, Clock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Socket } from 'socket.io-client';

const REACTION_EMOJIS = [
  { label: 'like', emoji: '👍' },
  { label: 'love', emoji: '❤️' },
  { label: 'care', emoji: '🥰' },
  { label: 'haha', emoji: '😂' },
  { label: 'wow', emoji: '😮' },
  { label: 'sad', emoji: '😢' },
  { label: 'angry', emoji: '😡' },
];

interface FriendProfileScreenProps {
  friend: Chat;
  onBack: () => void;
  onMessage: () => void;
  onCall: (type: 'video' | 'audio') => void;
  socket: Socket | null;
}

type TabType = 'all' | 'reels' | 'photos' | 'videos';

export default function FriendProfileScreen({ friend, onBack, onMessage, onCall, socket }: FriendProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [friendStatus, setFriendStatus] = useState(friend.status || 'friend');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'block' | 'unblock';
  }>({ isOpen: false, type: 'delete' });

  const handleBlock = async () => {
    await blockContact(friend.id);
    setFriendStatus('blocked');
    setIsMenuOpen(false);
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const handleUnblock = async () => {
    await updateContactStatus(friend.id, 'friend');
    setFriendStatus('friend');
    setIsMenuOpen(false);
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const handleDelete = async () => {
    await deleteContact(friend.id);
    onBack();
  };

  const handleSendRequest = async () => {
    const profile = await getProfile();
    const updatedFriend = { ...friend, status: 'pending' as const };
    await addContact(updatedFriend);
    setFriendStatus('pending');

    if (socket && friend.phone) {
      socket.emit('friend_request', {
        toPhone: friend.phone,
        fromUser: {
          name: profile?.name || 'TikRing User',
          phone: profile?.phone,
          avatar: profile?.avatar || 'https://picsum.photos/seed/tikring/100'
        }
      });
    }
  };

  const handleAcceptRequest = async () => {
    await updateContactStatus(friend.id, 'friend');
    setFriendStatus('friend');
  };

  const handleShare = () => {
    const shareUrl = `https://connectme.app/share/${selectedMedia.type}/${selectedMedia.id}`;
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now(),
      user: 'You',
      text: newComment,
      timestamp: 'Just now'
    };
    setComments([comment, ...comments]);
    setNewComment('');
  };

  const content = {
    reels: [
      { id: 1, thumbnail: `https://picsum.photos/seed/${friend.id}r1/400/600`, views: '1.2k', type: 'reel' },
      { id: 2, thumbnail: `https://picsum.photos/seed/${friend.id}r2/400/600`, views: '850', type: 'reel' },
      { id: 3, thumbnail: `https://picsum.photos/seed/${friend.id}r3/400/600`, views: '2.4k', type: 'reel' },
    ],
    photos: [
      { id: 1, url: `https://picsum.photos/seed/${friend.id}p1/400/400`, likes: '124', type: 'photo' },
      { id: 2, url: `https://picsum.photos/seed/${friend.id}p2/400/400`, likes: '89', type: 'photo' },
      { id: 3, url: `https://picsum.photos/seed/${friend.id}p3/400/400`, likes: '256', type: 'photo' },
    ],
    videos: [
      { id: 1, thumbnail: `https://picsum.photos/seed/${friend.id}v1/600/400`, views: '3.1k', likes: '450', duration: '0:45', type: 'video' },
      { id: 2, thumbnail: `https://picsum.photos/seed/${friend.id}v2/600/400`, views: '1.5k', likes: '210', duration: '1:20', type: 'video' },
    ]
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reels':
        return (
          <div className="grid grid-cols-3 gap-1 p-1">
            {content.reels.map(reel => (
              <div 
                key={reel.id} 
                onClick={() => setSelectedMedia({ ...reel, type: 'reel' })}
                className="relative aspect-[9/16] bg-gray-100 overflow-hidden cursor-pointer group"
              >
                <img src={reel.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold">
                  <Play className="w-3 h-3 fill-current" />
                  {reel.views}
                </div>
                <div className="absolute top-2 right-2">
                  <Film className="w-4 h-4 text-white/80" />
                </div>
              </div>
            ))}
          </div>
        );
      case 'photos':
        return (
          <div className="grid grid-cols-3 gap-1 p-1">
            {content.photos.map(photo => (
              <div 
                key={photo.id} 
                onClick={() => setSelectedMedia({ ...photo, type: 'photo' })}
                className="relative aspect-square bg-gray-100 overflow-hidden cursor-pointer group"
              >
                <img src={photo.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <Heart className="w-3 h-3 fill-current" />
                  {photo.likes}
                </div>
              </div>
            ))}
          </div>
        );
      case 'videos':
        return (
          <div className="grid grid-cols-2 gap-2 p-2">
            {content.videos.map(video => (
              <div 
                key={video.id} 
                onClick={() => setSelectedMedia({ ...video, type: 'video' })}
                className="relative aspect-video bg-gray-100 overflow-hidden rounded-xl cursor-pointer group shadow-sm"
              >
                <img src={video.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                    <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-3 flex items-center gap-3 text-white text-[10px] font-bold">
                  <span className="flex items-center gap-1"><Play className="w-3 h-3 fill-current" /> {video.views}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> {video.likes}</span>
                </div>
                <div className="absolute bottom-2 right-3 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold backdrop-blur-sm">
                  {video.duration}
                </div>
              </div>
            ))}
          </div>
        );
      case 'all':
      default:
        return (
          <div className="space-y-6 p-4">
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-text-primary">Recent Photos</h3>
                <button onClick={() => setActiveTab('photos')} className="text-xs font-bold text-primary">See All</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {content.photos.slice(0, 3).map(photo => (
                  <img 
                    key={photo.id} 
                    src={photo.url} 
                    onClick={() => setSelectedMedia({ ...photo, type: 'photo' })}
                    className="aspect-square object-cover rounded-lg cursor-pointer active:scale-95 transition-transform" 
                  />
                ))}
              </div>
            </section>
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-text-primary">Top Reels</h3>
                <button onClick={() => setActiveTab('reels')} className="text-xs font-bold text-primary">See All</button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {content.reels.map(reel => (
                  <div 
                    key={reel.id} 
                    onClick={() => setSelectedMedia({ ...reel, type: 'reel' })}
                    className="relative w-24 aspect-[9/16] flex-shrink-0 rounded-lg overflow-hidden cursor-pointer active:scale-95 transition-transform"
                  >
                    <img src={reel.thumbnail} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 left-1 text-[8px] text-white font-bold">{reel.views}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        );
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute inset-0 bg-white z-[60] flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Profile</h2>
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 hover:bg-surface rounded-full transition-colors"
          >
            <MoreVertical className="w-6 h-6 text-primary" />
          </button>
          
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
              >
                <button 
                  onClick={() => setConfirmModal({ isOpen: true, type: friendStatus === 'blocked' ? 'unblock' : 'block' })}
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 transition-colors",
                    friendStatus === 'blocked' ? "text-green-600 hover:bg-green-50" : "text-red-500 hover:bg-red-50"
                  )}
                >
                  {friendStatus === 'blocked' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {friendStatus === 'blocked' ? 'Unblock User' : 'Block User'}
                </button>
                <button 
                  onClick={() => setConfirmModal({ isOpen: true, type: 'delete' })}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Contact
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Info */}
        <div className="flex flex-col items-center py-8 px-6 bg-gradient-to-b from-primary/5 to-white">
          <div className="relative">
            <img 
              src={friend.avatar} 
              className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-xl"
              referrerPolicy="no-referrer"
            />
            {friend.isOnline && (
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-online rounded-full border-4 border-white" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <h2 className="text-2xl font-bold text-text-primary">{friend.name}</h2>
            {friend.isVerified && (
              <CheckCircle2 className="w-5 h-5 text-primary fill-primary/10" />
            )}
          </div>
          <p className="text-text-secondary text-sm font-medium">{friend.phone || 'No phone number'}</p>
          
          {friendStatus === 'pending' && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Request Pending
            </div>
          )}

          {friendStatus === 'blocked' && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              User Blocked
            </div>
          )}

          {friendStatus === 'request_received' && (
            <div className="mt-4 flex gap-3">
              <button 
                onClick={handleAcceptRequest}
                className="bg-primary text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <Check className="w-4 h-4" />
                Accept
              </button>
              <button 
                onClick={handleDelete}
                className="bg-surface text-text-secondary px-6 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
            </div>
          )}

          {friendStatus !== 'friend' && friendStatus !== 'pending' && friendStatus !== 'blocked' && friendStatus !== 'request_received' && (
            <button 
              onClick={handleSendRequest}
              className="mt-4 bg-primary text-white px-8 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-transform"
            >
              <UserPlus2 className="w-4 h-4" />
              Send Friend Request
            </button>
          )}
          
          <div className="flex gap-4 mt-6">
            <button 
              onClick={onMessage}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-text-secondary uppercase">Message</span>
            </button>
            <button 
              onClick={() => onCall('audio')}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-text-secondary uppercase">Audio</span>
            </button>
            <button 
              onClick={() => onCall('video')}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-text-secondary uppercase">Video</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
          {[
            { id: 'all', icon: Grid, label: 'All' },
            { id: 'reels', icon: Film, label: 'Reel' },
            { id: 'photos', icon: ImageIcon, label: 'Photo' },
            { id: 'videos', icon: PlayCircle, label: 'Video' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative",
                activeTab === tab.id ? "text-primary" : "text-text-secondary"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl p-8 flex flex-col items-center gap-6"
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                confirmModal.type === 'unblock' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              )}>
                {confirmModal.type === 'delete' && <Trash2 className="w-8 h-8" />}
                {confirmModal.type === 'block' && <ShieldAlert className="w-8 h-8" />}
                {confirmModal.type === 'unblock' && <CheckCircle2 className="w-8 h-8" />}
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-text-primary capitalize">{confirmModal.type} Contact?</h3>
                <p className="text-sm text-text-secondary">
                  Are you sure you want to {confirmModal.type} <b>{friend.name}</b>?
                  {confirmModal.type === 'block' && " They won't be able to message or call you."}
                  {confirmModal.type === 'delete' && " This will remove them from your contacts list."}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => {
                    if (confirmModal.type === 'delete') handleDelete();
                    if (confirmModal.type === 'block') handleBlock();
                    if (confirmModal.type === 'unblock') handleUnblock();
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-white shadow-lg",
                    confirmModal.type === 'unblock' ? "bg-green-500 shadow-green-500/20" : "bg-red-500 shadow-red-500/20"
                  )}
                >
                  Confirm
                </button>
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="flex-1 bg-surface py-3 rounded-xl font-bold text-text-secondary"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Viewer */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col"
          >
            <header className="flex items-center justify-between px-4 py-4 z-10">
              <button onClick={() => setSelectedMedia(null)} className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                <X className="w-6 h-6 text-white" />
              </button>
              <div className="text-center">
                <p className="text-white font-bold text-sm uppercase tracking-widest">{selectedMedia.type}</p>
                <p className="text-white/60 text-[10px]">Shared by {friend.name}</p>
              </div>
              <button className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                <MoreVertical className="w-6 h-6 text-white" />
              </button>
            </header>

            <div className="flex-1 flex items-center justify-center p-4 relative">
              {selectedMedia.type === 'photo' ? (
                <img 
                  src={selectedMedia.url} 
                  className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
                />
              ) : (
                <video 
                  src={selectedMedia.videoUrl} 
                  autoPlay 
                  loop
                  muted={false}
                  playsInline
                  className={cn(
                    "max-w-full max-h-full rounded-2xl shadow-2xl",
                    selectedMedia.type === 'reel' ? "aspect-[9/16] object-cover" : "object-contain"
                  )}
                />
              )}

              {/* Comments Overlay */}
              <AnimatePresence>
                {showComments && (
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="absolute inset-x-0 bottom-0 top-20 bg-white rounded-t-[32px] z-20 flex flex-col shadow-2xl"
                  >
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-4" onClick={() => setShowComments(false)} />
                    <div className="px-6 flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-text-primary">Comments</h3>
                      <button onClick={() => setShowComments(false)} className="text-primary font-bold text-sm">Close</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-6 space-y-4">
                      {comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-10">
                          <MessageCircle className="w-12 h-12 mb-2" />
                          <p className="text-sm font-medium">No comments yet.<br/>Be the first to share your opinion!</p>
                        </div>
                      ) : (
                        comments.map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                              {comment.user[0]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-text-primary">{comment.user}</span>
                                <span className="text-[10px] text-text-secondary">{comment.timestamp}</span>
                              </div>
                              <p className="text-sm text-text-secondary mt-0.5">{comment.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 border-t border-gray-100 flex items-center gap-3 bg-white">
                      <div className="flex-1 bg-surface rounded-2xl px-4 py-2.5 flex items-center gap-2">
                        <input 
                          type="text" 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        />
                        <button onClick={handleAddComment} className="text-primary">
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <footer className="p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-around relative">
              {/* Reaction Menu */}
              <AnimatePresence>
                {showReactions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-20 left-4 right-4 bg-white/90 backdrop-blur-xl rounded-full p-2 flex justify-around shadow-2xl border border-white/20"
                  >
                    {REACTION_EMOJIS.map((reaction) => (
                      <button 
                        key={reaction.label}
                        onClick={() => {
                          setCurrentReaction(reaction.emoji);
                          setShowReactions(false);
                        }}
                        className="text-2xl hover:scale-125 transition-transform active:scale-90 p-1"
                        title={reaction.label}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onLongPress={() => setShowReactions(true)}
                onClick={() => {
                  if (currentReaction) setCurrentReaction(null);
                  else setCurrentReaction('👍');
                }}
                className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-all hover:scale-110"
              >
                <div className="relative">
                  {currentReaction ? (
                    <span className="text-2xl">{currentReaction}</span>
                  ) : (
                    <Heart className="w-6 h-6" />
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter">
                  {currentReaction ? 'Reacted' : (selectedMedia.likes || '0')}
                </span>
              </button>
              <button 
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-all hover:scale-110"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{selectedMedia.comments || '0'}</span>
              </button>
              <button 
                onClick={() => setShowShareModal(true)}
                className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-all hover:scale-110"
              >
                <Share2 className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Share</span>
              </button>
              <button className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-all hover:scale-110">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Save</span>
              </button>
            </footer>

            {/* Share Modal */}
            <AnimatePresence>
              {showShareModal && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
                  onClick={() => setShowShareModal(false)}
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-text-primary">Share this {selectedMedia.type}</h3>
                      <p className="text-sm text-text-secondary">Copy the link below to share with your friends on any social media platform.</p>
                    </div>

                    <div className="bg-surface p-4 rounded-2xl flex items-center justify-between gap-3 border border-gray-100">
                      <p className="text-xs text-text-secondary truncate flex-1">
                        https://connectme.app/share/{selectedMedia.type}/{selectedMedia.id}
                      </p>
                      <button 
                        onClick={handleShare}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          isCopied ? "bg-green-500 text-white" : "bg-primary text-white"
                        )}
                      >
                        {isCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {['WhatsApp', 'Facebook', 'Twitter', 'Instagram'].map(platform => (
                        <div key={platform} className="flex flex-col items-center gap-1">
                          <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                            <Share2 className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold text-text-secondary">{platform}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setShowShareModal(false)}
                      className="w-full bg-surface text-text-primary font-bold py-4 rounded-2xl active:scale-95 transition-transform"
                    >
                      Cancel
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
