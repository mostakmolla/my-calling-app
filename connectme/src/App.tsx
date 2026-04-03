import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageSquare, Compass, Users } from 'lucide-react';
import HomeScreen from './components/HomeScreen';
import ChatScreen from './components/ChatScreen';
import VideoCall from './components/VideoCall';
import ProfileScreen from './components/ProfileScreen';
import ContactsScreen from './components/ContactsScreen';
import FriendProfileScreen from './components/FriendProfileScreen';
import { initDB, getChat, Chat } from './lib/db';
import { cn } from './lib/utils';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'chats' | 'explore' | 'contacts'>('chats');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'chat' | 'call' | 'profile' | 'friend_profile'>('main');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string>('Adam');
  const [selectedFriend, setSelectedFriend] = useState<Chat | null>(null);
  
  // WebRTC & Socket State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerId, setCallerId] = useState<string | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    initDB();
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('register', 'User_' + Math.floor(Math.random() * 1000));
    });

    newSocket.on('offer', async ({ from, offer }) => {
      setCallerId(from);
      setIsIncomingCall(true);
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

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const startCall = async (type: 'video' | 'audio') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
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
        if (event.candidate && socket) {
          socket.emit('ice_candidate', { to: 'broadcast_or_target', candidate: event.candidate });
        }
      };

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      if (socket) {
        socket.emit('offer', { to: 'target_id', offer });
      }
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

  const endCall = () => {
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
    setCurrentScreen('main');
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'chats':
        return (
          <HomeScreen 
            onChatSelect={async (id) => {
              setSelectedChatId(id);
              const chat = await getChat(id);
              if (chat) setSelectedChatName(chat.name);
              setCurrentScreen('chat');
            }}
            onCallSelect={(id, type) => startCall(type)}
            onProfileOpen={() => setCurrentScreen('profile')}
          />
        );
      case 'contacts':
        return (
          <ContactsScreen 
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
              onBack={() => setCurrentScreen('main')}
              onCall={(type) => startCall(type)}
              onViewProfile={async () => {
                const chat = await getChat(selectedChatId);
                if (chat) {
                  setSelectedFriend(chat);
                  setCurrentScreen('friend_profile');
                }
              }}
            />
          )}

          {currentScreen === 'friend_profile' && selectedFriend && (
            <FriendProfileScreen 
              friend={selectedFriend}
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
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen 
              onBack={() => setCurrentScreen('main')}
            />
          )}
        </div>

        {/* Bottom Navigation Bar - Only visible on main screen */}
        {currentScreen === 'main' && (
          <nav className="bg-nav-bg flex items-center justify-around py-3 px-6 z-20">
            <button onClick={() => setActiveTab('chats')} className="flex flex-col items-center gap-1">
              <MessageSquare className={cn("w-6 h-6", activeTab === 'chats' ? "fill-white text-white" : "text-white/70")} />
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
