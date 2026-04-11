import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2, UserPlus, UserMinus, Users, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Group, getGroup, updateGroup, deleteGroup, getChats, Chat, getProfile } from '@/src/lib/db';

interface GroupInfoScreenProps {
  groupId: string;
  onBack: () => void;
  onGroupDeleted: () => void;
  socket: any;
}

export default function GroupInfoScreen({ groupId, onBack, onGroupDeleted, socket }: GroupInfoScreenProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [allContacts, setAllContacts] = useState<Chat[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [myPhone, setMyPhone] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [groupData, chats, profile] = await Promise.all([
        getGroup(groupId),
        getChats(),
        getProfile()
      ]);
      setGroup(groupData || null);
      setAllContacts(chats.filter(c => c.type === 'individual' && c.status === 'friend'));
      setMyPhone(profile?.phone || 'me');
    };
    fetchData();
  }, [groupId]);

  const handleRemoveMember = async (phone: string) => {
    if (!group) return;
    const updatedMembers = group.members.filter(m => m !== phone);
    const updatedAdmins = (group.admins || [group.createdBy]).filter(a => a !== phone);
    const updatedGroup = { ...group, members: updatedMembers, admins: updatedAdmins };
    await updateGroup(updatedGroup);
    setGroup(updatedGroup);
    
    if (socket) {
      socket.emit('group_member_removed', { groupId, phone });
    }
  };

  const handlePromoteToAdmin = async (phone: string) => {
    if (!group) return;
    const currentAdmins = group.admins || [group.createdBy];
    if (currentAdmins.includes(phone)) return;
    
    const updatedAdmins = [...currentAdmins, phone];
    const updatedGroup = { ...group, admins: updatedAdmins };
    await updateGroup(updatedGroup);
    setGroup(updatedGroup);

    if (socket) {
      socket.emit('group_admin_promoted', { groupId, phone });
    }
  };

  const handleAddMember = async (phone: string) => {
    if (!group || group.members.includes(phone)) return;
    const updatedMembers = [...group.members, phone];
    const updatedGroup = { 
      ...group, 
      members: updatedMembers,
      admins: group.admins || [group.createdBy] 
    };
    await updateGroup(updatedGroup);
    setGroup(updatedGroup);
    setShowAddMember(false);

    if (socket) {
      socket.emit('group_invitation', { to: phone, group: updatedGroup });
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      await deleteGroup(groupId);
      onGroupDeleted();
    }
  };

  if (!group) return null;

  const isAdmin = (group.admins || [group.createdBy]).includes(myPhone);

  return (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack}>
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h3 className="text-sm font-bold text-text-primary">Group Info</h3>
        </div>
        {isAdmin && (
          <button onClick={handleDeleteGroup} className="text-red-500">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Group Profile */}
        <div className="flex flex-col items-center p-8 bg-surface/30">
          <div className="relative">
            <img 
              src={group.avatar} 
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl" 
              referrerPolicy="no-referrer"
            />
            {isAdmin && (
              <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full border-4 border-white shadow-lg">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <h2 className="mt-4 text-xl font-bold text-text-primary">{group.name}</h2>
          <p className="text-sm text-text-secondary mt-1">{group.members.length} members</p>
          {group.description && (
            <p className="text-sm text-text-secondary mt-4 text-center px-6 italic">
              "{group.description}"
            </p>
          )}
        </div>

        {/* Members List */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Members</h4>
            {isAdmin && (
              <button 
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1 text-primary text-xs font-bold"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            )}
          </div>

          <div className="space-y-3">
            {group.members.map(phone => {
              const contact = allContacts.find(c => c.phone === phone);
              const isMe = phone === myPhone;
              const isMemberAdmin = (group.admins || [group.createdBy]).includes(phone);

              return (
                <div key={phone} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface transition-colors group/item">
                  <div className="flex items-center gap-3">
                    <img 
                      src={isMe ? 'https://picsum.photos/seed/me/100' : (contact?.avatar || `https://picsum.photos/seed/${phone}/100`)} 
                      className="w-10 h-10 rounded-full object-cover" 
                    />
                    <div>
                      <h5 className="text-sm font-bold text-text-primary">
                        {isMe ? 'You' : (contact?.name || phone)}
                      </h5>
                      {isMemberAdmin && <span className="text-[10px] font-bold text-primary">Admin</span>}
                    </div>
                  </div>
                  
                  {isAdmin && !isMe && (
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {!isMemberAdmin && (
                        <button 
                          onClick={() => handlePromoteToAdmin(phone)}
                          className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors"
                          title="Promote to Admin"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleRemoveMember(phone)}
                        className="text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove from Group"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-text-primary">Add Member</h3>
                <button onClick={() => setShowAddMember(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {allContacts.filter(c => !group.members.includes(c.phone || '')).map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => handleAddMember(contact.phone || '')}
                    className="flex items-center gap-3 p-3 hover:bg-surface rounded-2xl cursor-pointer transition-colors"
                  >
                    <img src={contact.avatar} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <h5 className="text-sm font-bold text-text-primary">{contact.name}</h5>
                      <p className="text-xs text-text-secondary">{contact.phone}</p>
                    </div>
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                ))}
                {allContacts.filter(c => !group.members.includes(c.phone || '')).length === 0 && (
                  <div className="p-8 text-center text-text-secondary text-sm">
                    No more contacts to add
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
