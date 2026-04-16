'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Truck, 
  Lock, 
  Bell, 
  MessageSquare, 
  Save, 
  ShieldCheck,
  Power,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  
  // Section 1: Profile States
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    regions: '',
    service: 'BEIDES',
    isActive: true
  });

  // Section 2: Password States
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Section 3: Notification States
  const [notifForm, setNotifForm] = useState({
    emailNotif: true,
    smsNotif: false,
    smsNumber: ''
  });

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchPartner();
  }, []);

  async function fetchPartner() {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (user) {
        const { data: p, error: partnerError } = await supabase.from('partners').select('*').eq('user_id', user.id).single();
        if (partnerError) throw partnerError;
        if (p) {
          setPartner(p);
          setProfileForm({
            name: p.name || '',
            email: p.email || '',
            phone: p.phone || '',
            regions: p.regions || '',
            service: p.service || 'BEIDES',
            isActive: p.status === 'ACTIVE'
          });
          if (p.settings) {
            setNotifForm({
              emailNotif: p.settings.emailNotif ?? true,
              smsNotif: p.settings.smsNotif ?? false,
              smsNumber: p.settings.smsNumber || ''
            });
          }
        }
      }
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden', err.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (section: string) => {
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
            status: profileForm.isActive ? 'ACTIVE' : 'SUSPENDED'
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
          status: profileForm.isActive ? 'ACTIVE' : 'SUSPENDED'
        }));
      } 
      
      else if (section === 'password') {
        if (passwordForm.new !== passwordForm.confirm) {
          throw new Error('Passwörter stimmen nicht überein.');
        }
        const { error } = await supabase.auth.updateUser({
          password: passwordForm.new
        });
        if (error) throw error;
        setPasswordForm({ current: '', new: '', confirm: '' });
      }

      else if (section === 'notif') {
        // Bestehende settings mergen, nicht überschreiben
        const { error } = await supabase
          .from('partners')
          .update({
            settings: {
              ...(partner.settings || {}),
              emailNotif: notifForm.emailNotif,
              smsNotif: notifForm.smsNotif,
              smsNumber: notifForm.smsNumber
            }
          })
          .eq('user_id', partner.user_id);
        if (error) throw error;
        // Lokalen Partner-State aktualisieren
        setPartner((prev: any) => ({ ...prev, settings: { ...(prev?.settings || {}), emailNotif: notifForm.emailNotif, smsNotif: notifForm.smsNotif, smsNumber: notifForm.smsNumber } }));
      }

      setSavedSection(section);
      showToast('success', 'Gespeichert', `Abschnitt "${section}" wurde erfolgreich aktualisiert.`);
      setTimeout(() => setSavedSection(null), 3000);
    } catch (err: any) {
      showToast('error', 'Fehler beim Speichern', err.message || 'Unbekannter Fehler');
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-5xl font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Einstellungen</h1>
        <p className="text-slate-400 font-medium text-sm">Verwalten Sie Ihr Profil, Sicherheitseinstellungen und Benachrichtigungen.</p>
      </div>

      <div className="grid grid-cols-1 gap-10">
        
        {/* SECTION 1: PROFIL INFORMATIONEN */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 md:p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue-soft text-brand-blue flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Profil Informationen</h3>
            </div>
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${profileForm.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
               <Power className="w-3 h-3" /> {profileForm.isActive ? 'Aktiv' : 'Inaktiv'}
            </div>
          </div>

          <div className="p-8 md:p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 text-black">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Firmenname</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-blue transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2 text-black">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-Mail Adresse</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-blue transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2 text-black">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefon für Job-Alerts</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-blue transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2 text-black font-sans">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dienstleistung</label>
                <div className="relative">
                  <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <select 
                    value={profileForm.service} onChange={e => setProfileForm({...profileForm, service: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-blue appearance-none transition-all"
                  >
                    <option value="BEIDES">Umzug & Entrümpelung</option>
                    <option value="UMZUG">Nur Umzug</option>
                    <option value="ENTRÜMPELUNG">Nur Entrümpelung</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-black font-sans">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Einsatzgebiete / Regionen</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                <textarea 
                  rows={3}
                  value={profileForm.regions} onChange={e => setProfileForm({...profileForm, regions: e.target.value})}
                  placeholder="Z.B. Berlin, Brandenburg, Potsdam..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-blue transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
               <div className="flex items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Betriebs-Status:</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                     <button 
                       onClick={() => setProfileForm({...profileForm, isActive: true})}
                       className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${profileForm.isActive ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       Aktiv
                     </button>
                     <button 
                       onClick={() => setProfileForm({...profileForm, isActive: false})}
                       className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!profileForm.isActive ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       Inaktiv
                     </button>
                  </div>
               </div>
               <button 
                onClick={() => handleSave('profile')}
                disabled={savingSection === 'profile'}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                  savedSection === 'profile' ? 'bg-emerald-500 text-white' : 'bg-brand-blue text-white hover:bg-brand-blue-hover shadow-brand-blue/10'
                }`}
               >
                 {savingSection === 'profile' ? <RefreshCw className="w-4 h-4 animate-spin" /> : savedSection === 'profile' ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                 Speichern
               </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: PASSWORT ÄNDERN */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col font-sans">
          <div className="p-8 md:p-10 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Sicherheit</h3>
            </div>
          </div>

          <div className="p-8 md:p-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2 text-black">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Aktuelles Passwort</label>
                  <input 
                    type="password" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-brand-blue"
                  />
               </div>
               <div className="space-y-2 text-black">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Neues Passwort</label>
                  <input 
                    type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-brand-blue"
                  />
               </div>
               <div className="space-y-2 text-black">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bestätigen</label>
                  <input 
                    type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-brand-blue"
                  />
               </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => handleSave('password')}
                disabled={savingSection === 'password'}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                  savedSection === 'password' ? 'bg-emerald-500 text-white' : 'bg-brand-blue text-white hover:bg-brand-blue-hover shadow-brand-blue/10'
                }`}
              >
                {savingSection === 'password' ? <RefreshCw className="w-4 h-4 animate-spin" /> : savedSection === 'password' ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                Passwort aktualisieren
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: ANFRAGE BENACHRICHTIGUNGEN */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col font-sans">
          <div className="p-8 md:p-10 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Anfrage benachrichtigen</h3>
            </div>
          </div>

          <div className="p-8 md:p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Email Toggle */}
               <div className="flex items-center justify-between gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-brand-blue">
                        <Mail className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="font-bold text-slate-800 text-sm">E-Mail Benachrichtigung</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Sofort bei neuen Anfragen</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setNotifForm({...notifForm, emailNotif: !notifForm.emailNotif})}
                    className={`relative w-12 h-6 rounded-full transition-all ${notifForm.emailNotif ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                     <motion.div animate={{ x: notifForm.emailNotif ? 26 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
               </div>

               {/* SMS Toggle + Number */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400">
                          <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800 text-sm">SMS Benachrichtigung</h4>
                          <p className="text-[10px] text-slate-400 font-medium">Direkt auf Ihr Smartphone</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setNotifForm({...notifForm, smsNotif: !notifForm.smsNotif})}
                      className={`relative w-12 h-6 rounded-full transition-all ${notifForm.smsNotif ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <motion.div animate={{ x: notifForm.smsNotif ? 26 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                  
                  {notifForm.smsNotif && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2 text-black">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Handynummer für SMS</label>
                       <input 
                         type="tel" value={notifForm.smsNumber} onChange={e => setNotifForm({...notifForm, smsNumber: e.target.value})}
                         placeholder="+49 170 1234567"
                         className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-brand-blue shadow-sm"
                       />
                    </motion.div>
                  )}
               </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
               <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Daten werden verschlüsselt gespeichert</span>
               </div>
               <button 
                onClick={() => handleSave('notif')}
                disabled={savingSection === 'notif'}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                  savedSection === 'notif' ? 'bg-emerald-500 text-white' : 'bg-brand-blue text-white hover:bg-brand-blue-hover shadow-brand-blue/10'
                }`}
               >
                 {savingSection === 'notif' ? <RefreshCw className="w-4 h-4 animate-spin" /> : savedSection === 'notif' ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                 Speichern
               </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
