import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead } from '../api';
import type { Notification } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { Bell, CheckCheck, Inbox } from 'lucide-react';

export default function Notifications() {
  const { user } = useAuth();
  const [list, setList] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    if (!user) return;
    setLoading(true);
    getNotifications(user.id, unreadOnly)
      .then((data: any) => setList(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, [user, unreadOnly]);

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setList(list.map(n => n.id === id ? { ...n, read: true } : n));
      if (unreadOnly) {
        setList(list.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-slate-400 text-sm mt-1">Alerts, updates, security notices, and transfer statuses.</p>
          </div>

          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
              unreadOnly
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                : 'text-slate-400 border-white/[0.08] hover:bg-white/[0.03]'
            }`}
          >
            {unreadOnly ? 'Showing Unread' : 'Show All'}
          </button>
        </div>

        {/* Notifications list */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Retrieving notifications...
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 bg-white/[0.01] border border-white/[0.04] rounded-2xl">
              <Inbox size={48} className="text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">Your inbox is clear.</p>
            </div>
          ) : (
            list.map(n => (
              <div
                key={n.id}
                className={`flex justify-between items-start p-5 rounded-2xl border transition-all ${
                  n.read
                    ? 'bg-white/[0.01] border-white/[0.04] opacity-70'
                    : 'bg-gradient-to-r from-cyan-950/20 to-blue-950/20 border-cyan-500/20'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`p-2.5 rounded-xl ${
                    n.read ? 'bg-white/[0.04] text-slate-500' : 'bg-cyan-500/10 text-cyan-400'
                  }`}>
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium pr-4">{n.message}</p>
                    <span className="text-xs text-slate-500 mt-1 block">
                      {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-slate-500 hover:text-cyan-400 transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]"
                    title="Mark as Read"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
