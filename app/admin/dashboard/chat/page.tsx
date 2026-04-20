'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/components/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Send, User, Search, MoreVertical, Phone, Menu, X, CheckCircle2, Clock3 } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'admin';
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
  status: 'OPEN' | 'CLOSED';
  supportType: 'PARTNER' | 'KUNDE';
  messages: ChatMessage[];
}

function inferSupportType(messages: { text: string }[]): 'PARTNER' | 'KUNDE' {
  const combinedText = messages.map((message) => message.text).join(' ').toLowerCase();
  if (combinedText.includes('partner') || combinedText.includes('registrierung') || combinedText.includes('guthaben')) {
    return 'PARTNER';
  }
  return 'KUNDE';
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
    void fetchMessages();

    const channel = supabase
      .channel('admin_chat_global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          updateSessionsWithNewMessage(payload.new);
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
        const grouped = data.reduce((acc: Record<string, ChatSession>, msg: any) => {
          const sid = msg.session_id;
          if (!acc[sid]) {
            acc[sid] = {
              id: sid,
              name: msg.user_name || 'Unbekannt',
              lastMessage: msg.text,
              time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              unread: msg.sender === 'user' && msg.is_read === false ? 1 : 0,
              status: 'OPEN',
              supportType: 'KUNDE',
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
          if (msg.text === '[TICKET_GESCHLOSSEN]') {
            acc[sid].status = 'CLOSED';
            acc[sid].unread = 0;
          }
          if (msg.sender === 'user' && msg.is_read === false && acc[sid].status === 'OPEN') {
            acc[sid].unread += acc[sid].messages.length > 1 ? 1 : 0;
          }
          return acc;
        }, {});

        const sessionList = Object.values(grouped).map((session) => ({
          ...session,
          supportType: inferSupportType(session.messages),
          lastMessage: session.lastMessage === '[TICKET_GESCHLOSSEN]' ? 'Ticket abgeschlossen' : session.lastMessage,
        })) as ChatSession[];

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
            const nextMessages = [...s.messages, chatMsg];
            const nextStatus = msg.text === '[TICKET_GESCHLOSSEN]' ? 'CLOSED' : s.status;
            return {
              ...s,
              lastMessage: msg.text === '[TICKET_GESCHLOSSEN]' ? 'Ticket abgeschlossen' : msg.text,
              time: 'Jetzt',
              status: nextStatus,
              supportType: inferSupportType(nextMessages),
              unread: msg.sender === 'user' && activeSessionId !== sid && nextStatus !== 'CLOSED' ? s.unread + 1 : 0,
              messages: nextMessages
            };
          }
          return s;
        });
      }

      return [{
        id: sid,
        name: msg.user_name || 'Neu',
        lastMessage: msg.text === '[TICKET_GESCHLOSSEN]' ? 'Ticket abgeschlossen' : msg.text,
        time: 'Jetzt',
        unread: msg.sender === 'user' ? 1 : 0,
        status: msg.text === '[TICKET_GESCHLOSSEN]' ? 'CLOSED' : 'OPEN',
        supportType: inferSupportType([chatMsg]),
        messages: [chatMsg]
      }, ...prev];
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSessionId) return;

    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;

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

  const handleCloseSession = async () => {
    if (!activeSessionId || !currentSession || currentSession.status === 'CLOSED') return;

    try {
      const { error } = await supabase.from('chat_messages').insert([{
        sender: 'admin',
        session_id: activeSessionId,
        user_name: currentSession.name,
        text: '[TICKET_GESCHLOSSEN]'
      }]);

      if (error) throw error;

      setSessions(prev => prev.map(session =>
        session.id === activeSessionId ? { ...session, status: 'CLOSED', unread: 0, lastMessage: 'Ticket abgeschlossen' } : session
      ));
      showToast('success', 'Ticket abgeschlossen');
    } catch (err: any) {
      showToast('error', 'Ticket konnte nicht geschlossen werden', err.message);
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-sans"
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
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-brand-blue">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="text-sm font-bold text-slate-800 truncate">{session.name}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{session.time}</span>
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${session.supportType === 'PARTNER' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-slate-100 text-slate-600'}`}>
                    {session.supportType === 'PARTNER' ? 'Partner-Support' : 'Kunden-Support'}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${session.status === 'OPEN' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {session.status === 'OPEN' ? <Clock3 className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {session.status === 'OPEN' ? 'Offen' : 'Abgeschlossen'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{session.lastMessage}</p>
              </div>
              {session.unread > 0 && (
                <div className="w-5 h-5 bg-brand-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {session.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-slate-50/50">
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
            <div className="w-10 h-10 rounded-full bg-brand-blue-soft flex items-center justify-center text-brand-blue">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{currentSession?.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${currentSession?.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {currentSession?.status === 'CLOSED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                  {currentSession?.status === 'CLOSED' ? 'Abgeschlossen' : 'Offen'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {currentSession?.supportType === 'PARTNER' ? 'Partner-Support' : 'Kunden-Support'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => showToast('info', 'Telefon nicht verfügbar', 'Für diese Chat-Session sind keine Telefonnummern hinterlegt.')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
              <Phone className="w-5 h-5" />
            </button>
            <button onClick={() => void handleCloseSession()} disabled={!currentSession || currentSession.status === 'CLOSED'} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50">
              <CheckCircle2 className="w-5 h-5" />
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
                      ? 'bg-brand-blue text-white rounded-br-sm'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
                  }`}
                >
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {msg.sender === 'admin' ? 'Support' : 'Anfrage'}
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text === '[TICKET_GESCHLOSSEN]' ? 'Dieses Ticket wurde abgeschlossen.' : msg.text}</p>
                  <p className={`text-[10px] mt-1.5 font-medium ${msg.sender === 'admin' ? 'text-white/60' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={currentSession?.status === 'CLOSED' ? 'Dieses Ticket ist abgeschlossen.' : 'Nachricht schreiben...'}
              disabled={currentSession?.status === 'CLOSED'}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-sans disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || currentSession?.status === 'CLOSED'}
              className="bg-brand-blue text-white px-8 rounded-2xl font-bold hover:bg-brand-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
