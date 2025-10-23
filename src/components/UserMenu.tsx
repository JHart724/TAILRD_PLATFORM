import React, { useState, useRef, useEffect } from 'react';
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
  Clock
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
        { icon: User, label: 'My Profile', badge: null, action: () => console.log('Profile') },
        { icon: Settings, label: 'Preferences', badge: null, action: () => console.log('Settings') },
        { icon: Bell, label: 'Notifications', badge: '3', badgeColor: 'bg-red-500', action: () => console.log('Notifications') },
      ]
    },
    {
      title: 'Clinical Tools',
      items: [
        { icon: Activity, label: 'My Patients', badge: '47', badgeColor: 'bg-medical-blue-500', action: () => console.log('Patients') },
        { icon: FileText, label: 'Reports & Analytics', badge: null, action: () => console.log('Reports') },
        { icon: Users, label: 'Care Teams', badge: null, action: () => console.log('Teams') },
        { icon: Clock, label: 'Recent Activity', badge: null, action: () => console.log('Activity') },
      ]
    },
    {
      title: 'System',
      items: [
        { icon: Shield, label: 'Privacy & Security', badge: null, action: () => console.log('Security') },
        { icon: Database, label: 'Data Preferences', badge: null, action: () => console.log('Data') },
        { icon: Palette, label: 'Display Settings', badge: null, action: () => console.log('Display') },
        { icon: Lock, label: 'Access Controls', badge: null, action: () => console.log('Access') },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', badge: null, action: () => console.log('Help') },
        { icon: Mail, label: 'Contact Support', badge: null, action: () => console.log('Support') },
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
        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-steel-200 bg-white hover:bg-steel-50 transition-all duration-200 hover:shadow-md"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-medical-blue-500 to-medical-blue-600 flex items-center justify-center text-white font-semibold text-sm">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
          ) : (
            getInitials(userName)
          )}
        </div>
        
        {/* Name and Role */}
        <div className="text-left hidden md:block">
          <div className="text-sm font-semibold text-steel-900">{userName}</div>
          <div className="text-xs text-steel-600">{userRole}</div>
        </div>
        
        {/* Chevron */}
        <ChevronDown className={`w-4 h-4 text-steel-600 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-steel-200 z-50 overflow-hidden" style={{ transform: 'translateX(20px)' }}>
          {/* User Header */}
          <div className="p-4 bg-gradient-to-r from-medical-blue-50 to-medical-blue-100 border-b border-steel-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-medical-blue-500 to-medical-blue-600 flex items-center justify-center text-white font-bold">
                    {getInitials(userName)}
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold text-steel-900">{userName}</div>
                <div className="text-sm text-steel-600">{userRole}</div>
                <div className="text-xs text-steel-500">{userEmail}</div>
              </div>
            </div>
          </div>

          {/* Menu Sections */}
          <div className="max-h-[60vh] overflow-y-auto">
            {menuSections.map((section, sectionIndex) => (
              <div key={section.title} className={sectionIndex > 0 ? 'border-t border-steel-100' : ''}>
                <div className="px-4 py-2">
                  <div className="text-xs font-semibold text-steel-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                </div>
                <div className="pb-2">
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.action();
                          setIsOpen(false);
                        }}
                        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-steel-50 transition-colors duration-150"
                      >
                        <IconComponent className="w-4 h-4 text-steel-600" />
                        <span className="flex-1 text-left text-sm text-steel-700">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className={`px-2 py-0.5 text-xs font-semibold text-white rounded-full ${
                            item.badgeColor || 'bg-steel-400'
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
          <div className="border-t border-steel-200 p-2">
            <button
              onClick={() => {
                console.log('Sign out');
                setIsOpen(false);
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