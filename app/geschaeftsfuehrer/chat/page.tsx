/**
 * Chat-Anfragen Management
 * Echte Daten aus Supabase chat_messages-Tabelle, helles Design
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MessageSquare, Clock, User } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface ChatSession {
  sessionId: string;
  userName: string;
  supportCategory: string;
  lastMessage: string;
  lastMessageAt: string;
  totalMessages: number;
  unreadCount: number;
  firstMessageAt: string;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/geschaeftsfuehrer/chat/list');
        const json = await res.json();
        setSessions(json.data || []);
      } catch { /* empty */ } finally { setLoading(false); }
    })();
  }, []);

  const filtered = sessions.filter((s) => {
    const matchSearch =
      s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sessionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'all' || s.supportCategory === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalUnread = sessions.reduce((sum, s) => sum + s.unreadCount, 0);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-3 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-black text-slate-800">Chat-Anfragen</h1>
        <p className="text-slate-500 text-sm mt-1">
          {totalUnread > 0 ? `${totalUnread} ungelesene Nachricht${totalUnread > 1 ? 'en' : ''}` : 'Alle Nachrichten gelesen'}
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-700 focus:outline-none focus:border-brand-blue"
        >
          <option value="all">Alle Kategorien</option>
          <option value="KUNDE">Kunden</option>
          <option value="PARTNER">Partner</option>
        </select>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((session) => {
            const hasUnread = session.unreadCount > 0;
            return (
              <motion.div
                key={session.sessionId}
                className={`p-4 rounded-2xl border transition-all cursor-default ${
                  hasUnread
                    ? 'bg-white border-brand-blue/15 shadow-[0_2px_12px_rgba(2,118,200,0.08)]'
                    : 'bg-white border-brand-blue/5 hover:border-brand-blue/12'
                }`}
                whileHover={{ x: 3 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      session.supportCategory === 'PARTNER' ? 'bg-violet-50' : 'bg-brand-blue-soft'
                    }`}>
                      <User className={`w-4 h-4 ${
                        session.supportCategory === 'PARTNER' ? 'text-violet-500' : 'text-brand-blue'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-slate-800 truncate">{session.userName}</h3>
                        {hasUnread && (
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] font-bold flex items-center justify-center">
                            {session.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 truncate">{session.lastMessage}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          session.supportCategory === 'PARTNER'
                            ? 'bg-violet-50 text-violet-600'
                            : 'bg-brand-blue-soft text-brand-blue'
                        }`}>
                          {session.supportCategory === 'PARTNER' ? 'Partner' : 'Kunde'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {session.totalMessages} Nachricht{session.totalMessages !== 1 ? 'en' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-slate-400">{timeAgo(session.lastMessageAt)}</p>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-brand-blue/8 p-12 text-center">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Keine Chat-Anfragen vorhanden</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
