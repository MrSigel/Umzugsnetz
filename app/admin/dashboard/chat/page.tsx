'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/components/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Send, User, Search, MoreVertical, Phone, Video, Menu, X } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'admin' | 'bot';
  text: string;
  name?: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  messages: ChatMessage[];
}

export default function AdminChatPage() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('admin_chat_global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new;
          updateSessionsWithNewMessage(newMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [sessions, activeSessionId]);

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const grouped = data.reduce((acc: any, msg: any) => {
          const sid = msg.session_id;
          if (!acc[sid]) {
            acc[sid] = {
              id: sid,
              name: msg.user_name || 'Unbekannt',
              lastMessage: msg.text,
              time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              unread: 0,
              messages: []
            };
          }
          acc[sid].messages.push({
            sender: msg.sender,
            text: msg.text,
            name: msg.user_name,
            timestamp: msg.created_at
          });
          acc[sid].lastMessage = msg.text;
          acc[sid].time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return acc;
        }, {});

        const sessionList = Object.values(grouped) as ChatSession[];
        setSessions(sessionList.reverse());
        if (sessionList.length > 0 && !activeSessionId) {
          setActiveSessionId(sessionList[0].id);
        }
      }
    } catch (err: any) {
      showToast('error', 'Chat konnte nicht geladen werden', err.message);
    }
  }

  const updateSessionsWithNewMessage = (msg: any) => {
    setSessions(prev => {
      const sid = msg.session_id;
      const existing = prev.find(s => s.id === sid);
      
      const chatMsg: ChatMessage = {
        sender: msg.sender,
        text: msg.text,
        name: msg.user_name,
        timestamp: msg.created_at
      };

      if (existing) {
        return prev.map(s => {
          if (s.id === sid) {
            return {
              ...s,
              lastMessage: msg.text,
              time: 'Jetzt',
              unread: activeSessionId === sid ? 0 : s.unread + 1,
              messages: [...s.messages, chatMsg]
            };
          }
          return s;
        });
      } else {
        return [{
          id: sid,
          name: msg.user_name || 'Neu',
          lastMessage: msg.text,
          time: 'Jetzt',
          unread: 1,
          messages: [chatMsg]
        }, ...prev];
      }
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSessionId) return;

    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;

    // Save to Supabase
    try {
      const { error } = await supabase.from('chat_messages').insert([{
        sender: 'admin',
        session_id: activeSessionId,
        user_name: activeSession.name,
        text: inputText
      }]);

      if (error) throw error;
      setInputText('');
    } catch (err: any) {
      showToast('error', 'Nachricht konnte nicht gesendet werden', err.message);
    }
  };

  const filteredSessions = useMemo(() => {
    if (!searchTerm) {
      return sessions;
    }

    const term = searchTerm.toLowerCase();
    return sessions.filter((session) =>
      session.name.toLowerCase().includes(term) ||
      session.lastMessage.toLowerCase().includes(term),
    );
  }, [searchTerm, sessions]);

  const currentSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="h-[calc(100dvh-160px)] flex bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
      {/* Mobile overlay for sessions */}
      <AnimatePresence>
        {isSessionsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSessionsOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sessions Sidebar */}
      <aside className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white border-r border-slate-100 flex flex-col z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${isSessionsOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSessionsOpen(false)}
              className="lg:hidden w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
              aria-label="Chatliste schließen"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Chats suchen..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#0075c9]/20 transition-all font-sans"
            />
          </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.map(session => (
            <button
              key={session.id}
              onClick={() => {
                setActiveSessionId(session.id);
                setSessions(prev => prev.map(s => s.id === session.id ? { ...s, unread: 0 } : s));
                setIsSessionsOpen(false);
              }}
              className={`w-full p-4 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left ${
                activeSessionId === session.id ? 'bg-slate-50' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-[#0075c9]">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="text-sm font-bold text-slate-800 truncate">{session.name}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{session.time}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{session.lastMessage}</p>
              </div>
              {session.unread > 0 && (
                <div className="w-5 h-5 bg-[#0075c9] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {session.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {/* Chat Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSessionsOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
              aria-label="Chatliste öffnen"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0075c9]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{currentSession?.name}</p>
              <p className="text-[10px] font-bold text-[#00b67a] uppercase tracking-wider">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => showToast('info', 'Telefon nicht verfügbar', 'Für diese Chat-Session sind keine Telefonnummern hinterlegt.')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <Phone className="w-5 h-5" />
             </button>
             <button onClick={() => showToast('info', 'Video nicht verfügbar', 'Video-Calls sind im Chat aktuell nicht aktiviert.')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <Video className="w-5 h-5" />
             </button>
             <button onClick={() => {
               if (!currentSession?.id) {
                 showToast('warning', 'Keine Session ausgewählt');
                 return;
               }
               navigator.clipboard.writeText(currentSession.id);
               showToast('success', 'Session-ID kopiert', currentSession.id);
             }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <MoreVertical className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence initial={false}>
            {currentSession?.messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                    msg.sender === 'admin' 
                      ? 'bg-[#0075c9] text-white rounded-br-sm' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1.5 font-medium ${msg.sender === 'admin' ? 'text-white/60' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nachricht schreiben..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#0075c9]/20 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-[#0075c9] text-white px-8 rounded-2xl font-bold hover:bg-[#005ea6] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              Senden
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
