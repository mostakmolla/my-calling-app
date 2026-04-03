import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, Repeat, Monitor, MonitorOff, Camera, Ghost, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface VideoCallProps {
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  onEndCall: () => void;
  callerName: string;
  isIncoming?: boolean;
  onAccept?: () => void;
}

export default function VideoCall({ 
  remoteStream, 
  localStream, 
  onEndCall, 
  callerName,
  isIncoming,
  onAccept
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [showScreenshotFlash, setShowScreenshotFlash] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!isIncoming) {
      const timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isIncoming]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const toggleBlur = () => {
    setIsBlurActive(!isBlurActive);
  };

  const takeScreenshot = () => {
    setShowScreenshotFlash(true);
    setTimeout(() => setShowScreenshotFlash(false), 200);
    // Simulate sending screenshot
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Remote Video (Full Screen) */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isScreenSharing ? (
          <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center text-primary"
            >
              <Monitor className="w-16 h-16 animate-pulse" />
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">You are sharing your screen</h3>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                Other participants can now see your screen and everything you do on your device.
              </p>
            </div>
            <button 
              onClick={toggleScreenShare}
              className="px-8 py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
            >
              Stop Sharing
            </button>
          </div>
        ) : remoteStream ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-4xl text-white font-bold">{callerName[0]}</span>
            </div>
            <p className="text-white text-xl font-medium">{isIncoming ? 'Incoming Video Call...' : 'Calling...'}</p>
          </div>
        )}
      </div>

      {/* Top Bar */}
      <div className="absolute top-10 left-0 right-0 px-6 flex flex-col items-center gap-3 z-20">
        <div className="flex flex-col items-center">
          <h2 className="text-white text-xl font-bold drop-shadow-md">{callerName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-online animate-pulse" />
            <span className="text-white/70 text-xs font-medium uppercase tracking-widest">In Call</span>
          </div>
        </div>
        
        {!isIncoming && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 backdrop-blur-xl px-5 py-2 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-white text-2xl font-mono font-black tracking-tighter drop-shadow-lg">
              {formatDuration(duration)}
            </span>
          </motion.div>
        )}
      </div>

      {/* Local Video (PiP) */}
      <motion.div 
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        className={cn(
          "absolute bottom-32 right-6 w-32 h-44 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 z-30 transition-all duration-300",
          isScreenSharing ? "border-primary ring-4 ring-primary/20 scale-105" : "border-white/20"
        )}
      >
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            isBlurActive && "blur-md scale-110"
          )}
        />
        {isScreenSharing && (
          <div className="absolute top-2 left-2 right-2 bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[8px] font-black text-white text-center uppercase tracking-widest shadow-lg">
            Screen Sharing
          </div>
        )}
        {isBlurActive && !isVideoOff && (
          <div className="absolute bottom-2 right-2 p-1 bg-black/40 backdrop-blur-md rounded-full">
            <Sparkles className="w-3 h-3 text-white/80" />
          </div>
        )}
        {isVideoOff && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-white/50" />
          </div>
        )}
      </motion.div>

      {/* Controls Bar */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-6 z-40 px-6">
        <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-3xl flex items-center gap-4">
          <button 
            onClick={toggleMute}
            className={cn(
              "p-3 rounded-full transition-colors",
              isMuted ? "bg-white text-black" : "bg-white/20 text-white"
            )}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button 
            onClick={toggleVideo}
            className={cn(
              "p-3 rounded-full transition-colors",
              isVideoOff ? "bg-white text-black" : "bg-white/20 text-white"
            )}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button 
            onClick={toggleBlur}
            className={cn(
              "p-3 rounded-full transition-colors",
              isBlurActive ? "bg-white text-black" : "bg-white/20 text-white"
            )}
            title="Toggle Background Blur"
          >
            <Ghost className="w-5 h-5" />
          </button>

          <button 
            onClick={toggleScreenShare}
            className={cn(
              "p-3 rounded-full transition-colors",
              isScreenSharing ? "bg-primary text-white" : "bg-white/20 text-white"
            )}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          <button 
            onClick={takeScreenshot}
            className="p-3 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
          >
            <Camera className="w-5 h-5" />
          </button>

          <button 
            onClick={onEndCall}
            className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Screenshot Flash */}
      <AnimatePresence>
        {showScreenshotFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[100] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Incoming Call Actions */}
      <AnimatePresence>
        {isIncoming && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] p-10 flex flex-col items-center gap-8 z-50 shadow-2xl"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Video className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">Incoming Call from {callerName}</h3>
            </div>
            
            <div className="flex gap-12">
              <button 
                onClick={onEndCall}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg">
                  <PhoneOff className="w-8 h-8" />
                </div>
                <span className="text-sm font-bold text-red-500">Decline</span>
              </button>

              <button 
                onClick={onAccept}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-full bg-online flex items-center justify-center text-white shadow-lg">
                  <Video className="w-8 h-8" />
                </div>
                <span className="text-sm font-bold text-online">Accept</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
