import { NextResponse } from 'next/server';
import type { AppRole } from '@/lib/crm/types';
import { bootstrapPartnerUser } from '@/lib/auth/bootstrapPartnerUser';
import { requireAdminUser } from '@/lib/server/adminAuth';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type AssignRoleBody = {
  userId?: string;
  role?: AppRole;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isAppRole(value: string): value is AppRole {
  return value === 'ADMIN' || value === 'DEVELOPER' || value === 'PARTNER' || value === 'EMPLOYEE';
}

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin-Rechte erforderlich.';
    return jsonError(message, message === 'Admin-Rechte erforderlich.' ? 403 : 401);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const [{ data: authUsersData, error: authUsersError }, { data: roleRows, error: roleError }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin
      .from('user_roles')
      .select('user_id, role_code'),
  ]);

  if (authUsersError) {
    return jsonError(authUsersError.message, 500);
  }

  if (roleError) {
    return jsonError(roleError.message, 500);
  }

  const roleMap = new Map<string, AppRole[]>();
  for (const row of roleRows || []) {
    const current = roleMap.get(row.user_id) || [];
    current.push(row.role_code as AppRole);
    roleMap.set(row.user_id, current);
  }

  const users = (authUsersData.users || [])
    .map((user) => ({
      id: user.id,
      email: user.email || '',
      createdAt: user.created_at,
      confirmedAt: user.email_confirmed_at,
      roles: roleMap.get(user.id) || [],
    }))
    .sort((left, right) => {
      if (left.roles.length === 0 && right.roles.length > 0) return -1;
      if (left.roles.length > 0 && right.roles.length === 0) return 1;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  let adminUser;
  try {
    adminUser = await requireAdminUser(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin-Rechte erforderlich.';
    return jsonError(message, message === 'Admin-Rechte erforderlich.' ? 403 : 401);
  }

  let body: AssignRoleBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungueltige Anfrage.', 400);
  }

  const userId = body.userId?.trim();
  const role = String(body.role || '').toUpperCase();

  if (!userId || !isAppRole(role)) {
    return jsonError('Benutzer oder Rolle fehlt.', 400);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userResponse, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !userResponse.user) {
    return jsonError(userError?.message || 'Benutzer wurde nicht gefunden.', 404);
  }

  const targetUser = userResponse.user;
  const email = targetUser.email?.trim().toLowerCase();
  if (!email) {
    return jsonError('Benutzerkonto ohne E-Mail-Adresse.', 400);
  }

  const now = new Date().toISOString();

  await supabaseAdmin.from('profiles').upsert([{
    id: targetUser.id,
    email,
    full_name: String(targetUser.user_metadata?.full_name || '').trim() || email.split('@')[0],
    primary_role: role,
    updated_at: now,
  }], { onConflict: 'id' });

  await supabaseAdmin.from('user_roles').upsert([{
    user_id: targetUser.id,
    role_code: role,
  }], { onConflict: 'user_id,role_code' });

  if (role === 'EMPLOYEE') {
    await supabaseAdmin.from('employees').upsert([{
      user_id: targetUser.id,
      profile_id: targetUser.id,
      status: 'ACTIVE',
      updated_at: now,
    }], { onConflict: 'user_id' });

    await supabaseAdmin.from('team').upsert([{
      email,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      invited_by_email: adminUser.email?.toLowerCase() || null,
      onboarding_seen_at: now,
    }], { onConflict: 'email' });
  }

  if (role === 'PARTNER') {
    await bootstrapPartnerUser(targetUser);
  }

  await supabaseAdmin.from('notifications').insert([{
    type: 'USER_ROLE_ASSIGNED',
    title: 'Rolle zugewiesen',
    message: `${email} wurde die Rolle ${role} zugewiesen.`,
    link: '/crm/admin/users',
    is_read: false,
  }]);

  return NextResponse.json({ success: true });
}
