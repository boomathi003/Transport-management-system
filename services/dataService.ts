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
import { auth, rtdb } from './firebase';

const COLLECTIONS = {
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  FEES: 'fees',
  VEHICLES: 'vehicles',
  ATTENTION: 'attention',
  DESTINATIONS: 'destinations'
} as const;
const PLACEHOLDER_KEY = '__placeholder';

const today = () => new Date().toISOString().split('T')[0];
const SHARED_PUBLIC_UID = 'public_transport_workspace';
const legacyMigrationKey = (uid: string) => `ctms_anon_shared_migrated_${uid}`;
const getCurrentUserId = () => {
  // All sessions (Google + anonymous) use one shared workspace.
  return SHARED_PUBLIC_UID;
};

const userRootPath = () => `users/${getCurrentUserId()}`;
const userCollectionPath = (collection: string) => `${userRootPath()}/${collection}`;
const userDocumentPath = (collection: string, id: string) => `${userCollectionPath(collection)}/${id}`;
const cacheKey = (collection: string) => `ctms_cache_${getCurrentUserId()}_${collection}`;
const queueKey = () => `ctms_write_queue_${getCurrentUserId()}`;

type QueueOperation =
  | { type: 'set'; path: string; data: unknown }
  | { type: 'update'; path: string; data: Record<string, unknown> }
  | { type: 'remove'; path: string };

const stripId = <T extends { id?: string }>(data: T) => {
  const { id, ...rest } = data;
  return rest;
};

const readCache = <T>(collection: string): T[] => {
  try {
    const raw = localStorage.getItem(cacheKey(collection));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const writeCache = <T>(collection: string, data: T[]) => {
  try {
    localStorage.setItem(cacheKey(collection), JSON.stringify(data));
  } catch {
    // Ignore quota/storage errors.
  }
};

const removeFromCacheById = (collection: string, id: string) => {
  const existing = readCache<Record<string, unknown> & { id: string }>(collection);
  writeCache(collection, existing.filter((item) => item.id !== id));
};

const removeFromCacheByStudentId = (collection: string, studentId: string) => {
  const existing = readCache<Record<string, unknown> & { studentId?: string }>(collection);
  writeCache(collection, existing.filter((item) => item.studentId !== studentId));
};

const readQueue = (): QueueOperation[] => {
  try {
    const raw = localStorage.getItem(queueKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueueOperation[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (ops: QueueOperation[]) => {
  try {
    localStorage.setItem(queueKey(), JSON.stringify(ops));
  } catch {
    // Ignore local storage failures.
  }
};

const pushQueue = (op: QueueOperation) => {
  writeQueue([...readQueue(), op]);
};

const queueAwareSet = async (path: string, data: unknown) => {
  try {
    await set(ref(rtdb, path), data);
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      pushQueue({ type: 'set', path, data });
      return;
    }
    throw error;
  }
};

const queueAwareUpdate = async (path: string, data: Record<string, unknown>) => {
  try {
    await update(ref(rtdb, path), data);
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      pushQueue({ type: 'update', path, data });
      return;
    }
    throw error;
  }
};

const queueAwareRemove = async (path: string) => {
  try {
    await remove(ref(rtdb, path));
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      pushQueue({ type: 'remove', path });
      return;
    }
    throw error;
  }
};

const queueAwareUserUpdate = async (updates: Record<string, unknown>) => {
  await queueAwareUpdate(userRootPath(), updates);
};

const getCollectionMap = async <T>(collection: string): Promise<Record<string, T>> => {
  const snapshot = await get(child(ref(rtdb), userCollectionPath(collection)));
  if (!snapshot.exists()) return {};
  return (snapshot.val() as Record<string, T>) ?? {};
};

const migrateLegacyUserDataToSharedWorkspace = async () => {
  const user = auth.currentUser;
  if (!user?.uid) return;
  if (user.uid === SHARED_PUBLIC_UID) return;

  const migrationKey = legacyMigrationKey(user.uid);
  if (localStorage.getItem(migrationKey) === '1') return;

  const collections = Object.values(COLLECTIONS);
  const updates: Record<string, unknown> = {};

  for (const collection of collections) {
    const [legacySnapshot, sharedSnapshot] = await Promise.all([
      get(child(ref(rtdb), `users/${user.uid}/${collection}`)),
      get(child(ref(rtdb), `users/${SHARED_PUBLIC_UID}/${collection}`))
    ]);

    if (!legacySnapshot.exists()) continue;

    const legacyData = (legacySnapshot.val() as Record<string, unknown>) ?? {};
    const sharedData = (sharedSnapshot.val() as Record<string, unknown>) ?? {};

    Object.entries(legacyData).forEach(([id, value]) => {
      if (id === PLACEHOLDER_KEY) return;
      if (sharedData[id] !== undefined) return;
      updates[`${collection}/${id}`] = value;
    });
  }

  if (Object.keys(updates).length > 0) {
    await queueAwareUpdate(`users/${SHARED_PUBLIC_UID}`, updates);
  }

  localStorage.setItem(migrationKey, '1');
};

const getCollectionArray = async <T>(collection: string): Promise<Array<T & { id: string }>> => {
  try {
    const data = await getCollectionMap<T>(collection);
    const records = Object.entries(data)
      .filter(([id]) => id !== PLACEHOLDER_KEY)
      .map(([id, value]) => ({ id, ...(value as T) }));
    writeCache(collection, records);
    return records;
  } catch {
    return readCache<T & { id: string }>(collection);
  }
};

const ensureCollectionsInitialized = async () => {
  await migrateLegacyUserDataToSharedWorkspace();

  const paths = [
    COLLECTIONS.ATTENDANCE,
    COLLECTIONS.FEES,
    COLLECTIONS.VEHICLES,
    COLLECTIONS.ATTENTION
  ];

  const snapshots = await Promise.all(
    paths.map((path) => get(child(ref(rtdb), userCollectionPath(path))))
  );

  const updates: Record<string, boolean> = {};
  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists()) {
      updates[`${paths[index]}/${PLACEHOLDER_KEY}`] = true;
    }
  });

  if (Object.keys(updates).length > 0) {
    await queueAwareUserUpdate(updates);
  }
};

export class TransportDataService {
  static async initializeWorkspace(): Promise<void> {
    await ensureCollectionsInitialized();
  }

  static async flushOfflineQueue(): Promise<number> {
    const queued = readQueue();
    if (!queued.length) return 0;

    const remaining: QueueOperation[] = [];
    for (const op of queued) {
      try {
        if (op.type === 'set') {
          await set(ref(rtdb, op.path), op.data);
        } else if (op.type === 'update') {
          await update(ref(rtdb, op.path), op.data);
        } else {
          await remove(ref(rtdb, op.path));
        }
      } catch {
        remaining.push(op);
      }
    }
    writeQueue(remaining);
    return queued.length - remaining.length;
  }

  // --- Students ---
  static async getStudents(): Promise<Student[]> {
    try {
      await ensureCollectionsInitialized();
    } catch {
      // Ignore init failure (offline / temporary network issues).
    }
    const students = await getCollectionArray<Omit<Student, 'id'>>(COLLECTIONS.STUDENTS);

    return students;
  }

  static async addStudent(data: Omit<Student, 'id' | 'createdAt'>): Promise<string | null> {
    const studentRef = push(ref(rtdb, userCollectionPath(COLLECTIONS.STUDENTS)));
    if (!studentRef.key) return null;
    await queueAwareSet(`${userCollectionPath(COLLECTIONS.STUDENTS)}/${studentRef.key}`, { ...data, createdAt: today() });
    return studentRef.key;
  }

  static async updateStudent(id: string, updatesData: Partial<Student>): Promise<void> {
    await queueAwareUpdate(userDocumentPath(COLLECTIONS.STUDENTS, id), stripId(updatesData) as Record<string, unknown>);
  }

  static async deleteStudent(id: string): Promise<void> {
    removeFromCacheById(COLLECTIONS.STUDENTS, id);
    removeFromCacheById(COLLECTIONS.DESTINATIONS, id);
    removeFromCacheByStudentId(COLLECTIONS.FEES, id);
    removeFromCacheByStudentId(COLLECTIONS.ATTENDANCE, id);

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

    await queueAwareUserUpdate(updates);
  }

  // --- Fees ---
  static async getFees(): Promise<FeesRecord[]> {
    return getCollectionArray<Omit<FeesRecord, 'id'>>(COLLECTIONS.FEES);
  }

  static async addFee(data: Omit<FeesRecord, 'id' | 'createdAt'>): Promise<void> {
    const feeRef = push(ref(rtdb, userCollectionPath(COLLECTIONS.FEES)));
    if (!feeRef.key) return;
    await queueAwareSet(`${userCollectionPath(COLLECTIONS.FEES)}/${feeRef.key}`, { ...data, createdAt: today() });
  }

  static async updateFee(id: string, updatesData: Partial<FeesRecord>): Promise<void> {
    await queueAwareUpdate(userDocumentPath(COLLECTIONS.FEES, id), stripId(updatesData) as Record<string, unknown>);
  }

  static async deleteFee(id: string): Promise<void> {
    removeFromCacheById(COLLECTIONS.FEES, id);
    await queueAwareRemove(userDocumentPath(COLLECTIONS.FEES, id));
  }

  // --- Attendance ---
  static async getAllAttendance(): Promise<AttendanceRecord[]> {
    return getCollectionArray<Omit<AttendanceRecord, 'id'>>(COLLECTIONS.ATTENDANCE);
  }

  static async markAttendance(studentId: string, date: string, status: AttendanceStatus): Promise<void> {
    const attendance = await this.getAllAttendance();
    const existing = attendance.find((record) => record.studentId === studentId && record.date === date);

    if (existing) {
      await queueAwareUpdate(userDocumentPath(COLLECTIONS.ATTENDANCE, existing.id), { status });
      return;
    }

    const newRef = push(ref(rtdb, userCollectionPath(COLLECTIONS.ATTENDANCE)));
    if (!newRef.key) return;
    await queueAwareSet(`${userCollectionPath(COLLECTIONS.ATTENDANCE)}/${newRef.key}`, { studentId, date, status });
  }

  static async saveAttendanceBatch(date: string, attendanceMap: Record<string, AttendanceStatus>): Promise<void> {
    const existing = await this.getAllAttendance();
    const updates: Record<string, unknown> = {};

    existing.filter((record) => record.date === date).forEach((record) => {
      updates[`${COLLECTIONS.ATTENDANCE}/${record.id}`] = null;
    });

    Object.entries(attendanceMap).forEach(([studentId, status]) => {
      const attendanceId = push(ref(rtdb, userCollectionPath(COLLECTIONS.ATTENDANCE))).key;
      if (!attendanceId) return;
      updates[`${COLLECTIONS.ATTENDANCE}/${attendanceId}`] = { studentId, date, status };
    });

    await queueAwareUserUpdate(updates);
  }

  static async deleteAttendance(id: string): Promise<void> {
    removeFromCacheById(COLLECTIONS.ATTENDANCE, id);
    await queueAwareRemove(userDocumentPath(COLLECTIONS.ATTENDANCE, id));
  }

  // --- Maintenance ---
  static async getVehicles(): Promise<VehicleRecord[]> {
    return getCollectionArray<Omit<VehicleRecord, 'id'>>(COLLECTIONS.VEHICLES);
  }

  static async addVehicle(data: Omit<VehicleRecord, 'id' | 'createdAt'>): Promise<void> {
    const vehicleRef = push(ref(rtdb, userCollectionPath(COLLECTIONS.VEHICLES)));
    if (!vehicleRef.key) return;
    await queueAwareSet(`${userCollectionPath(COLLECTIONS.VEHICLES)}/${vehicleRef.key}`, { ...data, createdAt: today() });
  }

  static async updateVehicle(id: string, updatesData: Partial<VehicleRecord>): Promise<void> {
    await queueAwareUpdate(userDocumentPath(COLLECTIONS.VEHICLES, id), stripId(updatesData) as Record<string, unknown>);
  }

  static async deleteVehicle(id: string): Promise<void> {
    removeFromCacheById(COLLECTIONS.VEHICLES, id);
    await queueAwareRemove(userDocumentPath(COLLECTIONS.VEHICLES, id));
  }

  // --- Attention Messages ---
  static async getAttentionMessages(): Promise<AttentionMessage[]> {
    return getCollectionArray<Omit<AttentionMessage, 'id'>>(COLLECTIONS.ATTENTION);
  }

  static async addAttentionMessage(data: Omit<AttentionMessage, 'id'>): Promise<void> {
    const messageRef = push(ref(rtdb, userCollectionPath(COLLECTIONS.ATTENTION)));
    if (!messageRef.key) return;
    await queueAwareSet(`${userCollectionPath(COLLECTIONS.ATTENTION)}/${messageRef.key}`, data);
  }

  static async updateAttentionMessage(id: string, updatesData: Partial<AttentionMessage>): Promise<void> {
    await queueAwareUpdate(userDocumentPath(COLLECTIONS.ATTENTION, id), stripId(updatesData) as Record<string, unknown>);
  }

  static async deleteAttentionMessage(id: string): Promise<void> {
    removeFromCacheById(COLLECTIONS.ATTENTION, id);
    await queueAwareRemove(userDocumentPath(COLLECTIONS.ATTENTION, id));
  }

  // --- Destinations ---
  static async getAllDestinations(): Promise<DestinationRecord[]> {
    try {
      const snapshot = await get(child(ref(rtdb), userCollectionPath(COLLECTIONS.DESTINATIONS)));
      if (!snapshot.exists()) {
        writeCache(COLLECTIONS.DESTINATIONS, []);
        return [];
      }

      const data = snapshot.val() as Record<string, DestinationRecord>;
      const destinations = Object.values(data);
      writeCache(COLLECTIONS.DESTINATIONS, destinations);
      return destinations;
    } catch {
      return readCache<DestinationRecord>(COLLECTIONS.DESTINATIONS);
    }
  }

  static async updateDestination(data: DestinationRecord): Promise<void> {
    await queueAwareSet(userDocumentPath(COLLECTIONS.DESTINATIONS, data.studentId), data);
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
