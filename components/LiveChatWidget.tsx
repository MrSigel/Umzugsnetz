'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

type WidgetMessage = {
  sender: 'user' | 'admin';
  text: string;
};

type SuggestedQuestion = {
  id: string;
  label: string;
  message: string;
};

type BotAnswer = {
  handled: boolean;
  text: string;
};

const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: 'service', label: 'Wie funktioniert der Service?', message: 'Wie funktioniert euer Service genau?' },
  { id: 'kosten', label: 'Ist der Service kostenlos?', message: 'Ist der Service für mich kostenlos?' },
  { id: 'angebote', label: 'Wann erhalte ich Angebote?', message: 'Wie schnell erhalte ich passende Angebote?' },
  { id: 'partner', label: 'Partner werden', message: 'Wie kann ich Partner bei Umzugsnetz werden?' },
  { id: 'invite', label: 'Einladungscode', message: 'Wie funktioniert die Registrierung mit Einladungscode?' },
  { id: 'support', label: 'Mitarbeiter sprechen', message: 'Ich möchte mit einem Mitarbeiter sprechen.' },
];

const BOT_FALLBACK_MESSAGE = 'Leider kann ich Ihnen diese Frage nicht beantworten, wenn Sie aber möchten kann ich Ihre Anfrage an die zuständige Abteilung weiterleiten und es wird sich ein Mitarbeiter in Kürze melden. Geben Sie hierzu Ihre Kontaktdaten an wie Name, Vorname, Telefonnummer und E-Mail und zu wann Sie telefonisch am besten zu erreichen sind.';

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function getBotAnswer(message: string): BotAnswer {
  const normalized = message.toLowerCase();

  if (normalized.includes('kostenlos') || normalized.includes('kosten') || normalized.includes('gebühr')) {
    return {
      handled: true,
      text: 'Für Kunden ist die Anfrage kostenlos und unverbindlich. Sie erhalten passende Angebote aus unserem Netzwerk und entscheiden anschließend selbst, ob Sie eines annehmen möchten.',
    };
  }

  if (normalized.includes('wie funktioniert') || normalized.includes('ablauf') || normalized.includes('service')) {
    return {
      handled: true,
      text: 'Sie senden Ihre Anfrage über den Rechner oder das Formular. Anschließend gleichen wir die Anfrage mit passenden Umzugs- oder Entrümpelungsfirmen ab. Danach erhalten Sie unverbindliche Rückmeldungen und können Angebote vergleichen.',
    };
  }

  if (normalized.includes('wie schnell') || normalized.includes('wann') || normalized.includes('angebote') || normalized.includes('rückmeldung')) {
    return {
      handled: true,
      text: 'In der Regel erhalten Sie erste Rückmeldungen innerhalb weniger Stunden. Je nach Region, Termin und Auslastung kann es im Einzelfall etwas länger dauern.',
    };
  }

  if (normalized.includes('partner') && (normalized.includes('werden') || normalized.includes('registrieren') || normalized.includes('bewerben'))) {
    return {
      handled: true,
      text: 'Partner registrieren sich über umzugsnetz.de/partners/register. Für die Registrierung wird in der Regel ein Einladungscode benötigt, den das Admin-Team nach Prüfung versendet.',
    };
  }

  if (normalized.includes('einladungscode') || normalized.includes('invite') || normalized.includes('registrierungscode')) {
    return {
      handled: true,
      text: 'Wenn Sie einen Einladungscode erhalten haben, können Sie sich unter umzugsnetz.de/partners/register registrieren. Der Code wird dort während des Registrierungsprozesses geprüft.',
    };
  }

  if (normalized.includes('lead') || normalized.includes('kundenanfrage') || normalized.includes('anfragen kaufen') || normalized.includes('guthaben') || normalized.includes('wallet')) {
    return {
      handled: true,
      text: 'Partner sehen verfügbare Kundenanfragen im Partner-Dashboard. Für Freischaltungen wird ausreichend Guthaben benötigt. Guthaben, Transaktionen und Aufladeanfragen können direkt im Finanzbereich verwaltet werden.',
    };
  }

  if (normalized.includes('mitarbeiter') || normalized.includes('anrufen') || normalized.includes('rückruf') || normalized.includes('kontakt')) {
    return {
      handled: false,
      text: BOT_FALLBACK_MESSAGE,
    };
  }

  return {
    handled: false,
    text: BOT_FALLBACK_MESSAGE,
  };
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
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactBestTime, setContactBestTime] = useState('');
  const [lastUnhandledQuestion, setLastUnhandledQuestion] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, escalationOpen]);

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
  const contactFormValid = firstName.trim() && lastName.trim() && contactPhone.trim() && contactEmail.trim() && contactBestTime.trim();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

async function insertAdminMessage(text: string) {
    if (!sessionId) {
      return;
    }

    const { error } = await supabase.from('chat_messages').insert([{
      sender: 'admin',
      session_id: sessionId,
      support_category: 'KUNDE',
      user_name: displayName,
      text,
    }]);

    if (error) {
      throw error;
    }
  }

  async function handleStartChat(event: React.FormEvent) {
    event.preventDefault();

    if (!sessionId || !firstName.trim() || !lastName.trim()) {
      return;
    }

    const welcomeMessage = `Herzlich willkommen, ${firstName}! Ich bin der Umzugsnetz Bot. Wählen Sie eine Frage aus oder schreiben Sie Ihr Anliegen direkt in den Chat.`;

    try {
      setSending(true);
      await insertAdminMessage(welcomeMessage);
      setMessages([{ sender: 'admin', text: welcomeMessage }]);
      setStep('chat');
    } catch (error: any) {
      showToast('error', 'Chat konnte nicht gestartet werden', error.message);
    } finally {
      setSending(false);
    }
  }

  async function sendBotReply(nextMessage: string) {
    const answer = getBotAnswer(nextMessage);

    try {
      await insertAdminMessage(answer.text);
      setMessages((currentMessages) => [...currentMessages, { sender: 'admin', text: answer.text }]);
      setEscalationOpen(!answer.handled);
      if (!answer.handled) {
        setLastUnhandledQuestion(nextMessage);
      }
    } catch (error: any) {
      showToast('error', 'Bot-Antwort fehlgeschlagen', error.message);
    }
  }

  async function submitUserMessage(rawMessage: string) {
    if (!sessionId || !rawMessage.trim() || sending) {
      return;
    }

    const nextMessage = rawMessage.trim();
    setMessages((currentMessages) => [...currentMessages, { sender: 'user', text: nextMessage }]);
    setInput('');

    try {
      setSending(true);
      const { error } = await supabase.from('chat_messages').insert([{
        sender: 'user',
        session_id: sessionId,
        support_category: 'KUNDE',
        user_name: displayName,
        text: nextMessage,
      }]);

      if (error) {
        throw error;
      }

      await sendBotReply(nextMessage);
    } catch (error: any) {
      setMessages((currentMessages) => currentMessages.slice(0, -1));
      setInput(nextMessage);
      showToast('error', 'Nachricht konnte nicht gesendet werden', error.message);
    } finally {
      setSending(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    await submitUserMessage(input);
  }

  async function handleEscalationSubmit() {
    if (!sessionId || !contactFormValid || sending) {
      return;
    }

    const summaryMessage = [
      'WEITERLEITUNG AN MITARBEITER',
      `Vorname: ${firstName.trim()}`,
      `Nachname: ${lastName.trim()}`,
      `Telefon: ${contactPhone.trim()}`,
      `E-Mail: ${contactEmail.trim()}`,
      `Erreichbar: ${contactBestTime.trim()}`,
      `Offene Frage: ${lastUnhandledQuestion || 'Nicht angegeben'}`,
    ].join('\n');

    const confirmationMessage = 'Vielen Dank. Ich habe Ihre Anfrage an die zuständige Abteilung weitergeleitet. Ein Mitarbeiter meldet sich in Kürze per E-Mail oder telefonisch bei Ihnen.';

    try {
      setSending(true);

      const { error: escalationError } = await supabase.from('chat_messages').insert([{
        sender: 'user',
        session_id: sessionId,
        support_category: 'KUNDE',
        user_name: displayName,
        text: summaryMessage,
      }]);

      if (escalationError) {
        throw escalationError;
      }

      const { error: notificationError } = await supabase.from('notifications').insert([{
        type: 'CHAT_ESCALATION',
        title: 'Neue Chat-Weiterleitung',
        message: `${displayName} hat eine Rückmeldung durch einen Mitarbeiter angefordert.`,
        link: '/admin/dashboard/chat',
      }]);

      if (notificationError) {
        throw notificationError;
      }

      await insertAdminMessage(confirmationMessage);

      setMessages((currentMessages) => [
        ...currentMessages,
        { sender: 'user', text: summaryMessage },
        { sender: 'admin', text: confirmationMessage },
      ]);
      setEscalationOpen(false);
    } catch (error: any) {
      showToast('error', 'Weiterleitung fehlgeschlagen', error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-24 left-4 right-4 z-[100] font-sans sm:bottom-6 sm:left-auto sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto absolute bottom-20 right-0 flex w-full max-w-none flex-col overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white/98 shadow-2xl backdrop-blur-md max-sm:left-0 max-sm:right-0 max-sm:h-[min(68vh,36rem)] sm:w-[380px] sm:max-w-[380px]"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-blue to-brand-green p-4 text-white">
              <div>
                <h3 className="font-bold">Umzugsnetz Bot</h3>
                <p className="text-xs text-white/80">Antwortet direkt auf Standardfragen</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col sm:h-[470px]">
              {step === 'name' ? (
                <div className="flex flex-1 flex-col justify-center overflow-y-auto p-5 sm:p-6">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue/10">
                    <User className="h-8 w-8 text-brand-blue" />
                  </div>
                  <h4 className="mb-2 text-center font-bold text-slate-800">Hallo!</h4>
                  <p className="mb-6 text-center text-sm text-slate-900">
                    Bitte geben Sie Ihren Namen ein, um den Bot-Chat zu starten.
                  </p>
                  <form onSubmit={handleStartChat} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Vorname"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black transition-colors placeholder:text-slate-900 focus:border-brand-blue focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Nachname"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      required
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black transition-colors placeholder:text-slate-900 focus:border-brand-blue focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-blue to-brand-green py-3 font-bold text-white transition-shadow hover:shadow-lg disabled:opacity-60"
                    >
                      {sending ? 'Startet...' : 'Bot starten'}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUESTIONS.map((question) => (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => void submitUserMessage(question.message)}
                          className="rounded-full border border-brand-blue/15 bg-white px-3 py-2 text-xs font-bold text-brand-blue shadow-sm transition-colors hover:bg-brand-blue hover:text-white"
                        >
                          {question.label}
                        </button>
                      ))}
                    </div>

                    {messages.map((message, index) => (
                      <div key={`${message.sender}-${index}`} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] break-words rounded-2xl p-3 text-sm sm:max-w-[80%] ${
                            message.sender === 'user'
                              ? 'rounded-br-sm bg-brand-blue text-white'
                              : 'rounded-bl-sm border border-slate-100 bg-white text-slate-700 shadow-sm'
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))}

                    {escalationOpen && (
                      <div className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm">
                        <p className="text-sm font-bold text-slate-900">Anfrage an Mitarbeiter weiterleiten</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          Hinterlegen Sie Ihre Kontaktdaten. Die zuständige Abteilung sieht den Verlauf im Admin-Dashboard und meldet sich bei Ihnen.
                        </p>
                        <div className="mt-4 space-y-3">
                          <input
                            type="tel"
                            placeholder="Telefonnummer"
                            value={contactPhone}
                            onChange={(event) => setContactPhone(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black outline-none transition-colors focus:border-brand-blue"
                          />
                          <input
                            type="email"
                            placeholder="E-Mail"
                            value={contactEmail}
                            onChange={(event) => setContactEmail(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black outline-none transition-colors focus:border-brand-blue"
                          />
                          <input
                            type="text"
                            placeholder="Am besten erreichbar z. B. Mo–Fr ab 17 Uhr"
                            value={contactBestTime}
                            onChange={(event) => setContactBestTime(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black outline-none transition-colors focus:border-brand-blue"
                          />
                          <button
                            type="button"
                            disabled={!contactFormValid || sending}
                            onClick={handleEscalationSubmit}
                            className="w-full rounded-2xl bg-brand-blue px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Anfrage weiterleiten
                          </button>
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>

                  <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ihre Frage an den Bot..."
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black transition-colors placeholder:text-slate-600 focus:border-brand-blue focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || sending}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-white transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="ml-0.5 h-4 w-4" />
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
        className="pointer-events-auto ml-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-brand-blue/95 to-brand-green/95 text-white shadow-2xl backdrop-blur-md focus:outline-none"
      >
        {isOpen ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
        {!isOpen && hasUnreadReply && (
          <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-red-500" />
        )}
      </motion.button>
    </div>
  );
}
