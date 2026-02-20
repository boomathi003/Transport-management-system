
import React, { useState, useEffect } from 'react';
import { FeesRecord, VehicleRecord, Student, AttendanceRecord } from '../types';
import { TransportDataService } from '../services/dataService';
import { Calendar, CreditCard, Truck, CheckSquare, Download } from 'lucide-react';

const DailyLogView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logData, setLogData] = useState<{fees: FeesRecord[], vehicles: VehicleRecord[], attendance: AttendanceRecord[]}>({fees: [], vehicles: [], attendance: []});
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const [data, studentData] = await Promise.all([
        TransportDataService.getDataByDate(selectedDate),
        TransportDataService.getStudents()
      ]);
      if (!isMounted) return;
      setLogData(data);
      setStudents(studentData);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const downloadCsv = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportFeesCsv = () => {
    const rows = logData.fees.map((fee) => {
      const student = students.find((s) => s.id === fee.studentId);
      return [
        fee.feeDate,
        student?.name ?? 'Unknown',
        student?.registrationNumber ?? '',
        fee.feeType,
        fee.totalAmount.toString(),
        fee.paidAmount.toString(),
        fee.status
      ];
    });
    downloadCsv(`fees_${selectedDate}.csv`, ['Date', 'Student', 'Reg No', 'Type', 'Total', 'Paid', 'Status'], rows);
  };

  const exportAttendanceCsv = () => {
    const rows = logData.attendance.map((record) => {
      const student = students.find((s) => s.id === record.studentId);
      return [record.date, student?.name ?? 'Unknown', student?.registrationNumber ?? '', record.status];
    });
    downloadCsv(`attendance_${selectedDate}.csv`, ['Date', 'Student', 'Reg No', 'Status'], rows);
  };

  const exportVehiclesCsv = () => {
    const rows = logData.vehicles.map((vehicle) => [
      vehicle.createdAt,
      vehicle.busNumber,
      vehicle.driverName,
      vehicle.driverContact,
      vehicle.stack ?? '',
      vehicle.usage ?? ''
    ]);
    downloadCsv(`vehicles_${selectedDate}.csv`, ['Date', 'Bus Number', 'Driver', 'Contact', 'Route Stack', 'Usage'], rows);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Date-Based History</h1>
          <p className="text-slate-500 text-sm">Retrieve every detail entered on a specific day.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border-2 border-indigo-100 p-4 rounded-3xl shadow-sm">
          <Calendar className="text-indigo-600" size={24} />
          <input 
            type="date" 
            className="outline-none font-black text-slate-700 bg-transparent text-lg"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={exportFeesCsv} className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <Download size={14} /> Fees CSV
        </button>
        <button onClick={exportAttendanceCsv} className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <Download size={14} /> Attendance CSV
        </button>
        <button onClick={exportVehiclesCsv} className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <Download size={14} /> Vehicles CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-10">
          {/* Fees recorded today */}
          <section className="space-y-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wider text-sm">
               <CreditCard className="text-indigo-600" size={18}/> Fees Log ({logData.fees.length})
            </h3>
            <div className="space-y-3">
              {logData.fees.map(f => {
                const student = students.find(s => s.id === f.studentId);
                return (
                  <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800">{student?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400">Reg: {student?.registrationNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-indigo-600">₹{f.totalAmount.toLocaleString('en-IN')}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        f.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                        f.status === 'Partially Paid' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {logData.fees.length === 0 && <p className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">No fee records for this date.</p>}
            </div>
          </section>

          {/* Attendance recorded today */}
          <section className="space-y-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wider text-sm">
               <CheckSquare className="text-indigo-600" size={18}/> Attendance ({logData.attendance.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {logData.attendance.map(a => {
                const student = students.find(s => s.id === a.studentId);
                return (
                  <div key={a.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                    <span className="font-bold text-slate-800 text-sm truncate pr-2">{student?.name || 'Unknown'}</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                      a.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                );
              })}
              {logData.attendance.length === 0 && <p className="col-span-full p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">No attendance recorded.</p>}
            </div>
          </section>
        </div>

        {/* Vehicles added today */}
        <section className="space-y-4">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wider text-sm">
             <Truck className="text-slate-800" size={18}/> Fleet Entry Log ({logData.vehicles.length})
          </h3>
          <div className="space-y-3">
             {logData.vehicles.map(v => (
                <div key={v.id} className="bg-slate-800 p-5 rounded-2xl text-white flex justify-between items-center shadow-md">
                   <div>
                      <p className="font-black text-lg">{v.busNumber}</p>
                      <p className="text-xs text-slate-400">Driver: {v.driverName}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-bold text-slate-500">Contact</p>
                      <p className="text-sm font-bold">{v.driverContact}</p>
                   </div>
                </div>
             ))}
             {logData.vehicles.length === 0 && <p className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">No vehicle records for this date.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DailyLogView;
