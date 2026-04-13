import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Check, Search, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getChats, Chat, createGroup, Group, getProfile } from '@/src/lib/db';

interface CreateGroupScreenProps {
  onBack: () => void;
  onGroupCreated: (groupId: string) => void;
  socket: any;
}

export default function CreateGroupScreen({ onBack, onGroupCreated, socket }: CreateGroupScreenProps) {
  const [contacts, setContacts] = useState<Chat[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1: Select members, 2: Group info

  useEffect(() => {
    const fetchContacts = async () => {
      const allChats = await getChats();
      // Only individual chats that are friends
      setContacts(allChats.filter(c => c.type === 'individual' && c.status === 'friend'));
    };
    fetchContacts();
  }, []);

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    const profile = await getProfile();
    const groupId = `group-${Date.now()}`;
    
    const newGroup: Group = {
      id: groupId,
      name: groupName,
      avatar: `https://picsum.photos/seed/${groupId}/200`,
      description: groupDescription,
      members: [...selectedContacts, profile?.phone || 'me'],
      admins: [profile?.phone || 'me'],
      createdBy: profile?.phone || 'me',
      createdAt: Date.now(),
    };

    await createGroup(newGroup);

    // Notify members via socket if possible
    if (socket) {
      selectedContacts.forEach(phone => {
        socket.emit('group_invitation', { to: phone, group: newGroup });
      });
    }

    onGroupCreated(groupId);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone?.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={step === 1 ? onBack : () => setStep(1)} style={{ touchAction: 'manipulation' }}>
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              {step === 1 ? 'New Group' : 'Group Info'}
            </h3>
            <p className="text-[10px] text-text-secondary">
              {step === 1 ? `${selectedContacts.length} members selected` : 'Provide group details'}
            </p>
          </div>
        </div>
        {step === 1 && selectedContacts.length > 0 && (
          <button 
            onClick={() => setStep(2)}
            className="text-primary font-bold text-sm"
            style={{ touchAction: 'manipulation' }}
          >
            Next
          </button>
        )}
        {step === 2 && (
          <button 
            onClick={handleCreateGroup}
            disabled={!groupName.trim()}
            className={cn(
              "font-bold text-sm transition-colors",
              groupName.trim() ? "text-primary" : "text-gray-300"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            Create
          </button>
        )}
      </header>

      {step === 1 ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input 
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Selected Members horizontal list */}
          <AnimatePresence>
            {selectedContacts.length > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4 flex gap-3 overflow-x-auto no-scrollbar border-b border-gray-50"
              >
                {selectedContacts.map(id => {
                  const contact = contacts.find(c => c.id === id);
                  return (
                    <div key={id} className="flex flex-col items-center gap-1 flex-shrink-0 relative">
                      <img 
                        src={contact?.avatar} 
                        className="w-12 h-12 rounded-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => toggleContact(id)}
                        className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full p-0.5 border-2 border-white"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-text-secondary truncate w-12 text-center">
                        {contact?.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.map(contact => (
              <div 
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className="flex items-center px-4 py-3 hover:bg-surface transition-colors cursor-pointer border-b border-gray-50"
              >
                <div className="relative">
                  <img 
                    src={contact.avatar} 
                    className="w-12 h-12 rounded-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  {selectedContacts.includes(contact.id) && (
                    <div className="absolute bottom-0 right-0 bg-primary rounded-full p-0.5 border-2 border-white">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-sm font-bold text-text-primary">{contact.name}</h4>
                  <p className="text-xs text-text-secondary">{contact.phone}</p>
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Users className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-text-secondary font-medium">No contacts found</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-surface flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-primary transition-colors overflow-hidden">
                <Camera className="w-8 h-8 text-text-secondary group-hover:text-primary transition-colors" />
              </div>
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-2 border-4 border-white shadow-lg">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-xs text-text-secondary font-medium">Tap to change group icon</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Group Name</label>
              <input 
                type="text"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Description (Optional)</label>
              <textarea 
                placeholder="What is this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          <div className="pt-4">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1 mb-3">
              Members: {selectedContacts.length + 1}
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map(id => {
                const contact = contacts.find(c => c.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 bg-surface rounded-full pl-1 pr-3 py-1 border border-gray-100">
                    <img src={contact?.avatar} className="w-6 h-6 rounded-full object-cover" />
                    <span className="text-xs font-medium text-text-primary">{contact?.name}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 bg-primary/10 rounded-full pl-1 pr-3 py-1 border border-primary/20">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">You</div>
                <span className="text-xs font-bold text-primary">Admin</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
