import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, List, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from './AuthContext';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/tambah', icon: <FilePlus2 size={20} />, label: 'Tambah Aduan' },
    { to: '/senarai', icon: <List size={20} />, label: 'Senarai Aduan' },
  ];

  const filteredNav = navItems;

  return (
    <div className="min-h-screen text-slate-800 flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-card shadow-sm fixed h-full z-10 border-r-0">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-bold shadow-lg">
            RMT
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">e-Aduan</h1>
            <p className="text-xs text-slate-500">KPM RMT</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "sidebar-item-active font-medium shadow-sm" 
                    : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200/50">
          <div className="flex items-center space-x-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <UserIcon size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.role === 'Admin' ? 'Admin' : user?.name}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span>Log Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen relative overflow-x-hidden">
        <div className="md:hidden glass-card sticky top-0 z-20 p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              RMT
            </div>
            <h1 className="font-bold text-slate-800">e-Aduan</h1>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-500">
            <LogOut size={20} />
          </button>
        </div>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card flex justify-around p-2 z-20 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe rounded-t-[24px]">
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors",
                isActive ? "text-blue-600" : "text-slate-500"
              )
            }
          >
            {item.icon}
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
