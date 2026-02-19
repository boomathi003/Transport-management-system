
import React, { useState, useEffect } from 'react';
import { TransportDataService } from '../services/dataService';
import { Student, FeesRecord, VehicleRecord, ViewType } from '../types';
import { ShieldAlert, CreditCard, Truck, Users, ArrowRight, Bell, CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  setView: (view: ViewType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeesRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);

  useEffect(() => {
    setStudents(TransportDataService.getStudents());
    setFees(TransportDataService.getFees());
    setVehicles(TransportDataService.getVehicles());
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();
  const overdueFees = fees.filter(f => f.status === 'Pending' && f.dueDate < todayStr);

  const getUpcomingAlerts = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const alerts: { id: string, busNumber: string, docName: string, dueDate: string, daysLeft: number }[] = [];

    vehicles.forEach(v => {
      const docFields = [
        { name: 'Insurance', date: v.insuranceDueDate },
        { name: 'FC', date: v.fcDueDate },
        { name: 'Pollution', date: v.pollutionDueDate },
        { name: 'Sticker', date: v.stickerDueDate },
        { name: 'Fire Ext.', date: v.fireExtinguisherDueDate },
        { name: 'First Aid', date: v.firstAidBoxDueDate },
      ];

      docFields.forEach(doc => {
        if (doc.date) {
          const dueDate = new Date(doc.date);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 30) {
            alerts.push({
              id: `${v.id}-${doc.name}`,
              busNumber: v.busNumber,
              docName: doc.name,
              dueDate: doc.date,
              daysLeft: diffDays
            });
          }
        }
      });
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  };

  const upcomingAlerts = getUpcomingAlerts();

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Dashboard</h1>
          <p className="text-slate-500 font-medium italic">Overview of transport fleet operations.</p>
        </div>
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-indigo-600 relative cursor-pointer hover:bg-slate-50 transition-colors">
           <Bell size={24} />
           {(overdueFees.length > 0 || upcomingAlerts.length > 0) && (
             <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
           )}
        </div>
      </div>

      {/* Critical Fee Alerts Banner */}
      {overdueFees.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-[2rem] shadow-sm flex items-start gap-4 animate-in slide-in-from-top-4">
          <ShieldAlert className="text-rose-500 shrink-0" size={32} />
          <div>
            <h4 className="font-black text-rose-800 uppercase tracking-tight">Critical Fee Overdue</h4>
            <p className="text-rose-600 text-sm font-bold mt-1">
              There are {overdueFees.length} transport fee records that have passed their due date.
            </p>
            <button 
              onClick={() => setView(ViewType.FEES)}
              className="mt-3 text-xs font-black uppercase text-rose-700 hover:underline flex items-center gap-1"
            >
              Resolve in Ledger <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Grid Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={() => setView(ViewType.STUDENTS)}
          className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 cursor-pointer hover:scale-[1.02] transition-transform active:scale-100"
        >
          <Users size={32} className="mb-4 opacity-50" />
          <p className="text-indigo-100 font-black uppercase tracking-widest text-[10px]">Total Students</p>
          <h3 className="text-5xl font-black tracking-tighter">{students.length}</h3>
        </div>
        
        <div 
          onClick={() => setView(ViewType.FEES)}
          className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 cursor-pointer hover:scale-[1.02] transition-transform active:scale-100"
        >
          <CreditCard size={32} className="mb-4 opacity-50" />
          <p className="text-emerald-100 font-black uppercase tracking-widest text-[10px]">Fee Records</p>
          <h3 className="text-5xl font-black tracking-tighter">{fees.length}</h3>
        </div>

        <div 
          onClick={() => setView(ViewType.MAINTENANCE)}
          className="bg-slate-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200 cursor-pointer hover:scale-[1.02] transition-transform active:scale-100"
        >
          <Truck size={32} className="mb-4 opacity-50" />
          <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Fleet Size</p>
          <h3 className="text-5xl font-black tracking-tighter">{vehicles.length}</h3>
        </div>
      </div>

      {/* Fleet Maintenance Alerts Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="font-black text-slate-700 text-lg uppercase tracking-widest flex items-center gap-2">
             <CalendarClock className="text-indigo-600" size={20} />
             Fleet Document Alerts
           </h3>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next 30 Days</span>
        </div>
        
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          {upcomingAlerts.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {upcomingAlerts.map(alert => (
                <div key={alert.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className={`p-3 rounded-2xl ${alert.daysLeft < 0 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                      {alert.daysLeft < 0 ? <AlertTriangle size={20} /> : <CalendarClock size={20} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase tracking-tight">{alert.busNumber}</h4>
                      <p className="text-xs font-bold text-slate-400">{alert.docName} expires on {alert.dueDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${alert.daysLeft < 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                        {alert.daysLeft < 0 ? 'Expired' : `${alert.daysLeft} Days Remaining`}
                      </p>
                    </div>
                    <button 
                      onClick={() => setView(ViewType.MAINTENANCE)}
                      className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-slate-800 font-black uppercase tracking-widest text-sm">All Documents Valid</p>
              <p className="text-slate-400 text-xs font-medium">No vehicle documents are expiring within the next 30 days.</p>
            </div>
          )}
        </div>
      </section>

      {/* Large Actions */}
      <div className="space-y-4">
        <h3 className="font-black text-slate-700 text-lg uppercase tracking-widest px-2">Operation Center</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => setView(ViewType.STUDENTS)}
            className="bg-white p-8 rounded-[3rem] border-2 border-slate-50 flex items-center justify-between group hover:border-indigo-500 transition-all shadow-sm active:scale-[0.98] text-left"
          >
            <div className="flex items-center gap-6">
              <div className="bg-indigo-50 p-5 rounded-[1.5rem] text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                <Users size={28} />
              </div>
              <div>
                <p className="font-black text-slate-800 text-xl uppercase tracking-tighter">Student Registry</p>
                <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Register new fleet passengers</p>
              </div>
            </div>
            <ArrowRight className="text-slate-200 group-hover:text-indigo-600 transition-colors" size={24} />
          </button>

          <button 
            onClick={() => setView(ViewType.FEES)}
            className="bg-white p-8 rounded-[3rem] border-2 border-slate-50 flex items-center justify-between group hover:border-emerald-500 transition-all shadow-sm active:scale-[0.98] text-left"
          >
            <div className="flex items-center gap-6">
              <div className="bg-emerald-50 p-5 rounded-[1.5rem] text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                <CreditCard size={28} />
              </div>
              <div>
                <p className="font-black text-slate-800 text-xl uppercase tracking-tighter">Fee Collection</p>
                <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Track transport revenue logs</p>
              </div>
            </div>
            <ArrowRight className="text-slate-200 group-hover:text-emerald-600 transition-colors" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
