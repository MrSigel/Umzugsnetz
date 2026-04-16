'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { DEFAULT_PRICING_CONFIG, normalizePricingConfig } from '@/lib/pricing';
import { 
  Search, 
  ChevronRight, 
  Save, 
  ArrowLeft, 
  Wallet, 
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ShieldCheck,
  Trash2,
  AlertCircle,
  Ban,
  RefreshCw
} from 'lucide-react';

export default function PartnerNetworkPage() {
  const { showToast } = useToast();
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerApplications, setPartnerApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRegions, setEditRegions] = useState('');
  const [editService, setEditService] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [sendingApplicationId, setSendingApplicationId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Alle Status');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [isCrediting, setIsCrediting] = useState(false);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);

  useEffect(() => {
    fetchPartners();
    fetchInviteCodes();
  }, []);

  async function fetchPartners() {
    setLoading(true);
    try {
      const [{ data, error }, { data: pricingData }, { data: applicationData, error: applicationError }] = await Promise.all([
        supabase
          .from('partners')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('system_settings').select('value').eq('key', 'pricing_config').single(),
        supabase
          .from('partner_applications')
          .select('*')
          .neq('status', 'ARCHIVED')
          .order('created_at', { ascending: false }),
      ]);
      if (error) throw error;
      if (applicationError) throw applicationError;
      setPartners(data || []);
      setPartnerApplications(applicationData || []);
      setPricingConfig(normalizePricingConfig(pricingData?.value));
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden', err.message);
    } finally {
      setLoading(false);
    }
  }

  const getCategoryLabel = (alias: string) => {
    const moveTier = pricingConfig.umzug.find((item) => item.alias === alias);
    const clearanceTier = pricingConfig.entruempelung.find((item) => item.alias === alias);
    if (!moveTier || !clearanceTier) {
      return alias;
    }

    return `${alias} — Umzug €${moveTier.price.toFixed(2)} / Entrümpelung €${clearanceTier.price.toFixed(2)}`;
  };

  const handleEdit = (partner: any) => {
    setSelectedPartner(partner);
    setEditName(partner.name || '');
    setEditPhone(partner.phone || '');
    setEditRegions(partner.regions || '');
    setEditService(partner.service || 'BEIDES');
    setEditStatus(partner.status || 'ACTIVE');
    setEditCategory(partner.category || 'Standard Anfragen');
    setIsEditing(true);
  };

  const handleBack = () => {
    setIsEditing(false);
    setSelectedPartner(null);
    setCreditAmount('');
    setCreditReason('');
  };

  const handleSave = async () => {
    if (!selectedPartner) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          name: editName,
          phone: editPhone,
          regions: editRegions,
          service: editService,
          status: editStatus,
          category: editCategory,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPartner.id);
      if (error) throw error;
      showToast('success', 'Gespeichert', `Partner "${editName}" wurde erfolgreich aktualisiert.`);
      await fetchPartners();
      setIsEditing(false);
      setSelectedPartner(null);
    } catch (err: any) {
      showToast('error', 'Fehler beim Speichern', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (partner: any) => {
    // PENDING → ACTIVE (Freischalten), ACTIVE → SUSPENDED, SUSPENDED → ACTIVE
    const newStatus = partner.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const action = partner.status === 'PENDING' ? 'freigeschaltet' : newStatus === 'SUSPENDED' ? 'gesperrt' : 'reaktiviert';
    try {
      const { error } = await supabase
        .from('partners')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', partner.id);
      if (error) throw error;
      showToast('success', `Partner ${action}`, `${partner.name} wurde erfolgreich ${action}.`);
      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: newStatus } : p));
    } catch (err: any) {
      showToast('error', 'Fehler', err.message);
    }
  };

  async function fetchInviteCodes() {
    try {
      const { data, error } = await supabase
        .from('partner_invite_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInviteCodes(data || []);
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden der Codes', err.message);
    }
  }

  const generateInviteCode = async () => {
    setIsGeneratingCode(true);
    try {
      const code = (globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 8) || Math.random().toString(36).substring(2, 10)).toUpperCase();
      const { error } = await supabase
        .from('partner_invite_codes')
        .insert([{ code, is_used: false }]);
      if (error) throw error;
      showToast('success', 'Code generiert', `Neuer Einladungscode: ${code}`);
      await fetchInviteCodes();
    } catch (err: any) {
      showToast('error', 'Fehler', err.message);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const deleteInviteCode = async (id: string) => {
    if (!confirm('Möchten Sie diesen Code wirklich löschen?')) return;
    try {
      const { error } = await supabase
        .from('partner_invite_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('success', 'Code gelöscht');
      await fetchInviteCodes();
    } catch (err: any) {
      showToast('error', 'Fehler beim Löschen', err.message);
    }
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Alle Status' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openApplications = partnerApplications.filter((application) => application.status !== 'ARCHIVED');

  const handleSendPartnerInvite = async (application: any) => {
    setSendingApplicationId(application.id);

    try {
      const { data, error } = await supabase.functions.invoke('partner-invite', {
        body: { applicationId: application.id },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Die Einladung konnte nicht versendet werden.');
      }

      showToast('success', 'Einladung versendet', `Der Registrierungscode wurde an ${application.email} gesendet.`);
      await fetchPartners();
    } catch (err: any) {
      showToast('error', 'Fehler beim Versand', err.message);
    } finally {
      setSendingApplicationId(null);
    }
  };

  // Gutschrift über RPC (schreibt auch Transaktions-Einträge)
  const handleSaveBalance = async () => {
    if (!selectedPartner || !creditAmount) return;
    const amountNum = parseFloat(creditAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('warning', 'Ungültiger Betrag', 'Bitte geben Sie einen positiven Betrag ein.');
      return;
    }
    setIsCrediting(true);
    try {
      // Versuche zuerst die RPC-Funktion (erstellt auch Transaktions-Einträge)
      const { error: rpcError } = await supabase.rpc('admin_credit_partner', {
        partner_id_param: selectedPartner.id,
        amount_param: amountNum,
        reason_param: creditReason || 'Admin-Gutschrift'
      });

      if (rpcError) {
        // Fallback: Direkte Balance-Aktualisierung + manueller Transaktions-Eintrag
        const newBalance = Number(selectedPartner.balance || 0) + amountNum;
        const { error: updateError } = await supabase
          .from('partners')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', selectedPartner.id);
        if (updateError) throw updateError;

        // Wallet-Transaktion manuell erstellen
        await supabase.from('wallet_transactions').insert([{
          user_id: selectedPartner.user_id,
          partner_id: selectedPartner.id,
          type: 'ADMIN_CREDIT',
          amount: amountNum,
          description: creditReason || 'Admin-Gutschrift'
        }]);

        // Admin-Transaktion manuell erstellen
        await supabase.from('transactions').insert([{
          partner_id: selectedPartner.id,
          type: 'ADMIN_CREDIT',
          amount: -amountNum,
          description: `Admin-Gutschrift: ${creditReason || 'Manuell'}`
        }]);

        const updatedPartner = { ...selectedPartner, balance: newBalance };
        setSelectedPartner(updatedPartner);
        setPartners(prev => prev.map(p => p.id === selectedPartner.id ? updatedPartner : p));
      } else {
        // RPC erfolgreich – Daten neu laden
        await fetchPartners();
        const updated = partners.find(p => p.id === selectedPartner.id);
        if (updated) setSelectedPartner({ ...updated, balance: Number(updated.balance || 0) + amountNum });
      }

      showToast('success', 'Gutschrift erfolgreich', `€${amountNum.toFixed(2)} wurden dem Partner gutgeschrieben.`);
      setCreditAmount('');
      setCreditReason('');
    } catch (err: any) {
      showToast('error', 'Fehler bei der Gutschrift', err.message);
    } finally {
      setIsCrediting(false);
    }
  };

  // ─────────────────────────────────────────────
  // EDIT VIEW
  // ─────────────────────────────────────────────
  if (isEditing && selectedPartner) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Partner bearbeiten</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Stammdaten, Regionen und Tarif — <span className="text-slate-500">Wallet-Gutschriften werden als Transaktionen protokolliert</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Firmenname *</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-medium text-black" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Telefon</label>
                  <input type="text" placeholder="z. B. +49 ..." value={editPhone} onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-medium text-black" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Login-E-Mail (Nur Anzeige)</label>
                <input type="email" readOnly defaultValue={selectedPartner.email || '—'}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm text-slate-400 cursor-not-allowed font-medium" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Regionen / Einsatzgebiete</label>
                <textarea rows={4} value={editRegions} onChange={e => setEditRegions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-medium resize-none text-black" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dienstleistung</label>
                  <select value={editService} onChange={e => setEditService(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-medium appearance-none text-black">
                    <option value="BEIDES">Beides</option>
                    <option value="UMZUG">Umzug</option>
                    <option value="ENTRÜMPELUNG">Entrümpelung</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-bold appearance-none text-black">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tarif / Kategorie</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-bold appearance-none text-black">
                  {pricingConfig.umzug.map((tier) => (
                    <option key={tier.id} value={tier.alias}>{getCategoryLabel(tier.alias)}</option>
                  ))}
                </select>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-blue-hover transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/20 disabled:opacity-50">
                <Save className={`w-5 h-5 ${saving ? 'animate-pulse' : ''}`} />
                {saving ? 'Speichert...' : 'Änderungen speichern'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Card */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-brand-blue" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wallet</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-6">
                €{Number(selectedPartner.balance || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
              </h3>
              
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Guthaben gutschreiben</p>
                <input type="number" min="0" step="0.01" placeholder="Betrag in €" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all text-black" />
                <input type="text" placeholder="Grund (z. B. Testguthaben)" value={creditReason} onChange={e => setCreditReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all text-black" />
                <button onClick={handleSaveBalance} disabled={isCrediting || !creditAmount}
                  className="w-full bg-[#00b67a] text-white py-4 rounded-2xl font-bold hover:bg-[#008f5e] transition-all shadow-lg shadow-green-500/10 disabled:opacity-50">
                  {isCrediting ? 'Wird gebucht...' : 'Guthaben gutschreiben'}
                </button>
                <p className="text-[10px] text-slate-400 text-center">Gutschriften werden als Transaktion protokolliert</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Info className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hinweis</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Abonnements (Pro/VIP) werden über Stripe verwaltet. Manuelle Wallet-Gutschriften werden automatisch in der Transaktionsübersicht protokolliert.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {openApplications.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Offene Partner-Anfragen</h3>
              <p className="text-sm text-slate-500 mt-1">Anfragen aus Landingpage und Partnerformularen, die noch nicht archiviert wurden.</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-white text-amber-600 text-xs font-black uppercase tracking-widest border border-amber-200">
              {openApplications.length} offen
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {openApplications.map((application) => (
              <div key={application.id} className="bg-white rounded-[1.5rem] border border-amber-100 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-lg font-bold text-slate-800">{application.company_name}</p>
                    <p className="text-sm text-slate-500">{application.contact_name}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest">
                    {application.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <p><span className="font-bold text-slate-800">E-Mail:</span> {application.email}</p>
                  <p><span className="font-bold text-slate-800">Telefon:</span> {application.phone}</p>
                  <p><span className="font-bold text-slate-800">Ort:</span> {application.location}</p>
                  <p><span className="font-bold text-slate-800">Radius:</span> {application.radius || 'Nicht angegeben'}</p>
                  <p><span className="font-bold text-slate-800">Service:</span> {application.service}</p>
                  <p><span className="font-bold text-slate-800">Quelle:</span> {application.source_page || 'Unbekannt'}</p>
                  <p><span className="font-bold text-slate-800">Eingang:</span> {new Date(application.created_at).toLocaleString('de-DE')}</p>
                  {application.invite_sent_at && (
                    <p><span className="font-bold text-slate-800">Einladung gesendet:</span> {new Date(application.invite_sent_at).toLocaleString('de-DE')}</p>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => handleSendPartnerInvite(application)}
                    disabled={sendingApplicationId === application.id}
                    className="px-4 py-3 bg-brand-blue text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-brand-blue-hover transition-colors disabled:opacity-50"
                  >
                    {sendingApplicationId === application.id
                      ? 'Versendet...'
                      : application.invite_sent_at
                        ? 'Mail erneut senden'
                        : 'Invite senden'}
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Sendet Supabase Invite-Link an {application.email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Partnernetzwerk</h2>
          <p className="text-sm text-slate-500 mt-1">Alle Dienstleistungspartner im Netzwerk verwalten und überwachen.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Unternehmen suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 w-64 lg:w-80 shadow-sm text-black" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none shadow-sm appearance-none min-w-[140px]">
            <option value="Alle Status">Alle Status</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="PENDING">Ausstehend</option>
            <option value="SUSPENDED">Gesperrt</option>
          </select>
          <button onClick={fetchPartners} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-blue transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Unternehmen</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Dienst</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Guthaben</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-800">{partner.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{partner.email}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{partner.category}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-medium text-slate-600">{partner.service}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full w-fit ${
                        partner.status === 'ACTIVE' ? 'bg-[#00b67a]/10 text-[#00b67a]' : 
                        partner.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500'
                      }`}>
                        {partner.status === 'ACTIVE' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                         partner.status === 'SUSPENDED' ? <XCircle className="w-3.5 h-3.5" /> :
                         <Clock className="w-3.5 h-3.5" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">{partner.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-bold text-slate-900">€{Number(partner.balance || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(partner)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">
                          Details
                        </button>
                        <button
                          onClick={() => handleToggleStatus(partner)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            partner.status === 'ACTIVE'
                              ? 'bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                          }`}>
                          {partner.status === 'ACTIVE' ? 'Sperren' : partner.status === 'PENDING' ? 'Freischalten' : 'Reaktivieren'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPartners.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm italic">
                      {searchTerm ? 'Keine Partner gefunden.' : 'Noch keine Partner registriert.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invitation Code Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Partner Einladungs-Codes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Generieren Sie Einmal-Codes für neue Partner-Registrierungen.</p>
              </div>
            </div>
            <button onClick={generateInviteCode} disabled={isGeneratingCode}
              className="px-6 py-3 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue-hover transition-all disabled:opacity-50 shadow-lg shadow-brand-blue/10 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {isGeneratingCode ? 'Generiert...' : 'Code generieren'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 p-1">
            {inviteCodes.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-brand-blue/30 transition-colors">
                <div className="space-y-1">
                  <span className={`font-mono text-base font-black tracking-wider ${c.is_used ? 'text-slate-300 line-through' : 'text-brand-blue'}`}>{c.code}</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(c.created_at).toLocaleDateString('de-DE')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${c.is_used ? 'bg-slate-200 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                    {c.is_used ? 'Verbraucht' : 'Offen'}
                  </span>
                  {!c.is_used && (
                    <button onClick={() => deleteInviteCode(c.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {inviteCodes.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                <p className="text-sm font-bold text-slate-400">Keine Einladungs-Codes vorhanden.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-blue-soft text-brand-blue flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800">Sicheres Onboarding</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Jeder Code kann genau einmal für eine Partner-Registrierung verwendet werden. Geben Sie den Code direkt an den gewünschten Partner weiter. 
              Nach der Registrierung wird der Code automatisch deaktiviert.
            </p>
          </div>
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mt-8 italic text-[10px] text-slate-400 font-medium">
            Wallet-Gutschriften werden automatisch als Transaktionen protokolliert und im Partner-Dashboard sichtbar.
          </div>
        </div>
      </div>
    </div>
  );
}
