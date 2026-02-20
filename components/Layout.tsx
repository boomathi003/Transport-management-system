
import React from 'react';
import { ViewType } from '../types';
import { canAccessView, getUserRole } from '../services/accessControl';
import { auth } from '../services/firebase';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  CalendarDays,
  Search,
  Menu, 
  X,
  Bus,
  CheckSquare,
  Wrench,
  MapPin
} from 'lucide-react';

interface LayoutProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, children }) => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const navItems = [
    { type: ViewType.DASHBOARD, label: 'Home', icon: LayoutDashboard },
    { type: ViewType.STUDENTS, label: 'Students', icon: Users },
    { type: ViewType.DESTINATIONS, label: 'Destinations', icon: MapPin },
    { type: ViewType.ATTENDANCE, label: 'Attendance', icon: CheckSquare },
    { type: ViewType.FEES, label: 'Fees', icon: CreditCard },
    { type: ViewType.MAINTENANCE, label: 'Maintenance', icon: Wrench },
    { type: ViewType.DAILY_LOG, label: 'Daily Log', icon: CalendarDays },
  ];
  const role = getUserRole();
  const uid = auth.currentUser?.uid ?? 'not-signed-in';
  const shortUid = uid.length > 10 ? `${uid.slice(0, 6)}...${uid.slice(-4)}` : uid;
  const filteredNavItems = navItems.filter((item) =>
    canAccessView(item.type) &&
    item.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-indigo-700 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Bus className="w-7 h-7" />
          <span className="font-bold text-xl">CTMS Mobile</span>
        </div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 md:relative md:z-auto bg-white shadow-2xl md:shadow-none w-72 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 bg-indigo-800 text-white flex flex-col items-center gap-4">
          <div className="bg-white/10 p-4 rounded-3xl">
            <Bus className="w-12 h-12 text-indigo-200" />
          </div>
          <div className="text-center">
            <h1 className="font-black text-2xl tracking-tighter uppercase leading-none">Transport</h1>
            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mt-2">Management Suite</p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-2 text-indigo-100/80">{role} access</p>
            <p className="text-[9px] font-black tracking-[0.08em] mt-2 text-indigo-100/70">UID: {shortUid}</p>
          </div>
        </div>
        
        <div className="mt-6 px-6">
          <label className="relative block">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search menu"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </label>
        </div>

        <nav className="mt-5 px-6 space-y-2 pb-10">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.type;
            return (
              <button
                key={item.type}
                onClick={() => {
                  setView(item.type);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-tight transition-all
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
          {filteredNavItems.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">No menu found.</p>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
