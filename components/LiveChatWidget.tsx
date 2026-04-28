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
  createdAt?: string;
};

type SuggestedQuestion = {
  id: string;
  label: string;
  message: string;
};

type ServiceAnswer = {
  handled: boolean;
  text: string;
};

type SupportCategory = 'KUNDE' | 'PARTNER';

const CUSTOMER_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: 'ablauf', label: 'So funktioniert es', message: 'Wie funktioniert Umzugsnetz für mich als Kunde?' },
  { id: 'kosten', label: 'Ist es kostenlos?', message: 'Ist der Service für mich wirklich kostenlos?' },
  { id: 'angebote', label: 'Wann kommen Angebote?', message: 'Wie schnell erhalte ich passende Angebote?' },
  { id: 'firmen', label: 'Sind die Firmen geprüft?', message: 'Wie stellt ihr sicher, dass die Firmen seriös sind?' },
  { id: 'datenschutz', label: 'Datenschutz', message: 'Was passiert mit meinen Daten?' },
  { id: 'support', label: 'Mitarbeiter sprechen', message: 'Ich möchte mit einem Mitarbeiter sprechen.' },
];

const PARTNER_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: 'registrieren', label: 'Firma anmelden', message: 'Wie kann ich meine Firma bei Umzugsnetz registrieren?' },
  { id: 'onboarding', label: 'Onboarding', message: 'Wie läuft das Onboarding für Firmen ab?' },
  { id: 'preise', label: 'Was kostet eine Anfrage?', message: 'Wie viel zahle ich pro Kundenanfrage?' },
  { id: 'guthaben', label: 'Guthaben aufladen', message: 'Wie kann ich mein Guthaben aufladen?' },
  { id: 'pause', label: 'Anfragen pausieren', message: 'Kann ich kurzfristig keine neuen Anfragen mehr erhalten?' },
  { id: 'support', label: 'Mitarbeiter sprechen', message: 'Ich möchte mit einem Mitarbeiter sprechen.' },
];

const SERVICE_FALLBACK_MESSAGE = 'Vielen Dank für Ihre Nachricht. Wenn Sie möchten, leiten wir Ihr Anliegen direkt an die zuständige Fachabteilung weiter. Hinterlegen Sie dazu bitte Ihre Kontaktdaten sowie ein passendes Zeitfenster für die Rückmeldung.';
const CHAT_INACTIVITY_WARNING_MESSAGE = 'Hinweis: Wegen Inaktivität wird dieser Chat in 2 Minuten automatisch geschlossen.';
const CHAT_AUTO_CLOSE_MARKER = '[TICKET_GESCHLOSSEN]';
const CHAT_WARNING_AFTER_MS = 8 * 60 * 1000;
const CHAT_CLOSE_AFTER_MS = 10 * 60 * 1000;

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function getCustomerAnswer(normalized: string): ServiceAnswer | null {
  if (
    normalized.includes('datenschutz')
    || normalized.includes('dsgvo')
    || normalized.includes('was passiert mit')
    || normalized.includes('meinen daten')
    || normalized.includes('meine daten')
    || normalized.includes('daten weitergegeben')
    || normalized.includes('daten gespeichert')
    || normalized.includes('privatsphäre')
  ) {
    return {
      handled: true,
      text: 'Ihre Daten werden ausschließlich an Firmen weitergegeben, die Ihre Anfrage bearbeiten möchten. Wir geben keine Daten an Dritte weiter und Sie können jederzeit Auskunft, Berichtigung oder Löschung anfordern. Details: umzugsnetz.de/datenschutz.',
    };
  }

  if (normalized.includes('kostenlos') || normalized.includes('was kostet') || normalized.includes('kosten') || normalized.includes('gebühr') || normalized.includes('preis')) {
    return {
      handled: true,
      text: 'Für Sie als Kunde ist die Anfrage zu 100 % kostenlos und unverbindlich. Sie erhalten passende Angebote von geprüften Firmen und entscheiden frei, ob Sie eines annehmen. Es gibt keine versteckten Gebühren.',
    };
  }

  if (
    normalized.includes('wie funktioniert')
    || normalized.includes('ablauf')
    || normalized.includes('funktionsweise')
    || normalized.includes('wie läuft')
  ) {
    return {
      handled: true,
      text: 'So einfach ist es: 1) Sie geben Wohnfläche, Entfernung und Termin in unserem Kostenrechner ein. 2) Wir leiten Ihre Anfrage an passende, geprüfte Firmen aus Ihrer Region weiter. 3) Sie erhalten unverbindliche Angebote per Telefon oder E-Mail und entscheiden selbst, welches Sie annehmen.',
    };
  }

  if (
    normalized.includes('wie schnell')
    || normalized.includes('wann erhalte')
    || normalized.includes('wann bekomme')
    || normalized.includes('wann kommen')
    || normalized.includes('wann kommt')
    || normalized.includes('angebote')
    || normalized.includes('rückmeldung')
    || normalized.includes('antwort')
  ) {
    return {
      handled: true,
      text: 'Erste Rückmeldungen erhalten Sie in der Regel innerhalb von 1 bis 4 Stunden. Bei kurzfristigen Terminen oder stark nachgefragten Regionen kann es im Einzelfall bis zu 24 Stunden dauern.',
    };
  }

  if (
    normalized.includes('seriös')
    || normalized.includes('geprüft')
    || normalized.includes('verifiziert')
    || normalized.includes('vertrauen')
    || (normalized.includes('firmen') && (normalized.includes('sicher') || normalized.includes('echt')))
  ) {
    return {
      handled: true,
      text: 'Jede Firma in unserem Netzwerk durchläuft eine Prüfung von Gewerbeschein, Versicherung und Identität, bevor sie freigeschaltet wird. Zusätzlich bewerten Kunden die Firmen nach jedem Auftrag – Bewertungen und Auftragsstatistik fließen direkt in den Status der Firma ein.',
    };
  }

  if (
    normalized.includes('annehmen')
    || normalized.includes('verpflichtet')
    || normalized.includes('verbindlich')
  ) {
    return {
      handled: true,
      text: 'Sie sind zu nichts verpflichtet. Sie erhalten die Angebote unverbindlich und entscheiden in Ruhe, ob und welche Sie annehmen möchten. Lehnen Sie alle ab, entstehen Ihnen keine Kosten.',
    };
  }

  return null;
}

function getPartnerAnswer(normalized: string): ServiceAnswer | null {
  if (
    normalized.includes('registrier')
    || normalized.includes('anmelden')
    || (normalized.includes('firma') && normalized.includes('aufnehmen'))
    || normalized.includes('aufnahme')
    || normalized.includes('bewerben')
    || normalized.includes('partner werden')
  ) {
    return {
      handled: true,
      text: 'Sie können Ihre Firma direkt unter Anmelden → Tab "Registrieren" mit Firmenname, Ansprechperson, Standort, Website und Telefon eintragen. Sobald die automatische Verifizierung erfolgreich ist, schalten wir Ihren Marktplatz-Zugang frei. Ein Einladungscode ist nicht mehr erforderlich.',
    };
  }

  if (
    normalized.includes('onboarding')
    || normalized.includes('profil einrichten')
    || normalized.includes('einrichten')
    || normalized.includes('erste schritte')
  ) {
    return {
      handled: true,
      text: 'Nach der Registrierung führt Sie ein 4-Schritt-Wizard durch das Profil: Firma → Einsatzgebiet → Leistungen → Bestätigung. Anschließend sehen Sie passende Anfragen im Marktplatz und können sie mit einem Klick freischalten.',
    };
  }

  if (
    normalized.includes('preis')
    || normalized.includes('was kostet')
    || normalized.includes('lead-preis')
    || normalized.includes('lead preis')
    || normalized.includes('wie teuer')
    || normalized.includes('tarif')
    || normalized.includes('wie viel')
    || normalized.includes('zahle')
    || normalized.includes('kundenanfrage')
    || normalized.includes('anfrage kosten')
    || normalized.includes('pro anfrage')
  ) {
    return {
      handled: true,
      text: 'Sie zahlen nur für Anfragen, die Sie selbst kaufen. Standard-Anfragen für Umzüge starten bei 25 €, Priorisierte bei 35 € und Exklusive bei 45 €. Entrümpelungsanfragen liegen 5–10 € darunter. Die genauen Preise sehen Sie pro Anfrage im Marktplatz.',
    };
  }

  if (
    normalized.includes('guthaben')
    || normalized.includes('aufladen')
    || normalized.includes('wallet')
    || normalized.includes('topup')
    || normalized.includes('einzahlen')
    || normalized.includes('überweis')
  ) {
    return {
      handled: true,
      text: 'Im Partner-Dashboard unter „Guthaben" tragen Sie den gewünschten Betrag (mindestens 10 €) ein und schließen die Zahlung sicher per Stripe ab – per Kreditkarte, Apple Pay, Google Pay oder SEPA. Das Guthaben wird sofort gutgeschrieben.',
    };
  }

  if (
    normalized.includes('pause')
    || normalized.includes('pausier')
    || normalized.includes('verfügbar')
    || normalized.includes('keine anfragen')
    || normalized.includes('inaktiv')
  ) {
    return {
      handled: true,
      text: 'Über das Partner-Dashboard können Sie sich jederzeit pausieren – mit einem Klick auf den Status-Schalter "Verfügbar/Pausiert". Pausierte Konten erhalten keine neuen Anfragen, behalten aber Guthaben und Daten.',
    };
  }

  if (
    normalized.includes('storno')
    || normalized.includes('zurückgeben')
    || normalized.includes('falsche daten')
    || normalized.includes('erstattung')
    || normalized.includes('refund')
    || normalized.includes('reklamation')
  ) {
    return {
      handled: true,
      text: 'Wenn die Kontaktdaten einer gekauften Anfrage nicht korrekt oder nicht erreichbar sind, melden Sie sich bitte bei unserem Support – wir prüfen den Vorgang und erstatten den Kaufpreis bei berechtigter Reklamation.',
    };
  }

  if (
    normalized.includes('bewert')
    || normalized.includes('rating')
    || normalized.includes('feedback')
    || normalized.includes('kundenbewertung')
  ) {
    return {
      handled: true,
      text: 'Nach jedem Auftrag fragen wir den Kunden nach einer Bewertung. Gute Bewertungen verbessern Ihre Sichtbarkeit im Marktplatz und schalten höhere Tarif-Stufen (Priorisiert, Exklusiv) mit besseren Anfragen frei.',
    };
  }

  if (
    normalized.includes('region')
    || normalized.includes('einsatzgebiet')
    || normalized.includes('radius')
  ) {
    return {
      handled: true,
      text: 'Ihr Einsatzgebiet legen Sie im Onboarding mit Stadt und Radius (5–300 km) fest. Sie können den Radius jederzeit über Ihr Profil im Partner-Dashboard anpassen.',
    };
  }

  return null;
}

function getServiceAnswer(message: string, category: SupportCategory): ServiceAnswer {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('mitarbeiter')
    || normalized.includes('anrufen')
    || normalized.includes('rückruf')
    || normalized.includes('kontakt')
    || normalized.includes('mit jemandem sprechen')
    || normalized.includes('persönlich')
  ) {
    return {
      handled: false,
      text: 'Gerne leiten wir Ihr Anliegen an einen Mitarbeiter weiter. Hinterlegen Sie unten kurz Telefon, E-Mail und ein Zeitfenster für den Rückruf – wir melden uns zeitnah.',
    };
  }

  const direct = category === 'PARTNER' ? getPartnerAnswer(normalized) : getCustomerAnswer(normalized);
  if (direct) return direct;

  return {
    handled: false,
    text: SERVICE_FALLBACK_MESSAGE,
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
  const [lastUserActivityAt, setLastUserActivityAt] = useState<number | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifiedSessionsRef = useRef<Set<string>>(new Set());

  const supportCategory = useMemo<SupportCategory>(() => {
    return pathname?.startsWith('/partner') ? 'PARTNER' : 'KUNDE';
  }, [pathname]);

  const isAuthenticatedSurface = useMemo(() => {
    if (!pathname) return false;
    return (
      pathname.startsWith('/admin')
      || pathname.startsWith('/crm')
      || pathname.startsWith('/portal')
    );
  }, [pathname]);

  const suggestedQuestions = useMemo(
    () => (supportCategory === 'PARTNER' ? PARTNER_SUGGESTED_QUESTIONS : CUSTOMER_SUGGESTED_QUESTIONS),
    [supportCategory],
  );

  async function notifyChatMessage(currentSessionId: string, name: string, text: string) {
    if (notifiedSessionsRef.current.has(currentSessionId)) {
      return;
    }
    notifiedSessionsRef.current.add(currentSessionId);
    try {
      const preview = text.trim().slice(0, 160);
      const link = `/admin?tab=tickets&session=${encodeURIComponent(currentSessionId)}`;
      await supabase.from('notifications').insert([{
        type: supportCategory === 'PARTNER' ? 'CHAT_PARTNER_MESSAGE' : 'CHAT_USER_MESSAGE',
        title: supportCategory === 'PARTNER' ? 'Neue Partner-Chatnachricht' : 'Neue Chatnachricht',
        message: `${name || 'Neue Anfrage'}: ${preview}${text.length > 160 ? '…' : ''}`,
        link,
        is_read: false,
      }]);
    } catch {
      notifiedSessionsRef.current.delete(currentSessionId);
    }
  }

  const resetLocalChatSession = () => {
    localStorage.removeItem('umzugapp_chat_sid');
    setSessionId(null);
    setIsOpen(false);
    setStep('name');
    setMessages([]);
    setInput('');
    setFirstName('');
    setLastName('');
    setHasUnreadReply(false);
    setSending(false);
    setEscalationOpen(false);
    setContactPhone('');
    setContactEmail('');
    setContactBestTime('');
    setLastUnhandledQuestion('');
    setLastUserActivityAt(null);
    notifiedSessionsRef.current.clear();
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

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
    if (isAuthenticatedSurface) {
      return;
    }

    let existingSessionId = localStorage.getItem('umzugapp_chat_sid');
    if (!existingSessionId) {
      existingSessionId = createSessionId();
      localStorage.setItem('umzugapp_chat_sid', existingSessionId);
    }
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
          const wasClosed = data.some((message) => message.text === CHAT_AUTO_CLOSE_MARKER);
          if (wasClosed) {
            localStorage.removeItem('umzugapp_chat_sid');
            const nextSessionId = createSessionId();
            localStorage.setItem('umzugapp_chat_sid', nextSessionId);
            setSessionId(nextSessionId);
            setMessages([]);
            setStep('name');
            return;
          }

          setMessages(data.map((message) => ({
            sender: message.sender as WidgetMessage['sender'],
            text: message.text,
            createdAt: message.created_at,
          })));
          setStep('chat');

          const lastRelevantActivity = [...data]
            .reverse()
            .find((message) => (message.sender === 'user' || message.text !== CHAT_AUTO_CLOSE_MARKER) && message.created_at);

          if (lastRelevantActivity?.created_at) {
            setLastUserActivityAt(new Date(lastRelevantActivity.created_at).getTime());
          }

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

          if (payload.new.text === CHAT_AUTO_CLOSE_MARKER) {
            resetLocalChatSession();
            return;
          }

          setMessages((currentMessages) => {
            const nextMessage = {
              sender: payload.new.sender as WidgetMessage['sender'],
              text: payload.new.text,
              createdAt: payload.new.created_at,
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

  useEffect(() => {
    if (step !== 'chat' || !sessionId || !lastUserActivityAt) {
      return;
    }

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    const elapsedMs = Date.now() - lastUserActivityAt;
    const warningDelayMs = Math.max(CHAT_WARNING_AFTER_MS - elapsedMs, 0);
    const closeDelayMs = Math.max(CHAT_CLOSE_AFTER_MS - elapsedMs, 0);

    warningTimeoutRef.current = setTimeout(() => {
      void insertAdminMessage(CHAT_INACTIVITY_WARNING_MESSAGE, true);
    }, warningDelayMs);

    closeTimeoutRef.current = setTimeout(() => {
      void insertAdminMessage(CHAT_AUTO_CLOSE_MARKER, true);
      resetLocalChatSession();
    }, closeDelayMs);

    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [lastUserActivityAt, sessionId, step]);

  const displayName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);
  const contactFormValid = firstName.trim() && lastName.trim() && contactPhone.trim() && contactEmail.trim() && contactBestTime.trim();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

async function insertAdminMessage(text: string, skipLocalEcho = false) {
    if (!sessionId) {
      return;
    }

    if (skipLocalEcho && messages.some((message) => message.text === text)) {
      return;
    }

    const payload = {
      sender: 'admin',
      session_id: sessionId,
      support_category: supportCategory,
      user_name: displayName,
      text,
    };

    let { error } = await supabase.from('chat_messages').insert([payload]);

    if (error?.message?.includes("support_category")) {
      const fallbackPayload = {
        sender: 'admin',
        session_id: sessionId,
        user_name: displayName,
        text,
      };
      ({ error } = await supabase.from('chat_messages').insert([fallbackPayload]));
    }

    if (error) {
      throw error;
    }

    if (!skipLocalEcho) {
      setMessages((currentMessages) => [...currentMessages, { sender: 'admin', text }]);
    }
  }

  async function handleStartChat(event: React.FormEvent) {
    event.preventDefault();

    if (!sessionId || !firstName.trim() || !lastName.trim()) {
      return;
    }

    const welcomeMessage = `Herzlich willkommen, ${firstName}. Schön, dass Sie da sind. Nutzen Sie gerne die Textvorlagen oder schildern Sie Ihr Anliegen direkt im Servicechat.`;

    try {
      setSending(true);
      await insertAdminMessage(welcomeMessage);
      setStep('chat');
      setLastUserActivityAt(Date.now());
    } catch (error: any) {
      showToast('error', 'Chat konnte nicht gestartet werden', error.message);
    } finally {
      setSending(false);
    }
  }

  async function sendServiceReply(nextMessage: string) {
    const answer = getServiceAnswer(nextMessage, supportCategory);

    try {
      await insertAdminMessage(answer.text);
      setEscalationOpen(!answer.handled);
      if (!answer.handled) {
        setLastUnhandledQuestion(nextMessage);
      }
    } catch (error: any) {
      showToast('error', 'Antwort konnte nicht geladen werden', error.message);
    }
  }

  async function submitUserMessage(rawMessage: string) {
    if (!sessionId || !rawMessage.trim() || sending) {
      return;
    }

    const nextMessage = rawMessage.trim();
    setMessages((currentMessages) => [...currentMessages, { sender: 'user', text: nextMessage }]);
    setInput('');
    setLastUserActivityAt(Date.now());

    try {
      setSending(true);
      const payload = {
        sender: 'user',
        session_id: sessionId,
        support_category: supportCategory,
        user_name: displayName,
        text: nextMessage,
      };

      let { error } = await supabase.from('chat_messages').insert([payload]);

      if (error?.message?.includes("support_category")) {
        const fallbackPayload = {
          sender: 'user',
          session_id: sessionId,
          user_name: displayName,
          text: nextMessage,
        };
        ({ error } = await supabase.from('chat_messages').insert([fallbackPayload]));
      }

      if (error) {
        throw error;
      }

      void notifyChatMessage(sessionId, displayName, nextMessage);
      await sendServiceReply(nextMessage);
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

      const escalationPayload = {
        sender: 'user',
        session_id: sessionId,
        support_category: supportCategory,
        user_name: displayName,
        text: summaryMessage,
      };

      let { error: escalationError } = await supabase.from('chat_messages').insert([escalationPayload]);

      if (escalationError?.message?.includes("support_category")) {
        const fallbackEscalationPayload = {
          sender: 'user',
          session_id: sessionId,
          user_name: displayName,
          text: summaryMessage,
        };
        ({ error: escalationError } = await supabase.from('chat_messages').insert([fallbackEscalationPayload]));
      }

      if (escalationError) {
        throw escalationError;
      }

      const { error: notificationError } = await supabase.from('notifications').insert([{
        type: 'CHAT_ESCALATION',
        title: 'Neue Chat-Weiterleitung',
        message: `${displayName} hat eine Rückmeldung durch einen Mitarbeiter angefordert.`,
        link: '/',
      }]);

      if (notificationError) {
        throw notificationError;
      }

      await insertAdminMessage(confirmationMessage);
      setLastUserActivityAt(Date.now());

      setMessages((currentMessages) => [
        ...currentMessages,
        { sender: 'user', text: summaryMessage },
      ]);
      setEscalationOpen(false);
    } catch (error: any) {
      showToast('error', 'Weiterleitung fehlgeschlagen', error.message);
    } finally {
      setSending(false);
    }
  }

  if (isAuthenticatedSurface) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-24 left-4 right-4 z-[100] font-sans sm:bottom-6 sm:left-auto sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto absolute bottom-20 right-0 flex h-[min(70vh,40rem)] w-full max-w-none flex-col overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white/98 shadow-2xl backdrop-blur-md max-sm:left-0 max-sm:right-0 sm:w-[380px] sm:max-w-[380px]"
          >
            <div className="flex items-center justify-between bg-brand-blue p-4 text-white">
              <div>
                <h3 className="font-bold">Umzugsnetz Servicechat</h3>
                <p className="text-xs text-white/80">Schnelle Hilfe zu häufigen Fragen</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {step === 'name' ? (
                <div className="flex flex-1 flex-col justify-center overflow-y-auto p-5 sm:p-6">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue/10">
                    <User className="h-8 w-8 text-brand-blue" />
                  </div>
                  <h4 className="mb-2 text-center font-bold text-slate-800">Hallo!</h4>
                  <p className="mb-6 text-center text-sm text-slate-900">
                    Bitte geben Sie Ihren Namen ein, um den Servicechat zu starten.
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
                      className="mt-4 w-full rounded-xl bg-brand-blue py-3 font-bold text-white transition-shadow hover:bg-brand-blue-hover hover:shadow-lg disabled:opacity-60"
                    >
                      {sending ? 'Startet...' : 'Chat starten'}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
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
                          Hinterlegen Sie Ihre Kontaktdaten. Ihr Anliegen wird intern weitergeleitet und Sie erhalten zeitnah eine Rückmeldung.
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
                    <div className="mb-3 flex flex-wrap gap-2">
                      {suggestedQuestions.map((question) => (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => void submitUserMessage(question.message)}
                          className="rounded-full border border-brand-blue/20 bg-brand-blue-soft/35 px-3 py-2 text-xs font-bold text-brand-blue shadow-sm transition-colors hover:bg-brand-blue hover:text-white"
                        >
                          {question.label}
                        </button>
                      ))}
                    </div>
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={resetLocalChatSession}
                        className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-900"
                      >
                        Chat beenden
                      </button>
                    </div>
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ihre Nachricht an den Servicechat..."
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
        className="pointer-events-auto ml-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-white shadow-2xl backdrop-blur-md transition-colors hover:bg-brand-blue-hover focus:outline-none"
      >
        {isOpen ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
        {!isOpen && hasUnreadReply && (
          <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-red-500" />
        )}
      </motion.button>
    </div>
  );
}
