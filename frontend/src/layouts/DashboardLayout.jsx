import React, { useState } from 'react';
import { Navigate, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShoppingBag, 
  Bot, 
  Sparkles,
  PackageSearch
} from 'lucide-react';

const DashboardLayout = ({ allowedRole }) => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Security & Route Protection
  if (!token) return <Navigate to="/" replace />;
  if (allowedRole && user?.role !== allowedRole) return <Navigate to="/" replace />;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ─── Navigation Links ───
  const adminLinks = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Manage Clients', path: '/admin/clients', icon: Users },
    { name: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  const clientLinks = [
    { name: 'Workspace', path: '/client/dashboard', icon: LayoutDashboard },
    { name: 'Order Pipeline', path: '/client/orders', icon: ShoppingBag },
    { name: 'Product Catalog', path: '/client/products', icon: PackageSearch },
    { name: 'AI Brain Setup', path: '/client/ai-setup', icon: Bot },
  ];

  const navLinks = user?.role === 'admin' ? adminLinks : clientLinks;

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-300 font-sans selection:bg-zinc-800 selection:text-white flex overflow-hidden">
      
      {/* ─── Mobile Sidebar Overlay ─── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ─── Sidebar (Desktop & Mobile) ─── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#050505] border-r border-zinc-900 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-lg rounded-sm shrink-0">T</div>
            <span className="font-semibold text-white tracking-tight">THIRDWAVE-CRM</span>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="px-3 mb-4 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
            Menu
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.includes(link.path);
            
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-zinc-900/80 text-white border border-zinc-800/50 shadow-sm' 
                    : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200 transparent border border-transparent'}
                `}
              >
                <Icon className={`mr-3 h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout Bottom Section */}
        <div className="p-4 border-t border-zinc-900 bg-[#0A0A0A]">
          <div className="flex items-center px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 mb-3">
            <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold border border-zinc-700 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User Name'}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{user?.role || 'Account'} Access</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-colors border border-transparent hover:border-red-500/20 active:scale-[0.98]"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 flex flex-col min-w-0 lg:pl-72 h-screen overflow-hidden">
        
        {/* Mobile Topbar */}
        <header className="lg:hidden h-16 bg-[#050505] border-b border-zinc-900 flex items-center justify-between px-4 shrink-0 z-30">
          <div className="flex items-center gap-3">
             <div className="w-7 h-7 bg-white text-black flex items-center justify-center font-bold text-sm rounded-sm shrink-0">T</div>
             <span className="font-semibold text-white tracking-tight text-sm">THIRDWAVE</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg bg-zinc-900/50 border border-zinc-800"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Dynamic Page Content (Outlet) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 relative">
           {/* Background Grid Effect for Content Area */}
           <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
           
           <div className="relative z-10">
              <Outlet />
           </div>
        </div>
      </main>

    </div>
  );
};

export default DashboardLayout;