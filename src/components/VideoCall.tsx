import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Volume2, Repeat, Monitor, MonitorOff, Camera, Ghost, Sparkles, X, Compass, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="group relative flex flex-col items-center">
      {children}
      <div className="absolute bottom-full mb-2 px-2 py-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/10 whitespace-nowrap z-[60] pointer-events-none shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
        {text}
      </div>
    </div>
  );
}

interface VideoCallProps {
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  onEndCall: () => void;
  callerName: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onSwitchCamera?: () => void;
  onToggleScreenShare?: (isSharing: boolean) => Promise<{ success: boolean; error?: string }>;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  callConnected?: boolean;
}

export default function VideoCall({ 
  remoteStream, 
  localStream, 
  onEndCall, 
  callerName,
  isIncoming,
  onAccept,
  onSwitchCamera,
  onToggleScreenShare,
  localVideoRef: externalLocalVideoRef,
  remoteVideoRef: externalRemoteVideoRef,
  callConnected
}: VideoCallProps) {
  const internalLocalVideoRef = useRef<HTMLVideoElement>(null);
  const internalRemoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const localVideoRef = externalLocalVideoRef || internalLocalVideoRef;
  const remoteVideoRef = externalRemoteVideoRef || internalRemoteVideoRef;
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [virtualBackground, setVirtualBackground] = useState<'none' | 'blur' | 'studio' | 'office' | 'beach'>('none');
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showScreenshotFlash, setShowScreenshotFlash] = useState(false);
  const [isSelfTest, setIsSelfTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [layout, setLayout] = useState<'pip' | 'grid'>('pip');

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      if (isSelfTest && localStream) {
        remoteVideoRef.current.srcObject = localStream;
        remoteVideoRef.current.muted = false; // Unmute so they can hear themselves
      } else if (remoteStream) {
        console.log('📺 Setting remote stream to video element');
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.play().catch(err => {
          console.warn('⚠️ Video play failed:', err);
        });
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream, isSelfTest, localStream]);

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

  const toggleLayout = () => {
    setLayout(prev => prev === 'pip' ? 'grid' : 'pip');
  };

  if (isIncoming) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center gap-12 px-6 font-sans">
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-[#F0F0FF] flex items-center justify-center shadow-sm">
            <Video className="w-12 h-12 text-[#5B51D8]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1C2E] text-center">Incoming Call from {callerName}</h2>
        </div>

        <div className="flex gap-12">
          <button 
            onClick={onEndCall}
            className="flex flex-col items-center gap-3"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="w-16 h-16 rounded-full bg-[#FF4B4B] flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
              <PhoneOff className="w-8 h-8" />
            </div>
            <span className="text-sm font-bold text-[#FF4B4B]">Decline</span>
          </button>

          <button 
            onClick={onAccept}
            className="flex flex-col items-center gap-3"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="w-16 h-16 rounded-full bg-[#4CAF50] flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
              <Phone className="w-8 h-8" />
            </div>
            <span className="text-sm font-bold text-[#4CAF50]">Accept</span>
          </button>
        </div>
      </div>
    );
  }

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

      {/* Video Feeds */}
      <div className={cn(
        "absolute inset-0 transition-all duration-500",
        layout === 'grid' ? "flex flex-col sm:flex-row" : "flex items-center justify-center"
      )}>
        {/* Remote Video */}
        <div className={cn(
          "relative transition-all duration-500 overflow-hidden",
          layout === 'grid' ? "flex-1 h-1/2 sm:h-full border-b sm:border-b-0 sm:border-r border-white/10" : "absolute inset-0"
        )}>
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
                  Other participants can now see your screen.
                </p>
              </div>
              <button 
                onClick={toggleScreenShare}
                className="px-8 py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
                style={{ touchAction: 'manipulation' }}
              >
                Stop Sharing
              </button>
            </div>
          ) : (remoteStream || isSelfTest) ? (
            <div className="relative w-full h-full">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  {isSelfTest ? 'Self View' : 'Live'}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 z-30 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                <span className="text-xs font-bold text-white">{callerName}</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 gap-4">
              <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
                <span className="text-3xl text-white font-bold">{callerName[0]}</span>
              </div>
              <p className="text-white/60 text-sm font-medium">Waiting for video...</p>
            </div>
          )}
        </div>

        {/* Local Video (PiP or Grid Part) */}
        <motion.div 
          layout
          drag={layout === 'pip'}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          className={cn(
            "transition-all duration-500 overflow-hidden z-30",
            layout === 'pip' ? (
              "absolute bottom-24 right-4 sm:bottom-32 sm:right-6 w-24 h-32 sm:w-32 sm:h-44 bg-gray-900 rounded-xl shadow-2xl border-2"
            ) : (
              "flex-1 h-1/2 sm:h-full bg-gray-900 border-t sm:border-t-0 sm:border-l border-white/10"
            ),
            isScreenSharing ? "border-primary ring-4 ring-primary/20" : 
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
          <div className="absolute bottom-4 left-4 z-30 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
            <span className="text-xs font-bold text-white">You</span>
          </div>
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
              <VideoOff className="w-8 h-8 text-white/50" />
            </div>
          )}
        </motion.div>
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 flex justify-center items-center z-40 px-4 sm:px-6">
        <div className="bg-black/40 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 rounded-2xl sm:rounded-3xl flex items-center gap-2 sm:gap-4">
          <Tooltip text={isMuted ? "Unmute Mic" : "Mute Mic"}>
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={toggleMute}
                className={cn(
                  "p-2.5 sm:p-3 rounded-full transition-colors",
                  isMuted ? "bg-white text-black" : "bg-white/20 text-white"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Mic</span>
            </div>
          </Tooltip>

          <Tooltip text={isVideoOff ? "Turn Video On" : "Turn Video Off"}>
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={toggleVideo}
                className={cn(
                  "p-2.5 sm:p-3 rounded-full transition-colors",
                  isVideoOff ? "bg-white text-black" : "bg-white/20 text-white"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Video</span>
            </div>
          </Tooltip>

          <Tooltip text="Virtual Backgrounds">
            <div className="relative">
              <button 
                onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
                className={cn(
                  "p-2.5 sm:p-3 rounded-full transition-colors",
                  virtualBackground !== 'none' ? "bg-white text-black" : "bg-white/20 text-white"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
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
                        style={{ touchAction: 'manipulation' }}
                      >
                        {bg.icon}
                        {bg.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Tooltip>

          <Tooltip text="Toggle Layout">
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={toggleLayout}
                className={cn(
                  "p-2.5 sm:p-3 rounded-full transition-colors",
                  layout === 'grid' ? "bg-white text-black" : "bg-white/20 text-white"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Layout</span>
            </div>
          </Tooltip>

          <Tooltip text="Switch Camera">
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={handleSwitchCamera}
                className="p-2.5 sm:p-3 rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                style={{ touchAction: 'manipulation' }}
              >
                <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Flip</span>
            </div>
          </Tooltip>

          <Tooltip text="More Tools">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowToolsMenu(!showToolsMenu);
                  setShowBackgroundMenu(false);
                }}
                className={cn(
                  "p-2.5 sm:p-3 rounded-full transition-colors",
                  (isScreenSharing || showToolsMenu) ? "bg-white text-black" : "bg-white/20 text-white"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
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
                      style={{ touchAction: 'manipulation' }}
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
                      style={{ touchAction: 'manipulation' }}
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
                      style={{ touchAction: 'manipulation' }}
                    >
                      <Repeat className="w-4 h-4" />
                      Switch Camera
                    </button>
  
                    <button 
                      onClick={() => {
                        setIsSelfTest(!isSelfTest);
                        setShowToolsMenu(false);
                        if (!isSelfTest) {
                          setError("Self Test Mode: You can now see and hear yourself.");
                        } else {
                          setError("Self Test Mode Disabled.");
                        }
                        setTimeout(() => setError(null), 3000);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors",
                        isSelfTest ? "bg-primary text-white" : "text-white/70 hover:bg-white/10"
                      )}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <Volume2 className="w-4 h-4" />
                      {isSelfTest ? 'Stop Self Test' : 'Self Test Call'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Tooltip>

          <Tooltip text="End Call">
            <button 
              onClick={onEndCall}
              className="p-2.5 sm:p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
              style={{ touchAction: 'manipulation' }}
            >
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </Tooltip>
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
    </div>
  );
}
