// src/app/services/state-persistence.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface PersistedState {
  key: string;
  data: any;
  timestamp: Date;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class StatePresistanceService {
  private readonly STORAGE_PREFIX = 'mapper_builder_';
  private readonly CURRENT_VERSION = '1.0.0';
  private autosaveEnabled$ = new BehaviorSubject<boolean>(true);
  private autosaveInterval = 30000; // 30 seconds
  private autosaveTimer: any;

  constructor() {
    this.initializeAutosave();
  }

  // Save state to localStorage
  saveState(key: string, data: any): boolean {
    try {
      const persistedState: PersistedState = {
        key,
        data,
        timestamp: new Date(),
        version: this.CURRENT_VERSION
      };

      const serialized = JSON.stringify(persistedState);
      localStorage.setItem(this.STORAGE_PREFIX + key, serialized);

      return true;
    } catch (error) {
      console.error('Failed to save state:', error);
      return false;
    }
  }

  // Load state from localStorage
  loadState(key: string): any | null {
    try {
      const item = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!item) return null;

      const persistedState: PersistedState = JSON.parse(item);

      // Check version compatibility
      if (!this.isVersionCompatible(persistedState.version)) {
        console.warn('Incompatible state version, skipping load');
        return null;
      }

      return persistedState.data;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }

  // Delete saved state
  deleteState(key: string): void {
    localStorage.removeItem(this.STORAGE_PREFIX + key);
  }

  // Clear all saved states
  clearAllStates(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Get all saved states info
  getSavedStates(): Array<{ key: string; timestamp: Date; size: number }> {
    const states: Array<{ key: string; timestamp: Date; size: number }> = [];
    const keys = Object.keys(localStorage);

    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const persistedState: PersistedState = JSON.parse(item);
            states.push({
              key: persistedState.key,
              timestamp: new Date(persistedState.timestamp),
              size: item.length
            });
          }
        } catch (error) {
          console.error('Error reading state:', key, error);
        }
      }
    });

    return states.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Autosave functionality
  enableAutosave(saveCallback: () => void): void {
    this.autosaveEnabled$.next(true);

    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }

    this.autosaveTimer = setInterval(() => {
      if (this.autosaveEnabled$.value) {
        saveCallback();
      }
    }, this.autosaveInterval);
  }

  disableAutosave(): void {
    this.autosaveEnabled$.next(false);

    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  setAutosaveInterval(interval: number): void {
    this.autosaveInterval = interval;

    // Restart autosave with new interval if enabled
    if (this.autosaveEnabled$.value && this.autosaveTimer) {
      this.disableAutosave();
      this.enableAutosave(() => {});
    }
  }

  isAutosaveEnabled(): Observable<boolean> {
    return this.autosaveEnabled$.asObservable();
  }

  // Session storage for temporary data
  saveSessionState(key: string, data: any): void {
    try {
      sessionStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }

  loadSessionState(key: string): any | null {
    try {
      const item = sessionStorage.getItem(this.STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to load session state:', error);
      return null;
    }
  }

  clearSessionState(key: string): void {
    sessionStorage.removeItem(this.STORAGE_PREFIX + key);
  }

  // Storage quota management
  getStorageInfo(): { used: number; quota: number; percentage: number } {
    let used = 0;
    let quota = 5 * 1024 * 1024; // Default 5MB

    // Calculate used storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length + key.length;
        }
      }
    });

    // Try to get actual quota if available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.quota) {
          quota = estimate.quota;
        }
      });
    }

    return {
      used,
      quota,
      percentage: (used / quota) * 100
    };
  }

  private isVersionCompatible(version: string): boolean {
    // Simple version check - could be more sophisticated
    const [major] = version.split('.');
    const [currentMajor] = this.CURRENT_VERSION.split('.');
    return major === currentMajor;
  }

  private initializeAutosave(): void {
    // Check if there's a preference saved
    const autosavePref = this.loadState('autosave_preference');
    if (autosavePref !== null) {
      this.autosaveEnabled$.next(autosavePref.enabled);
      this.autosaveInterval = autosavePref.interval || this.autosaveInterval;
    }
  }

  // Save autosave preferences
  saveAutosavePreferences(): void {
    this.saveState('autosave_preference', {
      enabled: this.autosaveEnabled$.value,
      interval: this.autosaveInterval
    });
  }

  ngOnDestroy(): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }
  }
}

// Specific implementation for mapper state
@Injectable({
  providedIn: 'root'
})
export class MapperStatePersistenceService {
  private readonly MAPPER_STATE_KEY = 'current_mapper_state';
  private readonly DRAFT_KEY = 'mapper_draft';

  constructor(private persistence: StatePresistanceService) {}

  saveMapperState(state: any): boolean {
    return this.persistence.saveState(this.MAPPER_STATE_KEY, state);
  }

  loadMapperState(): any | null {
    return this.persistence.loadState(this.MAPPER_STATE_KEY);
  }

  saveDraft(state: any): boolean {
    return this.persistence.saveState(this.DRAFT_KEY, state);
  }

  loadDraft(): any | null {
    return this.persistence.loadState(this.DRAFT_KEY);
  }

  clearDraft(): void {
    this.persistence.deleteState(this.DRAFT_KEY);
  }

  hasDraft(): boolean {
    return this.loadDraft() !== null;
  }

  // Save recent mappers list
  saveRecentMappers(mappers: Array<{ id: number; name: string; lastOpened: Date }>): void {
    this.persistence.saveState('recent_mappers', mappers.slice(0, 10));
  }

  loadRecentMappers(): Array<{ id: number; name: string; lastOpened: Date }> {
    return this.persistence.loadState('recent_mappers') || [];
  }

  addToRecentMappers(mapper: { id: number; name: string }): void {
    const recent = this.loadRecentMappers();

    // Remove if already exists
    const filtered = recent.filter(m => m.id !== mapper.id);

    // Add to beginning
    filtered.unshift({
      ...mapper,
      lastOpened: new Date()
    });

    this.saveRecentMappers(filtered);
  }
}
