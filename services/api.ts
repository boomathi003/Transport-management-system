
import { Student, FeesRecord } from '../types';
import { TransportDataService } from './dataService';

export const StudentApi = {
  async saveStudent(data: Omit<Student, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string; data?: Student }> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          if (!data.name || !data.registrationNumber || !data.seriesNumber) {
            resolve({ success: false, message: "Validation Error: Missing mandatory fields." });
            return;
          }
          await TransportDataService.addStudent(data);
          resolve({ success: true, message: "Student record successfully saved to SQL database." });
        } catch (error) {
          resolve({ success: false, message: "Server Error: Failed to process student record." });
        }
      }, 500);
    });
  },

  async updateStudent(id: string, data: Partial<Student>): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          // Updated: Registration Number, Department, and Series Number are now changeable per requirements
          if (!data.name) {
            resolve({ success: false, message: "Validation Error: Student name cannot be empty." });
            return;
          }

          await TransportDataService.updateStudent(id, data);
          resolve({ success: true, message: "Student record successfully updated in the SQL database." });
        } catch (error) {
          resolve({ success: false, message: "Server Error: Failed to update student record." });
        }
      }, 500);
    });
  },

  async fetchStudents(): Promise<Student[]> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        resolve(await TransportDataService.getStudents());
      }, 300);
    });
  }
};

export const FeesApi = {
  async saveFee(data: Omit<FeesRecord, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string; data?: FeesRecord }> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          if (!data.studentId || data.totalAmount <= 0) {
            resolve({ success: false, message: "Validation Failed: Student and Total Fee are required." });
            return;
          }

          // In a real backend, we check for a record on that specific feeDate
          const existing = (await TransportDataService.getFees()).find(f => 
            f.studentId === data.studentId && 
            f.feeType === data.feeType && 
            f.feeDate === data.feeDate
          );

          if (existing) {
            resolve({ success: false, message: "Error: A fee record already exists for this student on this date." });
            return;
          }

          let status = data.status;
          if (data.paidAmount >= data.totalAmount) status = 'Paid';
          else if (data.paidAmount > 0) status = 'Partially Paid';
          else status = 'Pending';

          const recordToSave = { ...data, status };
          await TransportDataService.addFee(recordToSave);

          resolve({ 
            success: true, 
            message: `Fees record successfully committed to SQL database.`,
            data: { ...recordToSave, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] }
          });
        } catch (error) {
          resolve({ success: false, message: "Backend Error: Database connection lost." });
        }
      }, 500);
    });
  },

  async updateFee(id: string, data: Partial<FeesRecord>): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          let status = data.status;
          if (data.totalAmount !== undefined && data.paidAmount !== undefined) {
             if (data.paidAmount >= data.totalAmount) status = 'Paid';
             else if (data.paidAmount > 0) status = 'Partially Paid';
             else status = 'Pending';
          }

          await TransportDataService.updateFee(id, { ...data, status });
          resolve({ success: true, message: "Fee record updated successfully in SQL database." });
        } catch (error) {
          resolve({ success: false, message: "Backend Error: Failed to update SQL record." });
        }
      }, 500);
    });
  },

  async fetchFees(): Promise<FeesRecord[]> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        resolve(await TransportDataService.getFees());
      }, 300);
    });
  }
};
