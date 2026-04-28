import { NextResponse } from 'next/server';
import { type SupabaseClient, type User } from '@supabase/supabase-js';
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
const workResults = ['Gewonnen', 'Verloren', 'Neu Kontaktieren', 'Löschen'] as const;
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
    return 'Der Supabase-Schlüssel ist ungültig. Bitte den Dienstschlüssel in der Umgebung korrigieren.';
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

function normalizeInternalRole(value: unknown): 'ADMIN' | 'EMPLOYEE' | null {
  const role = String(value || '').trim().toUpperCase();
  if (role === 'ADMIN' || role === 'ADMINISTRATOR' || role === 'DEVELOPER') return 'ADMIN';
  if (role === 'EMPLOYEE' || role === 'MITARBEITER') return 'EMPLOYEE';
  return null;
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

function appendNote(current: unknown, note: unknown, prefix: string) {
  const text = String(note || '').trim();
  const existing = String(current || '').trim();
  const entry = `${prefix}${text ? `\n${text}` : ''}`.trim();
  return [existing, entry].filter(Boolean).join('\n\n').slice(0, 4000);
}

function partnerSettings(body: JsonRecord, existing?: JsonRecord | null) {
  const current = existing && typeof existing === 'object' ? existing : {};
  return {
    ...current,
    address: String(body.address || '').trim().slice(0, 500),
    contact_person: String(body.contactPerson || '').trim().slice(0, 200),
    notes: String(body.notes || '').trim().slice(0, 4000),
  };
}

function normalizePartnerStatus(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (['pending', 'in pruefung', 'in prüfung', 'pruefung', 'prüfung'].includes(status)) return 'PENDING';
  if (['suspended', 'pausiert', 'gesperrt'].includes(status)) return 'SUSPENDED';
  return 'ACTIVE';
}

function normalizePartnerService(value: unknown) {
  const service = String(value || '').trim().toLowerCase();
  if (['umzug'].includes(service)) return 'UMZUG';
  if (['entruempelung', 'entrümpelung'].includes(service)) return 'ENTRÜMPELUNG';
  return 'BEIDES';
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

function buildWorkStats(logs: JsonRecord[]) {
  const now = new Date();
  const today = now.toDateString();
  const currentHour = now.getHours();
  const totalCalls = logs.length;
  const callsToday = logs.filter((log) => log.created_at && new Date(String(log.created_at)).toDateString() === today).length;
  const callsThisHour = logs.filter((log) => {
    if (!log.created_at) return false;
    const date = new Date(String(log.created_at));
    return date.toDateString() === today && date.getHours() === currentHour;
  }).length;
  const countResult = (result: string) => logs.filter((log) => String(log.result || '') === result).length;
  const won = countResult('Gewonnen');
  const lost = countResult('Verloren');
  const recontact = countResult('Neu Kontaktieren');
  const deleted = countResult('Löschen');

  return {
    totalCalls,
    callsToday,
    callsThisHour,
    won,
    lost,
    recontact,
    deleted,
    successRate: totalCalls ? Math.round((won / totalCalls) * 100) : 0,
    lastCallAt: logs[0]?.created_at || null,
  };
}

function normalizeScope(value: unknown): PortalScope {
  const scope = String(value || '').trim().toLowerCase();
  return ['dashboard', 'leads', 'orders', 'tickets', 'finance', 'partners', 'team', 'settings', 'all'].includes(scope)
    ? (scope as PortalScope)
    : 'dashboard';
}

async function fetchPortalData(role: StaffRole, supabase: SupabaseClient, scope: PortalScope = 'dashboard', staffUser?: User) {
  const includeOrders = ['dashboard', 'leads', 'orders', 'finance', 'all'].includes(scope);
  const includeNotifications = ['dashboard', 'all'].includes(scope);
  const includeTransactions = role === 'ADMIN' && ['dashboard', 'finance', 'all'].includes(scope);
  const includePartners = ['partners', 'all'].includes(scope);
  const includeTeam = role === 'ADMIN' && ['team', 'all'].includes(scope);
  const includeSettings = role === 'ADMIN' && ['settings', 'all'].includes(scope);
  const includeTickets = ['tickets', 'all'].includes(scope);
  const includeWorkStats = ['dashboard', 'all'].includes(scope);

  const [ordersResult, partnersResult, transactionsResult, notificationsResult, teamResult, settingsResult, chatResult] = await Promise.all([
    includeOrders
      ? supabase
          .from('orders')
          .select('id, order_number, service_category, customer_name, customer_email, customer_phone, move_date, von_city, von_address, nach_city, nach_address, estimated_price, status, notes, created_at')
          .order('created_at', { ascending: false })
          .limit(scope === 'dashboard' ? 80 : 200)
      : Promise.resolve({ data: [], error: null }),
    includePartners
      ? supabase.from('partners').select('id, name, email, phone, regions, status, category, service, balance, settings').order('created_at', { ascending: false }).limit(120)
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
  let team = (teamResult.data || []) as JsonRecord[];
  let workLogs: JsonRecord[] = [];

  if (includeWorkStats) {
    let workLogQuery = supabase
      .from('work_call_logs')
      .select('id, staff_user_id, staff_email, order_id, result, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (role === 'EMPLOYEE' && staffUser?.id) {
      workLogQuery = workLogQuery.eq('staff_user_id', staffUser.id);
    }

    const { data, error } = await workLogQuery;
    if (!error) workLogs = (data || []) as JsonRecord[];
  }

  if (includeTeam) {
    const readProfiles = async () => {
      try {
        return await supabase.from('profiles').select('id, email, primary_role, created_at');
      } catch {
        return { data: [], error: null };
      }
    };
    const readUserRoles = async () => {
      try {
        return await supabase.from('user_roles').select('user_id, role_code');
      } catch {
        return { data: [], error: null };
      }
    };

    const [authUsersResult, profilesResult, userRolesResult] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: { users: [] }, error: null })),
      readProfiles(),
      readUserRoles(),
    ]);

    const profileById = new Map<string, JsonRecord>();
    ((profilesResult.data || []) as JsonRecord[]).forEach((profile) => {
      if (profile.id) profileById.set(String(profile.id), profile);
    });

    const roleByUserId = new Map<string, 'ADMIN' | 'EMPLOYEE'>();
    ((userRolesResult.data || []) as JsonRecord[]).forEach((entry) => {
      const resolvedRole = normalizeInternalRole(entry.role_code);
      if (entry.user_id && resolvedRole) roleByUserId.set(String(entry.user_id), resolvedRole);
    });

    const teamByEmail = new Map<string, JsonRecord>();
    team.forEach((member) => {
      const email = String(member.email || '').toLowerCase();
      if (email) teamByEmail.set(email, member);
    });

    (authUsersResult.data?.users || []).forEach((user: User) => {
      const email = user.email?.toLowerCase();
      if (!email || teamByEmail.has(email)) return;

      const profile = profileById.get(user.id);
      const resolvedRole =
        normalizeInternalRole(user.app_metadata?.role || user.user_metadata?.role)
        || roleByUserId.get(user.id)
        || normalizeInternalRole(profile?.primary_role);

      if (!resolvedRole) return;

      teamByEmail.set(email, {
        id: `auth:${user.id}`,
        email,
        role: resolvedRole,
        status: user.banned_until ? 'DISABLED' : user.email_confirmed_at ? 'ACTIVE' : 'PENDING',
        created_at: user.created_at || profile?.created_at || null,
      });
    });

    team = Array.from(teamByEmail.values()).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }

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
  if (includeTeam) response.team = team;
  if (includeSettings) response.settings = settingsResult.data || [];
  if (includeWorkStats) response.workStats = buildWorkStats(workLogs);

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
    return NextResponse.json(await fetchPortalData(staff.role, getSupabaseAdmin(), scope, staff.user));
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
    if (!id) return jsonError('Anfrage fehlt.', 400);

    const updates: JsonRecord = { updated_at: new Date().toISOString() };
    if (typeof body.status === 'string') updates.status = toDatabaseOrderStatus(sanitizeStatus(body.status) === 'Neu' ? body.status : sanitizeStatus(body.status));
    if (typeof body.notes === 'string') updates.notes = body.notes.slice(0, 4000);

    const { error } = await adminClient.from('orders').update(updates).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'processWorkLead') {
    const id = String(body.id || '');
    const result = String(body.result || '').trim();
    if (!id) return jsonError('Kunde fehlt.', 400);
    if (!workResults.includes(result as (typeof workResults)[number])) return jsonError('Bitte einen Status auswählen.', 400);

    const { data: currentLead, error: readError } = await adminClient.from('orders').select('id, order_number, customer_name, notes').eq('id', id).maybeSingle();
    if (readError) return jsonError(readError.message, 500);

    const logEntry = {
      staff_user_id: staff.user.id,
      staff_email: staff.user.email?.toLowerCase() || null,
      order_id: id,
      order_number: String(currentLead?.order_number || ''),
      customer_name: String(currentLead?.customer_name || ''),
      result,
      notes: String(body.notes || '').trim().slice(0, 4000),
    };

    if (result === 'Löschen') {
      const { error: logError } = await adminClient.from('work_call_logs').insert([logEntry]);
      if (logError) return jsonError(logError.message, 500);
      const { error } = await adminClient.from('orders').delete().eq('id', id);
      if (error) return jsonError(error.message, 500);
      return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
    }

    const status = result === 'Gewonnen' ? 'Abgeschlossen' : result === 'Verloren' ? 'Storniert' : 'In Bearbeitung';
    const prefix = `Arbeiten: ${result} am ${new Date().toLocaleString('de-DE')}`;
    const notes = appendNote(currentLead?.notes, body.notes, prefix);

    const { error: logError } = await adminClient.from('work_call_logs').insert([logEntry]);
    if (logError) return jsonError(logError.message, 500);

    const { error } = await adminClient.from('orders').update({
      status,
      notes,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'updatePartner') {
    if (staff.role !== 'ADMIN') return jsonError('Geschäftsführer-Rechte erforderlich.', 403);
    const id = String(body.id || '');
    if (!id) return jsonError('Partner fehlt.', 400);

    const updates: JsonRecord = { updated_at: new Date().toISOString() };
    if (typeof body.status === 'string') updates.status = body.status;
    if (typeof body.category === 'string') updates.category = body.category;
    if (typeof body.regions === 'string') updates.regions = body.regions.slice(0, 500);
    if (typeof body.notes === 'string') updates.settings = { internal_notes: body.notes.slice(0, 4000) };

    const { error } = await adminClient.from('partners').update(updates).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'createCustomerCompany') {
    const name = String(body.name || '').trim();
    if (!name) return jsonError('Firmenname fehlt.', 400);

    const { error } = await adminClient.from('partners').insert([{
      name,
      email: String(body.email || '').trim().toLowerCase() || null,
      phone: String(body.phone || '').trim() || null,
      regions: String(body.regions || '').trim() || null,
      service: String(body.service || 'BEIDES').trim(),
      status: String(body.status || 'ACTIVE').trim(),
      category: String(body.category || 'Standard Anfragen').trim(),
      settings: partnerSettings(body),
    }]);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'updateCustomerCompany') {
    const id = String(body.id || '');
    const name = String(body.name || '').trim();
    if (!id) return jsonError('Kunde fehlt.', 400);
    if (!name) return jsonError('Firmenname fehlt.', 400);

    const { data: currentPartner, error: readError } = await adminClient.from('partners').select('settings').eq('id', id).maybeSingle();
    if (readError) return jsonError(readError.message, 500);

    const { error } = await adminClient.from('partners').update({
      name,
      email: String(body.email || '').trim().toLowerCase() || null,
      phone: String(body.phone || '').trim() || null,
      regions: String(body.regions || '').trim() || null,
      service: String(body.service || 'BEIDES').trim(),
      status: String(body.status || 'ACTIVE').trim(),
      category: String(body.category || 'Standard Anfragen').trim(),
      settings: partnerSettings(body, currentPartner?.settings as JsonRecord | null),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'importCustomerCompanies') {
    if (staff.role !== 'ADMIN') return jsonError('Geschäftsführer-Rechte erforderlich.', 403);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const payload = rows
      .map((entry) => entry && typeof entry === 'object' ? entry as JsonRecord : null)
      .filter((entry): entry is JsonRecord => Boolean(entry))
      .map((entry) => {
        const name = String(entry.name || '').trim();
        if (!name) return null;
        return {
          name,
          email: String(entry.email || '').trim().toLowerCase() || null,
          phone: String(entry.phone || '').trim() || null,
          regions: String(entry.regions || '').trim() || null,
          service: normalizePartnerService(entry.service),
          status: normalizePartnerStatus(entry.status),
          category: String(entry.category || 'Standard Anfragen').trim(),
          settings: partnerSettings(entry),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .slice(0, 500);

    if (!payload.length) return jsonError('Keine gültigen Kundendaten gefunden.', 400);

    const { error } = await adminClient.from('partners').insert(payload);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'updateTeam') {
    if (staff.role !== 'ADMIN') return jsonError('Geschäftsführer-Rechte erforderlich.', 403);
    const id = String(body.id || '');
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || 'EMPLOYEE').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
    const status = String(body.status || '');
    if (!id || !['PENDING', 'ACTIVE', 'DISABLED'].includes(status)) return jsonError('Team-Daten ungültig.', 400);

    if (id.startsWith('auth:')) {
      if (!email) return jsonError('Team-E-Mail fehlt.', 400);
      const { error } = await adminClient.from('team').upsert([{
        email,
        role,
        status,
        invited_by_email: staff.user.email?.toLowerCase() || null,
      }], { onConflict: 'email' });
      if (error) return jsonError(error.message, 500);

      return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
    }

    const { data: current } = await adminClient.from('team').select('role').eq('id', id).maybeSingle();
    if (normalizeInternalRole(current?.role) === 'ADMIN' && status === 'DISABLED') {
      return jsonError('Geschäftsführer-Rolle ist geschützt.', 403);
    }

    const { error } = await adminClient.from('team').update({ status }).eq('id', id);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'createTeamMember') {
    if (staff.role !== 'ADMIN') return jsonError('Geschäftsführer-Rechte erforderlich.', 403);

    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || 'EMPLOYEE').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';

    if (!email) {
      return jsonError('Bitte eine E-Mail-Adresse angeben.', 400);
    }

    try {
      const appBaseUrl = process.env.APP_BASE_URL || 'https://umzugsnetz.de';
      const redirectTo = `${appBaseUrl.replace(/\/$/, '')}/admin/einladung`;
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          role: role === 'ADMIN' ? 'admin' : 'employee',
          full_name: email.split('@')[0],
        },
      });

      if (inviteError) return jsonError(mapSupabaseAdminError(inviteError), 500);

      const now = new Date().toISOString();
      const { error: teamError } = await adminClient
        .from('team')
        .upsert([{
          email,
          role,
          status: 'PENDING',
          invited_by_email: staff.user.email?.toLowerCase() || null,
          invitation_sent_at: now,
        }], { onConflict: 'email' });

      if (teamError) return jsonError(teamError.message, 500);

      if (inviteData.user?.id) {
        await adminClient.from('profiles').upsert([{
          id: inviteData.user.id,
          email,
          full_name: email.split('@')[0],
          primary_role: role,
          status: 'PENDING',
          updated_at: now,
        }]);
      }

      await adminClient.from('notifications').insert([{
        type: 'TEAM_INVITE_SENT',
        title: 'Mitarbeiter-Einladung versendet',
        message: `${email} wurde als ${role === 'ADMIN' ? 'Geschäftsführer' : 'Mitarbeiter'} eingeladen.`,
        link: '/',
        is_read: false,
      }]);
    } catch (error) {
      return jsonError(mapSupabaseAdminError(error), 500);
    }

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'assignLeadPartner') {
    if (staff.role !== 'ADMIN') return jsonError('Geschäftsführer-Rechte erforderlich.', 403);

    const id = String(body.id || '');
    const partnerId = String(body.partnerId || '').trim();
    if (!id || !partnerId) return jsonError('Anfrage oder Partner fehlt.', 400);

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

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'updateSetting') {
    if (staff.role !== 'ADMIN') return jsonError('Geschäftsführer-Rechte erforderlich.', 403);

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

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'markTicketRead') {
    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId) return jsonError('Support-Anfrage fehlt.', 400);

    const { error } = await adminClient.from('chat_messages').update({ is_read: true }).eq('session_id', sessionId).eq('sender', 'user');
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  if (action === 'markNotificationsRead') {
    const notificationIds = Array.isArray(body.notificationIds)
      ? body.notificationIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    let query = adminClient.from('notifications').update({ is_read: true });
    if (notificationIds.length) {
      query = query.in('id', notificationIds);
    } else {
      query = query.eq('is_read', false);
    }

    const { error } = await query;
    if (error) return jsonError(error.message, 500);

    return NextResponse.json(await fetchPortalData(staff.role, adminClient, scope, staff.user));
  }

  return jsonError('Aktion nicht gefunden.', 400);
}
