import { supabase } from '@/lib/supabase';

type PartnerApplicationInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  radius: string;
  service: string;
  sourcePage: string;
};

type ContactRequestInput = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  sourcePage: string;
};

type TopupRequestInput = {
  userId: string;
  partnerId: string;
  amount: number;
  paymentMethod: string;
  note?: string;
};

function buildReference(prefix: string) {
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase() || Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function submitPartnerApplication(input: PartnerApplicationInput) {
  const { error } = await supabase.from('partner_applications').insert([{
    company_name: input.companyName,
    contact_name: input.contactName,
    email: input.email,
    phone: input.phone,
    location: input.location,
    radius: input.radius,
    service: input.service,
    source_page: input.sourcePage,
    status: 'NEW',
  }]);

  if (error) {
    throw error;
  }

  await supabase.from('notifications').insert([{
    type: 'PARTNER_APPLICATION',
    title: 'Neue Partner-Anfrage',
    message: `${input.companyName} hat über ${input.sourcePage} eine Partner-Anfrage gestellt.`,
    link: '/admin/dashboard/partner',
    is_read: false,
  }]);
}

export async function submitContactRequest(input: ContactRequestInput) {
  const { error } = await supabase.from('contact_requests').insert([{
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    message: input.message,
    source_page: input.sourcePage,
    status: 'NEW',
  }]);

  if (error) {
    throw error;
  }

  await supabase.from('notifications').insert([{
    type: 'CONTACT_REQUEST',
    title: 'Neue Kontaktanfrage',
    message: `${input.firstName} ${input.lastName} hat eine Anfrage über ${input.sourcePage} gesendet.`,
    link: '/admin/dashboard/chat',
    is_read: false,
  }]);
}

export async function createWalletTopupRequest(input: TopupRequestInput) {
  const reference = buildReference('TOPUP');

  const { error } = await supabase.from('wallet_topup_requests').insert([{
    reference,
    user_id: input.userId,
    partner_id: input.partnerId,
    amount: input.amount,
    payment_method: input.paymentMethod,
    note: input.note || null,
    status: 'REQUESTED',
  }]);

  if (error) {
    throw error;
  }

  await supabase.from('notifications').insert([{
    type: 'TOPUP_REQUEST',
    title: 'Neue Guthaben-Anfrage',
    message: `Partner ${input.partnerId} hat eine Aufladung über ${input.amount.toFixed(2)} € angefragt.`,
    link: '/admin/dashboard/partner',
    is_read: false,
  }]);

  return reference;
}
