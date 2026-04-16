'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { 
  Search, 
  RefreshCw, 
  ChevronRight, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Home, 
  Truck, 
  FileText,
  Building2,
  MailQuestion,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  AlertCircle,
  Euro
} from 'lucide-react';

export default function OrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('Alle Städte');
  const [filterService, setFilterService] = useState('Alle Leistungen');
  const [matchedPartners, setMatchedPartners] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMatchedPartners(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('partner_purchases')
        .select('partner_id, price, created_at, partners(name, email, phone)')
        .eq('order_id', orderId);
      if (error) throw error;
      setMatchedPartners(data || []);
    } catch (err: any) {
      setMatchedPartners([]);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      }
      showToast('success', 'Status aktualisiert', `Auftrag wurde auf "${newStatus}" gesetzt.`);
    } catch (err: any) {
      showToast('error', 'Fehler beim Aktualisieren', err.message);
    } finally {
      setUpdating(false);
    }
  }

  const handleOpenDetail = (order: any) => {
    setSelectedOrder(order);
    setIsDetailView(true);
    fetchMatchedPartners(order.id);
  };

  const handleBack = () => {
    setIsDetailView(false);
    setSelectedOrder(null);
    setMatchedPartners([]);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.von_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = filterCity === 'Alle Städte' || order.von_city === filterCity;
    const matchesService = filterService === 'Alle Leistungen' || 
      order.service_category?.toLowerCase().includes(filterService.toLowerCase().replace('ü', 'ü'));

    return matchesSearch && matchesCity && matchesService;
  });

  const uniqueCities = Array.from(new Set(orders.map(o => o.von_city))).filter(Boolean) as string[];
  const formatEstimatedPrice = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
      return 'Nicht angegeben';
    }

    return `ab €${Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ─────────────────────────────────────────────
  // DETAIL VIEW
  // ─────────────────────────────────────────────
  if (isDetailView && selectedOrder) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <button onClick={handleBack}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Liste
            </button>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="text-3xl font-bold text-slate-900">{selectedOrder.customer_name}</h2>
              <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${
                selectedOrder.status === 'Neu' ? 'bg-brand-blue-soft text-brand-blue' :
                selectedOrder.status === 'In Bearbeitung' ? 'bg-amber-50 text-amber-600' :
                selectedOrder.status === 'Abgeschlossen' ? 'bg-emerald-50 text-emerald-600' :
                'bg-red-50 text-red-600'
              }`}>
                {selectedOrder.status}
              </span>
              <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${
                selectedOrder.service_category === 'PRIVATUMZUG' ? 'bg-purple-50 text-purple-600' :
                selectedOrder.service_category === 'FIRMENUMZUG' ? 'bg-indigo-50 text-indigo-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                {selectedOrder.service_category}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium">
              {selectedOrder.order_number ? `Anfrage ${selectedOrder.order_number} — ` : ''}
              Eingegangen am {new Date(selectedOrder.created_at).toLocaleString('de-DE')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status ändern</label>
            <select value={selectedOrder.status} onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
              disabled={updating}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 shadow-sm appearance-none min-w-[180px] disabled:opacity-50">
              <option value="Neu">Neu</option>
              <option value="In Bearbeitung">In Bearbeitung</option>
              <option value="Abgeschlossen">Abgeschlossen</option>
              <option value="Storniert">Storniert</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kontaktdaten */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand-blue-soft flex items-center justify-center text-brand-blue">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Kontaktdaten</h3>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vollständiger Name</p>
                <p className="text-sm font-bold text-slate-800">{selectedOrder.customer_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">E-Mail Adresse</p>
                <a href={`mailto:${selectedOrder.customer_email}`} className="text-sm font-bold text-brand-blue hover:underline">
                  {selectedOrder.customer_email}
                </a>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Telefonnummer</p>
                <a href={`tel:${selectedOrder.customer_phone}`} className="text-sm font-bold text-slate-800 hover:text-brand-blue">
                  {selectedOrder.customer_phone}
                </a>
              </div>
              {selectedOrder.erreichbarkeit && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Erreichbarkeit</p>
                  <p className="text-sm text-slate-600">{selectedOrder.erreichbarkeit}</p>
                </div>
              )}
              {selectedOrder.estimated_price && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Geschätzter Preis</p>
                  <p className="text-sm font-bold text-emerald-600">
                    {formatEstimatedPrice(selectedOrder.estimated_price)}
                  </p>
                </div>
              )}
              {selectedOrder.notes && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Anmerkungen</p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-slate-500 text-sm">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Anfragedetails */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Anfragedetails</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Termin / Datum</p>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedOrder.move_date ? new Date(selectedOrder.move_date).toLocaleDateString('de-DE') : 'Nicht angegeben'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Größe / Fläche</p>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedOrder.size_info || '—'} {selectedOrder.rooms_info ? `(${selectedOrder.rooms_info})` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <MapPin className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Von (Auszug)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedOrder.von_city || '—'}</p>
                  {selectedOrder.von_address && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedOrder.von_address}</p>
                  )}
                  {selectedOrder.von_floor && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Etage: {selectedOrder.von_floor} | Aufzug: {selectedOrder.von_lift ? 'Ja' : 'Nein'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nach (Einzug)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedOrder.nach_city || '—'}</p>
                  {selectedOrder.nach_address && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedOrder.nach_address}</p>
                  )}
                  {selectedOrder.nach_floor && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Etage: {selectedOrder.nach_floor} | Aufzug: {selectedOrder.nach_lift ? 'Ja' : 'Nein'}
                    </p>
                  )}
                </div>
              </div>
              {selectedOrder.additional_services && selectedOrder.additional_services.length > 0 && (
                <div className="flex gap-4 md:col-span-2">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Zusatzleistungen</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.additional_services.map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-brand-blue-soft text-brand-blue text-xs font-bold rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gematchte Unternehmen (aus DB) */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Gematchte Partner</h3>
                <p className="text-xs text-slate-400 mt-0.5">{matchedPartners.length} Partner haben diesen Lead gekauft</p>
              </div>
            </div>
            <div className="space-y-3">
              {matchedPartners.length > 0 ? (
                matchedPartners.map((purchase: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-brand-blue">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{purchase.partners?.name || 'Unbekannt'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{purchase.partners?.email}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">€{Number(purchase.price).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 space-y-2">
                  <MailQuestion className="w-8 h-8 mx-auto opacity-20" />
                  <p className="text-xs font-medium italic">Noch kein Partner hat diesen Lead gekauft.</p>
                </div>
              )}
            </div>
          </div>

          {/* Kontaktinformationen für Partner */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Zusammenfassung & Aktionen</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href={`mailto:${selectedOrder.customer_email}?subject=Ihre Umzugsanfrage&body=Sehr geehrte/r ${selectedOrder.customer_name},%0D%0A%0D%0Avielen Dank für Ihre Anfrage.`}
                className="flex items-center gap-3 p-4 bg-brand-blue-soft rounded-2xl border border-brand-blue/20 hover:bg-brand-blue/15 transition-colors">
                <Mail className="w-5 h-5 text-brand-blue" />
                <div>
                  <p className="text-xs font-bold text-brand-blue">E-Mail senden</p>
                  <p className="text-[10px] text-brand-blue">{selectedOrder.customer_email}</p>
                </div>
              </a>
              <a href={`tel:${selectedOrder.customer_phone}`}
                className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
                <Phone className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs font-bold text-emerald-700">Anrufen</p>
                  <p className="text-[10px] text-emerald-500">{selectedOrder.customer_phone}</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Euro className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-600">Schätzpreis</p>
                  <p className="text-[10px] text-slate-400">
                    {formatEstimatedPrice(selectedOrder.estimated_price)}
                  </p>
                </div>
              </div>
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kundenaufträge</h2>
          <p className="text-sm text-slate-500 mt-1">Verwalten und filtern Sie alle eingehenden Kundenaufträge.</p>
        </div>
        <button onClick={fetchOrders} disabled={loading}
          className={`bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Aktualisiert...' : 'Aktualisieren'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Suchen</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, E-Mail, Ort oder Auftragsnr..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-medium" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Stadt</label>
          <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-bold appearance-none">
            <option>Alle Städte</option>
            {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dienstleistung</label>
          <select value={filterService} onChange={(e) => setFilterService(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-bold appearance-none">
            <option>Alle Leistungen</option>
            <option value="PRIVATUMZUG">Privatumzug</option>
            <option value="FIRMENUMZUG">Firmenumzug</option>
            <option value="ENTRÜMPELUNG">Entrümpelung</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Name / E-Mail</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Leistung</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Von → Nach</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Datum</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Schätzpreis</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 pr-4">
                      <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{order.customer_email}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{order.customer_phone}</p>
                    </td>
                    <td className="py-6 text-center">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        order.service_category === 'PRIVATUMZUG' ? 'bg-brand-blue-soft text-brand-blue' :
                        order.service_category === 'FIRMENUMZUG' ? 'bg-purple-50 text-purple-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {order.service_category}
                      </span>
                    </td>
                    <td className="py-6">
                      <p className="text-sm font-bold text-slate-700">
                        {order.von_city}{order.nach_city ? ` → ${order.nach_city}` : ''}
                      </p>
                    </td>
                    <td className="py-6 text-center">
                      <p className="text-sm font-medium text-slate-700">
                        {order.move_date ? new Date(order.move_date).toLocaleDateString('de-DE') : '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </td>
                    <td className="py-6 text-center">
                      <p className="text-sm font-bold text-emerald-600">
                        {formatEstimatedPrice(order.estimated_price)}
                      </p>
                    </td>
                    <td className="py-6 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        order.status === 'Neu' ? 'bg-brand-blue-soft text-brand-blue' :
                        order.status === 'In Bearbeitung' ? 'bg-amber-50 text-amber-600' :
                        order.status === 'Abgeschlossen' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-6 text-right">
                      <button onClick={() => handleOpenDetail(order)}
                        className="text-[11px] font-bold text-slate-400 hover:text-brand-blue transition-all flex items-center gap-1 ml-auto group/btn">
                        Details <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-sm italic">
                      {searchTerm || filterCity !== 'Alle Städte' || filterService !== 'Alle Leistungen'
                        ? 'Keine Aufträge gefunden. Filter anpassen.'
                        : 'Noch keine Kundenaufträge vorhanden.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-slate-50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {filteredOrders.length} von {orders.length} Aufträgen
          </p>
        </div>
      </div>
    </div>
  );
}
