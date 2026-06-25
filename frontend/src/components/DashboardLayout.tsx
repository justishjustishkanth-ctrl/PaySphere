import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ArrowRightLeft, CreditCard,
  ShieldCheck, Bell, LogOut, Globe, AlertTriangle, FileText
} from 'lucide-react';

interface Props { children: ReactNode; }

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Beneficiaries', icon: Users, path: '/beneficiaries' },
  { label: 'Send Money', icon: ArrowRightLeft, path: '/send' },
  { label: 'Transactions', icon: CreditCard, path: '/transactions' },
  { label: 'KYC Status', icon: ShieldCheck, path: '/kyc' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
];

const adminNavItems = [
  { label: 'Admin Panel', icon: AlertTriangle, path: '/admin' },
];

export default function DashboardLayout({ children }: Props) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const items = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <div className="flex h-screen bg-[#060c1a] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white/[0.03] border-r border-white/[0.06] px-4 py-6">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Globe size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">PaySphere</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {items.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="User Profile"
                className="w-8 h-8 rounded-full object-cover border border-white/[0.08]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.fullName || `${user?.firstName} ${user?.lastName}`}</p>
              <p className="text-slate-500 text-xs truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
