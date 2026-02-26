import {
  child,
  get,
  ref,
  update
} from 'firebase/database';
import {
  AttendanceRecord,
  AttentionMessage,
  DestinationRecord,
  FeesRecord,
  Student,
  VehicleRecord
} from '../types';
import { auth, rtdb } from './firebase';
const PLACEHOLDER_KEY = '__placeholder';
const SHARED_PUBLIC_UID = 'public_transport_workspace';

const STORAGE_KEYS = {
  STUDENTS: 'ctms_students',
  ATTENDANCE: 'ctms_attendance',
  FEES: 'ctms_fees',
  VEHICLES: 'ctms_vehicles',
  ATTENTION: 'ctms_attention',
  DESTINATIONS: 'ctms_destinations',
  MIGRATED: 'ctms_firestore_migrated_v2'
} as const;
const CACHE_KEY_PREFIX = 'ctms_cache_';
const CACHE_MIGRATION_KEY = 'ctms_cache_to_shared_migrated_v2';
const getCurrentUserId = () => (auth.currentUser ? SHARED_PUBLIC_UID : null);
const userRootPath = (uid: string) => `users/${uid}`;
const userCollectionPath = (uid: string, collection: string) => `${userRootPath(uid)}/${collection}`;
const getMigrationKey = (uid: string) => `${STORAGE_KEYS.MIGRATED}_${uid}`;
const getRootMigrationKey = (uid: string) => `${STORAGE_KEYS.MIGRATED}_root_${uid}`;
const COLLECTIONS = ['students', 'attendance', 'fees', 'vehicles', 'attention', 'destinations'] as const;

const readLocal = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readLegacyCacheCollection = <T>(collection: string): T[] => {
  const all: T[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith(CACHE_KEY_PREFIX)) continue;
    if (!key.endsWith(`_${collection}`)) continue;
    all.push(...readLocal<T>(key));
  }
  return all;
};

const collectionHasDocs = async (uid: string, name: string) => {
  const snap = await get(child(ref(rtdb), userCollectionPath(uid, name)));
  if (!snap.exists()) return false;

  const value = snap.val() as Record<string, unknown>;
  return Object.keys(value).some((key) => key !== PLACEHOLDER_KEY);
};

const userHasAnyData = async (uid: string) => {
  const checks = await Promise.all(COLLECTIONS.map((name) => collectionHasDocs(uid, name)));
  return checks.some(Boolean);
};

const migrateRootDataToUser = async (uid: string) => {
  const updates: Record<string, unknown> = {};

  const rootSnapshots = await Promise.all(
    COLLECTIONS.map((name) => get(child(ref(rtdb), name)))
  );

  rootSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists()) return;
    const name = COLLECTIONS[index];
    const data = snapshot.val() as Record<string, unknown>;
    if (!data || typeof data !== 'object') return;

    Object.entries(data).forEach(([id, value]) => {
      updates[`${userCollectionPath(uid, name)}/${id}`] = value;
    });
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(rtdb), updates);
  }
};

export const runLocalStorageMigration = async () => {
  if (typeof window === 'undefined') return;
  const uid = getCurrentUserId();
  if (!uid) return;
  const migrationKey = getMigrationKey(uid);
  const rootMigrationKey = getRootMigrationKey(uid);

  if (localStorage.getItem(rootMigrationKey) !== 'true') {
    const hasUserData = await userHasAnyData(uid);
    if (!hasUserData) {
      try {
        await migrateRootDataToUser(uid);
      } catch {
        // Root migration may fail under strict rules; safe to continue.
      }
    }
    localStorage.setItem(rootMigrationKey, 'true');
  }

  if (localStorage.getItem(migrationKey) === 'true') return;

  const shouldImportLegacyCache = localStorage.getItem(CACHE_MIGRATION_KEY) !== 'true';

  const [students, attendance, fees, vehicles, attention, destinations] = [
    readLocal<Student>(STORAGE_KEYS.STUDENTS),
    readLocal<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE),
    readLocal<FeesRecord>(STORAGE_KEYS.FEES),
    readLocal<VehicleRecord>(STORAGE_KEYS.VEHICLES),
    readLocal<AttentionMessage>(STORAGE_KEYS.ATTENTION),
    readLocal<DestinationRecord>(STORAGE_KEYS.DESTINATIONS)
  ];

  const mergeMissingById = async <T extends { id?: string }>(
    collection: string,
    records: T[]
  ) => {
    if (records.length === 0) return;
    const snapshot = await get(child(ref(rtdb), userCollectionPath(uid, collection)));
    const existing = snapshot.exists()
      ? (snapshot.val() as Record<string, unknown>)
      : {};
    const updates: Record<string, unknown> = {};

    records.forEach((raw) => {
      const record = raw as Record<string, unknown> & { id?: string };
      const recordId = record.id;
      if (!recordId || recordId === PLACEHOLDER_KEY) return;
      if (existing[recordId] !== undefined) return;
      const { id, ...rest } = record;
      updates[`${userCollectionPath(uid, collection)}/${recordId}`] = rest;
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(rtdb), updates);
    }
  };

  const mergeMissingDestinations = async (records: DestinationRecord[]) => {
    if (records.length === 0) return;
    const snapshot = await get(child(ref(rtdb), userCollectionPath(uid, 'destinations')));
    const existing = snapshot.exists()
      ? (snapshot.val() as Record<string, unknown>)
      : {};
    const updates: Record<string, DestinationRecord> = {};

    records.forEach((destination) => {
      if (!destination.studentId) return;
      if (existing[destination.studentId] !== undefined) return;
      updates[`${userCollectionPath(uid, 'destinations')}/${destination.studentId}`] = destination;
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(rtdb), updates);
    }
  };

  const localStudents = shouldImportLegacyCache
    ? [...students, ...readLegacyCacheCollection<Student>('students')]
    : students;
  const localAttendance = shouldImportLegacyCache
    ? [...attendance, ...readLegacyCacheCollection<AttendanceRecord>('attendance')]
    : attendance;
  const localFees = shouldImportLegacyCache
    ? [...fees, ...readLegacyCacheCollection<FeesRecord>('fees')]
    : fees;
  const localVehicles = shouldImportLegacyCache
    ? [...vehicles, ...readLegacyCacheCollection<VehicleRecord>('vehicles')]
    : vehicles;
  const localAttention = shouldImportLegacyCache
    ? [...attention, ...readLegacyCacheCollection<AttentionMessage>('attention')]
    : attention;
  const localDestinations = shouldImportLegacyCache
    ? [...destinations, ...readLegacyCacheCollection<DestinationRecord>('destinations')]
    : destinations;

  const migrations: Array<Promise<void>> = [
    mergeMissingById('students', localStudents),
    mergeMissingById('attendance', localAttendance),
    mergeMissingById('fees', localFees),
    mergeMissingById('vehicles', localVehicles),
    mergeMissingById('attention', localAttention),
    mergeMissingDestinations(localDestinations)
  ];

  if (migrations.length === 0) {
    localStorage.setItem(migrationKey, 'true');
    return;
  }

  await Promise.all(migrations);
  if (shouldImportLegacyCache) {
    localStorage.setItem(CACHE_MIGRATION_KEY, 'true');
  }
  localStorage.setItem(migrationKey, 'true');
};
