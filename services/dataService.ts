import {
  child,
  get,
  push,
  ref,
  remove,
  set,
  update
} from 'firebase/database';
import {
  Student,
  AttendanceRecord,
  FeesRecord,
  VehicleRecord,
  AttendanceStatus,
  AttentionMessage,
  DestinationRecord
} from '../types';
import { rtdb } from './firebase';

const COLLECTIONS = {
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  FEES: 'fees',
  VEHICLES: 'vehicles',
  ATTENTION: 'attention',
  DESTINATIONS: 'destinations'
} as const;
const PLACEHOLDER_KEY = '__placeholder';

const DEFAULT_STUDENTS: Omit<Student, 'id' | 'createdAt'>[] = [
  { name: 'Sathish Kumar R', registrationNumber: '2322k1443', seriesNumber: 'S-001', department: 'Computer Science', academicYear: '3rd Year / 5th Sem' },
  { name: 'Karthikeyan M', registrationNumber: '2322k1417', seriesNumber: 'S-002', department: 'Computer Science', academicYear: '2nd Year / 3rd Sem' },
  { name: 'Abdul Kalam J', registrationNumber: '2322k1398', seriesNumber: 'S-003', department: 'Computer Science', academicYear: '4th Year / 7th Sem' }
];

const today = () => new Date().toISOString().split('T')[0];

const stripId = <T extends { id?: string }>(data: T) => {
  const { id, ...rest } = data;
  return rest;
};

const getCollectionMap = async <T>(path: string): Promise<Record<string, T>> => {
  const snapshot = await get(child(ref(rtdb), path));
  if (!snapshot.exists()) return {};
  return (snapshot.val() as Record<string, T>) ?? {};
};

const getCollectionArray = async <T>(path: string): Promise<Array<T & { id: string }>> => {
  const data = await getCollectionMap<T>(path);
  return Object.entries(data)
    .filter(([id]) => id !== PLACEHOLDER_KEY)
    .map(([id, value]) => ({ id, ...(value as T) }));
};

const ensureCollectionsInitialized = async () => {
  const paths = [
    COLLECTIONS.ATTENDANCE,
    COLLECTIONS.FEES,
    COLLECTIONS.VEHICLES,
    COLLECTIONS.ATTENTION
  ];

  const snapshots = await Promise.all(
    paths.map((path) => get(child(ref(rtdb), path)))
  );

  const updates: Record<string, boolean> = {};
  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists()) {
      updates[`${paths[index]}/${PLACEHOLDER_KEY}`] = true;
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(rtdb), updates);
  }
};

export class TransportDataService {
  // --- Students ---
  static async getStudents(): Promise<Student[]> {
    await ensureCollectionsInitialized();
    const students = await getCollectionArray<Omit<Student, 'id'>>(COLLECTIONS.STUDENTS);

    if (students.length === 0) {
      const updates: Record<string, unknown> = {};

      DEFAULT_STUDENTS.forEach((student) => {
        const studentId = push(ref(rtdb, COLLECTIONS.STUDENTS)).key;
        if (!studentId) return;

        updates[`${COLLECTIONS.STUDENTS}/${studentId}`] = { ...student, createdAt: today() };
        const destination: DestinationRecord = {
          studentId,
          pickupPoint: 'Pollachi',
          dropPoint: 'Poosaripatti',
          routeName: 'ROUTE-01',
          distance: 14
        };
        updates[`${COLLECTIONS.DESTINATIONS}/${studentId}`] = destination;
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(rtdb), updates);
      }

      return this.getStudents();
    }

    return students;
  }

  static async addStudent(data: Omit<Student, 'id' | 'createdAt'>): Promise<void> {
    const studentRef = push(ref(rtdb, COLLECTIONS.STUDENTS));
    await set(studentRef, { ...data, createdAt: today() });
  }

  static async updateStudent(id: string, updatesData: Partial<Student>): Promise<void> {
    await update(ref(rtdb, `${COLLECTIONS.STUDENTS}/${id}`), stripId(updatesData));
  }

  static async deleteStudent(id: string): Promise<void> {
    const [fees, attendance] = await Promise.all([
      getCollectionArray<Omit<FeesRecord, 'id'>>(COLLECTIONS.FEES),
      getCollectionArray<Omit<AttendanceRecord, 'id'>>(COLLECTIONS.ATTENDANCE)
    ]);

    const updates: Record<string, null> = {
      [`${COLLECTIONS.STUDENTS}/${id}`]: null,
      [`${COLLECTIONS.DESTINATIONS}/${id}`]: null
    };

    fees.filter((fee) => fee.studentId === id).forEach((fee) => {
      updates[`${COLLECTIONS.FEES}/${fee.id}`] = null;
    });

    attendance.filter((record) => record.studentId === id).forEach((record) => {
      updates[`${COLLECTIONS.ATTENDANCE}/${record.id}`] = null;
    });

    await update(ref(rtdb), updates);
  }

  // --- Fees ---
  static async getFees(): Promise<FeesRecord[]> {
    return getCollectionArray<Omit<FeesRecord, 'id'>>(COLLECTIONS.FEES);
  }

  static async addFee(data: Omit<FeesRecord, 'id' | 'createdAt'>): Promise<void> {
    const feeRef = push(ref(rtdb, COLLECTIONS.FEES));
    await set(feeRef, { ...data, createdAt: today() });
  }

  static async updateFee(id: string, updatesData: Partial<FeesRecord>): Promise<void> {
    await update(ref(rtdb, `${COLLECTIONS.FEES}/${id}`), stripId(updatesData));
  }

  static async deleteFee(id: string): Promise<void> {
    await remove(ref(rtdb, `${COLLECTIONS.FEES}/${id}`));
  }

  // --- Attendance ---
  static async getAllAttendance(): Promise<AttendanceRecord[]> {
    return getCollectionArray<Omit<AttendanceRecord, 'id'>>(COLLECTIONS.ATTENDANCE);
  }

  static async markAttendance(studentId: string, date: string, status: AttendanceStatus): Promise<void> {
    const attendance = await this.getAllAttendance();
    const existing = attendance.find((record) => record.studentId === studentId && record.date === date);

    if (existing) {
      await update(ref(rtdb, `${COLLECTIONS.ATTENDANCE}/${existing.id}`), { status });
      return;
    }

    const newRef = push(ref(rtdb, COLLECTIONS.ATTENDANCE));
    await set(newRef, { studentId, date, status });
  }

  static async saveAttendanceBatch(date: string, attendanceMap: Record<string, AttendanceStatus>): Promise<void> {
    const existing = await this.getAllAttendance();
    const updates: Record<string, unknown> = {};

    existing.filter((record) => record.date === date).forEach((record) => {
      updates[`${COLLECTIONS.ATTENDANCE}/${record.id}`] = null;
    });

    Object.entries(attendanceMap).forEach(([studentId, status]) => {
      const attendanceId = push(ref(rtdb, COLLECTIONS.ATTENDANCE)).key;
      if (!attendanceId) return;
      updates[`${COLLECTIONS.ATTENDANCE}/${attendanceId}`] = { studentId, date, status };
    });

    await update(ref(rtdb), updates);
  }

  static async deleteAttendance(id: string): Promise<void> {
    await remove(ref(rtdb, `${COLLECTIONS.ATTENDANCE}/${id}`));
  }

  // --- Maintenance ---
  static async getVehicles(): Promise<VehicleRecord[]> {
    return getCollectionArray<Omit<VehicleRecord, 'id'>>(COLLECTIONS.VEHICLES);
  }

  static async addVehicle(data: Omit<VehicleRecord, 'id' | 'createdAt'>): Promise<void> {
    const vehicleRef = push(ref(rtdb, COLLECTIONS.VEHICLES));
    await set(vehicleRef, { ...data, createdAt: today() });
  }

  static async updateVehicle(id: string, updatesData: Partial<VehicleRecord>): Promise<void> {
    await update(ref(rtdb, `${COLLECTIONS.VEHICLES}/${id}`), stripId(updatesData));
  }

  static async deleteVehicle(id: string): Promise<void> {
    await remove(ref(rtdb, `${COLLECTIONS.VEHICLES}/${id}`));
  }

  // --- Attention Messages ---
  static async getAttentionMessages(): Promise<AttentionMessage[]> {
    return getCollectionArray<Omit<AttentionMessage, 'id'>>(COLLECTIONS.ATTENTION);
  }

  static async addAttentionMessage(data: Omit<AttentionMessage, 'id'>): Promise<void> {
    const messageRef = push(ref(rtdb, COLLECTIONS.ATTENTION));
    await set(messageRef, data);
  }

  static async updateAttentionMessage(id: string, updatesData: Partial<AttentionMessage>): Promise<void> {
    await update(ref(rtdb, `${COLLECTIONS.ATTENTION}/${id}`), stripId(updatesData));
  }

  static async deleteAttentionMessage(id: string): Promise<void> {
    await remove(ref(rtdb, `${COLLECTIONS.ATTENTION}/${id}`));
  }

  // --- Destinations ---
  static async getAllDestinations(): Promise<DestinationRecord[]> {
    const snapshot = await get(child(ref(rtdb), COLLECTIONS.DESTINATIONS));
    if (!snapshot.exists()) return [];

    const data = snapshot.val() as Record<string, DestinationRecord>;
    return Object.values(data);
  }

  static async updateDestination(data: DestinationRecord): Promise<void> {
    await set(ref(rtdb, `${COLLECTIONS.DESTINATIONS}/${data.studentId}`), data);
  }

  static async getDataByDate(date: string): Promise<{
    fees: FeesRecord[];
    vehicles: VehicleRecord[];
    attendance: AttendanceRecord[];
  }> {
    const [fees, vehicles, attendance] = await Promise.all([
      this.getFees(),
      this.getVehicles(),
      this.getAllAttendance()
    ]);

    return {
      fees: fees.filter((item) => item.feeDate === date),
      vehicles: vehicles.filter((item) => item.createdAt === date),
      attendance: attendance.filter((item) => item.date === date)
    };
  }
}
