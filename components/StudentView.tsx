
import React, { useState, useEffect, useRef } from 'react';
import { Student } from '../types';
import { StudentApi } from '../services/api';
import { TransportDataService } from '../services/dataService';
import { 
  Plus, Search, Edit2, Trash2, Save, X, 
  GraduationCap, Hash, User, Loader2, 
  CheckCircle2, AlertCircle, Fingerprint,
  Info
} from 'lucide-react';

const StudentView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    seriesNumber: '',
    department: 'General',
    academicYear: 'N/A'
  });

  const loadStudents = async () => {
    const data = await StudentApi.fetchStudents();
    setStudents(data);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (isModalOpen && nameInputRef.current && !editingId) {
      nameInputRef.current.focus();
    }
  }, [isModalOpen, editingId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    let response;
    if (editingId) {
      response = await StudentApi.updateStudent(editingId, formData);
    } else {
      response = await StudentApi.saveStudent(formData);
    }

    setIsSubmitting(false);
    if (response.success) {
      setStatusMessage({ type: 'success', text: response.message });
      setTimeout(() => {
        closeModal();
        loadStudents();
        setStatusMessage(null);
      }, 1500);
    } else {
      setStatusMessage({ type: 'error', text: response.message });
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      name: student.name,
      registrationNumber: student.registrationNumber,
      seriesNumber: student.seriesNumber,
      department: student.department,
      academicYear: student.academicYear
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student profile?')) {
      await TransportDataService.deleteStudent(id);
      loadStudents();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', registrationNumber: '', seriesNumber: '', department: 'General', academicYear: 'N/A' });
    setStatusMessage(null);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Student Directory</h1>
          <p className="text-slate-500 text-sm font-medium">Manage permanent student registration logs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-2 transition-all shadow-xl shadow-indigo-100 active:scale-95 uppercase text-xs tracking-widest"
        >
          <Plus size={20} />
          New Student
        </button>
      </div>

      {/* Search Input */}
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
          <Search size={22} />
        </div>
        <input
          type="text"
          placeholder="Search by name or registration ID..."
          className="w-full pl-14 pr-4 py-5 bg-white border-2 border-slate-50 rounded-[2rem] outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Student Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredStudents.length > 0 ? filteredStudents.map(student => (
          <div key={student.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all group relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black shadow-inner shadow-indigo-100/50">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight leading-none mb-2">{student.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border border-slate-100">
                      ID: {student.registrationNumber}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEdit(student)}
                  className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm"
                  title="Modify Profile"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(student.id)}
                  className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white rounded-2xl transition-all shadow-sm"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-50">
                <div className="p-2 bg-white rounded-xl shadow-sm"><Hash size={16} className="text-indigo-500" /></div>
                <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Serial</p>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{student.seriesNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-indigo-50/30 p-4 rounded-3xl border border-indigo-50/50">
                <div className="p-2 bg-white rounded-xl shadow-sm"><GraduationCap size={16} className="text-indigo-600" /></div>
                <div>
                    <p className="text-[9px] font-black text-indigo-300 uppercase leading-none mb-1">Dept</p>
                    <p className="text-xs font-black text-indigo-700 uppercase truncate max-w-[80px] tracking-tight">{student.department}</p>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-24 text-center bg-white/50 border-4 border-dashed border-slate-200 rounded-[4rem]">
            <GraduationCap size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black text-xl italic uppercase tracking-widest text-center">No student records found</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100">
                  {editingId ? <Edit2 size={24}/> : <User size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                    {editingId ? 'Modify Profile' : 'Student Enrollment'}
                  </h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">All fields are editable</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 transition-colors p-2">
                <X size={36} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-6">
              
              {statusMessage && (
                <div className={`p-5 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 ${
                  statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {statusMessage.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
                  <p className="text-sm font-black uppercase tracking-tight">{statusMessage.text}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Full Name</label>
                  <input
                    ref={nameInputRef}
                    required
                    type="text"
                    placeholder="Enter full name"
                    className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 outline-none transition-all font-black text-slate-800 shadow-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Registration ID</label>
                    <input
                      required
                      type="text"
                      placeholder="REG-001"
                      className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 outline-none transition-all font-black text-slate-800 shadow-sm"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Dept / Course</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. CS"
                      className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 outline-none transition-all font-black text-slate-800 shadow-sm"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Serial Number</label>
                  <input
                    required
                    type="text"
                    placeholder="S-001"
                    className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 outline-none transition-all font-black text-slate-800 shadow-sm"
                    value={formData.seriesNumber}
                    onChange={(e) => setFormData({ ...formData, seriesNumber: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-7 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl shadow-indigo-100 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-lg disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={28} /> : <Save size={28} />}
                  {isSubmitting ? 'Syncing...' : editingId ? 'Update Record' : 'Commit Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentView;
