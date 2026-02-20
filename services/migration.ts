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

const STORAGE_KEYS = {
  STUDENTS: 'ctms_students',
  ATTENDANCE: 'ctms_attendance',
  FEES: 'ctms_fees',
  VEHICLES: 'ctms_vehicles',
  ATTENTION: 'ctms_attention',
  DESTINATIONS: 'ctms_destinations',
  MIGRATED: 'ctms_firestore_migrated'
} as const;
const getCurrentUserId = () => auth.currentUser?.uid ?? null;
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

  const [students, attendance, fees, vehicles, attention, destinations] = [
    readLocal<Student>(STORAGE_KEYS.STUDENTS),
    readLocal<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE),
    readLocal<FeesRecord>(STORAGE_KEYS.FEES),
    readLocal<VehicleRecord>(STORAGE_KEYS.VEHICLES),
    readLocal<AttentionMessage>(STORAGE_KEYS.ATTENTION),
    readLocal<DestinationRecord>(STORAGE_KEYS.DESTINATIONS)
  ];

  const migrations: Array<Promise<void>> = [];

  if (students.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs(uid, 'students')) return;
      const updates: Record<string, unknown> = {};
      students.forEach((student) => {
        const { id, ...rest } = student;
        updates[`${userCollectionPath(uid, 'students')}/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (attendance.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs(uid, 'attendance')) return;
      const updates: Record<string, unknown> = {};
      attendance.forEach((record) => {
        const { id, ...rest } = record;
        updates[`${userCollectionPath(uid, 'attendance')}/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (fees.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs(uid, 'fees')) return;
      const updates: Record<string, unknown> = {};
      fees.forEach((fee) => {
        const { id, ...rest } = fee;
        updates[`${userCollectionPath(uid, 'fees')}/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (vehicles.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs(uid, 'vehicles')) return;
      const updates: Record<string, unknown> = {};
      vehicles.forEach((vehicle) => {
        const { id, ...rest } = vehicle;
        updates[`${userCollectionPath(uid, 'vehicles')}/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (attention.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs(uid, 'attention')) return;
      const updates: Record<string, unknown> = {};
      attention.forEach((message) => {
        const { id, ...rest } = message;
        updates[`${userCollectionPath(uid, 'attention')}/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (destinations.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs(uid, 'destinations')) return;
      const updates: Record<string, DestinationRecord> = {};
      destinations.forEach((destination) => {
        updates[`${userCollectionPath(uid, 'destinations')}/${destination.studentId}`] = destination;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (migrations.length === 0) {
    localStorage.setItem(migrationKey, 'true');
    return;
  }

  await Promise.all(migrations);
  localStorage.setItem(migrationKey, 'true');
};
