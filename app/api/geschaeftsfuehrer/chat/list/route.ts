/**
 * API Route: Chat-Nachrichten-Liste
 * Echte Daten aus Supabase chat_messages-Tabelle
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Alle Chat-Sessions mit letzter Nachricht laden
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, session_id, sender, support_category, user_name, text, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    // Nach session_id gruppieren
    const sessionsMap = new Map<string, {
      sessionId: string;
      userName: string;
      supportCategory: string;
      lastMessage: string;
      lastMessageAt: string;
      totalMessages: number;
      unreadCount: number;
      firstMessageAt: string;
    }>();

    (messages || []).forEach((msg) => {
      const existing = sessionsMap.get(msg.session_id);
      if (!existing) {
        sessionsMap.set(msg.session_id, {
          sessionId: msg.session_id,
          userName: msg.user_name || 'Unbekannt',
          supportCategory: msg.support_category,
          lastMessage: msg.text,
          lastMessageAt: msg.created_at,
          totalMessages: 1,
          unreadCount: (!msg.is_read && msg.sender === 'user') ? 1 : 0,
          firstMessageAt: msg.created_at,
        });
      } else {
        existing.totalMessages += 1;
        if (!msg.is_read && msg.sender === 'user') {
          existing.unreadCount += 1;
        }
        // Älteste Nachricht tracken
        if (msg.created_at < existing.firstMessageAt) {
          existing.firstMessageAt = msg.created_at;
        }
        // user_name aktualisieren falls vorhanden
        if (msg.user_name && existing.userName === 'Unbekannt') {
          existing.userName = msg.user_name;
        }
      }
    });

    const sessions = Array.from(sessionsMap.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return NextResponse.json({
      success: true,
      data: sessions,
      total: sessions.length,
    });
  } catch (error: any) {
    console.error('Chat list error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Fehler beim Laden der Chat-Anfragen' },
      { status: 500 }
    );
  }
}
