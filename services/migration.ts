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
import { rtdb } from './firebase';
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

const collectionHasDocs = async (name: string) => {
  const snap = await get(child(ref(rtdb), name));
  if (!snap.exists()) return false;

  const value = snap.val() as Record<string, unknown>;
  return Object.keys(value).some((key) => key !== PLACEHOLDER_KEY);
};

export const runLocalStorageMigration = async () => {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(STORAGE_KEYS.MIGRATED) === 'true') return;

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
      if (await collectionHasDocs('students')) return;
      const updates: Record<string, unknown> = {};
      students.forEach((student) => {
        const { id, ...rest } = student;
        updates[`students/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (attendance.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs('attendance')) return;
      const updates: Record<string, unknown> = {};
      attendance.forEach((record) => {
        const { id, ...rest } = record;
        updates[`attendance/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (fees.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs('fees')) return;
      const updates: Record<string, unknown> = {};
      fees.forEach((fee) => {
        const { id, ...rest } = fee;
        updates[`fees/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (vehicles.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs('vehicles')) return;
      const updates: Record<string, unknown> = {};
      vehicles.forEach((vehicle) => {
        const { id, ...rest } = vehicle;
        updates[`vehicles/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (attention.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs('attention')) return;
      const updates: Record<string, unknown> = {};
      attention.forEach((message) => {
        const { id, ...rest } = message;
        updates[`attention/${id}`] = rest;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (destinations.length > 0) {
    migrations.push((async () => {
      if (await collectionHasDocs('destinations')) return;
      const updates: Record<string, DestinationRecord> = {};
      destinations.forEach((destination) => {
        updates[`destinations/${destination.studentId}`] = destination;
      });
      await update(ref(rtdb), updates);
    })());
  }

  if (migrations.length === 0) {
    localStorage.setItem(STORAGE_KEYS.MIGRATED, 'true');
    return;
  }

  await Promise.all(migrations);
  localStorage.setItem(STORAGE_KEYS.MIGRATED, 'true');
};
