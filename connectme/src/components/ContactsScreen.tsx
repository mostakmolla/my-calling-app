import React, { useState, useEffect } from 'react';
import { Search, Filter, UserPlus, Users, Grid, List, ArrowLeft, X, Check, Save, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getChats, Chat, addContact, createGroup } from '@/src/lib/db';

interface ContactsScreenProps {
  onContactSelect: (contactId: string) => void;
  onViewProfile: (contactId: string) => void;
  onBack: () => void;
}

export default function ContactsScreen({ onContactSelect, onViewProfile, onBack }: ContactsScreenProps) {
  const [contacts, setContacts] = useState<Chat[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  
  // New Contact Form
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  
  // Create Group Form
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const allChats = await getChats();
    setContacts(allChats);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddContact = async () => {
    if (!newContactName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const contact: Chat = {
        id: Date.now().toString(),
        name: newContactName,
        phone: newContactPhone,
        avatar: `https://picsum.photos/seed/${Math.random()}/100`,
        lastMessage: 'New contact added',
        lastTimestamp: Date.now(),
        unreadCount: 0,
        isOnline: Math.random() > 0.5,
      };
      await addContact(contact);
      
      // Success feedback
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-xl z-[100] font-bold animate-bounce';
      successMsg.innerText = 'Contact Added Successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);

      setIsNewContactModalOpen(false);
      setNewContactName('');
      setNewContactPhone('');
      await fetchContacts();
    } catch (error) {
      console.error('Failed to add contact:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    console.log('Attempting to create group:', { groupName, selectedContacts });
    if (!groupName.trim() || selectedContacts.length === 0 || isCreating) return;

    setIsCreating(true);
    try {
      const group = {
        id: 'group_' + Date.now(),
        name: groupName,
        avatar: `https://picsum.photos/seed/group_${Date.now()}/100`,
        members: selectedContacts,
        createdAt: Date.now(),
      };
      
      console.log('Saving group to DB...', group);
      await createGroup(group);
      console.log('Group created successfully');
      
      // Show success feedback
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-xl z-[100] font-bold animate-bounce';
      successMsg.innerText = 'Group Created Successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);

      setIsCreateGroupModalOpen(false);
      setGroupName('');
      setSelectedContacts([]);
      await fetchContacts();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleContactSelection = (id: string) => {
    console.log('Toggling contact selection:', id);
    setSelectedContacts(prev => {
      const isSelected = prev.includes(id);
      const next = isSelected ? prev.filter(i => i !== id) : [...prev, id];
      console.log('New selected contacts:', next);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="px-4 py-4 border-b border-gray-100 bg-white">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h2 className="text-xl font-bold text-primary">Contacts</h2>
          <div className="flex gap-3">
            <Search className="w-6 h-6 text-primary cursor-pointer" />
            <Filter className="w-6 h-6 text-primary cursor-pointer" />
          </div>
        </div>

          <div className="flex gap-3">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsNewContactModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-primary/20 rounded-xl text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              New Contact
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary rounded-xl text-white font-bold text-sm shadow-lg shadow-primary/20"
            >
              <Users className="w-4 h-4" />
              Create Group
            </motion.button>
          </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="bg-surface rounded-xl px-4 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-text-primary"
          />
          <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
            {viewMode === 'list' ? <Grid className="w-4 h-4 text-primary" /> : <List className="w-4 h-4 text-primary" />}
          </button>
        </div>
      </div>

      {/* Contact List */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4",
        viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "space-y-4"
      )}>
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center">
              <UserPlus className="w-10 h-10 text-primary/40" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary">No contacts found</h3>
              <p className="text-sm text-text-secondary mt-1">Add a new contact to start chatting or create a group.</p>
            </div>
            <button 
              onClick={() => setIsNewContactModalOpen(true)}
              className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
            >
              Add Contact
            </button>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div 
              key={`contact-list-${contact.id}`}
              onClick={() => onContactSelect(contact.id)}
              className={cn(
                "cursor-pointer transition-all active:scale-95",
                viewMode === 'grid' 
                  ? "bg-surface rounded-2xl p-4 flex flex-col items-center text-center gap-2 shadow-sm" 
                  : "flex items-center gap-4 p-2 hover:bg-surface rounded-xl"
              )}
            >
              <div 
                className="relative"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(contact.id);
                }}
              >
                <img 
                  src={contact.avatar} 
                  alt={contact.name} 
                  className={cn(
                    "rounded-full object-cover border-2 border-white shadow-sm hover:scale-110 transition-transform",
                    viewMode === 'grid' ? "w-20 h-20" : "w-12 h-12"
                  )}
                  referrerPolicy="no-referrer"
                />
                {contact.isOnline && (
                  <div className={cn(
                    "absolute bottom-0 right-0 bg-online rounded-full border-2 border-white",
                    viewMode === 'grid' ? "w-4 h-4" : "w-3 h-3"
                  )} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className={cn(
                  "font-bold text-text-primary truncate",
                  viewMode === 'grid' ? "text-base" : "text-sm"
                )}>
                  {contact.name}
                </h3>
                {viewMode === 'list' && (
                  <p className="text-[10px] text-online font-medium">
                    {contact.isOnline ? 'Online' : 'Offline'}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Contact Modal */}
      <AnimatePresence>
        {isNewContactModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-primary">Add New Contact</h3>
                <button onClick={() => setIsNewContactModalOpen(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Name</label>
                  <input 
                    type="text" 
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-surface rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Phone Number</label>
                  <input 
                    type="tel" 
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+1 234 567 890"
                    className="w-full bg-surface rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <motion.button 
                  whileHover={!newContactName.trim() ? {} : { scale: 1.01 }}
                  whileTap={!newContactName.trim() ? {} : { scale: 0.98 }}
                  onClick={handleAddContact}
                  disabled={!newContactName.trim()}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg",
                    !newContactName.trim() 
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" 
                      : "bg-primary text-white hover:bg-primary/90 shadow-primary/25"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    !newContactName.trim() ? "bg-gray-200" : "bg-white/20"
                  )}>
                    <Save className="w-5 h-5" />
                  </div>
                  <span className="text-base tracking-wide">Save Contact</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreateGroupModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-primary">Create New Group</h3>
                <button onClick={() => setIsCreateGroupModalOpen(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                    <Camera className="w-8 h-8 text-text-secondary" />
                  </div>
                  <input 
                    type="text" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group Name"
                    className="w-full text-center bg-transparent border-b-2 border-primary/20 focus:border-primary focus:outline-none py-2 font-bold text-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase">Select Members</label>
                  <div className="space-y-2">
                    {contacts.filter(c => c.type !== 'group').map(contact => (
                      <div 
                        key={`group-member-${contact.id}`}
                        onClick={() => toggleContactSelection(contact.id)}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer",
                          selectedContacts.includes(contact.id) ? "bg-primary/10" : "hover:bg-surface"
                        )}
                      >
                        <img src={contact.avatar} className="w-10 h-10 rounded-full" />
                        <span className="flex-1 font-medium text-sm">{contact.name}</span>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          selectedContacts.includes(contact.id) ? "bg-primary border-primary" : "border-gray-200"
                        )}>
                          {selectedContacts.includes(contact.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    ))}
                    {contacts.filter(c => c.type !== 'group').length === 0 && (
                      <p className="text-center text-text-secondary text-sm py-4">No contacts available to add.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <motion.button 
                  whileHover={(!groupName.trim() || selectedContacts.length === 0 || isCreating) ? {} : { scale: 1.01 }}
                  whileTap={(!groupName.trim() || selectedContacts.length === 0 || isCreating) ? {} : { scale: 0.98 }}
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedContacts.length === 0 || isCreating}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg",
                    (!groupName.trim() || selectedContacts.length === 0 || isCreating) 
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" 
                      : "bg-primary text-white hover:bg-primary/90 shadow-primary/25"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    (!groupName.trim() || selectedContacts.length === 0 || isCreating) ? "bg-gray-200" : "bg-white/20"
                  )}>
                    {isCreating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-base tracking-wide">
                    {isCreating 
                      ? "Creating Group..." 
                      : selectedContacts.length === 0 
                        ? "Select Members" 
                        : !groupName.trim() 
                          ? "Enter Group Name" 
                          : `Create Group (${selectedContacts.length})`}
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
