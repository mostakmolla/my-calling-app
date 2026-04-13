import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageSquare, Compass, Users, Phone, User, Mic, MicOff, Grid, Volume2, UserPlus, Video, PhoneOff, Check, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HomeScreen from './components/HomeScreen';
import ChatScreen from './components/ChatScreen';
import VideoCall from './components/VideoCall';
import ProfileScreen from './components/ProfileScreen';
import ContactsScreen from './components/ContactsScreen';
import FriendProfileScreen from './components/FriendProfileScreen';
import CallHistoryScreen from './components/CallHistoryScreen';
import CreateGroupScreen from './components/CreateGroupScreen';
import GroupInfoScreen from './components/GroupInfoScreen';
import { initDB, getChat, Chat, getProfile, saveProfile, addContact, saveMessage, Message, saveCallLog, CallLog, createGroup, Group, updateMessageStatus, getMessages, markAllMessagesAsRead, getGroup, updateGroup, deleteGroup, deleteMessage } from './lib/db';
import { cn } from './lib/utils';
import { ringtone } from './lib/ringtone';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function ControlBtn({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
      style={{ touchAction: 'manipulation' }}
    >
      <div className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
        active ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-surface text-text-secondary group-active:bg-primary/10"
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest transition-colors",
        active ? "text-primary" : "text-text-secondary"
      )}>{label}</span>
    </button>
  );
}

function AudioCall({ 
  callerName, 
  avatar, 
  onEndCall, 
  isIncoming, 
  onAccept, 
  onMinimize, 
  onSwitchToVideo,
  localStream,
  callDuration,
  formatTime,
  isMuted,
  setIsMuted,
  isSpeakerOn,
  setIsSpeakerOn
}: any) {
  const [showKeypad, setShowKeypad] = useState(false);
  const [showAddCall, setShowAddCall] = useState(false);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const keypadButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  if (isIncoming) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-between py-20 px-6 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-surface shadow-xl">
             {avatar ? (
               <img src={avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             ) : (
               <span className="text-5xl font-bold text-primary">{callerName[0]}</span>
             )}
          </div>
          <h2 className="text-2xl font-bold text-text-primary">{callerName}</h2>
          <p className="text-text-secondary font-medium animate-pulse">Audio Call</p>
        </div>

        <div className="flex gap-16">
          <button 
            onClick={onEndCall}
            className="flex flex-col items-center gap-3 group"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 group-active:scale-90 transition-transform">
              <PhoneOff className="w-8 h-8" />
            </div>
            <span className="text-sm font-bold text-red-500 uppercase tracking-wider">Decline</span>
          </button>

          <button 
            onClick={onAccept}
            className="flex flex-col items-center gap-3 group"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="w-16 h-16 rounded-full bg-online flex items-center justify-center text-white shadow-lg shadow-online/30 group-active:scale-90 transition-transform">
              <Check className="w-8 h-8" />
            </div>
            <span className="text-sm font-bold text-online uppercase tracking-wider">Accept</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-between py-12 px-6 font-sans overflow-hidden">
      {/* Top Info */}
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-bold text-text-primary">{callerName}</h2>
        <p className="text-text-secondary font-mono text-lg font-bold">
          {formatTime(callDuration)}
        </p>
      </div>

      {/* Middle Avatar */}
      <div className="relative">
        <div className="w-48 h-48 rounded-full bg-primary/5 flex items-center justify-center overflow-hidden border-8 border-surface shadow-2xl">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-7xl font-bold text-primary">{callerName[0]}</span>
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-online rounded-full border-4 border-white animate-pulse shadow-lg" />
      </div>

      {/* Controls Grid */}
      <div className="w-full max-w-xs flex flex-col gap-8">
        <div className="grid grid-cols-3 gap-4">
          {/* Row 1 */}
          <ControlBtn 
            icon={isMuted ? MicOff : Mic} 
            label="Mute" 
            active={isMuted} 
            onClick={toggleMute} 
          />
          <ControlBtn 
            icon={Grid} 
            label="Keypad" 
            active={showKeypad} 
            onClick={() => setShowKeypad(!showKeypad)} 
          />
          <ControlBtn 
            icon={Volume2} 
            label="Speaker" 
            active={isSpeakerOn} 
            onClick={() => setIsSpeakerOn(!isSpeakerOn)} 
          />
          
          {/* Row 2 */}
          <ControlBtn 
            icon={UserPlus} 
            label="Add Call" 
            onClick={() => setShowAddCall(true)} 
          />
          <ControlBtn 
            icon={Video} 
            label="Video" 
            onClick={onSwitchToVideo} 
          />
          <ControlBtn 
            icon={MessageSquare} 
            label="Message" 
            onClick={onMinimize} 
          />
        </div>

        {/* End Call Button */}
        <div className="flex justify-center mt-4">
          <button 
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/30 active:scale-90 transition-transform"
            style={{ touchAction: 'manipulation' }}
          >
            <PhoneOff className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Keypad Overlay */}
      <AnimatePresence>
        {showKeypad && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-0 bg-white z-[110] flex flex-col p-8"
          >
            <div className="flex justify-end mb-8">
              <button onClick={() => setShowKeypad(false)} className="p-2 bg-surface rounded-full">
                <X className="w-6 h-6 text-text-secondary" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-8 flex-1 content-center">
              {keypadButtons.map(key => (
                <button 
                  key={key}
                  className="w-20 h-20 rounded-full bg-surface flex items-center justify-center text-2xl font-bold text-text-primary active:bg-primary active:text-white transition-colors mx-auto"
                  style={{ touchAction: 'manipulation' }}
                >
                  {key}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Call Overlay */}
      <AnimatePresence>
        {showAddCall && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-[32px] p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-text-primary">Add Participants</h3>
                <p className="text-text-secondary mt-2">Group calling feature is coming soon!</p>
              </div>
              <button 
                onClick={() => setShowAddCall(false)}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl active:scale-95 transition-transform"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'explore' | 'contacts'>('chats');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'chat' | 'call' | 'profile' | 'friend_profile' | 'create_group' | 'group_info'>('main');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string>('');
  const [selectedChatAvatar, setSelectedChatAvatar] = useState<string>('');
  const [selectedFriend, setSelectedFriend] = useState<Chat | null>(null);
  const [callStartTime, setCallStartTime] = useState<number>(0);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [callDuration, setCallDuration] = useState(0);
  const [callConnected, setCallConnected] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  
  // WebRTC & Socket State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  
  // Refs for WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Helper refs for socket listeners
  const currentScreenRef = useRef(currentScreen);
  const selectedChatIdRef = useRef(selectedChatId);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    if (remoteStream) {
      setCallConnected(true);
    }
  }, [remoteStream]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callConnected && (currentScreen === 'call' || isCallMinimized)) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (!callConnected) {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callConnected, currentScreen, isCallMinimized]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (isIncomingCall) {
      ringtone.start();
    } else {
      ringtone.stop();
    }
  }, [isIncomingCall]);

  useEffect(() => {
    const setup = async () => {
      await initDB();
      let profile = await getProfile();
      
      if (!profile || !profile.phone) {
        const randomPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const defaultProfile = {
          name: profile?.name || 'User_' + Math.floor(Math.random() * 1000),
          phone: randomPhone,
          avatar: `https://picsum.photos/seed/${randomPhone}/200`,
          status: 'Hey! I am using TikRing',
          isPhoneVerified: true
        };
        await saveProfile(defaultProfile);
        profile = defaultProfile;
      }

      // CRITICAL: Never change this URL
      const newSocket = io('https://my-calling-app-production.up.railway.app', {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
        console.log('✅ Connected to Server');
        newSocket.emit('register', {
          username: profile?.name,
          phone: profile?.phone
        });
      });

      newSocket.on('connect_error', (err) => {
        console.error('❌ Connection Error:', err.message);
        setIsConnected(false);
        setIsConnecting(false);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        setIsConnecting(false);
      });

      newSocket.on('user_list', (users: any[]) => {
        setOnlineUsers(users.filter(u => u.phone !== profile?.phone));
      });

      newSocket.on('user_status_change', ({ phone, isOnline }) => {
        setOnlineUsers(prev => {
          if (isOnline) {
            if (!prev.find(u => u.phone === phone)) {
              return [...prev, { phone, isOnline: true }];
            }
            return prev;
          } else {
            return prev.filter(u => u.phone !== phone);
          }
        });
      });

      newSocket.on('offer', async ({ from, offer, type }) => {
        console.log('📞 Incoming offer from:', from, 'Type:', type);
        
        // If we are already in a call or processing one, ignore
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
          console.warn('⚠️ Ignoring incoming offer: signaling already in progress');
          return;
        }

        // Set a temporary flag to prevent concurrent offer processing
        if ((newSocket as any)._processingOffer) return;
        (newSocket as any)._processingOffer = true;

        try {
          setCallerId(from);
          setIsIncomingCall(true);
          setCallType(type || 'video');

          const chat = await getChat(from);
          if (chat) {
            setSelectedChatName(chat.name);
            setSelectedChatAvatar(chat.avatar);
            setSelectedChatId(from);
          } else {
            setSelectedChatName(from);
            setSelectedChatId(from);
          }
          
          setCurrentScreen('call');
          
          // Initialize PeerConnection
          const pc = new RTCPeerConnection(STUN_SERVERS);
          peerConnectionRef.current = pc;
          iceCandidateQueue.current = [];

          pc.ontrack = (event) => {
            console.log('🎬 Remote track received (Callee)');
            const stream = event.streams[0] || new MediaStream([event.track]);
            setRemoteStream(stream);
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              newSocket.emit('ice_candidate', { to: from, candidate: event.candidate });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          
          // Process queued candidates
          while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.warn('Failed to add queued ICE candidate:', e);
              }
            }
          }
        } catch (err) {
          console.error('Error handling offer:', err);
        } finally {
          (newSocket as any)._processingOffer = false;
        }
      });

      newSocket.on('answer', async ({ answer }) => {
        console.log('✅ Received answer');
        const pc = peerConnectionRef.current;
        if (pc && pc.signalingState === 'have-local-offer') {
          // Prevent concurrent setRemoteDescription calls for the same answer
          if ((pc as any)._isSettingRemoteDescription) return;
          (pc as any)._isSettingRemoteDescription = true;

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            
            while (iceCandidateQueue.current.length > 0) {
              const candidate = iceCandidateQueue.current.shift();
              if (candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                  console.warn('Failed to add queued ICE candidate:', e);
                }
              }
            }
          } catch (err: any) {
            // If the error is just that we're already stable, we can ignore it
            if (pc.signalingState === 'stable') {
              console.log('✨ Connection already stable, ignoring duplicate answer');
            } else {
              console.error('❌ Error setting remote answer:', err);
            }
          } finally {
            (pc as any)._isSettingRemoteDescription = false;
          }
        } else {
          console.warn('⚠️ Received answer in wrong state:', pc?.signalingState);
        }
      });

      newSocket.on('ice_candidate', async ({ candidate }) => {
        console.log('❄️ Received ICE candidate');
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidateQueue.current.push(candidate);
        }
      });

      newSocket.on('call_ended', () => {
        endCall();
      });

      newSocket.on('peer_disconnected', () => {
        endCall();
      });

      newSocket.on('receive_message', async (data: { from: string, message: Message, senderPhone?: string }) => {
        let chat = await getChat(data.from);
        if (!chat) {
          chat = {
            id: data.from,
            name: data.senderPhone || data.from,
            avatar: `https://picsum.photos/seed/${data.from}/100`,
            phone: data.senderPhone || data.from,
            unreadCount: 0,
            isOnline: true,
            status: 'pending',
            type: data.senderPhone ? 'group' : 'individual'
          };
          await addContact(chat);
        }

        const isMe = data.senderPhone === profile?.phone;
        const receivedMessage = {
          ...data.message,
          chatId: data.from, 
          senderId: isMe ? 'me' : (data.senderPhone || 'other')
        };
        await saveMessage(receivedMessage);

        if (!isMe && (currentScreenRef.current !== 'chat' || selectedChatIdRef.current !== data.from)) {
          ringtone.playNotificationTone();
        }
      });

      newSocket.on('message_read', async (data: { from: string, messageId?: string, chatId: string, isSelfUpdate?: boolean }) => {
        const targetChatId = data.chatId || data.from;
        if (data.isSelfUpdate) {
          await markAllMessagesAsRead(targetChatId);
        } else {
          if (data.messageId) {
            await updateMessageStatus(data.messageId, 'read');
          } else {
            const allMessages = await getMessages(targetChatId);
            for (const msg of allMessages) {
              if (msg.senderId === 'me' && msg.status !== 'read') {
                await updateMessageStatus(msg.id, 'read');
              }
            }
          }
        }
      });
      
      newSocket.on('delete_message', async (data: { messageId: string, chatId: string }) => {
        await deleteMessage(data.messageId);
      });

      return () => {
        newSocket.disconnect();
      };
    };

    setup();
  }, []);

  const startCall = async (type: 'video' | 'audio', targetId?: string) => {
    try {
      const id = targetId || selectedChatId;
      if (!id) return;

      const chat = await getChat(id);
      const targetPhone = chat?.phone || id; // Use phone if available, fallback to id

      setSelectedChatId(id);
      setSelectedChatName(chat?.name || "User");
      setSelectedChatAvatar(chat?.avatar || "");
      setCallType(type);
      setCallStartTime(Date.now());

      // 1. Get local stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { facingMode: cameraFacingMode } : false,
        audio: true,
      });
      setLocalStream(stream);
      setCurrentScreen('call');

      // 2. Create PeerConnection
      const pc = new RTCPeerConnection(STUN_SERVERS);
      peerConnectionRef.current = pc;
      iceCandidateQueue.current = [];
      
      // 3. Add tracks BEFORE creating offer
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // 4. Handle remote tracks
      pc.ontrack = (event) => {
        console.log('🎬 Remote track received (Caller)');
        const stream = event.streams[0] || new MediaStream([event.track]);
        setRemoteStream(stream);
      };

      // 5. Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', { to: targetPhone, candidate: event.candidate });
        }
      };

      // 6. Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (socket) {
        socket.emit('join_call', { toPhone: targetPhone });
        socket.emit('offer', { to: targetPhone, offer, type });
      }
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  const acceptCall = async () => {
    try {
      setIsIncomingCall(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: callType === 'video' ? { facingMode: cameraFacingMode } : false, 
        audio: true 
      });
      setLocalStream(stream);

      const pc = peerConnectionRef.current;
      if (!pc) return;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket && callerId) {
        socket.emit('join_call', { toPhone: callerId });
        socket.emit('answer', { to: callerId, answer });
      }
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  };

  const endCall = async () => {
    const duration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
    
    if (selectedChatId && socket) {
      const chat = await getChat(selectedChatId);
      const targetPhone = chat?.phone || selectedChatId;
      socket.emit('end_call', { to: targetPhone });
      
      const log: CallLog = {
        id: Date.now().toString(),
        chatId: selectedChatId,
        callerName: selectedChatName,
        callerAvatar: selectedChatAvatar,
        type: callType,
        direction: isIncomingCall ? 'incoming' : 'outgoing',
        duration: duration,
        timestamp: Date.now(),
      };
      await saveCallLog(log);
    }

    // Cleanup
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsIncomingCall(false);
    setCallStartTime(0);
    setCallConnected(false);
    setCallDuration(0);
    setIsCallMinimized(false);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setCurrentScreen('main');
  };

  const toggleScreenShare = async (isSharing: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isSharing && (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia)) {
        return { success: false, error: 'NotSupported' };
      }

      let newStream: MediaStream;
      if (isSharing) {
        newStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacingMode },
          audio: true
        });
      }

      const videoTrack = newStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }

      if (localStream) {
        localStream.getVideoTracks().forEach(track => track.stop());
      }
      
      setLocalStream(newStream);
      if (isSharing) {
        videoTrack.onended = () => toggleScreenShare(false);
      }
      return { success: true };
    } catch (err: any) {
      console.error('Error toggling screen share:', err);
      return { success: false, error: err.name === 'NotAllowedError' ? 'PermissionDenied' : 'NotSupported' };
    }
  };

  const switchCamera = async () => {
    if (!localStream) return;
    try {
      const newFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true
      });

      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];
      
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        const audioSender = senders.find(s => s.track?.kind === 'audio');
        
        if (videoSender && videoTrack) await videoSender.replaceTrack(videoTrack);
        if (audioSender && audioTrack) await audioSender.replaceTrack(audioTrack);
      }

      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(newStream);
      setCameraFacingMode(newFacingMode);
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  };

  const switchToVideo = async () => {
    try {
      setCallType('video');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode },
        audio: true
      });
      
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      
      setLocalStream(stream);
      
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        const videoSender = senders.find(s => s.track?.kind === 'video');
        const audioSender = senders.find(s => s.track?.kind === 'audio');
        
        if (videoSender && videoTrack) {
          await videoSender.replaceTrack(videoTrack);
        } else if (videoTrack) {
          peerConnectionRef.current.addTrack(videoTrack, stream);
        }
        
        if (audioSender && audioTrack) {
          await audioSender.replaceTrack(audioTrack);
        }
        
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        if (socket && selectedChatId) {
          const chat = await getChat(selectedChatId);
          socket.emit('offer', { to: chat?.phone || selectedChatId, offer, type: 'video' });
        }
      }
    } catch (err) {
      console.error('Error switching to video:', err);
    }
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'chats':
        return (
          <HomeScreen 
            socket={socket}
            onlineUsers={onlineUsers}
            isConnected={isConnected}
            isConnecting={isConnecting}
            onReconnect={() => socket?.connect()}
            onChatSelect={async (id) => {
              setSelectedChatId(id);
              const chat = await getChat(id);
              if (chat) {
                setSelectedChatName(chat.name);
                setSelectedChatAvatar(chat.avatar);
              }
              setCurrentScreen('chat');
            }}
            onCallSelect={(id, type) => startCall(type, id)}
            onProfileOpen={() => setCurrentScreen('profile')}
            onCreateGroup={() => setCurrentScreen('create_group')}
          />
        );
      case 'calls':
        return (
          <CallHistoryScreen 
            onBack={() => setActiveTab('chats')}
            onCall={(chatId, type) => startCall(type, chatId)}
          />
        );
      case 'contacts':
        return (
          <ContactsScreen 
            socket={socket}
            onlineUsers={onlineUsers}
            onContactSelect={async (id) => {
              setSelectedChatId(id);
              const chat = await getChat(id);
              if (chat) setSelectedChatName(chat.name);
              setCurrentScreen('chat');
            }}
            onViewProfile={async (id) => {
              const chat = await getChat(id);
              if (chat) {
                setSelectedFriend(chat);
                setCurrentScreen('friend_profile');
              }
            }}
            onBack={() => setActiveTab('chats')}
          />
        );
      case 'explore':
        return (
          <div className="flex-1 flex items-center justify-center bg-surface">
            <p className="text-text-secondary font-medium">Explore Screen Coming Soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="w-full h-full max-w-md bg-white shadow-2xl relative overflow-hidden flex flex-col">
        
        <div className="flex-1 relative overflow-hidden">
          {currentScreen === 'main' && renderMainContent()}

          {currentScreen === 'chat' && selectedChatId && (
            <ChatScreen 
              chatId={selectedChatId}
              socket={socket}
              onlineUsers={onlineUsers}
              isConnected={isConnected}
              onBack={() => setCurrentScreen('main')}
              onCall={(type) => startCall(type)}
              onViewProfile={async () => {
                const chat = await getChat(selectedChatId);
                if (chat) {
                  if (chat.type === 'group') {
                    setCurrentScreen('group_info');
                  } else {
                    setSelectedFriend(chat);
                    setCurrentScreen('friend_profile');
                  }
                }
              }}
            />
          )}

          {isCallMinimized && (
            <div 
              onClick={() => {
                setIsCallMinimized(false);
                setCurrentScreen('call');
              }}
              className="absolute top-0 left-0 right-0 bg-primary text-white py-3 px-4 flex items-center justify-between z-[100] cursor-pointer shadow-lg border-b border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-bold">Call with {selectedChatName}</span>
              </div>
              <span className="font-mono font-bold text-sm">{formatTime(callDuration)}</span>
            </div>
          )}

          {currentScreen === 'friend_profile' && selectedFriend && (
            <FriendProfileScreen 
              friend={selectedFriend}
              socket={socket}
              onlineUsers={onlineUsers}
              onBack={() => setCurrentScreen('chat')}
              onMessage={() => setCurrentScreen('chat')}
              onCall={(type) => startCall(type)}
            />
          )}

          {currentScreen === 'call' && (
            callType === 'video' ? (
              <VideoCall 
                callerName={selectedChatName || "Incoming..."}
                localStream={localStream}
                remoteStream={remoteStream}
                onEndCall={endCall}
                isIncoming={isIncomingCall}
                onAccept={acceptCall}
                onSwitchCamera={switchCamera}
                onToggleScreenShare={toggleScreenShare}
                localVideoRef={localVideoRef}
                remoteVideoRef={remoteVideoRef}
              />
            ) : (
              <AudioCall 
                callerName={selectedChatName || "Incoming..."}
                avatar={selectedChatAvatar}
                onEndCall={endCall}
                isIncoming={isIncomingCall}
                onAccept={acceptCall}
                onMinimize={() => {
                  setIsCallMinimized(true);
                  setCurrentScreen('chat');
                }}
                onSwitchToVideo={switchToVideo}
                localStream={localStream}
                callDuration={callDuration}
                formatTime={formatTime}
                isMuted={isMuted}
                setIsMuted={setIsMuted}
                isSpeakerOn={isSpeakerOn}
                setIsSpeakerOn={setIsSpeakerOn}
              />
            )
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen 
              onBack={() => setCurrentScreen('main')}
            />
          )}

          {currentScreen === 'create_group' && (
            <CreateGroupScreen 
              socket={socket}
              onBack={() => setCurrentScreen('main')}
              onGroupCreated={(groupId) => {
                setSelectedChatId(groupId);
                setCurrentScreen('chat');
              }}
            />
          )}

          {currentScreen === 'group_info' && selectedChatId && (
            <GroupInfoScreen 
              groupId={selectedChatId}
              socket={socket}
              onBack={() => setCurrentScreen('chat')}
              onGroupDeleted={() => {
                setSelectedChatId(null);
                setCurrentScreen('main');
              }}
            />
          )}
        </div>

        {currentScreen === 'main' && (
          <nav className="bg-nav-bg flex items-center justify-around py-3 px-6 z-20">
            <button onClick={() => setActiveTab('chats')} className="flex flex-col items-center gap-1">
              <MessageSquare className={cn("w-6 h-6", activeTab === 'chats' ? "fill-white text-white" : "text-white/70")} />
            </button>
            <button onClick={() => setActiveTab('calls')} className="flex flex-col items-center gap-1">
              <Phone className={cn("w-6 h-6", activeTab === 'calls' ? "fill-white text-white" : "text-white/70")} />
            </button>
            <button onClick={() => setActiveTab('explore')} className="flex flex-col items-center gap-1">
              <Compass className={cn("w-6 h-6", activeTab === 'explore' ? "fill-white text-white" : "text-white/70")} />
            </button>
            <button onClick={() => setActiveTab('contacts')} className="flex flex-col items-center gap-1">
              <Users className={cn("w-6 h-6", activeTab === 'contacts' ? "fill-white text-white" : "text-white/70")} />
            </button>
            <button onClick={() => setCurrentScreen('profile')} className="flex flex-col items-center gap-1">
              <User className={cn("w-6 h-6", currentScreen === 'profile' ? "fill-white text-white" : "text-white/70")} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
