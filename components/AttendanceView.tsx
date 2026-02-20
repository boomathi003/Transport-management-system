
import React, { useState, useEffect } from 'react';
import { Student, AttendanceStatus } from '../types';
import { TransportDataService } from '../services/dataService';
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Trash2, 
  History, 
  Clock, 
  ArrowLeft, 
  ArrowRight,
  RotateCcw,
  Users,
  Save,
  CheckCircle,
  PieChart,
  UserCheck
} from 'lucide-react';

const AttendanceView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isPastDate = selectedDate < today;

  const loadData = async () => {
    const [studentList, allAttendance] = await Promise.all([
      TransportDataService.getStudents(),
      TransportDataService.getAllAttendance()
    ]);
    const dateAttendance = allAttendance.filter(r => r.date === selectedDate);
    
    const attendanceMap: Record<string, AttendanceStatus> = {};
    dateAttendance.forEach(r => {
      attendanceMap[r.studentId] = r.status;
    });

    setStudents(studentList);
    setLocalAttendance(attendanceMap);
    setHasChanges(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalAttendance(prev => ({ ...prev, [studentId]: status }));
    setHasChanges(true);
  };

  const markAllPresent = () => {
    setIsUpdatingAll(true);
    const newMap: Record<string, AttendanceStatus> = { ...localAttendance };
    students.forEach(student => {
      newMap[student.id] = 'Present';
    });
    setLocalAttendance(newMap);
    setHasChanges(true);
    setTimeout(() => setIsUpdatingAll(false), 400);
  };

  const saveAttendance = async () => {
    await TransportDataService.saveAttendanceBatch(selectedDate, localAttendance);
    setHasChanges(false);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 2000);
  };

  const clearRecordsForDate = () => {
    if (window.confirm("Clear all logs for this date?")) {
      setLocalAttendance({});
      setHasChanges(true);
    }
  };

  const setRelativeDate = (offset: number) => {
    if (hasChanges && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const presentCount = Object.values(localAttendance).filter(v => v === 'Present').length;
  const totalCount = students.length;
  const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-3">
            <UserCheck className="text-indigo-600" />
            Attendance Register
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Daily boarding verification for {selectedDate}.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-3xl shadow-sm border border-slate-200 w-full lg:w-auto">
          <button onClick={() => setRelativeDate(-1)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
            <Calendar className="text-indigo-600" size={18} />
            <input 
              type="date" 
              className="outline-none text-sm font-black text-indigo-900 bg-transparent cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button onClick={() => setRelativeDate(1)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-500" disabled={selectedDate >= today}>
            <ArrowRight size={20} />
          </button>
          <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <button 
            onClick={() => setSelectedDate(today)}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${selectedDate === today ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Stats Example Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-sm">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
              <CheckCircle2 size={32} />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Present Today</p>
               <h3 className="text-3xl font-black text-slate-800">{presentCount} <span className="text-slate-300 font-medium text-lg">/ {totalCount}</span></h3>
            </div>
         </div>
         <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-sm">
            <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl">
              <XCircle size={32} />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absent Logs</p>
               <h3 className="text-3xl font-black text-slate-800">{Object.values(localAttendance).filter(v => v === 'Absent').length}</h3>
            </div>
         </div>
         <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white flex items-center justify-between shadow-xl shadow-indigo-100">
            <div>
               <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Boarding Rate</p>
               <h3 className="text-4xl font-black">{attendancePercentage}%</h3>
            </div>
            <PieChart size={48} className="text-indigo-400 opacity-50" />
         </div>
      </div>

      {/* Logic Example Banner */}
      {isPastDate && (
        <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
          <History className="text-amber-500" size={24} />
          <div>
            <p className="text-amber-800 font-black text-sm uppercase tracking-tight">Viewing Historical Register</p>
            <p className="text-amber-600 text-[11px] font-medium">Any changes made here will overwrite the original log for this date.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <button 
          onClick={markAllPresent}
          disabled={isUpdatingAll || students.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white text-emerald-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] border-2 border-emerald-50 hover:bg-emerald-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
        >
          <RotateCcw size={16} className={isUpdatingAll ? 'animate-spin' : ''} />
          {isUpdatingAll ? 'Updating...' : 'Auto-Fill All Present'}
        </button>

        <div className="flex gap-4 w-full sm:w-auto">
          <button onClick={clearRecordsForDate} className="bg-white text-slate-400 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-rose-500">
            <Trash2 size={16} />
          </button>
          <button 
            onClick={saveAttendance}
            disabled={!hasChanges}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-3 px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all ${
              hasChanges ? 'bg-indigo-600 text-white shadow-indigo-200 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save size={18} />
            Commit Changes
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Student Information</th>
                <th className="px-10 py-6">Verification</th>
                <th className="px-10 py-6 text-center">Set Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map(student => {
                const status = localAttendance[student.id];
                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-sm leading-tight uppercase">{student.name}</div>
                          <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{student.registrationNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      {status ? (
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {status === 'Present' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                          {status}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300 text-[9px] font-black uppercase tracking-widest animate-pulse">
                          <Clock size={12} /> Not Verified
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex justify-center items-center gap-3">
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Present')}
                          className={`p-3 rounded-2xl transition-all ${
                            status === 'Present' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-emerald-600'
                          }`}
                        >
                          <CheckCircle2 size={20} />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'Absent')}
                          className={`p-3 rounded-2xl transition-all ${
                            status === 'Absent' ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-rose-600'
                          }`}
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceView;
