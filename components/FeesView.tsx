
import React, { useEffect, useRef, useState } from 'react';
import { Student, FeesRecord, FeeType, PaymentStatus, DestinationRecord } from '../types';
import { FeesApi, StudentApi } from '../services/api';
import { TransportDataService } from '../services/dataService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Plus, X, Save, Search, CheckCircle,
  Clock, Edit2, Trash2, IndianRupee,
  TrendingUp, PieChart, Loader2,
  FileText, Calendar, ArrowLeft, ArrowRight,
  Sparkles
} from 'lucide-react';

type LocalAuth = {
  username: string;
  password: string;
  recoveryCode: string;
};

type AuthMode = 'setup' | 'login' | 'forgot';

const AUTH_DATA_KEY = 'fees_auth_data';
const AUTH_SESSION_KEY = 'fees_auth_session';

const FeesView: React.FC = () => {
  const [fees, setFees] = useState<FeesRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');

  const lastPendingAlertKeyRef = useRef<string>('');

  const [formData, setFormData] = useState({
    studentId: '',
    totalAmount: 0,
    paidAmount: 0,
    feeType: 'Transport' as FeeType,
    paymentDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    feeDate: new Date().toISOString().split('T')[0],
    status: 'Pending' as PaymentStatus
  });

  const getSavedAuth = (): LocalAuth | null => {
    const raw = localStorage.getItem(AUTH_DATA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LocalAuth;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const saved = getSavedAuth();
    const sessionActive = localStorage.getItem(AUTH_SESSION_KEY) === 'true';

    if (saved) {
      setAuthMode('login');
    } else {
      setAuthMode('setup');
    }

    if (saved && sessionActive) {
      setIsAuthenticated(true);
    }
  }, []);

  const loadData = async () => {
    const [feesData, studentsData, destData] = await Promise.all([
      FeesApi.fetchFees(),
      StudentApi.fetchStudents(),
      TransportDataService.getAllDestinations()
    ]);
    setFees(feesData);
    setStudents(studentsData);
    setDestinations(destData);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    if (!authUsername.trim() || !authPassword || !recoveryCode.trim()) {
      setAuthMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    if (authPassword !== confirmPassword) {
      setAuthMessage({ type: 'error', text: 'Password and confirm password do not match.' });
      return;
    }

    const payload: LocalAuth = {
      username: authUsername.trim(),
      password: authPassword,
      recoveryCode: recoveryCode.trim()
    };

    localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(payload));
    localStorage.setItem(AUTH_SESSION_KEY, 'false');

    setAuthMode('login');
    setAuthMessage({ type: 'success', text: 'Account created. Please login.' });
    setAuthUsername('');
    setAuthPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    const saved = getSavedAuth();
    if (!saved) {
      setAuthMode('setup');
      setAuthMessage({ type: 'error', text: 'No account found. Please create one first.' });
      return;
    }

    if (saved.username === authUsername && saved.password === authPassword) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_SESSION_KEY, 'true');
      setAuthMessage(null);
      setAuthPassword('');
    } else {
      setAuthMessage({ type: 'error', text: 'Invalid username or password.' });
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    const saved = getSavedAuth();
    if (!saved) {
      setAuthMode('setup');
      setAuthMessage({ type: 'error', text: 'No account found. Please create one first.' });
      return;
    }

    if (saved.recoveryCode !== recoveryCode.trim()) {
      setAuthMessage({ type: 'error', text: 'Invalid recovery code.' });
      return;
    }

    if (!authUsername.trim() || !authPassword) {
      setAuthMessage({ type: 'error', text: 'New username and password are required.' });
      return;
    }

    if (authPassword !== confirmPassword) {
      setAuthMessage({ type: 'error', text: 'Password and confirm password do not match.' });
      return;
    }

    const updated: LocalAuth = {
      username: authUsername.trim(),
      password: authPassword,
      recoveryCode: saved.recoveryCode
    };

    localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(updated));
    localStorage.setItem(AUTH_SESSION_KEY, 'false');

    setAuthMode('login');
    setAuthMessage({ type: 'success', text: 'Credentials reset. Please login.' });
    setAuthPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.setItem(AUTH_SESSION_KEY, 'false');
    setAuthPassword('');
  };

  const handleStudentSelect = (studentId: string) => {
    const dest = destinations.find(d => d.studentId === studentId);
    let calculatedFee = 0;

    if (dest && dest.distance > 0) {
      calculatedFee = dest.distance * 150;
    }

    setFormData(prev => ({
      ...prev,
      studentId,
      totalAmount: calculatedFee > 0 ? calculatedFee : prev.totalAmount
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) return alert('Please select a student first');

    setIsSubmitting(true);
    setStatusMessage(null);

    let response;
    if (editingId) {
      response = await FeesApi.updateFee(editingId, formData);
    } else {
      response = await FeesApi.saveFee(formData);
    }

    setIsSubmitting(false);
    if (response.success) {
      setStatusMessage({ type: 'success', text: response.message });
      setTimeout(() => {
        closeModal();
        loadData();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: response.message });
    }
  };

  const handleEdit = (fee: FeesRecord) => {
    setEditingId(fee.id);
    setFormData({
      studentId: fee.studentId,
      totalAmount: fee.totalAmount,
      paidAmount: fee.paidAmount,
      feeType: fee.feeType,
      paymentDate: fee.paymentDate,
      dueDate: fee.dueDate,
      feeDate: fee.feeDate,
      status: fee.status
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      studentId: '',
      totalAmount: 0,
      paidAmount: 0,
      feeType: 'Transport',
      paymentDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      feeDate: selectedDate,
      status: 'Pending'
    });
    setStatusMessage(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this fee record permanently?')) {
      await TransportDataService.deleteFee(id);
      loadData();
    }
  };

  const setRelativeDate = (offset: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const filteredFees = fees.filter(fee => {
    const matchesDate = fee.feeDate === selectedDate;
    const student = students.find(s => s.id === fee.studentId);
    const matchesSearch =
      student?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDate && matchesSearch;
  });

  const normalizeDepartment = (value?: string) => value?.trim().toLowerCase() || 'unknown';

  const filteredFeesByDepartment = filteredFees.reduce<Record<string, { label: string; items: FeesRecord[] }>>((acc, fee) => {
    const student = students.find(s => s.id === fee.studentId);
    const rawDepartment = student?.department?.trim();
    const key = normalizeDepartment(rawDepartment);
    if (!acc[key]) {
      acc[key] = { label: rawDepartment || 'Unknown', items: [] };
    }
    acc[key].items.push(fee);
    return acc;
  }, {});

  const filteredFeesDepartmentKeys = Object.keys(filteredFeesByDepartment).sort((a, b) => a.localeCompare(b));

  const departmentSummary = filteredFees.reduce<Record<string, { label: string; total: number; paid: number; pending: number; count: number }>>(
    (acc, fee) => {
      const student = students.find(s => s.id === fee.studentId);
      const rawDepartment = student?.department?.trim();
      const key = normalizeDepartment(rawDepartment);
      if (!acc[key]) {
        acc[key] = { label: rawDepartment || 'Unknown', total: 0, paid: 0, pending: 0, count: 0 };
      }
      acc[key].total += fee.totalAmount;
      acc[key].paid += fee.paidAmount;
      acc[key].pending += fee.totalAmount - fee.paidAmount;
      acc[key].count += 1;
      return acc;
    },
    {}
  );

  const departmentSummaryList = Object.entries(departmentSummary)
    .map(([, summary]) => summary)
    .sort((a, b) => b.total - a.total);

  const studentFeeStatus = students.map((student) => {
    const records = fees
      .filter((fee) => fee.studentId === student.id)
      .sort((a, b) => {
        const dateDiff = new Date(b.feeDate).getTime() - new Date(a.feeDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    const latest = records[0];

    if (!latest || latest.totalAmount === 0) {
      return { student, status: 'Not Paid', fee: latest };
    }

    if (latest.paidAmount >= latest.totalAmount) {
      return { student, status: 'Paid', fee: latest };
    }

    if (latest.paidAmount > 0) {
      return { student, status: 'Pending', fee: latest };
    }

    return { student, status: 'Not Paid', fee: latest };
  });

  const filteredStudentStatus = studentFeeStatus.filter(({ student }) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      student.name.toLowerCase().includes(query) ||
      student.registrationNumber.toLowerCase().includes(query)
    );
  });

  const statusCounts = studentFeeStatus.reduce(
    (acc, curr) => {
      if (curr.status === 'Paid') acc.paid += 1;
      if (curr.status === 'Pending') acc.pending += 1;
      if (curr.status === 'Not Paid') acc.notPaid += 1;
      return acc;
    },
    { paid: 0, pending: 0, notPaid: 0 }
  );

  const dateTotalReceived = filteredFees.reduce((acc, curr) => acc + curr.paidAmount, 0);
  const dateTotalPending = filteredFees.reduce((acc, curr) => acc + (curr.totalAmount - curr.paidAmount), 0);
  const pendingCalc = formData.totalAmount - formData.paidAmount;
  const monthlyFeeTrend = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - idx));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = fees
      .filter((fee) => fee.feeDate?.startsWith(key))
      .reduce((sum, fee) => sum + fee.paidAmount, 0);
    return { label: d.toLocaleString('en-US', { month: 'short' }), total };
  });
  const maxTrend = Math.max(...monthlyFeeTrend.map((item) => item.total), 1);
  const statusPillClasses: Record<string, string> = {
    Paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    'Not Paid': 'bg-rose-100 text-rose-700 border-rose-200'
  };
  const statusKeys = ['Paid', 'Pending', 'Not Paid'] as const;

  const groupByDepartment = (list: typeof filteredStudentStatus) =>
    list.reduce<Record<string, { label: string; items: typeof filteredStudentStatus }>>((acc, item) => {
      const rawDepartment = item.student.department?.trim();
      const key = normalizeDepartment(rawDepartment);
      if (!acc[key]) acc[key] = { label: rawDepartment || 'Unknown', items: [] };
      acc[key].items.push(item);
      return acc;
    }, {});

  const exportStatusPdf = (status: typeof statusKeys[number]) => {
    const list = filteredStudentStatus.filter((item) => item.status === status);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Student Fees - ${status}`, 14, 18);
    doc.setFontSize(10);
    doc.text('All Dates (Latest Record per Student)', 14, 24);

    const rows = list.map(({ student, fee }) => {
      const paid = fee?.paidAmount ?? 0;
      const total = fee?.totalAmount ?? 0;
      return [
        student.name,
        student.registrationNumber,
        student.department,
        `Rs ${paid.toLocaleString('en-IN')}`,
        `Rs ${total.toLocaleString('en-IN')}`
      ];
    });

    autoTable(doc, {
      head: [['Student Name', 'Reg No.', 'Department', 'Paid', 'Total']],
      body: rows.length ? rows : [['No students', '-', '-', '-', '-']],
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] }
    });

    const fileName = `students-${status.toLowerCase().replace(' ', '-')}.pdf`;
    doc.save(fileName);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const pendingFees = filteredFees.filter(fee => fee.totalAmount > fee.paidAmount);
    if (!pendingFees.length) {
      lastPendingAlertKeyRef.current = '';
      return;
    }

    const alertKey = `${selectedDate}:${pendingFees
      .map(f => `${f.id}-${f.totalAmount}-${f.paidAmount}`)
      .join('|')}`;

    if (lastPendingAlertKeyRef.current === alertKey) return;

    const alertLines = pendingFees.map((fee, index) => {
      const student = students.find(s => s.id === fee.studentId);
      const pending = fee.totalAmount - fee.paidAmount;
      return `${index + 1}. ${student?.name ?? 'Unknown'} - Pending ₹${pending.toLocaleString('en-IN')}`;
    });

    alert(`Pending fees alert (${selectedDate}):\n\n${alertLines.join('\n')}`);
    lastPendingAlertKeyRef.current = alertKey;
  }, [filteredFees, isAuthenticated, selectedDate, students]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-5">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Fees Access</h2>
          <p className="text-sm text-slate-500">
            {authMode === 'setup' && 'Create username, password, and recovery code.'}
            {authMode === 'login' && 'Login to access fees management.'}
            {authMode === 'forgot' && 'Reset username/password using recovery code.'}
          </p>

          {authMessage && (
            <div className={`px-4 py-3 rounded-2xl text-sm font-semibold ${authMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {authMessage.text}
            </div>
          )}

          {authMode === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <input
                type="text"
                placeholder="Create username"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Create password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Create recovery code"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                required
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-black uppercase tracking-widest">
                Create Account
              </button>
              <button type="button" onClick={() => setAuthMode('login')} className="w-full text-sm font-semibold text-indigo-600">
                Already have account? Login
              </button>
            </form>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-black uppercase tracking-widest">
                Login
              </button>
              <button type="button" onClick={() => setAuthMode('forgot')} className="w-full text-sm font-semibold text-indigo-600">
                Forgot username/password?
              </button>
              {!getSavedAuth() && (
                <button type="button" onClick={() => setAuthMode('setup')} className="w-full text-sm font-semibold text-slate-600">
                  No account? Create one
                </button>
              )}
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <input
                type="text"
                placeholder="Recovery code"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="New username"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="New password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-black uppercase tracking-widest">
                Reset Credentials
              </button>
              <button type="button" onClick={() => setAuthMode('login')} className="w-full text-sm font-semibold text-indigo-600">
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Fees Management</h1>
          <p className="text-slate-500 text-sm font-medium">Record and update fee records (Editable).</p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
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
            <button onClick={() => setRelativeDate(1)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-500">
              <ArrowRight size={20} />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${selectedDate === new Date().toISOString().split('T')[0] ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}
            >
              Today
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-3 rounded-2xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`px-5 py-3 rounded-2xl text-sm font-bold ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-emerald-100 flex items-center justify-between overflow-hidden relative group">
          <div className="z-10">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Received on {selectedDate}</p>
            <h3 className="text-4xl font-black">₹{dateTotalReceived.toLocaleString('en-IN')}</h3>
          </div>
          <TrendingUp size={80} className="absolute -right-4 text-white/10 group-hover:scale-110 transition-transform" />
        </div>
        <div className="bg-rose-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-rose-100 flex items-center justify-between overflow-hidden relative group">
          <div className="z-10">
            <p className="text-rose-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Pending Balance</p>
            <h3 className="text-4xl font-black">₹{dateTotalPending.toLocaleString('en-IN')}</h3>
          </div>
          <PieChart size={80} className="absolute -right-4 text-white/10 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      <section className="bg-white rounded-[3rem] border border-slate-100 p-6 shadow-sm">
        <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm mb-4">Fee Trend (6 Months)</h3>
        <div className="space-y-3">
          {monthlyFeeTrend.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-10 text-xs font-black text-slate-500">{item.label}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(item.total / maxTrend) * 100}%` }} />
              </div>
              <span className="text-xs font-black text-slate-700">Rs {item.total.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input
            type="text"
            placeholder="Search filtered ledger..."
            className="w-full pl-14 pr-4 py-5 bg-white border-2 border-slate-50 rounded-[2rem] outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-3xl font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest text-sm"
        >
          <Plus size={20} />
          Create Fee Entry
        </button>
      </div>

      <section className="bg-white rounded-[3rem] border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Department Wise Summary</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Filtered by {selectedDate}</p>
          </div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Departments: {departmentSummaryList.length || 0}
          </div>
        </div>
        {departmentSummaryList.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentSummaryList.map((dept) => (
              <div key={dept.department} className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{dept.department}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {dept.count} records
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl p-3 border border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total</p>
                    <p className="text-xs font-black text-slate-700">Rs {dept.total.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Paid</p>
                    <p className="text-xs font-black text-emerald-700">Rs {dept.paid.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-rose-50/70 rounded-2xl p-3 border border-rose-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Pending</p>
                    <p className="text-xs font-black text-rose-700">Rs {dept.pending.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 font-bold text-sm">
            No department data available for the selected date.
          </div>
        )}
      </section>

      <section className="bg-white rounded-[3rem] border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Student Fee Status</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">All Dates (Latest Record per Student)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusPillClasses.Paid}`}>
              Paid {statusCounts.paid}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusPillClasses.Pending}`}>
              Pending {statusCounts.pending}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusPillClasses['Not Paid']}`}>
              Not Paid {statusCounts.notPaid}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={() => exportStatusPdf('Paid')}
            className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest shadow-sm"
          >
            Download Paid PDF
          </button>
          <button
            type="button"
            onClick={() => exportStatusPdf('Pending')}
            className="px-4 py-2 rounded-2xl bg-amber-600 text-white text-[11px] font-black uppercase tracking-widest shadow-sm"
          >
            Download Pending PDF
          </button>
          <button
            type="button"
            onClick={() => exportStatusPdf('Not Paid')}
            className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest shadow-sm"
          >
            Download Not Paid PDF
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {statusKeys.map((status) => {
            const list = filteredStudentStatus.filter((item) => item.status === status);
            const grouped = groupByDepartment(list);
            const departmentKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
            return (
              <div key={status} className="bg-slate-50/60 border border-slate-100 rounded-3xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">{status}</h4>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusPillClasses[status]}`}>
                    {list.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {list.length > 0 ? departmentKeys.map((dept) => (
                    <div key={dept} className="bg-white border border-slate-100 rounded-2xl p-3">
                      <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
                        <div className="text-[11px] font-black uppercase tracking-widest text-slate-600">{grouped[dept].label}</div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {grouped[dept].items.length}
                        </span>
                      </div>
                      <div className="space-y-2 mt-3">
                        {grouped[dept].items.map(({ student, fee }) => {
                          const paid = fee?.paidAmount ?? 0;
                          const total = fee?.totalAmount ?? 0;
                          return (
                            <div key={student.id} className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                              <div className="font-black text-slate-800">{student.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {student.registrationNumber}
                              </div>
                              <div className="text-[11px] font-black text-slate-700 mt-2">
                                ₹{paid.toLocaleString('en-IN')} / ₹{total.toLocaleString('en-IN')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )) : (
                    <div className="py-6 text-center text-slate-400 font-bold text-sm">
                      No students
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {filteredFees.length > 0 ? (
        <div className="space-y-6">
          {filteredFeesDepartmentKeys.map((dept) => (
            <div key={dept} className="bg-white/70 border border-slate-100 rounded-[3rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">{filteredFeesByDepartment[dept].label}</h4>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {filteredFeesByDepartment[dept].items.length} records
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFeesByDepartment[dept].items.map(fee => {
                  const student = students.find(s => s.id === fee.studentId);
                  const pending = fee.totalAmount - fee.paidAmount;

                  return (
                    <div key={fee.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50 transition-all hover:shadow-xl group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                      <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(fee)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(fee.id)} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100">
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 mb-8">
                        <div className={`p-4 rounded-[1.5rem] ${fee.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                          {fee.status === 'Paid' ? <CheckCircle size={24} /> : <Clock size={24} />}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">{student?.name || 'N/A'}</h4>
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                            Ref: {student?.registrationNumber || 'No ID'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                          <div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Fee</p>
                            <p className="text-2xl font-black text-slate-800">₹{fee.totalAmount.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Entry Date</p>
                            <span className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-indigo-500 uppercase">{fee.feeDate}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-emerald-50/50 p-4 rounded-3xl">
                            <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Paid</p>
                            <p className="text-sm font-black text-emerald-700">₹{fee.paidAmount.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-rose-50/50 p-4 rounded-3xl">
                            <p className="text-[9px] font-black text-rose-600 uppercase mb-1">Pending</p>
                            <p className="text-sm font-black text-rose-700">₹{pending.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-white/50 border-4 border-dashed border-slate-200 rounded-[4rem]">
          <FileText size={64} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-black text-xl italic uppercase tracking-widest">No records found for {selectedDate}</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100">
                  <IndianRupee size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{editingId ? 'Edit Record' : 'Fee Entry'}</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Calculations are automatic but editable</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-800 p-2 transition-colors">
                <X size={40} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-12 py-10 space-y-8 max-h-[75vh] overflow-y-auto scrollbar-hide">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Select Student</label>
                <select
                  className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-500 transition-all font-black text-slate-700 appearance-none shadow-sm cursor-pointer"
                  value={formData.studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  required
                  disabled={isSubmitting || !!editingId}
                >
                  <option value="">CHOOSE STUDENT...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.registrationNumber})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Amount (₹)</label>
                    {formData.studentId && (
                      <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase">
                        <Sparkles size={10} className="animate-pulse" /> Auto-Filled
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-500 transition-all font-black text-xl shadow-inner"
                    value={formData.totalAmount || ''}
                    onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                    disabled={isSubmitting}
                  />
                  <p className="text-[9px] font-bold text-slate-400 px-4 uppercase tracking-tighter italic">Click to change if needed</p>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Paid Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-500 transition-all font-black text-xl"
                    value={formData.paidAmount || ''}
                    onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] px-2 italic">Balance (Auto)</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-8 py-5 bg-rose-50/50 border-2 border-rose-100 rounded-[2rem] font-black text-xl text-rose-600"
                    value={`₹ ${pendingCalc.toLocaleString('en-IN')}`}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Category</label>
                  <select
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-500 transition-all font-black text-slate-700 appearance-none shadow-sm cursor-pointer"
                    value={formData.feeType}
                    onChange={(e) => setFormData({ ...formData, feeType: e.target.value as FeeType })}
                    disabled={isSubmitting}
                  >
                    <option value="Transport">TRANSPORT</option>
                    <option value="Tuition">TUITION</option>
                    <option value="Other">OTHER</option>
                  </select>
                </div>
              </div>

              <div className="pt-8">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-7 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl shadow-indigo-100 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-lg disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={28} /> : <Save size={28} />}
                  {isSubmitting ? 'PROCESSING...' : editingId ? 'UPDATE RECORD' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesView;



