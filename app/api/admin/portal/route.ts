import { NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { requireStaffUser, type StaffRole } from '@/lib/server/staffAuth';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;
type TicketRecord = JsonRecord & {
  session_id: string;
  user_name: unknown;
  support_category: unknown;
  last_message: unknown;
  last_at: unknown;
  unread_count: number;
  messages: JsonRecord[];
};

const leadStatuses = ['Neu', 'Kontaktiert', 'Angebot', 'Gebucht', 'Abgelehnt'] as const;
const legacyStatusMap: Record<string, string> = {
  'In Bearbeitung': 'Kontaktiert',
  Abgeschlossen: 'Gebucht',
  Storniert: 'Abgelehnt',
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cityFromOrder(order: JsonRecord) {
  return String(order.von_city || order.nach_city || '').trim();
}

function normalizeLeadStatus(value: unknown) {
  const status = String(value || 'Neu').trim();
  return legacyStatusMap[status] || status;
}

function sanitizeStatus(value: unknown) {
  const status = String(value || '').trim();
  return leadStatuses.includes(status as (typeof leadStatuses)[number]) ? status : 'Neu';
}

function toDatabaseOrderStatus(value: unknown) {
  const status = String(value || '').trim();

  if (status === 'Gebucht' || status === 'abgeschlossen') return 'Abgeschlossen';
  if (status === 'Abgelehnt') return 'Storniert';
  if (status === 'Kontaktiert' || status === 'Angebot' || status === 'geplant' || status === 'aktiv') return 'In Bearbeitung';

  return 'Neu';
}

function buildKpis(orders: JsonRecord[], transactions: JsonRecord[]) {
  const booked = orders.filter((order) => normalizeLeadStatus(order.status) === 'Gebucht');
  const revenue = transactions.reduce((sum, transaction) => sum + Math.max(0, toNumber(transaction.amount)), 0);

  return {
    leads: orders.length,
    orders: booked.length,
    revenue,
    closeRate: orders.length ? Math.round((booked.length / orders.length) * 100) : 0,
    averageOrderValue: booked.length ? Math.round(revenue / booked.length) : 0,
  };
}

async function fetchPortalData(role: StaffRole, supabase: SupabaseClient) {
  const [ordersResult, partnersResult, transactionsResult, notificationsResult, teamResult, settingsResult, chatResult] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
    role === 'ADMIN'
      ? supabase.from('partners').select('*').order('created_at', { ascending: false }).limit(300)
      : Promise.resolve({ data: [], error: null }),
    role === 'ADMIN'
      ? supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(500)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20),
    role === 'ADMIN'
      ? supabase.from('team').select('*').order('created_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [], error: null }),
    role === 'ADMIN'
      ? supabase.from('system_settings').select('*').order('key', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(500),
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (partnersResult.error) throw new Error(partnersResult.error.message);
  if (transactionsResult.error) throw new Error(transactionsResult.error.message);
  if (notificationsResult.error) throw new Error(notificationsResult.error.message);
  if (teamResult.error) throw new Error(teamResult.error.message);
  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (chatResult.error) throw new Error(chatResult.error.message);

  const orders = (ordersResult.data || []) as JsonRecord[];
  const transactions = (transactionsResult.data || []) as JsonRecord[];
  const chatMessages = (chatResult.data || []) as JsonRecord[];
  const cities = Array.from(new Set(orders.map(cityFromOrder).filter(Boolean))).sort();
  const tickets = Array.from(
    chatMessages.reduce((map, message) => {
      const sessionId = String(message.session_id || '');
      if (!sessionId) return map;

      const existing = map.get(sessionId);
      if (!existing) {
        map.set(sessionId, {
          session_id: sessionId,
          user_name: message.user_name || 'Chat',
          support_category: message.support_category || 'KUNDE',
          last_message: message.text || '',
          last_at: message.created_at || null,
          unread_count: message.is_read === false && message.sender === 'user' ? 1 : 0,
          messages: [message],
        });
        return map;
      }

      existing.messages.push(message);
      if (message.is_read === false && message.sender === 'user') existing.unread_count += 1;
      return map;
    }, new Map<string, TicketRecord>())
      .values(),
  );

  return {
    role,
    kpis: buildKpis(orders, transactions),
    cities,
    leads: orders.map((order) => ({
      ...order,
      status: normalizeLeadStatus(order.status),
      city: cityFromOrder(order),
    })),
    partners: role === 'ADMIN' ? partnersResult.data || [] : [],
    transactions: role === 'ADMIN' ? transactions : [],
    notifications: notificationsResult.data || [],
    tickets,
    team: role === 'ADMIN' ? teamResult.data || [] : [],
    settings: role === 'ADMIN' ? settingsResult.data || [] : [],
  };
}

export async function GET(request: Request) {
  let staff;
  try {
    staff = await requireStaffUser(request, 'EMPLOYEE');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Zugriff verweigert.', 401);
  }

  try {
    return NextResponse.json(await fetchPortalData(staff.role, staff.client));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Portal konnte nicht geladen werden.', 500);
  }
}

export async function PATCH(request: Request) {
  let staff;
  try {
    staff = await requireStaffUser(request, 'EMPLOYEE');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Zugriff verweigert.', 401);
  }

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungueltige Anfrage.', 400);
  }

  const action = String(body.action || '');

  if (action === 'updateLead') {
    const id = String(body.id || '');
    if (!id) return jsonError('Lead fehlt.', 400);

    const updates: JsonRecord = { updated_at: new Date().toISOString() };
    if (typeof body.status === 'string') updates.status = toDatabaseOrderStatus(sanitizeStatus(body.status) === 'Neu' ? body.status : sanitizeStatus(body.status));
    if (typeof body.notes === 'string') updates.notes = body.notes.slice(0, 4000);

    const { error } = await staff.client.from('orders').update(updates).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, staff.client));
  }

  if (action === 'updatePartner') {
    if (staff.role !== 'ADMIN') return jsonError('Admin-Rechte erforderlich.', 403);
    const id = String(body.id || '');
    if (!id) return jsonError('Partner fehlt.', 400);

    const updates: JsonRecord = { updated_at: new Date().toISOString() };
    if (typeof body.status === 'string') updates.status = body.status;
    if (typeof body.category === 'string') updates.category = body.category;
    if (typeof body.notes === 'string') updates.settings = { internal_notes: body.notes.slice(0, 4000) };

    const { error } = await staff.client.from('partners').update(updates).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, staff.client));
  }

  if (action === 'updateTeam') {
    if (staff.role !== 'ADMIN') return jsonError('Admin-Rechte erforderlich.', 403);
    const id = String(body.id || '');
    const status = String(body.status || '');
    if (!id || !['PENDING', 'ACTIVE', 'DISABLED'].includes(status)) return jsonError('Team-Daten ungueltig.', 400);

    const { data: current } = await staff.client.from('team').select('role').eq('id', id).maybeSingle();
    if (current?.role === 'ADMIN' && status === 'DISABLED') {
      return jsonError('Admin-Rolle ist geschützt.', 403);
    }

    const { error } = await staff.client.from('team').update({ status }).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, staff.client));
  }

  if (action === 'createTeamMember') {
    if (staff.role !== 'ADMIN') return jsonError('Admin-Rechte erforderlich.', 403);

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = String(body.role || 'EMPLOYEE').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';

    if (!email || password.length < 8) {
      return jsonError('E-Mail und Passwort mit mindestens 8 Zeichen erforderlich.', 400);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: role === 'ADMIN' ? 'admin' : 'employee',
        full_name: email.split('@')[0],
      },
    });

    if (createError) return jsonError(createError.message, 500);

    const now = new Date().toISOString();
    const { error: teamError } = await staff.client
      .from('team')
      .upsert([{
        email,
        role,
        status: 'ACTIVE',
        invited_by_email: staff.user.email?.toLowerCase() || null,
        invitation_sent_at: now,
      }], { onConflict: 'email' });

    if (teamError) return jsonError(teamError.message, 500);

    if (createdUser.user?.id) {
      await supabaseAdmin.from('profiles').upsert([{
        id: createdUser.user.id,
        email,
        full_name: email.split('@')[0],
        primary_role: role,
        status: 'ACTIVE',
        updated_at: now,
      }]);
    }

    return NextResponse.json(await fetchPortalData(staff.role, staff.client));
  }

  return jsonError('Aktion nicht gefunden.', 400);
}
