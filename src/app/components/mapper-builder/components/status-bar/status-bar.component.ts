// src/app/components/mapper-builder/components/status-bar/status-bar.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CaseMapper, ValidationResult } from '../../../../models/mapper.models';
import { AutosaveStatus } from '../../../../services/mapper-autosave.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-toolbar class="status-bar">
      <!-- Mapper Info -->
      <div class="status-section" *ngIf="mapper">
        <mat-icon class="status-icon">description</mat-icon>
        <span class="status-text">
          <strong>{{ mapper.name }}</strong>
          <span class="version">v{{ mapper.version }}</span>
        </span>
      </div>

      <!-- Case Type -->
      <div class="status-section" *ngIf="mapper">
        <mat-icon class="status-icon">category</mat-icon>
        <span class="status-text">{{ mapper.case_type }}</span>
      </div>

      <!-- Validation Status -->
      <div class="status-section validation-status"
           [class.valid]="validationResult?.valid"
           [class.invalid]="validationResult && !validationResult.valid"
           *ngIf="validationResult">
        <mat-icon class="status-icon">
          {{ validationResult.valid ? 'check_circle' : 'error' }}
        </mat-icon>
        <span class="status-text">
          <ng-container *ngIf="validationResult.valid">Valid</ng-container>
          <ng-container *ngIf="!validationResult.valid">
            {{ validationResult.errors.length }} error<ng-container *ngIf="validationResult.errors.length !== 1">s</ng-container>
          </ng-container>
        </span>
      </div>

      <!-- Spacer -->
      <span class="status-spacer"></span>

      <!-- Auto-save Status -->
      <div class="status-section autosave-status" *ngIf="autosaveStatus">
        <mat-spinner
          *ngIf="autosaveStatus.isSaving"
          diameter="16"
          mode="indeterminate">
        </mat-spinner>

        <mat-icon *ngIf="!autosaveStatus.isSaving && autosaveStatus.lastSaved && !autosaveStatus.error"
                  class="status-icon success">
          cloud_done
        </mat-icon>

        <mat-icon *ngIf="!autosaveStatus.isSaving && autosaveStatus.pendingChanges && !autosaveStatus.error"
                  class="status-icon pending">
          cloud_queue
        </mat-icon>

        <mat-icon *ngIf="!autosaveStatus.isSaving && autosaveStatus.error"
                  class="status-icon error">
          cloud_off
        </mat-icon>

        <span class="status-text">
          <ng-container *ngIf="autosaveStatus.isSaving">Saving...</ng-container>
          <ng-container *ngIf="!autosaveStatus.isSaving && autosaveStatus.lastSaved && !autosaveStatus.error">
            Saved {{ getTimeAgo(autosaveStatus.lastSaved) }}
          </ng-container>
          <ng-container *ngIf="!autosaveStatus.isSaving && autosaveStatus.pendingChanges && !autosaveStatus.error && !autosaveStatus.lastSaved">
            Not saved
          </ng-container>
          <ng-container *ngIf="!autosaveStatus.isSaving && autosaveStatus.error">
            Save failed
          </ng-container>
        </span>
      </div>

      <!-- Dirty Indicator -->
      <div class="status-section" *ngIf="isDirty && !autosaveStatus?.isSaving">
        <mat-icon class="status-icon unsaved">edit</mat-icon>
        <span class="status-text">Unsaved changes</span>
      </div>

      <!-- Statistics -->
      <div class="status-section">
        <mat-icon class="status-icon">flag</mat-icon>
        <span class="status-text">
          {{ targetCount }} target<ng-container *ngIf="targetCount !== 1">s</ng-container>
        </span>
      </div>

      <div class="status-section">
        <mat-icon class="status-icon">rule</mat-icon>
        <span class="status-text">
          {{ ruleCount }} rule<ng-container *ngIf="ruleCount !== 1">s</ng-container>
        </span>
      </div>

      <!-- Connection Status -->
      <div class="status-section connection-status"
           [class.online]="isOnline"
           [class.offline]="!isOnline">
        <mat-icon class="status-icon"
                  [matTooltip]="isOnline ? 'Connected' : 'Offline'">
          {{ isOnline ? 'wifi' : 'wifi_off' }}
        </mat-icon>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .status-bar {
      height: 32px;
      min-height: 32px;
      background-color: #424242;
      color: #e0e0e0;
      font-size: 12px;
      padding: 0 16px;
      border-top: 1px solid #616161;
    }

    .status-section {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-right: 16px;
      padding-right: 16px;
      border-right: 1px solid #616161;

      &:last-child {
        border-right: none;
        margin-right: 0;
        padding-right: 0;
      }
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #9e9e9e;

      &.success {
        color: #66bb6a;
      }

      &.pending {
        color: #ffa726;
      }

      &.error {
        color: #ef5350;
      }

      &.unsaved {
        color: #ffca28;
      }
    }

    .status-text {
      display: flex;
      align-items: center;
      gap: 4px;

      strong {
        color: #fff;
      }

      .version {
        opacity: 0.7;
        margin-left: 4px;
      }
    }

    .status-spacer {
      flex: 1 1 auto;
    }

    .validation-status {
      &.valid .status-icon {
        color: #66bb6a;
      }

      &.invalid .status-icon {
        color: #ef5350;
      }
    }

    .autosave-status {
      mat-spinner {
        margin-right: 4px;
      }
    }

    .connection-status {
      &.online .status-icon {
        color: #66bb6a;
      }

      &.offline .status-icon {
        color: #ef5350;
      }
    }

    @media (max-width: 768px) {
      .status-bar {
        font-size: 11px;
      }

      .status-section {
        margin-right: 8px;
        padding-right: 8px;
      }

      .status-text strong {
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  `]
})
export class StatusBarComponent {
  @Input() mapper: CaseMapper | null = null;
  @Input() targetCount = 0;
  @Input() ruleCount = 0;
  @Input() validationResult: ValidationResult | null = null;
  @Input() isDirty = false;
  @Input() autosaveStatus: AutosaveStatus | null = null;

  isOnline = navigator.onLine;

  constructor() {
    // Monitor online status
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

    return date.toLocaleDateString();
  }
}
