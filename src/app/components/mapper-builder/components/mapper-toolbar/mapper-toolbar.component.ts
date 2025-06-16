// src/app/components/mapper-builder/components/mapper-toolbar/mapper-toolbar.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { RouterLink } from '@angular/router';

import { CaseMapper } from '../../../../models/mapper.models';

@Component({
  selector: 'app-mapper-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    RouterLink
  ],
  template: `
    <mat-toolbar color="primary" class="mapper-toolbar">
      <button mat-icon-button routerLink="/workflow" matTooltip="Back to Workflow">
        <mat-icon>arrow_back</mat-icon>
      </button>

      <span class="toolbar-title">
        <mat-icon>settings_input_component</mat-icon>
        <span *ngIf="currentMapper">
          {{ currentMapper.name }}
          <small class="version-badge">v{{ currentMapper.version }}</small>
        </span>
        <span *ngIf="!currentMapper">Mapper Builder</span>
      </span>

      <span class="toolbar-spacer"></span>

      <!-- Status Indicators -->
      <div class="status-indicators">
        <mat-icon
          *ngIf="isDirty"
          class="status-icon unsaved"
          matTooltip="You have unsaved changes">
          edit
        </mat-icon>

        <mat-icon
          *ngIf="currentMapper?.active_ind"
          class="status-icon active"
          matTooltip="Mapper is active">
          check_circle
        </mat-icon>

        <mat-icon
          *ngIf="currentMapper && !currentMapper.active_ind"
          class="status-icon inactive"
          matTooltip="Mapper is inactive">
          pause_circle
        </mat-icon>
      </div>

      <mat-divider vertical></mat-divider>

      <!-- Main Actions -->
      <button mat-button (click)="newMapper.emit()" class="toolbar-action">
        <mat-icon>add</mat-icon>
        New
      </button>

      <button mat-button (click)="loadMapper.emit()" class="toolbar-action">
        <mat-icon>folder_open</mat-icon>
        Load
      </button>

      <button
        mat-button
        (click)="saveMapper.emit()"
        [disabled]="!isDirty || isLoading"
        class="toolbar-action">
        <mat-icon>save</mat-icon>
        Save
      </button>

      <!-- More Options -->
      <button mat-icon-button [matMenuTriggerFor]="moreMenu" matTooltip="More options">
        <mat-icon>more_vert</mat-icon>
      </button>

      <mat-menu #moreMenu="matMenu">
        <button mat-menu-item (click)="exportMapper.emit()">
          <mat-icon>download</mat-icon>
          <span>Export Mapper</span>
        </button>
        <button mat-menu-item (click)="importMapper.emit()">
          <mat-icon>upload</mat-icon>
          <span>Import Mapper</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="duplicateMapper()">
          <mat-icon>content_copy</mat-icon>
          <span>Duplicate Mapper</span>
        </button>
        <button mat-menu-item (click)="viewHistory()">
          <mat-icon>history</mat-icon>
          <span>View History</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="viewDocumentation()">
          <mat-icon>help</mat-icon>
          <span>Documentation</span>
        </button>
        <button mat-menu-item (click)="viewKeyboardShortcuts()">
          <mat-icon>keyboard</mat-icon>
          <span>Keyboard Shortcuts</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .mapper-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 8px;
      font-size: 20px;
    }

    .version-badge {
      font-size: 12px;
      background-color: rgba(255,255,255,0.2);
      padding: 2px 8px;
      border-radius: 12px;
      margin-left: 8px;
    }

    .toolbar-spacer {
      flex: 1 1 auto;
    }

    .status-indicators {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 16px;
    }

    .status-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .status-icon.unsaved {
      color: #ffc107;
      animation: pulse 2s infinite;
    }

    .status-icon.active {
      color: #4caf50;
    }

    .status-icon.inactive {
      color: #ff9800;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }

    mat-divider[vertical] {
      height: 24px;
      margin: 0 16px;
    }

    .toolbar-action {
      margin: 0 4px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .toolbar-action span {
        display: none;
      }

      .toolbar-action mat-icon {
        margin-right: 0;
      }
    }
  `]
})
export class MapperToolbarComponent {
  @Input() isDirty: boolean | null = false;
  @Input() isLoading: boolean | null = false;
  @Input() currentMapper: CaseMapper | null | undefined = null;

  @Output() newMapper = new EventEmitter<void>();
  @Output() loadMapper = new EventEmitter<void>();
  @Output() saveMapper = new EventEmitter<void>();
  @Output() exportMapper = new EventEmitter<void>();
  @Output() importMapper = new EventEmitter<void>();

  duplicateMapper(): void {
    console.log('Duplicate mapper');
    // TODO: Implement duplicate functionality
  }

  viewHistory(): void {
    console.log('View history');
    // TODO: Implement history viewer
  }

  viewDocumentation(): void {
    window.open('/docs/mapper-builder', '_blank');
  }

  viewKeyboardShortcuts(): void {
    console.log('View keyboard shortcuts');
    // TODO: Show keyboard shortcuts dialog
  }
}
