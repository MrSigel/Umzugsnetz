import { NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { requireStaffUser, type StaffRole } from '@/lib/server/staffAuth';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type ActionBody = {
  action?: string;
  channelId?: string;
  name?: string;
  text?: string;
  email?: string;
  userId?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `kanal-${Date.now().toString(36)}`;
}

async function loadStaffDirectory(admin: SupabaseClient) {
  const [{ data: teamRows }, { data: profileRows }] = await Promise.all([
    admin.from('team').select('email,role,status'),
    admin.from('profiles').select('id,email,full_name,primary_role'),
  ]);

  const profilesByEmail = new Map<string, { id: string; full_name: string | null; email: string | null; primary_role: string | null }>();
  for (const profile of profileRows || []) {
    const key = String(profile.email || '').toLowerCase();
    if (key) profilesByEmail.set(key, profile);
  }

  const directory: Array<{ user_id: string; email: string; full_name: string | null; role: StaffRole | null; status: string }> = [];
  for (const row of teamRows || []) {
    const email = String(row.email || '').toLowerCase();
    if (!email) continue;
    const profile = profilesByEmail.get(email);
    if (!profile) continue;
    const status = String(row.status || '').toUpperCase();
    if (status === 'DISABLED') continue;
    const roleCode = String(row.role || '').toUpperCase();
    const role: StaffRole | null = roleCode === 'ADMIN' || roleCode === 'ADMINISTRATOR' || roleCode === 'DEVELOPER'
      ? 'ADMIN'
      : roleCode === 'EMPLOYEE' || roleCode === 'MITARBEITER'
        ? 'EMPLOYEE'
        : null;
    directory.push({
      user_id: profile.id,
      email,
      full_name: profile.full_name,
      role,
      status,
    });
  }

  for (const profile of profileRows || []) {
    const email = String(profile.email || '').toLowerCase();
    if (!email) continue;
    const role = String(profile.primary_role || '').toUpperCase();
    const isStaff = role === 'ADMIN' || role === 'DEVELOPER' || role === 'EMPLOYEE';
    if (!isStaff) continue;
    if (directory.some((entry) => entry.user_id === profile.id)) continue;
    directory.push({
      user_id: profile.id,
      email,
      full_name: profile.full_name,
      role: role === 'EMPLOYEE' ? 'EMPLOYEE' : 'ADMIN',
      status: 'ACTIVE',
    });
  }

  return directory;
}

async function loadChannelsForUser(admin: SupabaseClient, userId: string, role: StaffRole) {
  const [{ data: channels }, { data: memberships }] = await Promise.all([
    admin
      .from('team_channels')
      .select('id,slug,name,is_default,is_locked,created_by,created_at')
      .order('created_at', { ascending: true }),
    admin
      .from('team_channel_members')
      .select('id,channel_id,user_id,added_by,added_at'),
  ]);

  const myChannelIds = new Set<string>();
  for (const member of memberships || []) {
    if (member.user_id === userId) myChannelIds.add(member.channel_id);
  }

  const visibleChannels = (channels || []).filter((channel) => {
    if (role === 'ADMIN') return true;
    if (channel.is_default) return true;
    return myChannelIds.has(channel.id);
  });

  return { channels: visibleChannels, memberships: memberships || [] };
}

async function loadMessages(admin: SupabaseClient, channelId: string) {
  const { data } = await admin
    .from('team_chat_messages')
    .select('id,channel_id,author_user_id,author_email,author_name,text,created_at')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(200);
  return data || [];
}

export async function GET(request: Request) {
  let staff;
  try {
    staff = await requireStaffUser(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Anmeldung erforderlich.', 401);
  }

  const url = new URL(request.url);
  const channelId = url.searchParams.get('channelId');
  const admin = getSupabaseAdmin();

  const { channels, memberships } = await loadChannelsForUser(admin, staff.user.id, staff.role);
  const directory = staff.role === 'ADMIN' ? await loadStaffDirectory(admin) : [];

  let activeChannelId = channelId || channels.find((c) => c.is_default)?.id || channels[0]?.id || null;
  if (activeChannelId && !channels.some((c) => c.id === activeChannelId)) {
    activeChannelId = channels.find((c) => c.is_default)?.id || channels[0]?.id || null;
  }

  const messages = activeChannelId ? await loadMessages(admin, activeChannelId) : [];

  return NextResponse.json({
    role: staff.role,
    currentUser: {
      id: staff.user.id,
      email: staff.user.email || '',
    },
    channels: channels.map((channel) => ({
      ...channel,
      members: (memberships || []).filter((member) => member.channel_id === channel.id),
    })),
    activeChannelId,
    messages,
    directory,
  });
}

export async function POST(request: Request) {
  let staff;
  try {
    staff = await requireStaffUser(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Anmeldung erforderlich.', 401);
  }

  let body: ActionBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungültige Anfrage.', 400);
  }

  const action = String(body.action || '').trim();
  if (!action) return jsonError('Aktion fehlt.', 400);

  const admin = getSupabaseAdmin();

  if (action === 'create_channel') {
    if (staff.role !== 'ADMIN') return jsonError('Nur Geschäftsführer dürfen Kanäle anlegen.', 403);
    const name = String(body.name || '').trim();
    if (!name) return jsonError('Bitte einen Namen angeben.', 400);
    const baseSlug = slugify(name);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: channel, error } = await admin
      .from('team_channels')
      .insert([{ name: name.slice(0, 80), slug, is_default: false, is_locked: false, created_by: staff.user.id }])
      .select('*')
      .single();
    if (error || !channel) return jsonError(error?.message || 'Kanal konnte nicht erstellt werden.', 500);

    await admin.from('team_channel_members').insert([{
      channel_id: channel.id,
      user_id: staff.user.id,
      added_by: staff.user.id,
    }]);

    return NextResponse.json({ success: true, channelId: channel.id });
  }

  if (action === 'delete_channel') {
    if (staff.role !== 'ADMIN') return jsonError('Nur Geschäftsführer dürfen Kanäle löschen.', 403);
    const channelId = String(body.channelId || '').trim();
    if (!channelId) return jsonError('Kanal fehlt.', 400);
    const { data: channel } = await admin
      .from('team_channels')
      .select('id,is_locked')
      .eq('id', channelId)
      .maybeSingle();
    if (!channel) return jsonError('Kanal nicht gefunden.', 404);
    if (channel.is_locked) return jsonError('Dieser Kanal ist permanent und kann nicht gelöscht werden.', 400);
    const { error } = await admin.from('team_channels').delete().eq('id', channelId);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ success: true });
  }

  if (action === 'add_member') {
    if (staff.role !== 'ADMIN') return jsonError('Nur Geschäftsführer dürfen Mitglieder hinzufügen.', 403);
    const channelId = String(body.channelId || '').trim();
    if (!channelId) return jsonError('Kanal fehlt.', 400);

    const { data: channel } = await admin
      .from('team_channels')
      .select('id,is_default')
      .eq('id', channelId)
      .maybeSingle();
    if (!channel) return jsonError('Kanal nicht gefunden.', 404);
    if (channel.is_default) return jsonError('Der Standard-Kanal enthält automatisch alle Mitarbeiter.', 400);

    let userId = String(body.userId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    if (!userId && email) {
      const { data: profile } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle();
      userId = profile?.id || '';
    }
    if (!userId) return jsonError('Mitglied nicht gefunden.', 404);

    const { error } = await admin.from('team_channel_members').upsert([{
      channel_id: channelId,
      user_id: userId,
      added_by: staff.user.id,
    }], { onConflict: 'channel_id,user_id' });
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_member') {
    if (staff.role !== 'ADMIN') return jsonError('Nur Geschäftsführer dürfen Mitglieder entfernen.', 403);
    const channelId = String(body.channelId || '').trim();
    const userId = String(body.userId || '').trim();
    if (!channelId || !userId) return jsonError('Kanal und Mitglied erforderlich.', 400);

    const { data: channel } = await admin
      .from('team_channels')
      .select('id,is_default')
      .eq('id', channelId)
      .maybeSingle();
    if (!channel) return jsonError('Kanal nicht gefunden.', 404);
    if (channel.is_default) return jsonError('Der Standard-Kanal enthält automatisch alle Mitarbeiter.', 400);

    const { error } = await admin
      .from('team_channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', userId);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ success: true });
  }

  if (action === 'send_message') {
    const channelId = String(body.channelId || '').trim();
    const text = String(body.text || '').trim();
    if (!channelId || !text) return jsonError('Kanal und Nachricht erforderlich.', 400);
    if (text.length > 4000) return jsonError('Nachricht zu lang.', 400);

    const { data: channel } = await admin
      .from('team_channels')
      .select('id,is_default')
      .eq('id', channelId)
      .maybeSingle();
    if (!channel) return jsonError('Kanal nicht gefunden.', 404);

    if (!channel.is_default) {
      const { data: membership } = await admin
        .from('team_channel_members')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', staff.user.id)
        .maybeSingle();
      if (!membership && staff.role !== 'ADMIN') {
        return jsonError('Sie sind nicht Mitglied dieses Kanals.', 403);
      }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name,email')
      .eq('id', staff.user.id)
      .maybeSingle();

    const { error } = await admin.from('team_chat_messages').insert([{
      channel_id: channelId,
      author_user_id: staff.user.id,
      author_email: profile?.email || staff.user.email || null,
      author_name: profile?.full_name || staff.user.email || null,
      text,
    }]);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ success: true });
  }

  return jsonError('Unbekannte Aktion.', 400);
}
