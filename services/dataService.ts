
import { Student, AttendanceRecord, FeesRecord, VehicleRecord, AttendanceStatus, PaymentStatus, AttentionMessage, DestinationRecord } from '../types';

const STORAGE_KEYS = {
  STUDENTS: 'ctms_students',
  ATTENDANCE: 'ctms_attendance',
  FEES: 'ctms_fees',
  VEHICLES: 'ctms_vehicles',
  ATTENTION: 'ctms_attention',
  DESTINATIONS: 'ctms_destinations',
};

const DEFAULT_STUDENTS: Omit<Student, 'id' | 'createdAt'>[] = [
  { name: 'Sathish Kumar R', registrationNumber: '2322k1443', seriesNumber: 'S-001', department: 'Computer Science', academicYear: '3rd Year / 5th Sem' },
  { name: 'Karthikeyan M', registrationNumber: '2322k1417', seriesNumber: 'S-002', department: 'Computer Science', academicYear: '2nd Year / 3rd Sem' },
  { name: 'Abdul Kalam J', registrationNumber: '2322k1398', seriesNumber: 'S-003', department: 'Computer Science', academicYear: '4th Year / 7th Sem' },
];

export class TransportDataService {
  private static get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  private static save<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  static getStudents(): Student[] {
    const students = this.get<Student[]>(STORAGE_KEYS.STUDENTS, []);
    if (students.length === 0) {
      const initial = DEFAULT_STUDENTS.map((s, idx) => ({
        ...s,
        id: (idx + 1).toString(),
        createdAt: new Date().toISOString().split('T')[0]
      }));
      this.save(STORAGE_KEYS.STUDENTS, initial);
      
      // Initialize default destinations for these students
      const defaultDestinations: DestinationRecord[] = initial.map(s => ({
        studentId: s.id,
        pickupPoint: 'Pollachi',
        dropPoint: 'Poosaripatti',
        routeName: 'ROUTE-01',
        distance: 14
      }));
      this.save(STORAGE_KEYS.DESTINATIONS, defaultDestinations);
      
      return initial;
    }
    return students;
  }

  static addStudent(data: Omit<Student, 'id' | 'createdAt'>): void {
    const students = this.getStudents();
    const newStudent = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] };
    this.save(STORAGE_KEYS.STUDENTS, [...students, newStudent]);
  }

  static updateStudent(id: string, updates: Partial<Student>): void {
    const students = this.getStudents();
    this.save(STORAGE_KEYS.STUDENTS, students.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  static deleteStudent(id: string): void {
    const students = this.getStudents();
    this.save(STORAGE_KEYS.STUDENTS, students.filter(s => s.id !== id));
    this.save(STORAGE_KEYS.FEES, this.getFees().filter(f => f.studentId !== id));
    this.save(STORAGE_KEYS.ATTENDANCE, this.getAllAttendance().filter(a => a.studentId !== id));
    this.save(STORAGE_KEYS.DESTINATIONS, this.getAllDestinations().filter(d => d.studentId !== id));
  }

  // --- Fees ---
  static getFees(): FeesRecord[] {
    return this.get(STORAGE_KEYS.FEES, []);
  }

  static addFee(data: Omit<FeesRecord, 'id' | 'createdAt'>): void {
    const fees = this.getFees();
    const newFee: FeesRecord = { 
      ...data, 
      id: Date.now().toString(), 
      createdAt: new Date().toISOString().split('T')[0] 
    };
    this.save(STORAGE_KEYS.FEES, [...fees, newFee]);
  }

  static updateFee(id: string, updates: Partial<FeesRecord>): void {
    const fees = this.getFees();
    this.save(STORAGE_KEYS.FEES, fees.map(f => f.id === id ? { ...f, ...updates } : f));
  }

  static deleteFee(id: string): void {
    const fees = this.getFees();
    this.save(STORAGE_KEYS.FEES, fees.filter(f => f.id !== id));
  }

  // --- Attendance ---
  static getAllAttendance(): AttendanceRecord[] {
    return this.get(STORAGE_KEYS.ATTENDANCE, []);
  }

  static markAttendance(studentId: string, date: string, status: AttendanceStatus): void {
    const records = this.getAllAttendance();
    const existingIndex = records.findIndex(r => r.studentId === studentId && r.date === date);
    if (existingIndex > -1) {
      records[existingIndex].status = status;
      this.save(STORAGE_KEYS.ATTENDANCE, records);
    } else {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        studentId,
        date,
        status
      };
      this.save(STORAGE_KEYS.ATTENDANCE, [...records, newRecord]);
    }
  }

  static saveAttendanceBatch(date: string, attendanceMap: Record<string, AttendanceStatus>): void {
    const records = this.getAllAttendance();
    const otherDateRecords = records.filter(r => r.date !== date);
    
    const newRecordsForDate = Object.entries(attendanceMap).map(([studentId, status], index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      studentId,
      date,
      status
    }));

    this.save(STORAGE_KEYS.ATTENDANCE, [...otherDateRecords, ...newRecordsForDate]);
  }

  static deleteAttendance(id: string): void {
    const records = this.getAllAttendance();
    this.save(STORAGE_KEYS.ATTENDANCE, records.filter(r => r.id !== id));
  }

  // --- Maintenance ---
  static getVehicles(): VehicleRecord[] {
    return this.get(STORAGE_KEYS.VEHICLES, []);
  }

  static addVehicle(data: Omit<VehicleRecord, 'id' | 'createdAt'>): void {
    const vehicles = this.getVehicles();
    const newVehicle = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] };
    this.save(STORAGE_KEYS.VEHICLES, [...vehicles, newVehicle]);
  }

  static updateVehicle(id: string, updates: Partial<VehicleRecord>): void {
    const vehicles = this.getVehicles();
    this.save(STORAGE_KEYS.VEHICLES, vehicles.map(v => v.id === id ? { ...v, ...updates } : v));
  }

  static deleteVehicle(id: string): void {
    const vehicles = this.getVehicles();
    this.save(STORAGE_KEYS.VEHICLES, vehicles.filter(v => v.id !== id));
  }

  // --- Attention Messages ---
  static getAttentionMessages(): AttentionMessage[] {
    return this.get(STORAGE_KEYS.ATTENTION, []);
  }

  static addAttentionMessage(data: Omit<AttentionMessage, 'id'>): void {
    const messages = this.getAttentionMessages();
    const newMessage = { ...data, id: Date.now().toString() };
    this.save(STORAGE_KEYS.ATTENTION, [...messages, newMessage]);
  }

  static updateAttentionMessage(id: string, updates: Partial<AttentionMessage>): void {
    const messages = this.getAttentionMessages();
    this.save(STORAGE_KEYS.ATTENTION, messages.map(m => m.id === id ? { ...m, ...updates } : m));
  }

  static deleteAttentionMessage(id: string): void {
    const messages = this.getAttentionMessages();
    this.save(STORAGE_KEYS.ATTENTION, messages.filter(m => m.id !== id));
  }

  // --- Destinations ---
  static getAllDestinations(): DestinationRecord[] {
    return this.get(STORAGE_KEYS.DESTINATIONS, []);
  }

  static updateDestination(data: DestinationRecord): void {
    const records = this.getAllDestinations();
    const index = records.findIndex(r => r.studentId === data.studentId);
    if (index > -1) {
      records[index] = data;
      this.save(STORAGE_KEYS.DESTINATIONS, records);
    } else {
      this.save(STORAGE_KEYS.DESTINATIONS, [...records, data]);
    }
  }

  static getDataByDate(date: string) {
    const fees = this.getFees().filter(f => f.feeDate === date);
    const vehicles = this.getVehicles().filter(v => v.createdAt === date);
    const attendance = this.getAllAttendance().filter(a => a.date === date);
    return { fees, vehicles, attendance };
  }
}
