import { NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { requireStaffUser, type StaffRole } from '@/lib/server/staffAuth';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;
type PortalScope = 'dashboard' | 'leads' | 'orders' | 'tickets' | 'finance' | 'partners' | 'team' | 'settings' | 'all';
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

function mapSupabaseAdminError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Unbekannter Fehler');
  if (message.toLowerCase().includes('invalid api key')) {
    return 'SUPABASE_SERVICE_ROLE_KEY ist ungültig. Bitte den Service-Role-Key in der Umgebung korrigieren.';
  }

  return message;
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

function normalizeScope(value: unknown): PortalScope {
  const scope = String(value || '').trim().toLowerCase();
  return ['dashboard', 'leads', 'orders', 'tickets', 'finance', 'partners', 'team', 'settings', 'all'].includes(scope)
    ? (scope as PortalScope)
    : 'dashboard';
}

async function fetchPortalData(role: StaffRole, supabase: SupabaseClient, scope: PortalScope = 'dashboard') {
  const includeOrders = ['dashboard', 'leads', 'orders', 'finance', 'all'].includes(scope);
  const includeNotifications = ['dashboard', 'all'].includes(scope);
  const includeTransactions = role === 'ADMIN' && ['dashboard', 'finance', 'all'].includes(scope);
  const includePartners = role === 'ADMIN' && ['partners', 'all'].includes(scope);
  const includeTeam = role === 'ADMIN' && ['team', 'all'].includes(scope);
  const includeSettings = role === 'ADMIN' && ['settings', 'all'].includes(scope);
  const includeTickets = ['tickets', 'all'].includes(scope);

  const [ordersResult, partnersResult, transactionsResult, notificationsResult, teamResult, settingsResult, chatResult] = await Promise.all([
    includeOrders
      ? supabase
          .from('orders')
          .select('id, order_number, service_category, customer_name, customer_email, customer_phone, move_date, von_city, von_address, nach_city, nach_address, estimated_price, status, notes, created_at')
          .order('created_at', { ascending: false })
          .limit(scope === 'dashboard' ? 80 : 200)
      : Promise.resolve({ data: [], error: null }),
    includePartners
      ? supabase.from('partners').select('id, name, email, phone, regions, status, category, service, balance').order('created_at', { ascending: false }).limit(120)
      : Promise.resolve({ data: [], error: null }),
    includeTransactions
      ? supabase.from('transactions').select('id, type, amount, description, created_at').order('created_at', { ascending: false }).limit(150)
      : Promise.resolve({ data: [], error: null }),
    includeNotifications
      ? supabase.from('notifications').select('id, title, message, created_at, is_read').order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [], error: null }),
    includeTeam
      ? supabase.from('team').select('id, email, role, status, created_at').order('created_at', { ascending: false }).limit(120)
      : Promise.resolve({ data: [], error: null }),
    includeSettings
      ? supabase.from('system_settings').select('id, key, value').order('key', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    includeTickets
      ? supabase.from('chat_messages').select('id, session_id, sender, support_category, user_name, text, is_read, created_at').order('created_at', { ascending: false }).limit(250)
      : Promise.resolve({ data: [], error: null }),
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
  const cities = includeOrders ? Array.from(new Set(orders.map(cityFromOrder).filter(Boolean))).sort() : [];
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
    }, new Map<string, TicketRecord>()).values(),
  );

  const response: Record<string, unknown> = { role };

  if (includeOrders || includeTransactions) response.kpis = buildKpis(orders, transactions);
  if (includeOrders) {
    response.cities = cities;
    response.leads = orders.map((order) => ({
      ...order,
      status: normalizeLeadStatus(order.status),
      city: cityFromOrder(order),
    }));
  }
  if (includePartners) response.partners = partnersResult.data || [];
  if (includeTransactions) response.transactions = transactions;
  if (includeNotifications) response.notifications = notificationsResult.data || [];
  if (includeTickets) response.tickets = tickets;
  if (includeTeam) response.team = teamResult.data || [];
  if (includeSettings) response.settings = settingsResult.data || [];

  return response;
}

export async function GET(request: Request) {
  let staff;
  try {
    staff = await requireStaffUser(request, 'EMPLOYEE');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Zugriff verweigert.', 401);
  }

  try {
    const scope = normalizeScope(new URL(request.url).searchParams.get('scope'));
    return NextResponse.json(await fetchPortalData(staff.role, getSupabaseAdmin(), scope));
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
    return jsonError('Ungültige Anfrage.', 400);
  }

  const action = String(body.action || '');
  const scope = normalizeScope(body.scope);
  const adminClient = getSupabaseAdmin();

  if (action === 'updateLead') {
    const id = String(body.id || '');
    if (!id) return jsonError('Lead fehlt.', 400);

    const updates: JsonRecord = { updated_at: new Date().toISOString() };
    if (typeof body.status === 'string') updates.status = toDatabaseOrderStatus(sanitizeStatus(body.status) === 'Neu' ? body.status : sanitizeStatus(body.status));
    if (typeof body.notes === 'string') updates.notes = body.notes.slice(0, 4000);

    const { error } = await adminClient.from('orders').update(updates).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope));
  }

  if (action === 'updatePartner') {
    if (staff.role !== 'ADMIN') return jsonError('Admin-Rechte erforderlich.', 403);
    const id = String(body.id || '');
    if (!id) return jsonError('Partner fehlt.', 400);

    const updates: JsonRecord = { updated_at: new Date().toISOString() };
    if (typeof body.status === 'string') updates.status = body.status;
    if (typeof body.category === 'string') updates.category = body.category;
    if (typeof body.regions === 'string') updates.regions = body.regions.slice(0, 500);
    if (typeof body.notes === 'string') updates.settings = { internal_notes: body.notes.slice(0, 4000) };

    const { error } = await adminClient.from('partners').update(updates).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope));
  }

  if (action === 'updateTeam') {
    if (staff.role !== 'ADMIN') return jsonError('Admin-Rechte erforderlich.', 403);
    const id = String(body.id || '');
    const status = String(body.status || '');
    if (!id || !['PENDING', 'ACTIVE', 'DISABLED'].includes(status)) return jsonError('Team-Daten ungültig.', 400);

    const { data: current } = await adminClient.from('team').select('role').eq('id', id).maybeSingle();
    if (current?.role === 'ADMIN' && status === 'DISABLED') {
      return jsonError('Admin-Rolle ist geschützt.', 403);
    }

    const { error } = await adminClient.from('team').update({ status }).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope));
  }

  if (action === 'createTeamMember') {
    if (staff.role !== 'ADMIN') return jsonError('Admin-Rechte erforderlich.', 403);

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = String(body.role || 'EMPLOYEE').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';

    if (!email || password.length < 8) {
      return jsonError('E-Mail und Passwort mit mindestens 8 Zeichen erforderlich.', 400);
    }

    try {
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: role === 'ADMIN' ? 'admin' : 'employee',
          full_name: email.split('@')[0],
        },
      });

      if (createError) return jsonError(mapSupabaseAdminError(createError), 500);

      const now = new Date().toISOString();
      const { error: teamError } = await adminClient
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
        await adminClient.from('profiles').upsert([{
          id: createdUser.user.id,
          email,
          full_name: email.split('@')[0],
          primary_role: role,
          status: 'ACTIVE',
          updated_at: now,
        }]);
      }
    } catch (error) {
      return jsonError(mapSupabaseAdminError(error), 500);
    }

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope));
  }

  if (action === 'assignLeadPartner') {
    if (staff.role !== 'ADMIN') return jsonError('Admin-Rechte erforderlich.', 403);

    const id = String(body.id || '');
    const partnerId = String(body.partnerId || '').trim();
    if (!id || !partnerId) return jsonError('Lead oder Partner fehlt.', 400);

    const { data: partner, error: partnerError } = await adminClient.from('partners').select('id, name').eq('id', partnerId).maybeSingle();
    if (partnerError) return jsonError(partnerError.message, 500);
    if (!partner) return jsonError('Partner nicht gefunden.', 404);

    const { data: currentLead, error: leadReadError } = await adminClient.from('orders').select('notes').eq('id', id).maybeSingle();
    if (leadReadError) return jsonError(leadReadError.message, 500);

    const currentNotes = String(currentLead?.notes || '').trim();
    const assignmentNote = `Zugewiesen an ${partner.name || 'Partner'} am ${new Date().toLocaleString('de-DE')}`;
    const notes = currentNotes ? `${currentNotes}\n${assignmentNote}` : assignmentNote;

    const { error } = await adminClient.from('orders').update({
      notes: notes.slice(0, 4000),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope));
  }

  if (action === 'updateSetting') {
    if (staff.role !== 'ADMIN') return jsonError('Admin-Rechte erforderlich.', 403);

    const id = String(body.id || '').trim();
    const key = String(body.key || '').trim();
    const value = body.value;
    if (!id && !key) return jsonError('Einstellung fehlt.', 400);

    const payload: JsonRecord = {
      value,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (id) {
      ({ error } = await adminClient.from('system_settings').update(payload).eq('id', id));
    } else {
      ({ error } = await adminClient.from('system_settings').upsert([{ key, ...payload }], { onConflict: 'key' }));
    }

    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope));
  }

  if (action === 'markTicketRead') {
    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId) return jsonError('Ticket fehlt.', 400);

    const { error } = await adminClient.from('chat_messages').update({ is_read: true }).eq('session_id', sessionId).eq('sender', 'user');
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope));
  }

  return jsonError('Aktion nicht gefunden.', 400);
}
