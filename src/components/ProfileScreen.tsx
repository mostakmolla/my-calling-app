import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, User, Phone, Info, Bell, Shield, LogOut, Save, ChevronDown, Check, Grid, Film, ImageIcon, PlayCircle, X, MoreVertical, MessageSquare, Compass, Heart, MessageCircle, Share2, Play, Send, Copy, CheckCircle2, Music, Upload, CheckCircle, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { getProfile, saveProfile } from '@/src/lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

const countries = [
  { name: 'Afghanistan', code: '+93', flag: '🇦🇫', iso: 'AF' },
  { name: 'Albania', code: '+355', flag: '🇦🇱', iso: 'AL' },
  { name: 'Algeria', code: '+213', flag: '🇩🇿', iso: 'DZ' },
  { name: 'Andorra', code: '+376', flag: '🇦🇩', iso: 'AD' },
  { name: 'Angola', code: '+244', flag: '🇦🇴', iso: 'AO' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷', iso: 'AR' },
  { name: 'Armenia', code: '+374', flag: '🇦🇲', iso: 'AM' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', iso: 'AU' },
  { name: 'Austria', code: '+43', flag: '🇦🇹', iso: 'AT' },
  { name: 'Azerbaijan', code: '+994', flag: '🇦🇿', iso: 'AZ' },
  { name: 'Bahamas', code: '+1', flag: '🇧🇸', iso: 'BS' },
  { name: 'Bahrain', code: '+973', flag: '🇧🇭', iso: 'BH' },
  { name: 'Bangladesh', code: '+880', flag: '🇧🇩', iso: 'BD' },
  { name: 'Barbados', code: '+1', flag: '🇧🇧', iso: 'BB' },
  { name: 'Belarus', code: '+375', flag: '🇧🇾', iso: 'BY' },
  { name: 'Belgium', code: '+32', flag: '🇧🇪', iso: 'BE' },
  { name: 'Belize', code: '+501', flag: '🇧🇿', iso: 'BZ' },
  { name: 'Benin', code: '+229', flag: '🇧🇯', iso: 'BJ' },
  { name: 'Bhutan', code: '+975', flag: '🇧🇹', iso: 'BT' },
  { name: 'Bolivia', code: '+591', flag: '🇧🇴', iso: 'BO' },
  { name: 'Bosnia and Herzegovina', code: '+387', flag: '🇧🇦', iso: 'BA' },
  { name: 'Botswana', code: '+267', flag: '🇧🇼', iso: 'BW' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', iso: 'BR' },
  { name: 'Brunei', code: '+673', flag: '🇧🇳', iso: 'BN' },
  { name: 'Bulgaria', code: '+359', flag: '🇧🇬', iso: 'BG' },
  { name: 'Burkina Faso', code: '+226', flag: '🇧🇫', iso: 'BF' },
  { name: 'Burundi', code: '+257', flag: '🇧🇮', iso: 'BI' },
  { name: 'Cambodia', code: '+855', flag: '🇰🇭', iso: 'KH' },
  { name: 'Cameroon', code: '+237', flag: '🇨🇲', iso: 'CM' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', iso: 'CA' },
  { name: 'Cape Verde', code: '+238', flag: '🇨🇻', iso: 'CV' },
  { name: 'Central African Republic', code: '+236', flag: '🇨🇫', iso: 'CF' },
  { name: 'Chad', code: '+235', flag: '🇹🇩', iso: 'TD' },
  { name: 'Chile', code: '+56', flag: '🇨🇱', iso: 'CL' },
  { name: 'China', code: '+86', flag: '🇨🇳', iso: 'CN' },
  { name: 'Colombia', code: '+57', flag: '🇨🇴', iso: 'CO' },
  { name: 'Comoros', code: '+269', flag: '🇰🇲', iso: 'KM' },
  { name: 'Congo', code: '+242', flag: '🇨🇬', iso: 'CG' },
  { name: 'Costa Rica', code: '+506', flag: '🇨🇷', iso: 'CR' },
  { name: 'Croatia', code: '+385', flag: '🇭🇷', iso: 'HR' },
  { name: 'Cuba', code: '+53', flag: '🇨🇺', iso: 'CU' },
  { name: 'Cyprus', code: '+357', flag: '🇨🇾', iso: 'CY' },
  { name: 'Czech Republic', code: '+420', flag: '🇨🇿', iso: 'CZ' },
  { name: 'Denmark', code: '+45', flag: '🇩🇰', iso: 'DK' },
  { name: 'Djibouti', code: '+253', flag: '🇩🇯', iso: 'DJ' },
  { name: 'Dominica', code: '+1', flag: '🇩🇲', iso: 'DM' },
  { name: 'Dominican Republic', code: '+1', flag: '🇩🇴', iso: 'DO' },
  { name: 'Ecuador', code: '+593', flag: '🇪🇨', iso: 'EC' },
  { name: 'Egypt', code: '+20', flag: '🇪🇬', iso: 'EG' },
  { name: 'El Salvador', code: '+503', flag: '🇸🇻', iso: 'SV' },
  { name: 'Equatorial Guinea', code: '+240', flag: '🇬🇶', iso: 'GQ' },
  { name: 'Eritrea', code: '+291', flag: '🇪🇷', iso: 'ER' },
  { name: 'Estonia', code: '+372', flag: '🇪🇪', iso: 'EE' },
  { name: 'Ethiopia', code: '+251', flag: '🇪🇹', iso: 'ET' },
  { name: 'Fiji', code: '+679', flag: '🇫🇯', iso: 'FJ' },
  { name: 'Finland', code: '+358', flag: '🇫🇮', iso: 'FI' },
  { name: 'France', code: '+33', flag: '🇫🇷', iso: 'FR' },
  { name: 'Gabon', code: '+241', flag: '🇬🇦', iso: 'GA' },
  { name: 'Gambia', code: '+220', flag: '🇬🇲', iso: 'GM' },
  { name: 'Georgia', code: '+995', flag: '🇬🇪', iso: 'GE' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', iso: 'DE' },
  { name: 'Ghana', code: '+233', flag: '🇬🇭', iso: 'GH' },
  { name: 'Greece', code: '+30', flag: '🇬🇷', iso: 'GR' },
  { name: 'Grenada', code: '+1', flag: '🇬🇩', iso: 'GD' },
  { name: 'Guatemala', code: '+502', flag: '🇬🇹', iso: 'GT' },
  { name: 'Guinea', code: '+224', flag: '🇬🇳', iso: 'GN' },
  { name: 'Guinea-Bissau', code: '+245', flag: '🇬🇼', iso: 'GW' },
  { name: 'Guyana', code: '+592', flag: '🇬🇾', iso: 'GY' },
  { name: 'Haiti', code: '+509', flag: '🇭🇹', iso: 'HT' },
  { name: 'Honduras', code: '+504', flag: '🇭🇳', iso: 'HN' },
  { name: 'Hungary', code: '+36', flag: '🇭🇺', iso: 'HU' },
  { name: 'Iceland', code: '+354', flag: '🇮🇸', iso: 'IS' },
  { name: 'India', code: '+91', flag: '🇮🇳', iso: 'IN' },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩', iso: 'ID' },
  { name: 'Iran', code: '+98', flag: '🇮🇷', iso: 'IR' },
  { name: 'Iraq', code: '+964', flag: '🇮🇶', iso: 'IQ' },
  { name: 'Ireland', code: '+353', flag: '🇮🇪', iso: 'IE' },
  { name: 'Israel', code: '+972', flag: '🇮🇱', iso: 'IL' },
  { name: 'Italy', code: '+39', flag: '🇮🇹', iso: 'IT' },
  { name: 'Jamaica', code: '+1', flag: '🇯🇲', iso: 'JM' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', iso: 'JP' },
  { name: 'Jordan', code: '+962', flag: '🇯🇴', iso: 'JO' },
  { name: 'Kazakhstan', code: '+7', flag: '🇰🇿', iso: 'KZ' },
  { name: 'Kenya', code: '+254', flag: '🇰🇪', iso: 'KE' },
  { name: 'Kiribati', code: '+686', flag: '🇰🇮', iso: 'KI' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼', iso: 'KW' },
  { name: 'Kyrgyzstan', code: '+996', flag: '🇰🇬', iso: 'KG' },
  { name: 'Laos', code: '+856', flag: '🇱🇦', iso: 'LA' },
  { name: 'Latvia', code: '+371', flag: '🇱🇻', iso: 'LV' },
  { name: 'Lebanon', code: '+961', flag: '🇱🇧', iso: 'LB' },
  { name: 'Lesotho', code: '+266', flag: '🇱🇸', iso: 'LS' },
  { name: 'Liberia', code: '+231', flag: '🇱🇷', iso: 'LR' },
  { name: 'Libya', code: '+218', flag: '🇱🇾', iso: 'LY' },
  { name: 'Liechtenstein', code: '+423', flag: '🇱🇮', iso: 'LI' },
  { name: 'Lithuania', code: '+370', flag: '🇱🇹', iso: 'LT' },
  { name: 'Luxembourg', code: '+352', flag: '🇱🇺', iso: 'LU' },
  { name: 'Macedonia', code: '+389', flag: '🇲🇰', iso: 'MK' },
  { name: 'Madagascar', code: '+261', flag: '🇲🇬', iso: 'MG' },
  { name: 'Malawi', code: '+265', flag: '🇲🇼', iso: 'MW' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾', iso: 'MY' },
  { name: 'Maldives', code: '+960', flag: '🇲🇻', iso: 'MV' },
  { name: 'Mali', code: '+223', flag: '🇲🇱', iso: 'ML' },
  { name: 'Malta', code: '+356', flag: '🇲🇹', iso: 'MT' },
  { name: 'Marshall Islands', code: '+692', flag: '🇲🇭', iso: 'MH' },
  { name: 'Mauritania', code: '+222', flag: '🇲🇷', iso: 'MR' },
  { name: 'Mauritius', code: '+230', flag: '🇲🇺', iso: 'MU' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽', iso: 'MX' },
  { name: 'Micronesia', code: '+691', flag: '🇫🇲', iso: 'FM' },
  { name: 'Moldova', code: '+373', flag: '🇲🇩', iso: 'MD' },
  { name: 'Monaco', code: '+377', flag: '🇲🇨', iso: 'MC' },
  { name: 'Mongolia', code: '+976', flag: '🇲🇳', iso: 'MN' },
  { name: 'Montenegro', code: '+382', flag: '🇲🇪', iso: 'ME' },
  { name: 'Morocco', code: '+212', flag: '🇲🇦', iso: 'MA' },
  { name: 'Mozambique', code: '+258', flag: '🇲🇿', iso: 'MZ' },
  { name: 'Myanmar', code: '+95', flag: '🇲🇲', iso: 'MM' },
  { name: 'Namibia', code: '+264', flag: '🇳🇦', iso: 'NA' },
  { name: 'Nauru', code: '+674', flag: '🇳🇷', iso: 'NR' },
  { name: 'Nepal', code: '+977', flag: '🇳🇵', iso: 'NP' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱', iso: 'NL' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿', iso: 'NZ' },
  { name: 'Nicaragua', code: '+505', flag: '🇳🇮', iso: 'NI' },
  { name: 'Niger', code: '+227', flag: '🇳🇪', iso: 'NE' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬', iso: 'NG' },
  { name: 'North Korea', code: '+850', flag: '🇰🇵', iso: 'KP' },
  { name: 'Norway', code: '+47', flag: '🇳🇴', iso: 'NO' },
  { name: 'Oman', code: '+968', flag: '🇴🇲', iso: 'OM' },
  { name: 'Pakistan', code: '+92', flag: '🇵🇰', iso: 'PK' },
  { name: 'Palau', code: '+680', flag: '🇵🇼', iso: 'PW' },
  { name: 'Palestine', code: '+970', flag: '🇵🇸', iso: 'PS' },
  { name: 'Panama', code: '+507', flag: '🇵🇦', iso: 'PA' },
  { name: 'Papua New Guinea', code: '+675', flag: '🇵🇬', iso: 'PG' },
  { name: 'Paraguay', code: '+595', flag: '🇵🇾', iso: 'PY' },
  { name: 'Peru', code: '+51', flag: '🇵🇪', iso: 'PE' },
  { name: 'Philippines', code: '+63', flag: '🇵🇭', iso: 'PH' },
  { name: 'Poland', code: '+48', flag: '🇵🇱', iso: 'PL' },
  { name: 'Portugal', code: '+351', flag: '🇵🇹', iso: 'PT' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦', iso: 'QA' },
  { name: 'Romania', code: '+40', flag: '🇷🇴', iso: 'RO' },
  { name: 'Russia', code: '+7', flag: '🇷🇺', iso: 'RU' },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼', iso: 'RW' },
  { name: 'Saint Kitts and Nevis', code: '+1', flag: '🇰🇳', iso: 'KN' },
  { name: 'Saint Lucia', code: '+1', flag: '🇱🇨', iso: 'LC' },
  { name: 'Saint Vincent and the Grenadines', code: '+1', flag: '🇻🇨', iso: 'VC' },
  { name: 'Samoa', code: '+685', flag: '🇼🇸', iso: 'WS' },
  { name: 'San Marino', code: '+378', flag: '🇸🇲', iso: 'SM' },
  { name: 'Sao Tome and Principe', code: '+239', flag: '🇸🇹', iso: 'ST' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', iso: 'SA' },
  { name: 'Senegal', code: '+221', flag: '🇸🇳', iso: 'SN' },
  { name: 'Serbia', code: '+381', flag: '🇷🇸', iso: 'RS' },
  { name: 'Seychelles', code: '+248', flag: '🇸🇨', iso: 'SC' },
  { name: 'Sierra Leone', code: '+232', flag: '🇸🇱', iso: 'SL' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', iso: 'SG' },
  { name: 'Slovakia', code: '+421', flag: '🇸🇰', iso: 'SK' },
  { name: 'Slovenia', code: '+386', flag: '🇸🇮', iso: 'SI' },
  { name: 'Solomon Islands', code: '+677', flag: '🇸🇧', iso: 'SB' },
  { name: 'Somalia', code: '+252', flag: '🇸🇴', iso: 'SO' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦', iso: 'ZA' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷', iso: 'KR' },
  { name: 'South Sudan', code: '+211', flag: '🇸🇸', iso: 'SS' },
  { name: 'Spain', code: '+34', flag: '🇪🇸', iso: 'ES' },
  { name: 'Sri Lanka', code: '+94', flag: '🇱🇰', iso: 'LK' },
  { name: 'Sudan', code: '+249', flag: '🇸🇩', iso: 'SD' },
  { name: 'Suriname', code: '+597', flag: '🇸🇷', iso: 'SR' },
  { name: 'Swaziland', code: '+268', flag: '🇸🇿', iso: 'SZ' },
  { name: 'Sweden', code: '+46', flag: '🇸🇪', iso: 'SE' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭', iso: 'CH' },
  { name: 'Syria', code: '+963', flag: '🇸🇾', iso: 'SY' },
  { name: 'Taiwan', code: '+886', flag: '🇹🇼', iso: 'TW' },
  { name: 'Tajikistan', code: '+992', flag: '🇹🇯', iso: 'TJ' },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿', iso: 'TZ' },
  { name: 'Thailand', code: '+66', flag: '🇹🇭', iso: 'TH' },
  { name: 'Timor-Leste', code: '+670', flag: '🇹🇱', iso: 'TL' },
  { name: 'Togo', code: '+228', flag: '🇹🇬', iso: 'TG' },
  { name: 'Tonga', code: '+676', flag: '🇹🇴', iso: 'TO' },
  { name: 'Trinidad and Tobago', code: '+1', flag: '🇹🇹', iso: 'TT' },
  { name: 'Tunisia', code: '+216', flag: '🇹🇳', iso: 'TN' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷', iso: 'TR' },
  { name: 'Turkmenistan', code: '+993', flag: '🇹🇲', iso: 'TM' },
  { name: 'Tuvalu', code: '+688', flag: '🇹🇻', iso: 'TV' },
  { name: 'Uganda', code: '+256', flag: '🇺🇬', iso: 'UG' },
  { name: 'Ukraine', code: '+380', flag: '🇺🇦', iso: 'UA' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', iso: 'AE' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', iso: 'GB' },
  { name: 'United States', code: '+1', flag: '🇺🇸', iso: 'US' },
  { name: 'Uruguay', code: '+598', flag: '🇺🇾', iso: 'UY' },
  { name: 'Uzbekistan', code: '+998', flag: '🇺🇿', iso: 'UZ' },
  { name: 'Vanuatu', code: '+678', flag: '🇻🇺', iso: 'VU' },
  { name: 'Vatican City', code: '+379', flag: '🇻🇦', iso: 'VA' },
  { name: 'Venezuela', code: '+58', flag: '🇻🇪', iso: 'VE' },
  { name: 'Vietnam', code: '+84', flag: '🇻🇳', iso: 'VN' },
  { name: 'Yemen', code: '+967', flag: '🇾🇪', iso: 'YE' },
  { name: 'Zambia', code: '+260', flag: '🇿🇲', iso: 'ZM' },
  { name: 'Zimbabwe', code: '+263', flag: '🇿🇼', iso: 'ZW' },
];

interface ProfileScreenProps {
  onBack: () => void;
}

const REACTION_EMOJIS = [
  { label: 'like', emoji: '👍' },
  { label: 'love', emoji: '❤️' },
  { label: 'care', emoji: '🥰' },
  { label: 'haha', emoji: '😂' },
  { label: 'wow', emoji: '😮' },
  { label: 'sad', emoji: '😢' },
  { label: 'angry', emoji: '😡' },
];

const PREDEFINED_TONES = [
  { id: 'default', name: 'Default Ringtone', url: '' },
  { id: 'classic', name: 'Classic Bell', url: '' },
  { id: 'digital', name: 'Digital Pulse', url: '' },
  { id: 'nature', name: 'Morning Birds', url: '' },
  { id: 'zen', name: 'Zen Garden', url: '' },
];

export default function ProfileScreen({ onBack }: ProfileScreenProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Hey there! I am using ConnectMe.');
  const [phone, setPhone] = useState('1728842220');
  const [countryCode, setCountryCode] = useState('+880');
  const [countryFlag, setCountryFlag] = useState('🇧🇩');
  const [countryIso, setCountryIso] = useState('BD');
  const [activeTab, setActiveTab] = useState<'all' | 'reels' | 'photos' | 'videos'>('all');
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = () => {
    const shareUrl = `https://connectme.app/share/my-content/${selectedMedia.id}`;
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now(),
      user: 'You',
      text: newComment,
      timestamp: 'Just now'
    };
    setComments([comment, ...comments]);
    setNewComment('');
  };

  const myContent = {
    reels: [
      { id: 'my-reel-1', thumbnail: 'https://picsum.photos/seed/myreel1/200/300', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-1282-large.mp4', views: '124', likes: '12', comments: '2' },
      { id: 'my-reel-2', thumbnail: 'https://picsum.photos/seed/myreel2/200/300', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-leaves-low-angle-shot-1305-large.mp4', views: '45', likes: '5', comments: '0' },
    ],
    photos: [
      { id: 'my-photo-1', url: 'https://picsum.photos/seed/myphoto1/300/300', likes: '34' },
      { id: 'my-photo-2', url: 'https://picsum.photos/seed/myphoto2/300/300', likes: '18' },
      { id: 'my-photo-3', url: 'https://picsum.photos/seed/myphoto3/300/300', likes: '56' },
    ],
    videos: [
      { id: 'my-video-1', thumbnail: 'https://picsum.photos/seed/myvideo1/300/200', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-1271-large.mp4', duration: '0:15', views: '1.2k', likes: '245' },
    ]
  };

  const [avatar, setAvatar] = useState('https://picsum.photos/seed/me/200');
  const [isSaving, setIsSaving] = useState(false);
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const qrCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const [activeSubPage, setActiveSubPage] = useState<'main' | 'notifications' | 'privacy' | 'two-step' | 'security-notifications' | 'call-tones'>('main');
  const [callTone, setCallTone] = useState({ id: 'default', name: 'Default Ringtone', url: '' });
  const [isUploadingTone, setIsUploadingTone] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    showNotifications: true,
    sound: true,
    vibration: true,
    previewMessage: true
  });
  const [privacySettings, setPrivacySettings] = useState({
    lastSeen: 'Everyone',
    profilePhoto: 'Everyone',
    about: 'Everyone',
    readReceipts: true
  });
  const [securitySettings, setSecuritySettings] = useState({
    twoStepEnabled: false,
    twoStepPIN: '',
    securityNotifications: true
  });

  const [tempPIN, setTempPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const profile = await getProfile();
      if (profile) {
        setName(profile.name || '');
        setStatus(profile.status || '');
        setPhone(profile.phone || '1728842220');
        setCountryCode(profile.countryCode || '+880');
        setCountryFlag(profile.countryFlag || '🇧🇩');
        setCountryIso(profile.countryIso || 'BD');
        setAvatar(profile.avatar || 'https://picsum.photos/seed/me/200');
        setIsPhoneVerified(profile.isPhoneVerified || false);
        if (profile.notificationSettings) setNotificationSettings(profile.notificationSettings);
        if (profile.privacySettings) setPrivacySettings(profile.privacySettings);
        if (profile.securitySettings) setSecuritySettings(profile.securitySettings);
        if (profile.callTone) setCallTone(profile.callTone);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await saveProfile({ 
      name, 
      status, 
      phone, 
      countryCode, 
      countryFlag, 
      countryIso,
      avatar, 
      isPhoneVerified,
      notificationSettings,
      privacySettings,
      securitySettings,
      callTone
    });
    setTimeout(() => {
      setIsSaving(false);
      onBack();
    }, 500);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('avatar-input')?.click();
  };

  const selectCountry = (country: typeof countries[0]) => {
    setCountryCode(country.code);
    setCountryFlag(country.flag);
    setCountryIso(country.iso);
    setIsCountrySelectorOpen(false);
    setCountrySearch('');
    setIsPhoneVerified(false); // Reset verification if country changes
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setIsPhoneVerified(false); // Reset verification if phone changes
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const startVerification = () => {
    if (!phone) return;
    setIsVerifying(true);
    setVerificationError('');
    // Mock sending OTP
    setTimeout(() => {
      const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setOtp(mockOtp);
      setIsVerifying(false);
      setIsVerificationModalOpen(true);
      setResendTimer(30);
      // In a real app, this would be sent via SMS
      console.log(`Verification Code: ${mockOtp}`);
      // No alert, we'll show it in the UI for demo
    }, 1500);
  };

  const verifyOtp = () => {
    setIsVerifying(true);
    setVerificationError('');
    setTimeout(() => {
      if (enteredOtp === otp) {
        setIsPhoneVerified(true);
        setIsVerificationModalOpen(false);
        setEnteredOtp('');
        setOtp('');
      } else {
        setVerificationError('Invalid code. Please try again.');
      }
      setIsVerifying(false);
    }, 1000);
  };

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.includes(countrySearch)
  );

  const handleToneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingTone(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const newTone = {
          id: `custom-${Date.now()}`,
          name: file.name,
          url: reader.result as string
        };
        setCallTone(newTone);
        setIsUploadingTone(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderCallTonesPage = () => (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute inset-0 bg-white z-20 flex flex-col"
    >
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <button onClick={() => setActiveSubPage('notifications')}>
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Call Tones</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Custom Tone</h3>
          <div className="relative">
            <input 
              type="file" 
              id="tone-upload" 
              accept="audio/*" 
              className="hidden" 
              onChange={handleToneUpload} 
            />
            <label 
              htmlFor="tone-upload"
              className="flex items-center gap-4 p-4 bg-surface rounded-2xl border-2 border-dashed border-primary/20 cursor-pointer hover:bg-primary/5 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                {isUploadingTone ? (
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-text-primary">Upload Custom Tone</p>
                <p className="text-xs text-text-secondary">MP3, WAV or OGG files</p>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Predefined Tones</h3>
          <div className="space-y-2">
            {PREDEFINED_TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => setCallTone(tone)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all",
                  callTone.id === tone.id ? "bg-primary/10 border-primary" : "bg-surface hover:bg-gray-100"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  callTone.id === tone.id ? "bg-primary text-white" : "bg-white text-text-secondary"
                )}>
                  <Music className="w-5 h-5" />
                </div>
                <span className={cn(
                  "flex-1 text-left font-bold",
                  callTone.id === tone.id ? "text-primary" : "text-text-primary"
                )}>
                  {tone.name}
                </span>
                {callTone.id === tone.id && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {callTone.id.startsWith('custom-') && (
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-primary uppercase">Current Custom Tone</p>
              <p className="font-bold text-text-primary truncate">{callTone.name}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderNotificationsPage = () => (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute inset-0 bg-white z-20 flex flex-col"
    >
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <button onClick={() => setActiveSubPage('main')}>
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Notifications</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-text-primary">Show Notifications</h3>
            <p className="text-sm text-text-secondary">Enable or disable all notifications</p>
          </div>
          <button 
            onClick={() => setNotificationSettings(prev => ({ ...prev, showNotifications: !prev.showNotifications }))}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              notificationSettings.showNotifications ? "bg-primary" : "bg-gray-200"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              notificationSettings.showNotifications ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-text-primary">Sound</h3>
            <p className="text-sm text-text-secondary">Play sound for incoming messages</p>
          </div>
          <button 
            onClick={() => setNotificationSettings(prev => ({ ...prev, sound: !prev.sound }))}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              notificationSettings.sound ? "bg-primary" : "bg-gray-200"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              notificationSettings.sound ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-text-primary">Vibration</h3>
            <p className="text-sm text-text-secondary">Vibrate for incoming messages</p>
          </div>
          <button 
            onClick={() => setNotificationSettings(prev => ({ ...prev, vibration: !prev.vibration }))}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              notificationSettings.vibration ? "bg-primary" : "bg-gray-200"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              notificationSettings.vibration ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-text-primary">Preview Message</h3>
            <p className="text-sm text-text-secondary">Show message content in notifications</p>
          </div>
          <button 
            onClick={() => setNotificationSettings(prev => ({ ...prev, previewMessage: !prev.previewMessage }))}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              notificationSettings.previewMessage ? "bg-primary" : "bg-gray-200"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              notificationSettings.previewMessage ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button 
            onClick={() => setActiveSubPage('call-tones')}
            className="w-full flex items-center justify-between p-4 bg-surface rounded-2xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Music className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-text-primary">Call Tone</p>
                <p className="text-xs text-text-secondary">{callTone.name}</p>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-text-secondary -rotate-90" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderTwoStepPage = () => (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute inset-0 bg-white z-20 flex flex-col"
    >
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <button onClick={() => {
          setActiveSubPage('privacy');
          setPinStep('enter');
          setTempPIN('');
          setConfirmPIN('');
          setPinError('');
        }}>
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Two-Step Verification</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Shield className="w-10 h-10" />
          </div>
          <p className="text-sm text-text-secondary">
            For added security, enable two-step verification, which will require a PIN when registering your phone number with ConnectMe again.
          </p>
        </div>

        {!securitySettings.twoStepEnabled ? (
          <div className="space-y-6">
            {pinStep === 'enter' ? (
              <div className="space-y-4">
                <h3 className="font-bold text-center">Enter a 4-digit PIN</h3>
                <input 
                  type="password" 
                  maxLength={4}
                  value={tempPIN}
                  onChange={(e) => setTempPIN(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full text-center text-3xl font-bold tracking-[1em] py-3 bg-surface rounded-2xl border-2 border-transparent focus:border-primary focus:outline-none"
                />
                <button 
                  disabled={tempPIN.length < 4}
                  onClick={() => setPinStep('confirm')}
                  className="w-full bg-primary text-white font-bold py-3 rounded-2xl shadow-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-center">Confirm your PIN</h3>
                <input 
                  type="password" 
                  maxLength={4}
                  value={confirmPIN}
                  onChange={(e) => setConfirmPIN(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full text-center text-3xl font-bold tracking-[1em] py-3 bg-surface rounded-2xl border-2 border-transparent focus:border-primary focus:outline-none"
                />
                {pinError && <p className="text-xs text-red-500 text-center font-bold">{pinError}</p>}
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setPinStep('enter'); setConfirmPIN(''); }}
                    className="flex-1 bg-surface text-text-primary font-bold py-3 rounded-2xl"
                  >
                    Back
                  </button>
                  <button 
                    disabled={confirmPIN.length < 4}
                    onClick={() => {
                      if (tempPIN === confirmPIN) {
                        setSecuritySettings(prev => ({ ...prev, twoStepEnabled: true, twoStepPIN: tempPIN }));
                        setPinStep('enter');
                        setTempPIN('');
                        setConfirmPIN('');
                      } else {
                        setPinError('PINs do not match. Try again.');
                      }
                    }}
                    className="flex-1 bg-primary text-white font-bold py-3 rounded-2xl shadow-lg disabled:opacity-50"
                  >
                    Enable
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-2xl flex items-center gap-3 text-green-700">
              <Check className="w-5 h-5" />
              <span className="font-bold text-sm">Two-step verification is enabled.</span>
            </div>
            <button 
              onClick={() => setSecuritySettings(prev => ({ ...prev, twoStepEnabled: false, twoStepPIN: '' }))}
              className="w-full bg-red-50 text-red-500 font-bold py-3 rounded-2xl border border-red-100"
            >
              Disable Two-Step Verification
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderSecurityNotificationsPage = () => (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute inset-0 bg-white z-20 flex flex-col"
    >
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <button onClick={() => setActiveSubPage('privacy')}>
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Security Notifications</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Bell className="w-10 h-10" />
          </div>
          <p className="text-sm text-text-secondary">
            Get notified when your security settings change or when a new device logs into your account.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface rounded-2xl">
          <div>
            <h3 className="font-bold text-text-primary">Show Security Notifications</h3>
            <p className="text-xs text-text-secondary">On this device</p>
          </div>
          <button 
            onClick={() => setSecuritySettings(prev => ({ ...prev, securityNotifications: !prev.securityNotifications }))}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              securitySettings.securityNotifications ? "bg-primary" : "bg-gray-200"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              securitySettings.securityNotifications ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        <div className="p-4 border border-gray-100 rounded-2xl space-y-2">
          <h4 className="font-bold text-sm text-text-primary">Why is this important?</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Security notifications help you keep track of important changes to your account. If you see a notification for an action you didn't take, you can immediately secure your account.
          </p>
        </div>
      </div>
    </motion.div>
  );

  const renderPrivacyPage = () => (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute inset-0 bg-white z-20 flex flex-col"
    >
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <button onClick={() => setActiveSubPage('main')}>
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Privacy & Security</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Who can see my personal info</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-text-primary">Last Seen</h4>
                <p className="text-sm text-text-secondary">{privacySettings.lastSeen}</p>
              </div>
              <select 
                value={privacySettings.lastSeen}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, lastSeen: e.target.value }))}
                className="bg-surface px-3 py-1 rounded-lg text-sm font-medium focus:outline-none"
              >
                <option>Everyone</option>
                <option>My Contacts</option>
                <option>Nobody</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-text-primary">Profile Photo</h4>
                <p className="text-sm text-text-secondary">{privacySettings.profilePhoto}</p>
              </div>
              <select 
                value={privacySettings.profilePhoto}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, profilePhoto: e.target.value }))}
                className="bg-surface px-3 py-1 rounded-lg text-sm font-medium focus:outline-none"
              >
                <option>Everyone</option>
                <option>My Contacts</option>
                <option>Nobody</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-text-primary">About</h4>
                <p className="text-sm text-text-secondary">{privacySettings.about}</p>
              </div>
              <select 
                value={privacySettings.about}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, about: e.target.value }))}
                className="bg-surface px-3 py-1 rounded-lg text-sm font-medium focus:outline-none"
              >
                <option>Everyone</option>
                <option>My Contacts</option>
                <option>Nobody</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Messaging</h3>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-text-primary">Read Receipts</h4>
              <p className="text-sm text-text-secondary">If turned off, you won't send or receive Read Receipts.</p>
            </div>
            <button 
              onClick={() => setPrivacySettings(prev => ({ ...prev, readReceipts: !prev.readReceipts }))}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                privacySettings.readReceipts ? "bg-primary" : "bg-gray-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                privacySettings.readReceipts ? "right-1" : "left-1"
              )} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Security</h3>
          <button 
            onClick={() => setActiveSubPage('two-step')}
            className="w-full text-left py-2 border-b border-gray-100 flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-bold text-text-primary">Two-Step Verification</span>
              <span className="text-xs text-text-secondary">{securitySettings.twoStepEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <ChevronDown className="w-4 h-4 -rotate-90 text-text-secondary" />
          </button>
          <button 
            onClick={() => setActiveSubPage('security-notifications')}
            className="w-full text-left py-2 border-b border-gray-100 flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-bold text-text-primary">Security Notifications</span>
              <span className="text-xs text-text-secondary">{securitySettings.securityNotifications ? 'On' : 'Off'}</span>
            </div>
            <ChevronDown className="w-4 h-4 -rotate-90 text-text-secondary" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack}>
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h2 className="text-lg font-bold text-text-primary">Profile</h2>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="text-primary font-bold flex items-center gap-1"
        >
          {isSaving ? 'Saving...' : <><Save className="w-5 h-5" /> Save</>}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-8 bg-surface/30 relative overflow-hidden">
          <div className="relative">
            <img 
              src={avatar} 
              alt="Profile" 
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
              referrerPolicy="no-referrer"
            />
            <input 
              type="file" 
              id="avatar-input" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarChange} 
            />
            <button 
              onClick={triggerFileInput}
              className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white shadow-lg text-white"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <h3 className="mt-4 text-xl font-bold text-text-primary">{name || 'Your Name'}</h3>
          <p className="text-text-secondary text-sm">{status}</p>
        </div>

        {/* Form Section */}
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Name</label>
              <div className="flex items-center gap-3 border-b border-gray-200 py-2">
                <User className="w-5 h-5 text-text-secondary" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1 bg-transparent border-none focus:outline-none text-text-primary font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Status</label>
              <div className="flex items-center gap-3 border-b border-gray-200 py-2">
                <Info className="w-5 h-5 text-text-secondary" />
                <input 
                  type="text" 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="Enter your status"
                  className="flex-1 bg-transparent border-none focus:outline-none text-text-primary font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-primary uppercase tracking-wider">Phone</label>
                {isPhoneVerified ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> VERIFIED
                  </span>
                ) : (
                  <button 
                    onClick={startVerification}
                    disabled={isVerifying || !phone}
                    className="text-[10px] font-bold text-primary hover:underline disabled:opacity-50"
                  >
                    {isVerifying ? 'SENDING...' : 'VERIFY NOW'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 border-b border-gray-200 py-2">
                <Phone className="w-5 h-5 text-text-secondary" />
                <div className="flex items-center gap-2 flex-1">
                  <button 
                    onClick={() => setIsCountrySelectorOpen(true)}
                    className="flex items-center gap-1 bg-surface px-3 py-1.5 rounded-xl text-sm font-bold text-text-primary hover:bg-gray-200 transition-colors border border-gray-100 shadow-sm"
                  >
                    <span className="opacity-70">{countryIso}</span>
                    <span>{countryCode}</span>
                    <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                  </button>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="Enter phone number"
                    className="flex-1 bg-transparent border-none focus:outline-none text-text-primary font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Media Tabs Section */}
          <div className="mt-4 border-t border-gray-100">
            <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
              {[
                { id: 'all', icon: Grid, label: 'All' },
                { id: 'reels', icon: Film, label: 'Reel' },
                { id: 'photos', icon: ImageIcon, label: 'Photo' },
                { id: 'videos', icon: PlayCircle, label: 'Video' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative",
                    activeTab === tab.id ? "text-primary" : "text-text-secondary"
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="profileActiveTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-[300px] p-1">
              {activeTab === 'all' && (
                <div className="space-y-6 p-4">
                  <section>
                    <h3 className="font-bold text-text-primary mb-3">My Photos</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {myContent.photos.map(photo => (
                        <img 
                          key={photo.id} 
                          src={photo.url} 
                          onClick={() => setSelectedMedia({ ...photo, type: 'photo' })}
                          className="aspect-square object-cover rounded-lg cursor-pointer active:scale-95 transition-transform" 
                        />
                      ))}
                    </div>
                  </section>
                </div>
              )}
              {activeTab === 'reels' && (
                <div className="grid grid-cols-3 gap-1">
                  <div className="aspect-[9/16] bg-surface flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/20 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors group">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-primary">Create Reel</span>
                  </div>
                  {myContent.reels.map(reel => (
                    <div 
                      key={reel.id} 
                      onClick={() => setSelectedMedia({ ...reel, type: 'reel' })}
                      className="relative aspect-[9/16] bg-gray-100 overflow-hidden cursor-pointer group"
                    >
                      <img src={reel.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold">
                        <Play className="w-3 h-3 fill-current" />
                        {reel.views}
                      </div>
                      <div className="absolute top-2 right-2">
                        <Film className="w-4 h-4 text-white/80" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'photos' && (
                <div className="grid grid-cols-3 gap-1">
                  {myContent.photos.map(photo => (
                    <div 
                      key={photo.id} 
                      onClick={() => setSelectedMedia({ ...photo, type: 'photo' })}
                      className="relative aspect-square bg-gray-100 overflow-hidden cursor-pointer group"
                    >
                      <img src={photo.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        <Heart className="w-3 h-3 fill-current" />
                        {photo.likes}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'videos' && (
                <div className="grid grid-cols-2 gap-2 p-1">
                  {myContent.videos.map(video => (
                    <div 
                      key={video.id} 
                      onClick={() => setSelectedMedia({ ...video, type: 'video' })}
                      className="relative aspect-video bg-gray-100 overflow-hidden rounded-xl cursor-pointer group shadow-sm"
                    >
                      <img src={video.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                          <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-3 flex items-center gap-3 text-white text-[10px] font-bold">
                        <span className="flex items-center gap-1"><Play className="w-3 h-3 fill-current" /> {video.views}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> {video.likes}</span>
                      </div>
                      <div className="absolute bottom-2 right-3 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold backdrop-blur-sm">
                        {video.duration}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

      {/* Media Viewer */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col"
          >
            <header className="flex items-center justify-between px-4 py-4 z-10">
              <button onClick={() => setSelectedMedia(null)} className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                <X className="w-6 h-6 text-white" />
              </button>
              <div className="text-center">
                <p className="text-white font-bold text-sm uppercase tracking-widest">{selectedMedia.type}</p>
                <p className="text-white/60 text-[10px]">Your Content</p>
              </div>
              <button className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                <MoreVertical className="w-6 h-6 text-white" />
              </button>
            </header>

            <div className="flex-1 flex items-center justify-center p-4 relative">
              {selectedMedia.type === 'photo' ? (
                <img 
                  src={selectedMedia.url} 
                  className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
                />
              ) : (
                <video 
                  src={selectedMedia.videoUrl} 
                  autoPlay 
                  loop
                  muted={false}
                  playsInline
                  className={cn(
                    "max-w-full max-h-full rounded-2xl shadow-2xl",
                    selectedMedia.type === 'reel' ? "aspect-[9/16] object-cover" : "object-contain"
                  )}
                />
              )}

              {/* Comments Overlay */}
              <AnimatePresence>
                {showComments && (
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="absolute inset-x-0 bottom-0 top-20 bg-white rounded-t-[32px] z-20 flex flex-col shadow-2xl"
                  >
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-4" onClick={() => setShowComments(false)} />
                    <div className="px-6 flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-text-primary">Comments</h3>
                      <button onClick={() => setShowComments(false)} className="text-primary font-bold text-sm">Close</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-6 space-y-4">
                      {comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-10">
                          <MessageCircle className="w-12 h-12 mb-2" />
                          <p className="text-sm font-medium">No comments yet.<br/>Be the first to share your opinion!</p>
                        </div>
                      ) : (
                        comments.map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                              {comment.user[0]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-text-primary">{comment.user}</span>
                                <span className="text-[10px] text-text-secondary">{comment.timestamp}</span>
                              </div>
                              <p className="text-sm text-text-secondary mt-0.5">{comment.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 border-t border-gray-100 flex items-center gap-3 bg-white">
                      <div className="flex-1 bg-surface rounded-2xl px-4 py-2.5 flex items-center gap-2">
                        <input 
                          type="text" 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        />
                        <button onClick={handleAddComment} className="text-primary">
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <footer className="p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-around relative">
              {/* Reaction Menu */}
              <AnimatePresence>
                {showReactions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-20 left-4 right-4 bg-white/90 backdrop-blur-xl rounded-full p-2 flex justify-around shadow-2xl border border-white/20"
                  >
                    {REACTION_EMOJIS.map((reaction) => (
                      <button 
                        key={reaction.label}
                        onClick={() => {
                          setCurrentReaction(reaction.emoji);
                          setShowReactions(false);
                        }}
                        className="text-2xl hover:scale-125 transition-transform active:scale-90 p-1"
                        title={reaction.label}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onLongPress={() => setShowReactions(true)}
                onClick={() => {
                  if (currentReaction) setCurrentReaction(null);
                  else setCurrentReaction('👍');
                }}
                className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-all hover:scale-110"
              >
                <div className="relative">
                  {currentReaction ? (
                    <span className="text-2xl">{currentReaction}</span>
                  ) : (
                    <Heart className="w-6 h-6" />
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter">
                  {currentReaction ? 'Reacted' : (selectedMedia.likes || '0')}
                </span>
              </button>
              <button 
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-all hover:scale-110"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{selectedMedia.comments || '0'}</span>
              </button>
              <button 
                onClick={() => setShowShareModal(true)}
                className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-all hover:scale-110"
              >
                <Share2 className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Share</span>
              </button>
              <button className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-all hover:scale-110">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Edit</span>
              </button>
            </footer>

            {/* Share Modal */}
            <AnimatePresence>
              {showShareModal && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
                  onClick={() => setShowShareModal(false)}
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-text-primary">Share this {selectedMedia.type}</h3>
                      <p className="text-sm text-text-secondary">Copy the link below to share with your friends on any social media platform.</p>
                    </div>

                    <div className="bg-surface p-4 rounded-2xl flex items-center justify-between gap-3 border border-gray-100">
                      <p className="text-xs text-text-secondary truncate flex-1">
                        https://connectme.app/share/my-content/{selectedMedia.id}
                      </p>
                      <button 
                        onClick={handleShare}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          isCopied ? "bg-green-500 text-white" : "bg-primary text-white"
                        )}
                      >
                        {isCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {['WhatsApp', 'Facebook', 'Twitter', 'Instagram'].map(platform => (
                        <div key={platform} className="flex flex-col items-center gap-1">
                          <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                            <Share2 className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold text-text-secondary">{platform}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setShowShareModal(false)}
                      className="w-full bg-surface text-text-primary font-bold py-4 rounded-2xl active:scale-95 transition-transform"
                    >
                      Cancel
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options List */}
        <div className="mt-4 border-t border-gray-100">
          <button 
            onClick={() => setIsQrModalOpen(true)}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface transition-colors"
          >
            <QrCode className="w-5 h-5 text-text-secondary" />
            <span className="flex-1 text-left text-text-primary font-medium">My QR Code</span>
          </button>
          <button 
            onClick={() => setActiveSubPage('notifications')}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface transition-colors"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            <span className="flex-1 text-left text-text-primary font-medium">Notifications</span>
          </button>
          <button 
            onClick={() => setActiveSubPage('privacy')}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface transition-colors"
          >
            <Shield className="w-5 h-5 text-text-secondary" />
            <span className="flex-1 text-left text-text-primary font-medium">Privacy & Security</span>
          </button>
          <button className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface transition-colors text-red-500">
            <LogOut className="w-5 h-5" />
            <span className="flex-1 text-left font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Sub Pages */}
      <AnimatePresence>
        {activeSubPage === 'notifications' && renderNotificationsPage()}
        {activeSubPage === 'privacy' && renderPrivacyPage()}
        {activeSubPage === 'two-step' && renderTwoStepPage()}
        {activeSubPage === 'security-notifications' && renderSecurityNotificationsPage()}
        {activeSubPage === 'call-tones' && renderCallTonesPage()}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl flex flex-col items-center p-8 gap-6"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <h3 className="text-xl font-bold text-primary">My Scan Code</h3>
                <p className="text-xs text-text-secondary">Share this code with friends to add you instantly</p>
              </div>

              <div className="p-4 bg-white rounded-2xl shadow-inner border-4 border-primary/10">
                <div ref={qrCanvasRef as any}>
                  <QRCodeCanvas 
                    value={`tikring-user:${phone || 'unknown'}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: avatar || 'https://picsum.photos/seed/me/100',
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <p className="font-bold text-text-primary">{name || 'User'}</p>
                <p className="text-sm text-text-secondary">{phone || 'No phone set'}</p>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={async () => {
                    const canvas = qrCanvasRef.current?.querySelector('canvas');
                    if (canvas) {
                      const url = canvas.toDataURL('image/png');
                      
                      if (navigator.share) {
                        try {
                          const blob = await (await fetch(url)).blob();
                          const file = new File([blob], 'tikring-qr.png', { type: 'image/png' });
                          await navigator.share({
                            title: 'My TikRing QR Code',
                            text: `Scan this to add me on TikRing: ${phone}`,
                            files: [file]
                          });
                        } catch (err) {
                          // Fallback to download if share fails or is cancelled
                          const link = document.createElement('a');
                          link.download = 'my-tikring-qr.png';
                          link.href = url;
                          link.click();
                        }
                      } else {
                        const link = document.createElement('a');
                        link.download = 'my-tikring-qr.png';
                        link.href = url;
                        link.click();
                      }
                    }
                  }}
                  className="flex-1 bg-surface py-3 rounded-xl font-bold text-primary flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button 
                  onClick={() => {
                    const shareLink = `https://tikring.app/user/${phone || 'unknown'}`;
                    navigator.clipboard.writeText(shareLink);
                    const toast = document.createElement('div');
                    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-xl z-[200] font-bold';
                    toast.innerText = 'Link Copied!';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
                  }}
                  className="flex-1 bg-surface py-3 rounded-xl font-bold text-primary flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Link
                </button>
                <button 
                  onClick={() => setIsQrModalOpen(false)}
                  className="flex-1 bg-primary py-3 rounded-xl font-bold text-white shadow-lg shadow-primary/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Country Selector Modal */}
      <AnimatePresence>
        {isCountrySelectorOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-primary text-white">
                <h3 className="font-bold">Select Country</h3>
                <button onClick={() => { setIsCountrySelectorOpen(false); setCountrySearch(''); }} className="p-1 hover:bg-white/20 rounded-full">
                  <ArrowLeft className="w-5 h-5 rotate-90" />
                </button>
              </div>
              
              {/* Search in Modal */}
              <div className="p-3 border-b border-gray-50 bg-surface/50">
                <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
                  <ChevronDown className="w-4 h-4 text-text-secondary rotate-90" />
                  <input 
                    type="text" 
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country or code..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium"
                    autoFocus
                  />
                  {countrySearch && (
                    <button onClick={() => setCountrySearch('')}>
                      <ChevronDown className="w-4 h-4 text-text-secondary rotate-0" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.name}
                      onClick={() => selectCountry(country)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors",
                        countryCode === country.code && countryFlag === country.flag 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-surface text-text-primary"
                      )}
                    >
                      <span className="text-2xl">{country.flag}</span>
                      <div className="flex flex-col flex-1 text-left">
                        <span className="font-medium truncate">{country.name}</span>
                        <span className="text-xs opacity-50">{country.iso}</span>
                      </div>
                      <span className="text-sm font-bold opacity-60">{country.code}</span>
                      {countryCode === country.code && countryFlag === country.flag && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="py-10 text-center text-text-secondary">
                    <p className="text-sm">No countries found</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Verification Modal */}
      <AnimatePresence>
        {isVerificationModalOpen && (
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
              className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl p-6 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Verify Phone</h3>
                <p className="text-sm text-text-secondary">
                  Enter the 4-digit code sent to <br/>
                  <span className="font-bold text-text-primary">{countryCode} {phone}</span>
                </p>
                <div className="mt-2 py-1 px-3 bg-primary/5 rounded-lg inline-block">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Demo Code: {otp}</p>
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="relative">
                  <input 
                    type="text" 
                    maxLength={4}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="0000"
                    className="w-full text-center text-3xl font-bold tracking-[1em] py-3 bg-surface rounded-2xl border-2 border-transparent focus:border-primary focus:outline-none transition-all"
                    autoFocus
                  />
                </div>
                
                {verificationError && (
                  <p className="text-xs font-bold text-red-500">{verificationError}</p>
                )}

                <div className="space-y-3">
                  <button 
                    onClick={verifyOtp}
                    disabled={isVerifying || enteredOtp.length < 4}
                    className="w-full bg-primary text-white font-bold py-3 rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </>
                    ) : 'Verify & Continue'}
                  </button>

                  <div className="flex flex-col items-center gap-2">
                    {resendTimer > 0 ? (
                      <p className="text-xs text-text-secondary font-medium">
                        Resend code in <span className="text-primary font-bold">{resendTimer}s</span>
                      </p>
                    ) : (
                      <button 
                        onClick={startVerification}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => { setIsVerificationModalOpen(false); setEnteredOtp(''); setVerificationError(''); }}
                  className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
