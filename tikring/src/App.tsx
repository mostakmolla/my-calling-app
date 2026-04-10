import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageSquare, Compass, Users, Phone } from 'lucide-react';
import HomeScreen from './components/HomeScreen';
import ChatScreen from './components/ChatScreen';
import VideoCall from './components/VideoCall';
import ProfileScreen from './components/ProfileScreen';
import ContactsScreen from './components/ContactsScreen';
import FriendProfileScreen from './components/FriendProfileScreen';
import CallHistoryScreen from './components/CallHistoryScreen';
import CreateGroupScreen from './components/CreateGroupScreen';
import GroupInfoScreen from './components/GroupInfoScreen';
import { initDB, getChat, Chat, getProfile, saveProfile, addContact, saveMessage, Message, saveCallLog, CallLog, createGroup, Group } from './lib/db';
import { cn } from './lib/utils';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'explore' | 'contacts'>('chats');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'chat' | 'call' | 'profile' | 'friend_profile' | 'create_group' | 'group_info'>('main');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string>('Adam');
  const [selectedChatAvatar, setSelectedChatAvatar] = useState<string>('');
  const [selectedFriend, setSelectedFriend] = useState<Chat | null>(null);
  const [callStartTime, setCallStartTime] = useState<number>(0);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  
  // WebRTC & Socket State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerId, setCallerId] = useState<string | null>(null); // This will store the caller's phone number
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const currentScreenRef = useRef(currentScreen);
  const selectedChatIdRef = useRef(selectedChatId);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    const setup = async () => {
      await initDB();
      let profile = await getProfile();
      
      // Ensure user has a unique phone number for signaling
      if (!profile || !profile.phone) {
        const randomPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const defaultProfile = {
          name: profile?.name || 'User_' + Math.floor(Math.random() * 1000),
          phone: randomPhone,
          avatar: `https://picsum.photos/seed/${randomPhone}/200`,
          status: 'Hey! I am using ConnectMe',
          isPhoneVerified: true
        };
        await saveProfile(defaultProfile);
        profile = defaultProfile;
      }

      const newSocket = io();
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('register', {
          username: profile?.name,
          phone: profile?.phone
        });
      });

      newSocket.on('user_list', (users: any[]) => {
        // Filter out self
        setOnlineUsers(users.filter(u => u.phone !== profile?.phone));
      });

      newSocket.on('friend_request_received', async (fromUser) => {
        // Save the incoming request to the database
        const newContact: Chat = {
          id: `req-${Date.now()}`,
          name: fromUser.name,
          phone: fromUser.phone,
          avatar: fromUser.avatar,
          unreadCount: 1,
          isOnline: true,
          status: 'request_received',
          lastMessage: 'Sent you a friend request',
          lastTimestamp: Date.now(),
        };
        await addContact(newContact);
        
        // Show a notification (simple toast)
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold animate-bounce';
        toast.innerText = `New Friend Request from ${fromUser.name}!`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
      });

      newSocket.on('offer', async ({ from, offer }) => {
        // 'from' is the sender's phone number or socket ID
        setCallerId(from);
        setIsIncomingCall(true);
        
        // Try to find the chat to get the caller's name
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
        
        peerConnection.current = new RTCPeerConnection(STUN_SERVERS);
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      });

    newSocket.on('answer', async ({ answer }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

      newSocket.on('ice_candidate', async ({ candidate }) => {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      newSocket.on('group_invitation', async (group: Group) => {
        await createGroup(group);
        newSocket.emit('join_group', group.id);
        
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold animate-bounce';
        toast.innerText = `You were added to group: ${group.name}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
      });

      newSocket.on('receive_message', async (data: { from: string, message: Message, senderPhone?: string }) => {
        // Check if chat exists
        let chat = await getChat(data.from);
        if (!chat) {
          // If it's a group message and we don't have the group, we might need to fetch it (simplified here)
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

        // Save the message to DB
        const receivedMessage = {
          ...data.message,
          chatId: data.from, 
          senderId: data.senderPhone || 'other' 
        };
        await saveMessage(receivedMessage);

        // Show notification if not on chat screen for this user
        if (currentScreenRef.current !== 'chat' || selectedChatIdRef.current !== data.from) {
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold animate-bounce';
          toast.innerText = `New message from ${chat?.name || data.from}`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        }
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
      setSelectedChatId(id);
      setSelectedChatName(chat?.name || "User");
      setSelectedChatAvatar(chat?.avatar || "");
      setCallType(type);
      setCallStartTime(Date.now());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { facingMode: cameraFacingMode } : false,
        audio: true,
      });
      setLocalStream(stream);
      setCurrentScreen('call');

      peerConnection.current = new RTCPeerConnection(STUN_SERVERS);
      
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });

      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socket && id) {
          socket.emit('ice_candidate', { to: id, candidate: event.candidate });
        }
      };

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      if (socket && id) {
        socket.emit('offer', { to: id, offer });
      }
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: cameraFacingMode }, 
        audio: true 
      });
      setLocalStream(stream);
      setIsIncomingCall(false);

      if (!peerConnection.current) return;

      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });

      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socket && callerId) {
          socket.emit('ice_candidate', { to: callerId, candidate: event.candidate });
        }
      };

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      if (socket && callerId) {
        socket.emit('answer', { to: callerId, answer });
      }
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  };

  const endCall = async () => {
    const duration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
    
    // Save call log
    if (selectedChatId) {
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

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsIncomingCall(false);
    setCameraFacingMode('user');
    setCallStartTime(0);
    setCurrentScreen('main');
  };

  const toggleScreenShare = async (isSharing: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isSharing && (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia)) {
        return { success: false, error: 'NotSupported' };
      }

      let newStream: MediaStream;
      if (isSharing) {
        newStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: false // Explicitly disable audio for better mobile compatibility
        });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacingMode },
          audio: true
        });
      }

      const videoTrack = newStream.getVideoTracks()[0];
      const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
      
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
      if (err.name === 'NotAllowedError') {
        return { success: false, error: 'PermissionDenied' };
      }
      if (err.name === 'NotFoundError' || err.name === 'NotSupportedError') {
        return { success: false, error: 'NotSupported' };
      }
      return { success: false, error: 'Unknown' };
    }
  };

  const switchCamera = async () => {
    if (!localStream) return;
    
    try {
      // Check if the device has multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length < 2) {
        console.warn('Only one camera detected. Camera switching may not be possible.');
        // We still try to toggle facing mode as some browsers might handle it differently
      }

      const newFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: newFacingMode } 
        },
        audio: true
      }).catch(async () => {
        // Fallback if 'exact' fails
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
          audio: true
        });
      });

      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];
      
      // Update peer connection
      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        const audioSender = senders.find(s => s.track?.kind === 'audio');
        
        if (videoSender && videoTrack) {
          await videoSender.replaceTrack(videoTrack);
        }
        if (audioSender && audioTrack) {
          await audioSender.replaceTrack(audioTrack);
        }
      }

      // Stop old tracks
      localStream.getTracks().forEach(track => track.stop());
      
      setLocalStream(newStream);
      setCameraFacingMode(newFacingMode);
      
      console.log(`Switched to ${newFacingMode} camera`);
    } catch (err) {
      console.error('Error switching camera:', err);
      // Try to fallback to any camera if specific facing mode fails
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(fallbackStream);
      } catch (fallbackErr) {
        console.error('Fallback camera access failed:', fallbackErr);
      }
    }
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'chats':
        return (
          <HomeScreen 
            socket={socket}
            onlineUsers={onlineUsers}
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

          {currentScreen === 'friend_profile' && selectedFriend && (
            <FriendProfileScreen 
              friend={selectedFriend}
              socket={socket}
              onBack={() => setCurrentScreen('chat')}
              onMessage={() => setCurrentScreen('chat')}
              onCall={(type) => startCall(type)}
            />
          )}

          {currentScreen === 'call' && (
            <VideoCall 
              callerName={selectedChatName || "Incoming..."}
              localStream={localStream}
              remoteStream={remoteStream}
              onEndCall={endCall}
              isIncoming={isIncomingCall}
              onAccept={acceptCall}
              onSwitchCamera={switchCamera}
              onToggleScreenShare={toggleScreenShare}
            />
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

        {/* Bottom Navigation Bar - Only visible on main screen */}
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
          </nav>
        )}
      </div>
    </div>
  );
}
