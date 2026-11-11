import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, UserPlus, Users, Grid, List, ArrowLeft, X, Check, Save, Camera, QrCode, RefreshCw, User } from 'lucide-react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getChats, Chat, addContact, createGroup, deleteContact, blockContact, unblockContact, updateContactStatus, getProfile } from '@/src/lib/db';
import { Trash2, ShieldAlert, UserPlus2, Clock, CheckCircle2, RotateCcw, Camera as CameraIcon } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface ContactsScreenProps {
  onContactSelect: (contactId: string) => void;
  onViewProfile: (contactId: string) => void;
  onBack: () => void;
  socket: Socket | null;
  onlineUsers?: any[];
}

export default function ContactsScreen({ onContactSelect, onViewProfile, onBack, socket, onlineUsers = [] }: ContactsScreenProps) {
  const [contacts, setContacts] = useState<Chat[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [isSyncing, setIsSyncing] = useState(false);
  const [scannedUser, setScannedUser] = useState<any>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  
  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'block' | 'unblock';
    contactId: string;
    contactName: string;
  }>({ isOpen: false, type: 'delete', contactId: '', contactName: '' });
  
  // New Contact Form
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  
  // Create Group Form
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = useCallback(async () => {
    const allChats = await getChats();
    setContacts(allChats);
  }, []);

  const handleCloseScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // Ignore stop errors as they usually relate to DOM already being gone
      }
    }
    setIsQrScannerOpen(false);
  }, []);

  const handleScanQr = useCallback(async (scannedData: string) => {
    // Handle both raw phone numbers and prefixed data like "tikring-user:+1234567890"
    let phone = scannedData;
    if (scannedData.startsWith('tikring-user:')) {
      phone = scannedData.split(':')[1];
    } else if (scannedData.includes(':')) {
      // Fallback for other colon-separated formats
      phone = scannedData.split(':')[1];
    }
    
    if (phone) {
      // Mock finding a user
      const mockFoundUser = {
        name: 'TikRing User',
        phone: phone,
        avatar: `https://picsum.photos/seed/${phone}/100`,
        status: 'Hey! I am using TikRing'
      };
      setScannedUser(mockFoundUser);
      setNewContactPhone(phone);
      setNewContactName(mockFoundUser.name);
      handleCloseScanner();
    }
  }, [handleCloseScanner]);

  useEffect(() => {
    const startScanning = async () => {
      if (isQrScannerOpen) {
        try {
          // Ensure the element exists and is clean
          const element = document.getElementById("qr-reader");
          if (!element) return;
          element.innerHTML = ""; 

          const html5QrCode = new Html5Qrcode("qr-reader");
          scannerRef.current = html5QrCode;
          
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };
          
          await html5QrCode.start(
            { facingMode: cameraFacingMode },
            config,
            (decodedText) => {
              handleScanQr(decodedText);
              handleCloseScanner();
            },
            () => {
              // Ignore errors
            }
          );
        } catch (err) {
          console.error("Unable to start scanning", err);
        }
      }
    };

    startScanning();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isQrScannerOpen, cameraFacingMode, handleScanQr, handleCloseScanner]);

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    // Simulate syncing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const syncedContacts: Chat[] = [
      { id: 'sync-1', name: 'John Doe', avatar: 'https://picsum.photos/seed/john/100', lastMessage: 'Joined TikRing!', lastTimestamp: Date.now(), unreadCount: 0, isOnline: true, type: 'individual', phone: '+1234567890' },
      { id: 'sync-2', name: 'Jane Smith', avatar: 'https://picsum.photos/seed/jane/100', lastMessage: 'Hey there!', lastTimestamp: Date.now(), unreadCount: 0, isOnline: false, type: 'individual', phone: '+0987654321' },
    ];

    for (const contact of syncedContacts) {
      await addContact(contact);
    }
    
    setIsSyncing(false);
    await fetchContacts();
    
    const successMsg = document.createElement('div');
    successMsg.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-xl z-[100] font-bold';
    successMsg.innerText = 'Contacts Synced!';
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 3000);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  // If searching by phone and no contact found, show a "Find User" option
  const isSearchingPhone = /^\+?\d{5,}$/.test(searchQuery);
  const noMatchFound = filteredContacts.length === 0 && isSearchingPhone;

  const handleSendRequest = async (user: any) => {
    try {
      const profile = await getProfile();
      const contact: Chat = {
        id: `req-${Date.now()}`,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        unreadCount: 0,
        isOnline: false,
        status: 'pending',
        lastMessage: 'Friend request sent',
        lastTimestamp: Date.now(),
      };
      await addContact(contact);

      // Emit the request via socket
      if (socket && user.phone) {
        socket.emit('friend_request', {
          toPhone: user.phone,
          fromUser: {
            name: profile?.name || 'TikRing User',
            phone: profile?.phone,
            avatar: profile?.avatar || 'https://picsum.photos/seed/tikring/100'
          }
        });
      }

      setScannedUser(null);
      setSearchQuery('');
      await fetchContacts();
      
      const msg = document.createElement('div');
      msg.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-xl z-[100] font-bold';
      msg.innerText = 'Request Sent!';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const handleDeleteContact = async (id: string) => {
    await deleteContact(id);
    await fetchContacts();
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const handleBlockContact = async (id: string) => {
    await blockContact(id);
    await fetchContacts();
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const handleUnblockContact = async (id: string) => {
    await unblockContact(id);
    await fetchContacts();
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const handleAddContact = async () => {
    if (!newContactName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const contact: Chat = {
        id: newContactPhone || Date.now().toString(),
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
      const profile = await getProfile();
      const group = {
        id: 'group_' + Date.now(),
        name: groupName,
        avatar: `https://picsum.photos/seed/group_${Date.now()}/100`,
        members: [...selectedContacts, profile?.phone || 'me'],
        admins: [profile?.phone || 'me'],
        createdBy: profile?.phone || 'me',
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

  const handleAddGlobalUser = async (user: any) => {
    const newContact: Chat = {
      id: user.phone,
      name: user.username,
      phone: user.phone,
      avatar: `https://picsum.photos/seed/${user.phone}/100`,
      unreadCount: 0,
      isOnline: true,
      status: 'friend',
      type: 'individual'
    };
    await addContact(newContact);
    await fetchContacts();
    
    // Show success feedback
    const successMsg = document.createElement('div');
    successMsg.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-xl z-[100] font-bold animate-bounce';
    successMsg.innerText = `Added ${user.username} to contacts!`;
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-4 border-b border-gray-100 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onBack} className="p-1" style={{ touchAction: 'manipulation' }}>
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
              style={{ touchAction: 'manipulation' }}
            >
              <UserPlus className="w-4 h-4" />
              New Contact
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsQrScannerOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface rounded-xl text-primary font-bold text-sm shadow-sm"
              style={{ touchAction: 'manipulation' }}
            >
              <QrCode className="w-4 h-4" />
              Scan QR
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary rounded-xl text-white font-bold text-sm shadow-lg shadow-primary/20"
              style={{ touchAction: 'manipulation' }}
            >
              <Users className="w-4 h-4" />
              Create Group
            </motion.button>
          </div>
          
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={handleSyncContacts}
            disabled={isSyncing}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-xs border border-green-100"
            style={{ touchAction: 'manipulation' }}
          >
            <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing Phone Contacts...' : 'Sync Contacts from Phone'}
          </motion.button>
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
          <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} style={{ touchAction: 'manipulation' }}>
            {viewMode === 'list' ? <Grid className="w-4 h-4 text-primary" /> : <List className="w-4 h-4 text-primary" />}
          </button>
        </div>
      </div>

      {/* Global Online Users Section */}
      {onlineUsers.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-3 ml-1">Global Online Users</h4>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {onlineUsers
              .filter((user, index, self) => 
                index === self.findIndex((u) => u.phone === user.phone)
              )
              .map((user) => (
                <div 
                  key={`global-contact-${user.phone || user.id || Math.random()}`} 
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                  onClick={() => handleAddGlobalUser(user)}
                >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl p-[2px] bg-gradient-to-tr from-primary to-blue-400 group-hover:scale-105 transition-transform">
                    <img 
                      src={`https://picsum.photos/seed/${user.phone}/100`} 
                      className="w-full h-full rounded-2xl object-cover border-2 border-white" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-online rounded-full border-2 border-white shadow-sm animate-pulse" />
                </div>
                <span className="text-[10px] font-bold text-text-primary truncate w-14 text-center">{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact List */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4",
        viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "space-y-4"
      )}>
        {noMatchFound && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-text-primary">User not in contacts</p>
              <p className="text-sm text-text-secondary">Would you like to find "{searchQuery}" on TikRing?</p>
            </div>
            <button 
              onClick={() => handleScanQr(searchQuery)}
              className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
              style={{ touchAction: 'manipulation' }}
            >
              Find User
            </button>
          </motion.div>
        )}

        {filteredContacts.length === 0 && !noMatchFound ? (
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
              style={{ touchAction: 'manipulation' }}
            >
              Add Contact
            </button>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div 
              key={`contact-list-${contact.id}`}
              onClick={() => onViewProfile(contact.id)}
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
                {(contact.isOnline || onlineUsers.some(u => u.phone === contact.phone)) && (
                  <div className={cn(
                    "absolute bottom-0 right-0 bg-online rounded-full border-2 border-white animate-pulse",
                    viewMode === 'grid' ? "w-4 h-4" : "w-3 h-3"
                  )} />
                )}
              </div>
              <div className="flex-1 min-w-0 group">
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    "font-bold text-text-primary truncate",
                    viewMode === 'grid' ? "text-base" : "text-sm"
                  )}>
                    {contact.name}
                  </h3>
                  {contact.isVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/10 flex-shrink-0" />
                  )}
                  {contact.status === 'pending' && (
                    <span className="flex items-center gap-1 text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      <Clock className="w-2.5 h-2.5" />
                      Pending
                    </span>
                  )}
                  {contact.status === 'blocked' && (
                    <span className="flex items-center gap-1 text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Blocked
                    </span>
                  )}
                </div>
                {viewMode === 'list' && (
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-[10px] font-medium transition-colors",
                      (contact.isOnline || onlineUsers.some(u => u.phone === contact.phone)) ? "text-online" : "text-text-secondary"
                    )}>
                      {(contact.isOnline || onlineUsers.some(u => u.phone === contact.phone)) ? 'Online' : 'Offline'}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {contact.status === 'blocked' ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ isOpen: true, type: 'unblock', contactId: contact.id, contactName: contact.name });
                          }}
                          className="p-1.5 hover:bg-green-50 text-green-500 rounded-lg transition-colors"
                          title="Unblock"
                          style={{ touchAction: 'manipulation' }}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ isOpen: true, type: 'block', contactId: contact.id, contactName: contact.name });
                          }}
                          className="p-1.5 hover:bg-red-50 text-text-secondary hover:text-red-500 rounded-lg transition-colors"
                          title="Block"
                          style={{ touchAction: 'manipulation' }}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal({ isOpen: true, type: 'delete', contactId: contact.id, contactName: contact.name });
                        }}
                        className="p-1.5 hover:bg-red-50 text-text-secondary hover:text-red-500 rounded-lg transition-colors"
                        title="Delete"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
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
                {confirmModal.type === 'unblock' && <Check className="w-8 h-8" />}
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-text-primary capitalize">{confirmModal.type} Contact?</h3>
                <p className="text-sm text-text-secondary">
                  Are you sure you want to {confirmModal.type} <b>{confirmModal.contactName}</b>?
                  {confirmModal.type === 'block' && " They won't be able to message or call you."}
                  {confirmModal.type === 'delete' && " This will remove them from your contacts list."}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => {
                    if (confirmModal.type === 'delete') handleDeleteContact(confirmModal.contactId);
                    if (confirmModal.type === 'block') handleBlockContact(confirmModal.contactId);
                    if (confirmModal.type === 'unblock') handleUnblockContact(confirmModal.contactId);
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-white shadow-lg",
                    confirmModal.type === 'unblock' ? "bg-green-500 shadow-green-500/20" : "bg-red-500 shadow-red-500/20"
                  )}
                  style={{ touchAction: 'manipulation' }}
                >
                  Confirm
                </button>
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="flex-1 bg-surface py-3 rounded-xl font-bold text-text-secondary"
                  style={{ touchAction: 'manipulation' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {isQrScannerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex flex-col"
          >
            <div className="p-6 flex justify-between items-center text-white">
              <h3 className="font-bold">Scan QR Code</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  title="Switch Camera"
                  style={{ touchAction: 'manipulation' }}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button onClick={handleCloseScanner} style={{ touchAction: 'manipulation' }}><X className="w-6 h-6" /></button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-8">
              <div id="qr-reader" className="w-full max-w-sm rounded-3xl overflow-hidden border-2 border-primary/30 relative">
                <div className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
                  <CameraIcon className="w-3 h-3 text-white" />
                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">
                    {cameraFacingMode === 'user' ? 'Front' : 'Back'}
                  </span>
                </div>
              </div>
              
              <p className="text-white/60 text-center text-sm px-8">Align the QR code within the frame to scan. Camera access is required.</p>
              
              <button 
                onClick={() => handleScanQr('tikring-user:+8801728842220')}
                className="bg-white text-primary px-8 py-3 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform"
                style={{ touchAction: 'manipulation' }}
              >
                Simulate Scan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanned User Profile Modal */}
      <AnimatePresence>
        {scannedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl flex flex-col items-center p-8 gap-6"
            >
              <div className="relative">
                <img src={scannedUser.avatar} className="w-24 h-24 rounded-full border-4 border-primary/10 shadow-lg" />
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 border-2 border-white">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-text-primary">{scannedUser.name}</h3>
                <p className="text-sm text-text-secondary">{scannedUser.phone}</p>
                <p className="text-xs text-text-secondary italic">"{scannedUser.status}"</p>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => handleSendRequest(scannedUser)}
                  className="flex-1 bg-primary py-3 rounded-xl font-bold text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  style={{ touchAction: 'manipulation' }}
                >
                  <UserPlus2 className="w-4 h-4" />
                  Send Request
                </button>
                <button 
                  onClick={() => setScannedUser(null)}
                  className="flex-1 bg-surface py-3 rounded-xl font-bold text-text-secondary"
                  style={{ touchAction: 'manipulation' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <button onClick={() => setIsNewContactModalOpen(false)} style={{ touchAction: 'manipulation' }}><X className="w-5 h-5 text-text-secondary" /></button>
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
