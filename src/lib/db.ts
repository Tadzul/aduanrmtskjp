/// <reference types="vite/client" />
import localforage from 'localforage';
import { format } from 'date-fns';

// Configure localforage
localforage.config({
  name: 'eAduanRMT',
  storeName: 'aduan_data',
  description: 'Offline storage for e-Aduan RMT'
});

export type Role = 'Admin' | 'Guru';

export interface User {
  id: string;
  name: string;
  role: Role;
  username: string;
  password?: string;
}

export type AduanStatus = 'Belum Diambil' | 'Dalam Tindakan' | 'Selesai';

export interface Aduan {
  id: string;
  noAduan: string;
  guruId: string;
  namaPelapor?: string;
  tarikh: string; // ISO Date String
  masa: string; // HH:mm format
  lokasi: string;
  pengusaha: string;
  jenisAduan: string[];
  lainLainJenis?: string;
  keterangan: string;
  gambarIds: string[]; // references to images
  tindakanSusulan: string;
  lainLainTindakan?: string;
  status: AduanStatus;
  tandatangan?: string; // Base64 or ID
  createdAt: number;
}

export interface Gambar {
  id: string;
  aduanId: string;
  base64: string;
  filename?: string;
}

// Simulated Initial Data
const initialUsers: User[] = [
  { id: 'u1', name: 'Pentadbir (Guru Besar / PKHEM)', role: 'Admin', username: 'admin', password: '5315' },
  { id: 'u2', name: 'Guru', role: 'Guru', username: 'guru', password: 'aba2051' }
];

export const db = {
  async init() {
    const initialized = await localforage.getItem('initialized');
    if (!initialized) {
      await localforage.setItem('aduan', []);
      await localforage.setItem('gambar', []);
      await localforage.setItem('settings', {});
      await localforage.setItem('aduan_counter', 1);
      await localforage.setItem('initialized', true);
    }
    // Always update users to ensure correct credentials in demo
    await localforage.setItem('users', initialUsers);
  },

  async getUsers(): Promise<User[]> {
    return await localforage.getItem<User[]>('users') || [];
  },

  async saveAduanComplete(aduan: Omit<Aduan, 'noAduan'>, images: Gambar[]): Promise<Aduan> {
    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz7_KiYdVZdkJynd8uITGb4-T9Q8TJNsqKvzoIR4WP8hgkKQuu00_wOyQEEJfYym8_J/exec';

    // First save to localforage to have offline support/fallback
    const savedAduan = await this.saveAduan(aduan);
    for (const img of images) {
      await this.saveGambar({ ...img, aduanId: savedAduan.id });
    }

    if (appsScriptUrl) {
      try {
        const payload = {
          action: 'saveAduan',
          data: {
            ...savedAduan,
            images: images.map(img => ({ base64: img.base64 }))
          }
        };
        
        await fetch(appsScriptUrl, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.error('Failed to sync to Google Sheets:', e);
      }
    }

    return savedAduan;
  },

  async getAduan(): Promise<Aduan[]> {
    const localData = await localforage.getItem<Aduan[]>('aduan') || [];
    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz7_KiYdVZdkJynd8uITGb4-T9Q8TJNsqKvzoIR4WP8hgkKQuu00_wOyQEEJfYym8_J/exec';
    let merged = [...localData];

    if (appsScriptUrl) {
      try {
        const res = await fetch(`${appsScriptUrl}?action=getAduan`);
        const json = await res.json();
        if (json.success && json.data) {
          const gasData = json.data as Aduan[];
          let updated = false;
          for (const item of gasData) {
            const exists = merged.find(a => a.id === item.id);
            if (!exists) {
              merged.push(item);
              updated = true;
            }
          }
          if (updated) {
            await localforage.setItem('aduan', merged);
          }
        }
      } catch (e) {
        console.error('Failed to fetch from Google Sheets:', e);
      }
    }
    
    // Filter out soft-deleted items
    return merged.filter((a: any) => !a.deleted);
  },

  async getAduanById(id: string): Promise<Aduan | null> {
    const aduans = await this.getAduan();
    return aduans.find(a => a.id === id) || null;
  },

  async saveAduan(aduan: Omit<Aduan, 'noAduan'>): Promise<Aduan> {
    const localData = await localforage.getItem<Aduan[]>('aduan') || [];
    
    // Generate No Aduan if new
    let noAduan = (aduan as Aduan).noAduan;
    if (!noAduan) {
      const counter = await localforage.getItem<number>('aduan_counter') || 1;
      const year = new Date().getFullYear();
      noAduan = `RMT-${year}-${counter.toString().padStart(5, '0')}`;
      await localforage.setItem('aduan_counter', counter + 1);
    }

    const newAduan = { ...aduan, noAduan } as Aduan;
    
    const existingIndex = localData.findIndex(a => a.id === newAduan.id);
    if (existingIndex > -1) {
      localData[existingIndex] = newAduan;
    } else {
      localData.push(newAduan);
    }
    
    await localforage.setItem('aduan', localData);

    // Sync simple edit to GAS if appsScriptUrl exists
    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz7_KiYdVZdkJynd8uITGb4-T9Q8TJNsqKvzoIR4WP8hgkKQuu00_wOyQEEJfYym8_J/exec';
    if (appsScriptUrl && existingIndex > -1) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'saveAduan',
            data: newAduan // Images aren't sent here because it's just a status/text edit
          }),
        });
      } catch (e) {
        console.error('Failed to sync edit to Google Sheets:', e);
      }
    }

    return newAduan;
  },

  async deleteAduan(id: string): Promise<void> {
    const localData = await localforage.getItem<Aduan[]>('aduan') || [];
    const index = localData.findIndex(a => a.id === id);
    if (index > -1) {
      (localData[index] as any).deleted = true;
      await localforage.setItem('aduan', localData);
    } else {
      // If it's not in localData yet, add a stub so GAS merge doesn't resurrect it
      localData.push({ id, deleted: true } as any);
      await localforage.setItem('aduan', localData);
    }

    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz7_KiYdVZdkJynd8uITGb4-T9Q8TJNsqKvzoIR4WP8hgkKQuu00_wOyQEEJfYym8_J/exec';
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'deleteAduan', // In case GAS supports it
            data: { id }
          }),
        });
      } catch (e) {
        console.error('Failed to sync delete to Google Sheets:', e);
      }
    }
  },

  async getGambarByAduanId(aduanId: string): Promise<Gambar[]> {
    const gambars = await localforage.getItem<Gambar[]>('gambar') || [];
    return gambars.filter(g => g.aduanId === aduanId);
  },

  async saveGambar(gambar: Gambar): Promise<void> {
    const gambars = await localforage.getItem<Gambar[]>('gambar') || [];
    const existingIndex = gambars.findIndex(g => g.id === gambar.id);
    if (existingIndex > -1) {
      gambars[existingIndex] = gambar;
    } else {
      gambars.push(gambar);
    }
    await localforage.setItem('gambar', gambars);
  },

  async deleteGambar(id: string): Promise<void> {
    const gambars = await localforage.getItem<Gambar[]>('gambar') || [];
    await localforage.setItem('gambar', gambars.filter(g => g.id !== id));
  }
};
