
import React, { useState, useEffect } from 'react';
import { Student, DestinationRecord } from '../types';
import { TransportDataService } from '../services/dataService';
import { 
  MapPin, 
  ArrowRight, 
  Save, 
  Edit2, 
  Search, 
  Route, 
  X, 
  Navigation, 
  CheckCircle2, 
  Hash, 
  Info,
  User,
  Trash2,
  Clock,
  Filter,
  Map,
  ChevronRight,
  Sparkles
} from 'lucide-react';

type FilterType = 'All' | 'Assigned' | 'Pending';

const DestinationView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [destRecords, setDestRecords] = useState<DestinationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    pickupPoint: '',
    dropPoint: '',
    routeName: '',
    distance: 0
  });

  const loadData = async () => {
    const [studentData, destData] = await Promise.all([
      TransportDataService.getStudents(),
      TransportDataService.getAllDestinations()
    ]);
    setStudents(studentData);
    setDestRecords(destData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAssignModal = (studentId: string) => {
    const existing = destRecords.find(d => d.studentId === studentId);
    setEditingStudentId(studentId);
    if (existing && existing.routeName !== 'Unassigned') {
      setFormData({
        pickupPoint: existing.pickupPoint,
        dropPoint: existing.dropPoint,
        routeName: existing.routeName,
        distance: existing.distance
      });
    } else {
      setFormData({ pickupPoint: '', dropPoint: '', routeName: '', distance: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId) return;

    await TransportDataService.updateDestination({ 
      studentId: editingStudentId, 
      ...formData 
    });

    setStatusMessage({ type: 'success', text: 'Route path updated.' });
    
    setTimeout(() => {
      setIsModalOpen(false);
      setEditingStudentId(null);
      setStatusMessage(null);
      loadData();
    }, 1000);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudentId(null);
    setStatusMessage(null);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const record = destRecords.find(d => d.studentId === s.id);
    const isAssigned = record && record.routeName !== 'Unassigned' && record.pickupPoint !== '-';

    if (filter === 'Assigned') return matchesSearch && isAssigned;
    if (filter === 'Pending') return matchesSearch && !isAssigned;
    return matchesSearch;
  });

  const recentLocations = ["Pollachi", "Poosaripatti", "College Main Gate", "Town Bus Stand"];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-3">
            <Map className="text-indigo-600" />
            Destination Control
          </h1>
          <p className="text-slate-500 text-sm font-medium">Map student profiles to geographic transport routes.</p>
        </div>

        {/* Status Filters */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          {(['All', 'Assigned', 'Pending'] as FilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
            <Search size={22} />
          </div>
          <input
            type="text"
            placeholder="Find student to assign route..."
            className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-50 rounded-[2rem] outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center justify-center gap-4">
           <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unassigned</p>
              <p className="text-xl font-black text-rose-500">
                {students.length - destRecords.filter(d => d.routeName !== 'Unassigned').length}
              </p>
           </div>
        </div>
      </div>

      {/* Modern List Layout */}
      <div className="space-y-4">
        {filteredStudents.length > 0 ? filteredStudents.map(student => {
          const record = destRecords.find(d => d.studentId === student.id) || {
            pickupPoint: '-', dropPoint: '-', routeName: 'Unassigned', distance: 0
          };
          const isAssigned = record.routeName !== 'Unassigned' && record.pickupPoint !== '-';

          return (
            <div key={student.id} className="bg-white rounded-[2.5rem] border border-slate-50 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col lg:flex-row items-stretch">
                
                {/* Student Info Part */}
                <div className="p-8 lg:w-1/3 flex items-center gap-5 border-b lg:border-b-0 lg:border-r border-slate-50">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${
                    isAssigned ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight leading-none mb-2 truncate">{student.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.registrationNumber}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{student.department}</span>
                    </div>
                  </div>
                </div>

                {/* Route Visualization Part */}
                <div className="flex-1 p-8 bg-slate-50/30 flex flex-col justify-center">
                  {isAssigned ? (
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="flex-1 w-full text-center sm:text-left">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Pickup From</p>
                        <p className="font-black text-slate-700">{record.pickupPoint}</p>
                      </div>
                      
                      <div className="flex flex-col items-center px-4">
                         <div className="flex items-center gap-2 mb-1">
                           <div className="h-0.5 w-8 bg-indigo-200"></div>
                           <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-lg shadow-indigo-100">
                             <Navigation size={12} className="rotate-45" />
                           </div>
                           <div className="h-0.5 w-8 bg-indigo-200"></div>
                         </div>
                         <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{record.distance} KM</p>
                      </div>

                      <div className="flex-1 w-full text-center sm:text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Drop To</p>
                        <p className="font-black text-slate-700">{record.dropPoint}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-slate-300">
                      <Clock size={20} />
                      <p className="text-sm font-black uppercase tracking-widest italic">Route assignment pending...</p>
                    </div>
                  )}
                </div>

                {/* Action Part */}
                <div className="p-8 lg:w-64 flex items-center justify-center lg:justify-end gap-3 bg-white">
                  <div className="hidden sm:block text-right mr-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Route Ref</p>
                    <p className="text-xs font-black text-slate-800 uppercase">{record.routeName}</p>
                  </div>
                  <button 
                    onClick={() => openAssignModal(student.id)}
                    className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      isAssigned 
                      ? 'bg-slate-50 text-slate-500 hover:bg-indigo-600 hover:text-white' 
                      : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700'
                    }`}
                  >
                    {isAssigned ? 'Edit Route' : 'Assign Map'}
                    <ChevronRight size={14} />
                  </button>
                </div>

              </div>
            </div>
          );
        }) : (
          <div className="py-24 text-center bg-white/50 border-4 border-dashed border-slate-200 rounded-[4rem]">
            <MapPin size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black text-xl italic uppercase tracking-widest text-center">No students match filter</p>
          </div>
        )}
      </div>

      {/* Enhanced Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100">
                  <Route size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Route Planner</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Manual Input or Quick-Select</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 transition-colors p-2">
                <X size={36} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-6">
              
              {statusMessage && (
                <div className="p-5 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                  <CheckCircle2 size={24}/>
                  <p className="text-sm font-black uppercase tracking-tight">{statusMessage.text}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Route Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. ROUTE-01"
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-600 outline-none transition-all font-black text-slate-800"
                    value={formData.routeName}
                    onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                  />
                </div>

                <div className="space-y-4 bg-indigo-50/30 p-6 rounded-[2.5rem] border border-indigo-50/50">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-2 mb-3">Quick Fill Common Points</p>
                   <div className="flex flex-wrap gap-2">
                      {recentLocations.map(loc => (
                        <button 
                          key={loc}
                          type="button"
                          onClick={() => setFormData({...formData, pickupPoint: loc})}
                          className="bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          {loc}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Pickup Point</label>
                    <input
                      required
                      type="text"
                      placeholder="Start point"
                      className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-600 outline-none transition-all font-black text-slate-800"
                      value={formData.pickupPoint}
                      onChange={(e) => setFormData({ ...formData, pickupPoint: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Drop Point</label>
                    <input
                      required
                      type="text"
                      placeholder="End point"
                      className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-600 outline-none transition-all font-black text-slate-800"
                      value={formData.dropPoint}
                      onChange={(e) => setFormData({ ...formData, dropPoint: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Distance (One-way KM)</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                      <MapPin size={18} />
                    </div>
                    <input
                      required
                      type="number"
                      placeholder="0"
                      className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-600 outline-none transition-all font-black text-slate-800"
                      value={formData.distance || ''}
                      onChange={(e) => setFormData({ ...formData, distance: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-7 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl shadow-indigo-100 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-lg"
                >
                  <Save size={28} />
                  Confirm Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationView;
