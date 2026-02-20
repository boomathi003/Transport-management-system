import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyD_pBK-HHZZlq26TO-oxyqluVWIeUZbRI4',
  authDomain: 'transport-management-sys-d6020.firebaseapp.com',
  projectId: 'transport-management-sys-d6020',
  storageBucket: 'transport-management-sys-d6020.firebasestorage.app',
  messagingSenderId: '485358663460',
  appId: '1:485358663460:web:dde48bfe59e0a782d365b1',
  measurementId: 'G-91W8PD7KT1',
  databaseURL: 'https://transport-management-sys-d6020-default-rtdb.firebaseio.com/'
};

export const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export let analytics: Analytics | null = null;

googleProvider.setCustomParameters({ prompt: 'select_account' });

if (typeof window !== 'undefined') {
  void isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
