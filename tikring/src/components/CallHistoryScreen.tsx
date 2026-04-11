import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, Video, Trash2, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CallLog, getCallLogs, deleteCallLog } from '@/src/lib/db';
import { cn } from '@/src/lib/utils';

interface CallHistoryScreenProps {
  onBack: () => void;
  onCall: (chatId: string, type: 'video' | 'audio') => void;
}

export default function CallHistoryScreen({ onBack, onCall }: CallHistoryScreenProps) {
  const [calls, setCalls] = useState<CallLog[]>([]);

  useEffect(() => {
    const fetchCalls = async () => {
      const logs = await getCallLogs();
      // Sort by timestamp descending
      setCalls(logs.sort((a, b) => b.timestamp - a.timestamp));
    };
    fetchCalls();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteCallLog(id);
    setCalls(prev => prev.filter(c => c.id !== id));
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getCallIcon = (direction: string) => {
    switch (direction) {
      case 'incoming': return <PhoneIncoming className="w-3 h-3 text-green-500" />;
      case 'outgoing': return <PhoneOutgoing className="w-3 h-3 text-blue-500" />;
      case 'missed': return <PhoneMissed className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-4 border-b border-gray-100 bg-white shadow-sm">
        <button onClick={onBack} className="p-1 hover:bg-surface rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h2 className="text-xl font-bold text-text-primary">Call History</h2>
      </header>

      <div className="flex-1 overflow-y-auto">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary p-8 text-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 opacity-20" />
            </div>
            <p className="font-medium">No call history yet</p>
            <p className="text-xs mt-1">Your recent calls will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence initial={false}>
              {calls.map((call) => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-4 hover:bg-surface/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img 
                        src={call.callerAvatar || `https://picsum.photos/seed/${call.chatId}/100`} 
                        alt={call.callerName}
                        className="w-12 h-12 rounded-full object-cover shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                        {call.type === 'video' ? (
                          <Video className="w-3 h-3 text-primary" />
                        ) : (
                          <Phone className="w-3 h-3 text-primary" />
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className={cn(
                        "text-sm font-bold",
                        call.direction === 'missed' ? "text-red-500" : "text-text-primary"
                      )}>
                        {call.callerName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {getCallIcon(call.direction)}
                        <span className="text-[10px] text-text-secondary font-medium">
                          {call.direction.charAt(0).toUpperCase() + call.direction.slice(1)}
                          {call.duration > 0 && ` • ${formatDuration(call.duration)}`}
                          {` • ${formatTimestamp(call.timestamp)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onCall(call.chatId, call.type)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                    >
                      {call.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(call.id)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
