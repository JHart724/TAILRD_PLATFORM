import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { toast } from './shared/Toast';
import { 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  Shield, 
  HelpCircle, 
  FileText,
  Users,
  Activity,
  ChevronDown,
  Mail,
  Lock,
  Palette,
  Database,
  Clock,
  UserCog
} from 'lucide-react';

interface UserMenuProps {
  userName?: string;
  userRole?: string;
  userEmail?: string;
  userAvatar?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ 
  userName = 'Dr. Sarah Williams',
  userRole = 'Cardiology Director',
  userEmail = 'sarah.williams@hospital.com',
  userAvatar
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
 setIsOpen(false);
 }
 };

 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuSections = [
 {
 title: 'Account',
 items: [
 { icon: User, label: 'My Profile', badge: null, action: () => navigate('/profile') },
 { icon: Settings, label: 'Preferences', badge: null, action: () => navigate('/settings') },
 { icon: Bell, label: 'Notifications', badge: '3', badgeColor: 'bg-red-500', action: () => toast.info('Notifications', 'You have 3 unread notifications.') },
 ]
 },
 {
 title: 'Clinical Tools',
 items: [
 { icon: Activity, label: 'My Patients', badge: '47', badgeColor: 'bg-porsche-500', action: () => navigate('/dashboard') },
 { icon: FileText, label: 'Reports & Analytics', badge: null, action: () => navigate('/dashboard') },
 { icon: Users, label: 'Care Teams', badge: null, action: () => navigate('/dashboard') },
 { icon: Clock, label: 'Recent Activity', badge: null, action: () => toast.info('Recent Activity', 'Activity log coming in a future update.') },
 ]
 },
 {
 title: 'System',
 items: [
 { icon: UserCog, label: 'Super Admin', badge: 'ADMIN', badgeColor: 'bg-arterial-500', action: () => navigate('/admin') },
 { icon: Shield, label: 'Privacy & Security', badge: null, action: () => navigate('/settings') },
 { icon: Database, label: 'Data Preferences', badge: null, action: () => navigate('/settings') },
 { icon: Palette, label: 'Display Settings', badge: null, action: () => navigate('/settings') },
 { icon: Lock, label: 'Access Controls', badge: null, action: () => toast.info('Access Controls', 'Contact your administrator to manage access permissions.') },
 ]
 },
 {
 title: 'Support',
 items: [
 { icon: HelpCircle, label: 'Help Center', badge: null, action: () => toast.info('Help Center', 'Contact TAILRD support at support@tailrd.com for assistance.') },
 { icon: Mail, label: 'Contact Support', badge: null, action: () => toast.info('Contact Support', 'Reach us at support@tailrd.com or call ext. 4357.') },
 ]
 }
  ];

  const getInitials = (name: string) => {
 return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
 <div className="relative" ref={menuRef}>
 {/* User Button */}
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="flex items-center gap-3 px-3 py-2 rounded-lg border border-titanium-200 bg-white hover:bg-titanium-50 transition-all duration-200 hover:shadow-md"
 aria-label="User menu"
 aria-haspopup="true"
 aria-expanded={isOpen}
 >
 {/* Avatar */}
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-porsche-500 to-porsche-600 flex items-center justify-center text-white font-semibold text-sm">
 {userAvatar ? (
 <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
 ) : (
 getInitials(userName)
 )}
 </div>
 
 {/* Name and Role */}
 <div className="text-left hidden md:block">
 <div className="text-sm font-semibold text-titanium-900">{userName}</div>
 <div className="text-xs text-titanium-600">{userRole}</div>
 </div>
 
 {/* Chevron */}
 <ChevronDown className={`w-4 h-4 text-titanium-600 transition-transform duration-200 ${
 isOpen ? 'rotate-180' : ''
 }`} />
 </button>

 {/* Dropdown Menu */}
 {isOpen && (
 <div role="menu" className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-titanium-200 z-50 overflow-hidden">
 {/* User Header */}
 <div className="p-4 bg-gradient-to-r from-porsche-50 to-porsche-100 border-b border-titanium-200">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center">
 {userAvatar ? (
 <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
 ) : (
 <div className="w-full h-full rounded-full bg-gradient-to-br from-porsche-500 to-porsche-600 flex items-center justify-center text-white font-bold">
 {getInitials(userName)}
 </div>
 )}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{userName}</div>
 <div className="text-sm text-titanium-600">{userRole}</div>
 <div className="text-xs text-titanium-500">{userEmail}</div>
 </div>
 </div>
 </div>

 {/* Menu Sections */}
 <div className="max-h-[60vh] overflow-y-auto">
 {menuSections.map((section, sectionIndex) => (
 <div key={section.title} className={sectionIndex > 0 ? 'border-t border-titanium-100' : ''}>
 <div className="px-4 py-2">
 <div className="text-xs font-semibold text-titanium-500 uppercase tracking-wider">
 {section.title}
 </div>
 </div>
 <div className="pb-2">
 {section.items.map((item) => {
 const IconComponent = item.icon;
 return (
 <button
 key={item.label}
 role="menuitem"
 onClick={() => {
 item.action();
 setIsOpen(false);
 }}
 className="w-full px-4 py-2 flex items-center gap-3 hover:bg-titanium-50 transition-colors duration-150"
 >
 <IconComponent className="w-4 h-4 text-titanium-600" />
 <span className="flex-1 text-left text-sm text-titanium-700">
 {item.label}
 </span>
 {item.badge && (
 <span className={`px-2 py-0.5 text-xs font-semibold text-white rounded-full ${
 item.badgeColor || 'bg-titanium-400'
 }`}>
 {item.badge}
 </span>
 )}
 </button>
 );
 })}
 </div>
 </div>
 ))}
 </div>

 {/* Sign Out */}
 <div className="border-t border-titanium-200 p-2">
 <button
 role="menuitem"
 onClick={async () => {
 setIsOpen(false);
 await logout();
 navigate('/', { replace: true });
 }}
 className="w-full px-4 py-2 flex items-center gap-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
 >
 <LogOut className="w-4 h-4" />
 <span className="font-semibold text-sm">Sign Out</span>
 </button>
 </div>
 </div>
 )}
 </div>
  );
};

export default UserMenu;