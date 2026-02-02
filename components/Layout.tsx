import React from 'react';
import { LayoutDashboard, ClipboardCheck, FileText, LogOut, Menu, UserCircle, Calendar, Shield, ClipboardList } from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, currentUser, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Define standard menu items
  const menuItems = [
    { id: 'dashboard', label: '主儀表板', icon: LayoutDashboard },
    { id: 'progress_report', label: '進度匯報', icon: ClipboardCheck }, 
    { id: 'venue_check', label: '每月場館檢核', icon: ClipboardList }, // New Item
    { id: 'calendar', label: '行事曆', icon: Calendar },
    { id: 'meetings', label: '會議與現勘', icon: FileText },
  ];

  // Robust check for Admin role (handles whitespace and case variations)
  const isAdmin = currentUser?.role === UserRole.ADMIN || 
                  currentUser?.role?.trim() === UserRole.ADMIN ||
                  currentUser?.role?.toLowerCase() === 'admin';

  // Strictly add Admin Panel only if user is ADMIN
  if (isAdmin) {
    menuItems.push({ id: 'admin', label: '後台管理', icon: Shield });
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed w-full bg-white z-20 border-b flex items-center p-4 shadow-sm">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="mr-4">
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg text-gray-800">基隆市停車場履約系統</h1>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-10 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-center border-b px-6 bg-blue-600">
             <h1 className="font-bold text-xl text-white">履約管理系統</h1>
          </div>

          <div className="p-4 border-b bg-gray-50">
             <div className="flex items-center space-x-3">
                <UserCircle className="w-10 h-10 text-gray-400" />
                <div>
                   <p className="text-sm font-semibold text-gray-700">{currentUser?.name}</p>
                   <p className="text-xs text-gray-500">{currentUser?.role}</p>
                   {currentUser?.role !== UserRole.ADMIN && (
                     <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                       {currentUser?.assignedStation === 'ALL' ? '全區' : currentUser?.assignedStation}
                     </span>
                   )}
                </div>
             </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              登出系統
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;