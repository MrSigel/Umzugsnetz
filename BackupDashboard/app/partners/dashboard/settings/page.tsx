'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Power,
  RefreshCw,
  Save,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    regions: '',
    service: 'BEIDES',
    isActive: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [notifForm, setNotifForm] = useState({
    emailNotif: true,
    smsNotif: true,
    smsNumber: '',
  });

  useEffect(() => {
    void fetchPartner();
  }, []);

  async function fetchPartner() {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!user) {
        throw new Error('Kein aktiver Partner gefunden.');
      }

      const { data: p, error: partnerError } = await supabase.from('partners').select('*').eq('user_id', user.id).single();
      if (partnerError) throw partnerError;

      setPartner(p);
      setProfileForm({
        name: p.name || '',
        email: p.email || '',
        phone: p.phone || '',
        regions: p.regions || '',
        service: p.service || 'BEIDES',
        isActive: p.status === 'ACTIVE',
      });

      setNotifForm({
        emailNotif: p.settings?.emailNotif ?? true,
        smsNotif: p.settings?.smsNotif ?? true,
        smsNumber: p.settings?.smsNumber || p.phone || '',
      });
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden', err.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  const setSavedState = (section: string) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 3000);
  };

  const handleSave = async (section: 'profile' | 'password' | 'notif') => {
    if (!partner) return;
    setSavingSection(section);

    try {
      if (section === 'profile') {
        const { error } = await supabase
          .from('partners')
          .update({
            name: profileForm.name,
            email: profileForm.email,
            phone: profileForm.phone,
            regions: profileForm.regions,
            service: profileForm.service,
            status: profileForm.isActive ? 'ACTIVE' : 'SUSPENDED',
          })
          .eq('user_id', partner.user_id);

        if (error) throw error;

        if (profileForm.email && profileForm.email !== partner.email) {
          const { error: authEmailError } = await supabase.auth.updateUser({ email: profileForm.email });
          if (authEmailError) throw authEmailError;
        }

        setPartner((prev: any) => ({
          ...prev,
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone,
          regions: profileForm.regions,
          service: profileForm.service,
          status: profileForm.isActive ? 'ACTIVE' : 'SUSPENDED',
        }));
      }

      if (section === 'password') {
        if (passwordForm.new.length < 8) {
          throw new Error('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
        }

        if (passwordForm.new !== passwordForm.confirm) {
          throw new Error('Die Passwörter stimmen nicht überein.');
        }

        const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
        if (error) throw error;
        setPasswordForm({ current: '', new: '', confirm: '' });
      }

      if (section === 'notif') {
        const nextSettings = {
          ...(partner.settings || {}),
          emailNotif: notifForm.emailNotif,
          smsNotif: notifForm.smsNotif,
          smsNumber: notifForm.smsNumber,
        };

        const { error } = await supabase
          .from('partners')
          .update({ settings: nextSettings })
          .eq('user_id', partner.user_id);

        if (error) throw error;
        setPartner((prev: any) => ({ ...prev, settings: nextSettings }));
      }

      setSavedState(section);
      showToast('success', 'Gespeichert', 'Die Änderungen wurden erfolgreich übernommen.');
    } catch (err: any) {
      showToast('error', 'Fehler beim Speichern', err.message || 'Unbekannter Fehler');
    } finally {
      setSavingSection(null);
    }
  };

  const renderSaveButton = (section: 'profile' | 'password' | 'notif', label: string) => (
    <button
      onClick={() => void handleSave(section)}
      disabled={savingSection === section}
      className={`flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all shadow-lg ${
        savedSection === section ? 'bg-emerald-500 text-white' : 'bg-brand-blue text-white hover:bg-brand-blue-hover shadow-brand-blue/10'
      }`}
    >
      {savingSection === section ? <RefreshCw className="h-4 w-4 animate-spin" /> : savedSection === section ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-10 pb-20 font-sans animate-in fade-in duration-500">
      <div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-800">Einstellungen</h1>
        <p className="text-sm font-medium text-slate-400">Verwalten Sie Ihr Profil, Sicherheit und Benachrichtigungen in einer klaren Oberfläche.</p>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/30 p-8 md:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Unternehmensprofil</h3>
            </div>
            <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${profileForm.isActive ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>
              <Power className="h-3 w-3" /> {profileForm.isActive ? 'Aktiv' : 'Inaktiv'}
            </div>
          </div>

          <div className="space-y-8 p-8 md:p-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Firmenname</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-6 text-sm font-bold text-slate-800 transition-all focus:border-brand-blue focus:outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">E-Mail-Adresse</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-6 text-sm font-bold text-slate-800 transition-all focus:border-brand-blue focus:outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Telefon für Benachrichtigungen</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-6 text-sm font-bold text-slate-800 transition-all focus:border-brand-blue focus:outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Dienstleistung</label>
                <div className="relative">
                  <Truck className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  <select value={profileForm.service} onChange={(e) => setProfileForm({ ...profileForm, service: e.target.value })} className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-6 text-sm font-bold text-slate-800 transition-all focus:border-brand-blue focus:outline-none">
                    <option value="BEIDES">Umzug & Entrümpelung</option>
                    <option value="UMZUG">Nur Umzug</option>
                    <option value="ENTRÜMPELUNG">Nur Entrümpelung</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Einsatzgebiete / Regionen</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
                <textarea rows={3} value={profileForm.regions} onChange={(e) => setProfileForm({ ...profileForm, regions: e.target.value })} placeholder="z. B. Berlin, Brandenburg, Potsdam" className="w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-6 text-sm font-bold text-slate-800 transition-all focus:border-brand-blue focus:outline-none" />
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 pt-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-slate-700">Betriebsstatus:</label>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button type="button" onClick={() => setProfileForm({ ...profileForm, isActive: true })} className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${profileForm.isActive ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Aktiv</button>
                  <button type="button" onClick={() => setProfileForm({ ...profileForm, isActive: false })} className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${!profileForm.isActive ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Inaktiv</button>
                </div>
              </div>
              {renderSaveButton('profile', 'Profil speichern')}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 bg-slate-50/30 p-8 md:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Sicherheit</h3>
            </div>
          </div>

          <div className="space-y-6 p-8 md:p-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Aktuelles Passwort</label>
                <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-800 focus:border-brand-blue focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Neues Passwort</label>
                <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-800 focus:border-brand-blue focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Bestätigen</label>
                <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-800 focus:border-brand-blue focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              {renderSaveButton('password', 'Passwort aktualisieren')}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 bg-slate-50/30 p-8 md:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Benachrichtigungen</h3>
            </div>
          </div>

          <div className="space-y-10 p-8 md:p-10">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
              <div className="flex items-center justify-between gap-6 rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">E-Mail-Benachrichtigung</h4>
                    <p className="text-[10px] font-medium text-slate-400">Sofort bei neuen Kundenanfragen</p>
                  </div>
                </div>
                <button type="button" onClick={() => setNotifForm({ ...notifForm, emailNotif: !notifForm.emailNotif })} className={`relative h-6 w-12 rounded-full transition-all ${notifForm.emailNotif ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <motion.div animate={{ x: notifForm.emailNotif ? 26 : 4 }} className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between gap-6 rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">SMS-Benachrichtigung</h4>
                      <p className="text-[10px] font-medium text-slate-400">Direkt auf Ihr Smartphone</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setNotifForm({ ...notifForm, smsNotif: !notifForm.smsNotif })} className={`relative h-6 w-12 rounded-full transition-all ${notifForm.smsNotif ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <motion.div animate={{ x: notifForm.smsNotif ? 26 : 4 }} className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                {notifForm.smsNotif && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Handynummer für SMS</label>
                    <input type="tel" value={notifForm.smsNumber} onChange={(e) => setNotifForm({ ...notifForm, smsNumber: e.target.value })} placeholder="+49 170 1234567" className="w-full rounded-2xl border border-slate-100 bg-white px-6 py-4 text-sm font-bold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none" />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 pt-4">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Daten werden verschlüsselt gespeichert</span>
              </div>
              {renderSaveButton('notif', 'Benachrichtigungen speichern')}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
