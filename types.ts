
export type AttendanceStatus = 'Present' | 'Absent';
export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';
export type Priority = 'Low' | 'Medium' | 'High';
export type FeeType = 'Tuition' | 'Transport' | 'Other';

export interface Student {
  id: string;
  name: string;
  registrationNumber: string;
  seriesNumber: string;
  department: string;
  academicYear: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
}

export interface FeesRecord {
  id: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  feeType: FeeType;
  paymentDate: string;
  dueDate: string;
  feeDate: string; // The date this fee record belongs to
  status: PaymentStatus;
  createdAt: string;
}

export interface VehicleRecord {
  id: string;
  // 1. Basic Details
  busNumber: string;
  driverName: string;
   staffName?: string; // new
  driverContact: string;

  // 2. Document & Expiry Details
  insuranceDate: string;
  insuranceDueDate: string;
  fcDate: string;
  fcDueDate: string;
  pollutionDate: string;
  pollutionDueDate: string;
  stickerDate: string;
  stickerDueDate: string;
  fireExtinguisherDate: string;
  fireExtinguisherDueDate: string;
  firstAidBoxDate: string;
  firstAidBoxDueDate: string;

  // 3. Maintenance Details
  vehicleOilKM: number;
  vehicleOilDate: string;
  engineOilKM: number;
  engineOilDate: string;
  brakeOilKM: number;
  brakeOilDate: string;
  steeringOilKM: number;
  steeringOilDate: string;
  airCheckDate: string;
  greaseCheckDate: string;

  // 4. Tyre Details
  tyre1Number: string;
  tyre2Number: string;

  // 5. Diesel & Usage Details
  dieselFillingDate: string;
  dieselKMReading: number;
  previousDieselKM: number;
  kmCalculation: number; // KM Used
  stack: string;
  usage: string;

  createdAt: string;
}

export interface AttentionMessage {
  id: string;
  title: string;
  message: string;
  date: string;
  priority: Priority;
}

export interface DestinationRecord {
  studentId: string;
  pickupPoint: string;
  dropPoint: string;
  routeName: string;
  distance: number;
}

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  ATTENDANCE = 'ATTENDANCE',
  FEES = 'FEES',
  MAINTENANCE = 'MAINTENANCE',
  DAILY_LOG = 'DAILY_LOG',
  DESTINATIONS = 'DESTINATIONS'
}
