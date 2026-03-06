import { Injectable } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { AuthUser } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class StorageService {
  get accessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  }

  set accessToken(value: string | null) {
    if (value) {
      localStorage.setItem(STORAGE_KEYS.accessToken, value);
    } else {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
    }
  }

  get refreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  }

  set refreshToken(value: string | null) {
    if (value) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, value);
    } else {
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
    }
  }

  get user(): AuthUser | null {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  set user(value: AuthUser | null) {
    if (value) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(value));
    } else {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
  }
}
