
import React, { useState, useEffect } from 'react';
import { VehicleRecord } from '../types';
import { TransportDataService } from '../services/dataService';
import { 
  Plus, X, Save, Truck, Droplets, 
  Gauge, Settings, User, 
  Edit2, Trash2, CheckCircle, FileText,
  AlertTriangle, Calendar, Activity, 
  ChevronRight, ArrowRight, Phone,
  Disc, MapPin, Wind, Hammer,
  CircleDot, Beaker, ClipboardCheck
} from 'lucide-react';

const VehicleView: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(1);

  const [formData, setFormData] = useState<Omit<VehicleRecord, 'id' | 'createdAt'>>({
    busNumber: '', driverName: '', staffName: '', driverContact: '',
    insuranceDate: '', insuranceDueDate: '',
    fcDate: '', fcDueDate: '',
    pollutionDate: '', pollutionDueDate: '',
    stickerDate: '', stickerDueDate: '',
    fireExtinguisherDate: '', fireExtinguisherDueDate: '',
    firstAidBoxDate: '', firstAidBoxDueDate: '',
    vehicleOilKM: 0, vehicleOilDate: '',
    engineOilKM: 0, engineOilDate: '',
    brakeOilKM: 0, brakeOilDate: '',
    steeringOilKM: 0, steeringOilDate: '',
    airCheckDate: '', greaseCheckDate: '',
    tyre1Number: '', tyre2Number: '',
    dieselFillingDate: '', dieselKMReading: 0,
    previousDieselKM: 0,
    kmCalculation: 0, stack: '', usage: ''
  });

  const loadVehicles = async () => {
    const data = await TransportDataService.getVehicles();
    setVehicles(data);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  // Automatic KM Calculation logic: KM Reading - Previous KM
  useEffect(() => {
    const diff = formData.dieselKMReading - formData.previousDieselKM;
    setFormData(prev => ({ ...prev, kmCalculation: diff > 0 ? diff : 0 }));
  }, [formData.dieselKMReading, formData.previousDieselKM]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.busNumber) return alert("Bus Number is required!");
    
    if (editingId) {
      await TransportDataService.updateVehicle(editingId, formData);
    } else {
      await TransportDataService.addVehicle(formData);
    }
    
    await loadVehicles();
    closeModal();
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  const openEditModal = (vehicle: VehicleRecord) => {
    setEditingId(vehicle.id);
    setFormData({ ...vehicle });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setActiveTab(1);
    setFormData({
      busNumber: '', driverName: '', staffName: '', driverContact: '',
      insuranceDate: '', insuranceDueDate: '',
      fcDate: '', fcDueDate: '',
      pollutionDate: '', pollutionDueDate: '',
      stickerDate: '', stickerDueDate: '',
      fireExtinguisherDate: '', fireExtinguisherDueDate: '',
      firstAidBoxDate: '', firstAidBoxDueDate: '',
      vehicleOilKM: 0, vehicleOilDate: '',
      engineOilKM: 0, engineOilDate: '',
      brakeOilKM: 0, brakeOilDate: '',
      steeringOilKM: 0, steeringOilDate: '',
      airCheckDate: '', greaseCheckDate: '',
      tyre1Number: '', tyre2Number: '',
      dieselFillingDate: '', dieselKMReading: 0,
      previousDieselKM: 0,
      kmCalculation: 0, stack: '', usage: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Confirm: Delete vehicle profile from master SQL?")) {
      await TransportDataService.deleteVehicle(id);
      loadVehicles();
    }
  };

  const isExpired = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getAlerts = (v: VehicleRecord) => {
    const alerts = [];
    if (isExpired(v.insuranceDueDate)) alerts.push('Insurance');
    if (isExpired(v.pollutionDueDate)) alerts.push('Pollution');
    if (isExpired(v.fcDueDate)) alerts.push('FC');
    if (isExpired(v.stickerDueDate)) alerts.push('Sticker');
    if (isExpired(v.fireExtinguisherDueDate)) alerts.push('Fire Ext.');
    if (isExpired(v.firstAidBoxDueDate)) alerts.push('First Aid');
    return alerts;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Fleet Maintenance Control</h1>
          <p className="text-slate-500 text-sm font-medium italic">Persistent mechanical and documentation records.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-black text-white px-10 py-5 rounded-[2.5rem] font-black flex items-center gap-3 shadow-2xl shadow-slate-200 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
        >
          <Plus size={20} />
          Register New Vehicle
        </button>
      </div>

      {showConfirmation && (
        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[3rem] flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-emerald-800 font-black text-sm uppercase tracking-tight">Record Synchronized</p>
            <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Saved securely to master storage.</p>
          </div>
        </div>
      )}

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {vehicles.map(v => {
          const alerts = getAlerts(v);
          const hasAlerts = alerts.length > 0;
          
          return (
            <div key={v.id} className={`bg-white rounded-[4rem] shadow-sm border-2 overflow-hidden transition-all group ${hasAlerts ? 'border-rose-100 ring-4 ring-rose-50' : 'border-slate-50 hover:shadow-xl'}`}>
              
              <div className={`p-8 flex justify-between items-center ${hasAlerts ? 'bg-rose-600' : 'bg-slate-800'} text-white`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Truck size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{v.busNumber}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">
  Driver: {v.driverName}
</p>
<p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">
  Staff: {v.staffName || 'N/A'}
</p>

                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Driver: {v.driverName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(v)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="p-3 bg-white/10 hover:bg-rose-500 rounded-2xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="p-10 space-y-8">
                {hasAlerts && (
                  <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-start gap-4">
                    <AlertTriangle className="text-rose-500 shrink-0" size={24} />
                    <div>
                      <p className="text-rose-800 text-[10px] font-black uppercase tracking-widest mb-1">Expiry Warnings</p>
                      <p className="text-rose-600 text-xs font-bold leading-relaxed">Attention required for: {alerts.join(', ')}.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <Phone size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Driver Contact</span>
                      </div>
                      <p className="text-sm font-black text-slate-700 tracking-tight">{v.driverContact}</p>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <Activity size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Last KM Log</span>
                      </div>
                      <p className="text-sm font-black text-indigo-600 tracking-tight">{v.dieselKMReading.toLocaleString()} KM</p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                   <div className="bg-slate-50/50 p-4 rounded-2xl text-center border border-slate-50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tyre Log</p>
                      <p className="text-[10px] font-black text-slate-600 truncate">{v.tyre1Number || 'N/A'}</p>
                   </div>
                   <div className="bg-slate-50/50 p-4 rounded-2xl text-center border border-slate-50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Engine Oil</p>
                      <p className="text-[10px] font-black text-slate-600">{v.engineOilKM ? `${v.engineOilKM} KM` : 'N/A'}</p>
                   </div>
                   <div className="bg-slate-50/50 p-4 rounded-2xl text-center border border-slate-50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Stack Ref</p>
                      <p className="text-[10px] font-black text-slate-600 truncate">{v.stack || 'Unset'}</p>
                   </div>
                </div>

                <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-300" />
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Unit Registered: {v.createdAt}</span>
                   </div>
                   <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-3 py-1 bg-indigo-50 rounded-full">Manual Entry</span>
                </div>
              </div>

            </div>
          );
        })}
        {vehicles.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white/50 border-4 border-dashed border-slate-200 rounded-[5rem]">
            <Truck size={80} className="mx-auto text-slate-200 mb-6" />
            <p className="text-slate-400 font-black text-2xl italic uppercase tracking-widest">No SQL Vehicle Records Found</p>
            <p className="text-slate-300 text-xs font-medium mt-2">Add a bus unit to begin tracking maintenance and document expiry.</p>
          </div>
        )}
      </div>

      {/* Advanced Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-200">
                  <Truck size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-1">
                    {editingId ? 'Modify Fleet Record' : 'Enroll Fleet Unit'}
                  </h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Step {activeTab} of 5 • {activeTab === 1 ? 'Identity' : activeTab === 2 ? 'Documents' : activeTab === 3 ? 'Maintenance' : activeTab === 4 ? 'Tyre Log' : 'Fuel & Usage'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 transition-colors p-2">
                <X size={48} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-10 scrollbar-hide">
              {/* Wizard Steps Indicator */}
              <div className="flex justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10"></div>
                {[1, 2, 3, 4, 5].map(step => (
                  <button
                    key={step}
                    onClick={() => setActiveTab(step)}
                    className={`w-12 h-12 rounded-full font-black text-sm flex items-center justify-center transition-all border-4 ${
                      activeTab >= step ? 'bg-indigo-600 text-white border-white shadow-lg' : 'bg-white text-slate-300 border-slate-50'
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSave} className="space-y-10">
                {/* 1. Basic Details */}
                {activeTab === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-4">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-6">Bus Number</label>
                      <input required type="text" placeholder="TN-XX-XX-XXXX" className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-black text-xl text-slate-700 focus:border-indigo-600 outline-none transition-all" value={formData.busNumber} onChange={e => setFormData({...formData, busNumber: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-6">Driver Name</label>
                      <input required type="text" placeholder="Full Name" className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-black text-xl text-slate-700 focus:border-indigo-600 outline-none transition-all" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} />
                    </div>
                    <div className="space-y-3">
  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-6">
    Staff Name
  </label>
  <input
    type="text"
    placeholder="Staff Full Name"
    className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-black text-xl text-slate-700 focus:border-indigo-600 outline-none transition-all"
    value={formData.staffName || ''}
    onChange={e => setFormData({ ...formData, staffName: e.target.value })}
  />
</div>

                    <div className="space-y-3 md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-6">Driver Contact Number</label>
                      <input required type="text" placeholder="+91 XXXXX XXXXX" className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-black text-xl text-slate-700 focus:border-indigo-600 outline-none transition-all" value={formData.driverContact} onChange={e => setFormData({...formData, driverContact: e.target.value})} />
                    </div>
                  </div>
                )}

                {/* 2. Documents & Expiry */}
                {activeTab === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 animate-in fade-in slide-in-from-left-4">
                    {[
                      { label: 'Insurance', start: 'insuranceDate', end: 'insuranceDueDate' },
                      { label: 'Fitness Certificate (FC)', start: 'fcDate', end: 'fcDueDate' },
                      { label: 'Pollution (PUC)', start: 'pollutionDate', end: 'pollutionDueDate' },
                      { label: 'Route Sticker', start: 'stickerDate', end: 'stickerDueDate' },
                      { label: 'Fire Extinguisher', start: 'fireExtinguisherDate', end: 'fireExtinguisherDueDate' },
                      { label: 'First Aid Box', start: 'firstAidBoxDate', end: 'firstAidBoxDueDate' },
                    ].map((doc, idx) => (
                      <div key={idx} className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 space-y-5">
                         <div className="flex items-center gap-3">
                            <ClipboardCheck className="text-indigo-600" size={18} />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">{doc.label}</h4>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Issue Date</label>
                               <input type="date" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs" value={(formData as any)[doc.start]} onChange={e => setFormData({...formData, [doc.start]: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest px-2 italic">Due Date</label>
                               <input type="date" className="w-full p-4 bg-rose-50/30 border-2 border-rose-100 rounded-2xl font-black text-xs text-rose-600" value={(formData as any)[doc.end]} onChange={e => setFormData({...formData, [doc.end]: e.target.value})} />
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Maintenance Details */}
                {activeTab === 3 && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-left-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {[
                         { label: 'Vehicle Oil', km: 'vehicleOilKM', date: 'vehicleOilDate', icon: CircleDot },
                         { label: 'Engine Oil', km: 'engineOilKM', date: 'engineOilDate', icon: Beaker },
                         { label: 'Brake Oil', km: 'brakeOilKM', date: 'brakeOilDate', icon: Beaker },
                         { label: 'Steering Box Oil', km: 'steeringOilKM', date: 'steeringOilDate', icon: Settings },
                       ].map((item, idx) => (
                         <div key={idx} className="bg-indigo-50/30 p-8 rounded-[3rem] border border-indigo-50/50 space-y-4">
                            <div className="flex items-center gap-3">
                               <item.icon className="text-indigo-600" size={18} />
                               <h4 className="text-xs font-black uppercase tracking-widest text-indigo-700">{item.label} Log</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <input type="number" placeholder="KM Reading" className="w-full p-5 bg-white border border-indigo-100 rounded-2xl font-black text-sm text-slate-700" value={(formData as any)[item.km] || ''} onChange={e => setFormData({...formData, [item.km]: Number(e.target.value)})} />
                               <input type="date" className="w-full p-5 bg-white border border-indigo-100 rounded-2xl font-black text-xs text-indigo-600" value={(formData as any)[item.date]} onChange={e => setFormData({...formData, [item.date]: e.target.value})} />
                            </div>
                         </div>
                       ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-emerald-50/30 p-8 rounded-[3rem] border border-emerald-50/50 space-y-4">
                           <div className="flex items-center gap-3">
                              <Wind className="text-emerald-600" size={18} />
                              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700">Air Checkup Date</h4>
                           </div>
                           <input type="date" className="w-full p-5 bg-white border border-emerald-100 rounded-2xl font-black text-xs text-emerald-600" value={formData.airCheckDate} onChange={e => setFormData({...formData, airCheckDate: e.target.value})} />
                        </div>
                        <div className="bg-amber-50/30 p-8 rounded-[3rem] border border-amber-50/50 space-y-4">
                           <div className="flex items-center gap-3">
                              <Hammer className="text-amber-600" size={18} />
                              <h4 className="text-xs font-black uppercase tracking-widest text-amber-700">Grease Checkup Date</h4>
                           </div>
                           <input type="date" className="w-full p-5 bg-white border border-amber-100 rounded-2xl font-black text-xs text-amber-600" value={formData.greaseCheckDate} onChange={e => setFormData({...formData, greaseCheckDate: e.target.value})} />
                        </div>
                    </div>
                  </div>
                )}

                {/* 4. Tyre Details */}
                {activeTab === 4 && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-4">
                      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-6">
                         <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg"><Disc size={28}/></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter">Tyre Component 1</h4>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Tyre 1 Serial Number</label>
                            <input type="text" placeholder="MRF-XXXX-001" className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-700 focus:border-indigo-600 outline-none" value={formData.tyre1Number} onChange={e => setFormData({...formData, tyre1Number: e.target.value})} />
                         </div>
                      </div>
                      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-6">
                         <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg"><Disc size={28}/></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter">Tyre Component 2</h4>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Tyre 2 Serial Number</label>
                            <input type="text" placeholder="MRF-XXXX-002" className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-700 focus:border-indigo-600 outline-none" value={formData.tyre2Number} onChange={e => setFormData({...formData, tyre2Number: e.target.value})} />
                         </div>
                      </div>
                   </div>
                )}

                {/* 5. Diesel & Usage */}
                {activeTab === 5 && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-left-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Filling Date</label>
                          <input type="date" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-xs" value={formData.dieselFillingDate} onChange={e => setFormData({...formData, dieselFillingDate: e.target.value})} />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Previous KM Reading</label>
                          <input type="number" placeholder="0" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-lg text-slate-500" value={formData.previousDieselKM || ''} onChange={e => setFormData({...formData, previousDieselKM: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] px-4">Current KM Reading</label>
                          <input type="number" placeholder="0" className="w-full px-8 py-5 bg-indigo-50/30 border-2 border-indigo-100 rounded-3xl font-black text-xl text-indigo-600" value={formData.dieselKMReading || ''} onChange={e => setFormData({...formData, dieselKMReading: Number(e.target.value)})} />
                       </div>
                    </div>

                    <div className="bg-indigo-600 p-10 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl shadow-indigo-100">
                       <div className="text-center md:text-left">
                          <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Calculated Usage</p>
                          <h3 className="text-5xl font-black tracking-tighter">{formData.kmCalculation.toLocaleString()} <span className="text-xl font-bold opacity-50">KM Used</span></h3>
                       </div>
                       <Beaker size={80} className="opacity-20 hidden md:block" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Route Stack Ref</label>
                          <input type="text" placeholder="e.g. ROUTE A MORNING" className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-black text-slate-700" value={formData.stack} onChange={e => setFormData({...formData, stack: e.target.value})} />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Usage Type</label>
                          <input type="text" placeholder="e.g. Daily College Route" className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-black text-slate-700" value={formData.usage} onChange={e => setFormData({...formData, usage: e.target.value})} />
                       </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Wizard Footer Actions */}
            <div className="px-12 py-10 border-t border-slate-100 bg-slate-50/50 flex gap-6">
               {activeTab > 1 && (
                 <button 
                  type="button"
                  onClick={() => setActiveTab(activeTab - 1)}
                  className="px-10 py-5 bg-white border-2 border-slate-200 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex items-center gap-3"
                 >
                   <ArrowRight size={18} className="rotate-180" /> Back
                 </button>
               )}
               
               {activeTab < 5 ? (
                 <button 
                   type="button"
                   onClick={() => setActiveTab(activeTab + 1)}
                   className="flex-1 bg-slate-900 text-white font-black py-7 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-xl hover:bg-black transition-all uppercase tracking-[0.2em] text-sm"
                 >
                   Continue to Next Step <ArrowRight size={20} />
                 </button>
               ) : (
                 <button 
                   type="submit"
                   onClick={handleSave}
                   className="flex-1 bg-indigo-600 text-white font-black py-7 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-[0.2em] text-lg"
                 >
                   <Save size={28} />
                   {editingId ? 'Update Master Record' : 'Commit Final Registration'}
                 </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleView;
