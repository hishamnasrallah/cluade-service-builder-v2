// src/app/services/mapper-autosave.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import {Subject, interval, merge, fromEvent, Observable} from 'rxjs';
import { debounceTime, takeUntil, filter, switchMap } from 'rxjs/operators';
import { MapperStateService } from './mapper-state.service';
import { MapperApiService } from './mapper-api.service';

export interface AutosaveConfig {
  enabled: boolean;
  intervalSeconds: number;
  saveOnBlur: boolean;
  saveOnNavigation: boolean;
  showNotifications: boolean;
  maxRetries: number;
}

export interface AutosaveStatus {
  lastSaved?: Date;
  isSaving: boolean;
  error?: string;
  pendingChanges: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MapperAutosaveService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private saveSubject$ = new Subject<void>();
  private statusSubject$ = new Subject<AutosaveStatus>();

  status$ = this.statusSubject$.asObservable();

  private config: AutosaveConfig = {
    enabled: true,
    intervalSeconds: 30,
    saveOnBlur: true,
    saveOnNavigation: true,
    showNotifications: false,
    maxRetries: 3
  };

  private currentStatus: AutosaveStatus = {
    isSaving: false,
    pendingChanges: false
  };

  private retryCount = 0;

  constructor(
    private stateService: MapperStateService,
    private apiService: MapperApiService
  ) {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initialize(): void {
    // Setup auto-save triggers
    this.setupIntervalSave();
    this.setupBlurSave();
    this.setupNavigationSave();
    this.setupManualSave();

    // Monitor state changes
    this.stateService.getState$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.currentStatus.pendingChanges = state.isDirty;
        this.updateStatus();
      });
  }

  private setupIntervalSave(): void {
    interval(this.config.intervalSeconds * 1000)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.config.enabled && this.currentStatus.pendingChanges)
      )
      .subscribe(() => {
        this.triggerSave('interval');
      });
  }

  private setupBlurSave(): void {
    if (!this.config.saveOnBlur) return;

    fromEvent(window, 'blur')
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.config.enabled && this.currentStatus.pendingChanges)
      )
      .subscribe(() => {
        this.triggerSave('blur');
      });
  }

  private setupNavigationSave(): void {
    if (!this.config.saveOnNavigation) return;

    fromEvent(window, 'beforeunload')
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.config.enabled && this.currentStatus.pendingChanges)
      )
      .subscribe((event: BeforeUnloadEvent) => {
        // Try to save before leaving
        this.triggerSave('navigation');

        // Show warning if changes pending
        if (this.currentStatus.pendingChanges) {
          event.preventDefault();
          event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
      });
  }

  private setupManualSave(): void {
    this.saveSubject$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        filter(() => !this.currentStatus.isSaving),
        switchMap(() => this.performSave())
      )
      .subscribe({
        next: () => {
          this.handleSaveSuccess();
        },
        error: (error) => {
          this.handleSaveError(error);
        }
      });
  }

  triggerSave(source: 'manual' | 'interval' | 'blur' | 'navigation' = 'manual'): void {
    if (!this.config.enabled || !this.currentStatus.pendingChanges) {
      return;
    }

    console.log(`[Autosave] Triggered by: ${source}`);
    this.saveSubject$.next();
  }

  private performSave(): Observable<any> {
    const state = this.stateService.getCurrentState();

    if (!state.currentMapper) {
      throw new Error('No mapper to save');
    }

    this.currentStatus.isSaving = true;
    this.updateStatus();

    const saveRequest = {
      case_mapper: state.currentMapper,
      targets: state.targets,
      create_version: false,
      is_draft: true
    };

    return this.apiService.saveMapperConfiguration(saveRequest);
  }

  private handleSaveSuccess(): void {
    this.currentStatus = {
      lastSaved: new Date(),
      isSaving: false,
      pendingChanges: false,
      error: undefined
    };

    this.retryCount = 0;
    this.stateService.resetDirtyState();
    this.updateStatus();

    if (this.config.showNotifications) {
      this.showNotification('Changes saved automatically');
    }
  }

  private handleSaveError(error: any): void {
    console.error('[Autosave] Save failed:', error);

    this.currentStatus.isSaving = false;
    this.currentStatus.error = error.message || 'Failed to save changes';
    this.updateStatus();

    // Retry logic
    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);

      console.log(`[Autosave] Retrying in ${retryDelay}ms (attempt ${this.retryCount}/${this.config.maxRetries})`);

      setTimeout(() => {
        this.triggerSave('manual');
      }, retryDelay);
    } else {
      if (this.config.showNotifications) {
        this.showNotification('Failed to save changes. Please save manually.', 'error');
      }
    }
  }

  private updateStatus(): void {
    this.statusSubject$.next({ ...this.currentStatus });
  }

  private showNotification(message: string, type: 'info' | 'error' = 'info'): void {
    // Could integrate with a notification service
    console.log(`[Autosave] ${type}: ${message}`);
  }

  // Public methods for configuration
  setConfig(config: Partial<AutosaveConfig>): void {
    this.config = { ...this.config, ...config };

    // Re-initialize if needed
    if ('intervalSeconds' in config || 'enabled' in config) {
      this.destroy$.next();
      this.initialize();
    }
  }

  getConfig(): AutosaveConfig {
    return { ...this.config };
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  getStatus(): AutosaveStatus {
    return { ...this.currentStatus };
  }

  forceSave(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.performSave().subscribe({
        next: () => {
          this.handleSaveSuccess();
          resolve();
        },
        error: (error) => {
          this.handleSaveError(error);
          reject(error);
        }
      });
    });
  }
}

// Auto-save Status Component
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-autosave-status',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="autosave-status" [class.has-error]="status?.error">
      <mat-spinner
        *ngIf="status?.isSaving"
        diameter="16"
        mode="indeterminate">
      </mat-spinner>

      <mat-icon
        *ngIf="!status?.isSaving && status?.lastSaved && !status?.error"
        class="success-icon"
        matTooltip="Last saved: {{ status.lastSaved | date:'short' }}">
        cloud_done
      </mat-icon>

      <mat-icon
        *ngIf="!status?.isSaving && status?.pendingChanges && !status?.error"
        class="pending-icon"
        matTooltip="Changes pending save">
        cloud_queue
      </mat-icon>

      <mat-icon
        *ngIf="!status?.isSaving && status?.error"
        class="error-icon"
        [matTooltip]="'Save failed: ' + status.error">
        cloud_off
      </mat-icon>

      <span class="status-text">
        <ng-container *ngIf="status?.isSaving">Saving...</ng-container>
        <ng-container *ngIf="!status?.isSaving && status?.lastSaved && !status?.error">
          Saved {{ getTimeAgo(status.lastSaved) }}
        </ng-container>
        <ng-container *ngIf="!status?.isSaving && status?.pendingChanges && !status?.lastSaved && !status?.error">
          Not saved
        </ng-container>
        <ng-container *ngIf="!status?.isSaving && status?.error">
          Save failed
        </ng-container>
      </span>
    </div>
  `,
  styles: [`
    .autosave-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 16px;
      background-color: #f5f5f5;
      font-size: 12px;
      color: #666;
    }

    .autosave-status.has-error {
      background-color: #ffebee;
      color: #c62828;
    }

    mat-spinner {
      margin-right: 4px;
    }

    mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .success-icon {
      color: #4caf50;
    }

    .pending-icon {
      color: #ff9800;
    }

    .error-icon {
      color: #f44336;
    }

    .status-text {
      white-space: nowrap;
    }
  `]
})
export class AutosaveStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  status: AutosaveStatus | null = null;

  constructor(private autosaveService: MapperAutosaveService) {}

  ngOnInit(): void {
    this.autosaveService.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.status = status;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 30) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

    return date.toLocaleDateString();
  }
}
