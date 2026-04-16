'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

type WidgetMessage = {
  sender: 'bot' | 'user' | 'admin';
  text: string;
};

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function LiveChatWidget() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'name' | 'chat'>('name');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasUnreadReply, setHasUnreadReply] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasUnreadReply(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('openChat', handleOpenChat);
    return () => window.removeEventListener('openChat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      return;
    }

    const existingSessionId = localStorage.getItem('umzugapp_chat_sid') || createSessionId();
    localStorage.setItem('umzugapp_chat_sid', existingSessionId);
    setSessionId(existingSessionId);

    let isCancelled = false;

    async function hydrateChat() {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', existingSessionId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        if (isCancelled || !data) {
          return;
        }

        if (data.length > 0) {
          setMessages(data.map((message) => ({
            sender: message.sender as WidgetMessage['sender'],
            text: message.text,
          })));
          setStep('chat');

          const lastNamedMessage = [...data].reverse().find((message) => message.user_name);
          if (lastNamedMessage?.user_name) {
            const [savedFirstName = '', ...savedLastName] = lastNamedMessage.user_name.split(' ');
            setFirstName(savedFirstName);
            setLastName(savedLastName.join(' '));
          }
        }
      } catch (error: any) {
        if (!isCancelled) {
          showToast('error', 'Chat konnte nicht geladen werden', error.message);
        }
      }
    }

    hydrateChat();

    const channel = supabase
      .channel(`chat:${existingSessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${existingSessionId}` },
        (payload) => {
          if (payload.new.sender === 'user') {
            return;
          }

          setMessages((currentMessages) => {
            const nextMessage = {
              sender: payload.new.sender as WidgetMessage['sender'],
              text: payload.new.text,
            };
            const lastMessage = currentMessages[currentMessages.length - 1];
            if (lastMessage?.sender === nextMessage.sender && lastMessage?.text === nextMessage.text) {
              return currentMessages;
            }

            return [...currentMessages, nextMessage];
          });

          if (!isOpen) {
            setHasUnreadReply(true);
          }
        },
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [pathname, showToast, isOpen]);

  const displayName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  async function handleStartChat(event: React.FormEvent) {
    event.preventDefault();

    if (!sessionId || !firstName.trim() || !lastName.trim()) {
      return;
    }

    const welcomeMessage = `Herzlich willkommen, ${firstName}! Wie können wir Ihnen heute weiterhelfen?`;

    try {
      setSending(true);
      const { error } = await supabase.from('chat_messages').insert([{
        sender: 'bot',
        session_id: sessionId,
        user_name: `${firstName.trim()} ${lastName.trim()}`,
        text: welcomeMessage,
      }]);

      if (error) {
        throw error;
      }

      setMessages([{ sender: 'bot', text: welcomeMessage }]);
      setStep('chat');
    } catch (error: any) {
      showToast('error', 'Chat konnte nicht gestartet werden', error.message);
    } finally {
      setSending(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();

    if (!sessionId || !input.trim() || sending) {
      return;
    }

    const nextMessage = input.trim();
    setMessages((currentMessages) => [...currentMessages, { sender: 'user', text: nextMessage }]);
    setInput('');

    try {
      setSending(true);
      const { error } = await supabase.from('chat_messages').insert([{
        sender: 'user',
        session_id: sessionId,
        user_name: displayName,
        text: nextMessage,
      }]);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setMessages((currentMessages) => currentMessages.slice(0, -1));
      setInput(nextMessage);
      showToast('error', 'Nachricht konnte nicht gesendet werden', error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[350px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
          >
            <div className="bg-gradient-to-r from-[#0075c9] to-[#00b67a] p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold">Live Support</h3>
                <p className="text-white/80 text-xs">Wir antworten in der Regel sofort</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-[400px] flex flex-col">
              {step === 'name' ? (
                <div className="p-6 flex-1 flex flex-col justify-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <User className="w-8 h-8 text-[#0075c9]" />
                  </div>
                  <h4 className="text-center font-bold text-slate-800 mb-2">Hallo!</h4>
                  <p className="text-center text-sm text-slate-900 mb-6">
                    Bitte geben Sie Ihren Namen ein, um den Chat zu starten.
                  </p>
                  <form onSubmit={handleStartChat} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Vorname"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#0075c9] transition-colors text-sm text-black placeholder:text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Nachname"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#0075c9] transition-colors text-sm text-black placeholder:text-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full bg-gradient-to-r from-[#0075c9] to-[#00b67a] text-white py-3 rounded-xl font-bold hover:shadow-lg transition-shadow mt-4 disabled:opacity-60"
                    >
                      {sending ? 'Startet...' : 'Chat starten'}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="p-4 flex-1 overflow-y-auto bg-slate-50 space-y-4">
                    {messages.map((message, index) => (
                      <div key={`${message.sender}-${index}`} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                            message.sender === 'user'
                              ? 'bg-[#0075c9] text-white rounded-br-sm'
                              : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-sm'
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ihre Nachricht..."
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:border-[#0075c9] transition-colors text-sm text-black placeholder:text-slate-600"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || sending}
                        className="w-10 h-10 flex-shrink-0 bg-[#0075c9] text-white rounded-full flex items-center justify-center hover:bg-[#005ea6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="w-16 h-16 rounded-full bg-gradient-to-r from-[#0075c9] to-[#00b67a] shadow-2xl flex items-center justify-center text-white relative focus:outline-none"
      >
        {isOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
        {!isOpen && hasUnreadReply && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
      </motion.button>
    </div>
  );
}
