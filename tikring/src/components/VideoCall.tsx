import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, Repeat, Monitor, MonitorOff, Camera, Ghost, Sparkles, X, Compass, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface VideoCallProps {
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  onEndCall: () => void;
  callerName: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onSwitchCamera?: () => void;
  onToggleScreenShare?: (isSharing: boolean) => Promise<{ success: boolean; error?: string }>;
}

export default function VideoCall({ 
  remoteStream, 
  localStream, 
  onEndCall, 
  callerName,
  isIncoming,
  onAccept,
  onSwitchCamera,
  onToggleScreenShare
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [virtualBackground, setVirtualBackground] = useState<'none' | 'blur' | 'studio' | 'office' | 'beach'>('none');
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showScreenshotFlash, setShowScreenshotFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const toggleScreenShare = async () => {
    const nextSharing = !isScreenSharing;
    if (onToggleScreenShare) {
      const result = await onToggleScreenShare(nextSharing);
      if (result.success) {
        setIsScreenSharing(nextSharing);
      } else {
        if (result.error === 'NotSupported') {
          setError("Screen sharing is not supported on this browser or device. Mobile browsers often restrict this feature.");
        } else if (result.error === 'PermissionDenied') {
          setError("Screen share permission was denied. Please allow access in the browser's dialog.");
        } else {
          setError("Failed to start screen sharing. Please try again.");
        }
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const toggleBlur = () => {
    setVirtualBackground(prev => prev === 'blur' ? 'none' : 'blur');
    setIsBlurActive(prev => !prev);
  };

  const selectBackground = (bg: 'none' | 'blur' | 'studio' | 'office' | 'beach') => {
    setVirtualBackground(bg);
    setIsBlurActive(bg !== 'none');
    setShowBackgroundMenu(false);
  };

  const handleSwitchCamera = () => {
    if (onSwitchCamera) {
      onSwitchCamera();
      setError("Switching camera...");
      setTimeout(() => setError(null), 2000);
    }
  };

  const takeScreenshot = () => {
    setShowScreenshotFlash(true);
    setTimeout(() => setShowScreenshotFlash(false), 200);
    
    try {
      const video = remoteVideoRef.current || localVideoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw the video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to data URL and download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `TikRing-Screenshot-${new Date().getTime()}.png`;
      link.click();

      setError("Screenshot saved to your device!");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Failed to take screenshot:', err);
      setError("Failed to save screenshot.");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-24 left-4 right-4 bg-red-500/95 backdrop-blur-xl text-white p-4 rounded-2xl text-center text-sm font-bold z-[70] shadow-2xl border border-white/20 flex flex-col items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <X className="w-4 h-4" />
            </div>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

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
          isScreenSharing ? "border-primary ring-4 ring-primary/20 scale-105" : 
          (isMuted || isVideoOff) ? "border-red-500 ring-4 ring-red-500/20" : "border-white/20"
        )}
      >
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            virtualBackground === 'blur' && "blur-xl scale-110",
            virtualBackground === 'studio' && "brightness-125 contrast-110 saturate-110",
            (virtualBackground === 'office' || virtualBackground === 'beach') && "opacity-40"
          )}
        />
        {virtualBackground === 'studio' && !isVideoOff && (
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-yellow-500/10 mix-blend-overlay pointer-events-none" />
        )}
        {(virtualBackground === 'office' || virtualBackground === 'beach') && !isVideoOff && (
          <div className="absolute inset-0 z-[-1] bg-gray-900">
            <img 
              src={virtualBackground === 'office' ? "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80" : "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"} 
              className="w-full h-full object-cover blur-sm opacity-80"
              alt="Background"
            />
          </div>
        )}
        {isBlurActive && !isVideoOff && (
          <div className="absolute inset-0 bg-primary/5 backdrop-blur-[2px] pointer-events-none" />
        )}
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

          <div className="relative">
            <button 
              onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
              className={cn(
                "p-3 rounded-full transition-colors",
                virtualBackground !== 'none' ? "bg-white text-black" : "bg-white/20 text-white"
              )}
              title="Virtual Backgrounds"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showBackgroundMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: -10, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex flex-col gap-1 min-w-[120px] shadow-2xl z-50"
                >
                  {[
                    { id: 'none', label: 'None', icon: <X className="w-4 h-4" /> },
                    { id: 'blur', label: 'Blur', icon: <Ghost className="w-4 h-4" /> },
                    { id: 'studio', label: 'Studio', icon: <Sparkles className="w-4 h-4" /> },
                    { id: 'office', label: 'Office', icon: <Monitor className="w-4 h-4" /> },
                    { id: 'beach', label: 'Beach', icon: <Compass className="w-4 h-4" /> },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => selectBackground(bg.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors",
                        virtualBackground === bg.id ? "bg-primary text-white" : "text-white/70 hover:bg-white/10"
                      )}
                    >
                      {bg.icon}
                      {bg.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => {
                setShowToolsMenu(!showToolsMenu);
                setShowBackgroundMenu(false);
              }}
              className={cn(
                "p-3 rounded-full transition-colors",
                (isScreenSharing || showToolsMenu) ? "bg-white text-black" : "bg-white/20 text-white"
              )}
              title="Tools"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showToolsMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: -10, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex flex-col gap-1 min-w-[140px] shadow-2xl z-50"
                >
                  <button 
                    onClick={() => {
                      toggleScreenShare();
                      setShowToolsMenu(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors",
                      isScreenSharing ? "bg-primary text-white" : "text-white/70 hover:bg-white/10"
                    )}
                  >
                    {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                    {isScreenSharing ? 'Stop Sharing' : 'Screen Share'}
                  </button>

                  <button 
                    onClick={() => {
                      takeScreenshot();
                      setShowToolsMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:bg-white/10 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Screenshot
                  </button>

                  <button 
                    onClick={() => {
                      handleSwitchCamera();
                      setShowToolsMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:bg-white/10 transition-colors"
                  >
                    <Repeat className="w-4 h-4" />
                    Switch Camera
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
