// src/app/components/mapper-builder/components/version-history/version-history.component.ts

import {Component, Input, Output, EventEmitter, OnInit, Inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  CaseMapper,
  MapperVersion,
  MapperTarget
} from '../../../models/mapper.models';
import { MapperApiService } from '../../../services/mapper-api.service';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDivider, MatDividerModule} from '@angular/material/divider';
import {MatCheckbox} from '@angular/material/checkbox';

interface VersionComparison {
  version1: MapperVersion;
  version2: MapperVersion;
  differences: {
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'modified' | 'removed';
  }[];
}

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatDivider,
    MatCheckbox
  ],
  templateUrl: './version-history.component.html',
  styleUrl: './version-history.component.scss'
})
export class VersionHistoryComponent implements OnInit {
  @Input({transform: (value: CaseMapper | undefined | null): CaseMapper | undefined => value || undefined}) mapper?: CaseMapper;
  @Output() loadVersion = new EventEmitter<MapperVersion>();
  @Output() compareVersions = new EventEmitter<{v1: MapperVersion, v2: MapperVersion}>();

  versions: MapperVersion[] = [];
  displayedColumns = ['version', 'name', 'created', 'author', 'changes', 'status', 'actions'];
  isLoading = false;
  selectedVersions: MapperVersion[] = [];

  constructor(
    private apiService: MapperApiService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.mapper?.id) {
      this.loadVersionHistory();
    }
  }

  loadVersionHistory(): void {
    if (!this.mapper?.id) return;

    this.isLoading = true;
    this.apiService.getMapperVersions(this.mapper.id).subscribe({
      next: (versions) => {
        this.versions = versions;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load version history:', error);
        this.isLoading = false;
      }
    });
  }

  onLoadVersion(version: MapperVersion): void {
    if (confirm(`Load version ${version.version}? This will replace the current configuration.`)) {
      this.loadVersion.emit(version);
    }
  }

  createNewVersion(): void {
    const dialogRef = this.dialog.open(CreateVersionDialogComponent, {
      width: '500px',
      data: {
        currentVersion: this.mapper?.version,
        mapperName: this.mapper?.name
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.createMapperVersion(this.mapper!.id!, result).subscribe({
          next: (newVersion) => {
            this.loadVersionHistory();
          },
          error: (error) => {
            console.error('Failed to create version:', error);
          }
        });
      }
    });
  }

  toggleVersionSelection(version: MapperVersion): void {
    const index = this.selectedVersions.findIndex(v => v.id === version.id);

    if (index >= 0) {
      this.selectedVersions.splice(index, 1);
    } else {
      if (this.selectedVersions.length >= 2) {
        this.selectedVersions.shift();
      }
      this.selectedVersions.push(version);
    }
  }

  isVersionSelected(version: MapperVersion): boolean {
    return this.selectedVersions.some(v => v.id === version.id);
  }

  compareSelectedVersions(): void {
    if (this.selectedVersions.length === 2) {
      this.compareVersions.emit({
        v1: this.selectedVersions[0],
        v2: this.selectedVersions[1]
      });
    }
  }

  viewChanges(version: MapperVersion): void {
    // Show changes in a dialog
    const dialogRef = this.dialog.open(VersionChangesDialogComponent, {
      width: '800px',
      maxHeight: '80vh',
      data: { version }
    });
  }

  rollbackToVersion(version: MapperVersion): void {
    if (confirm(`Rollback to version ${version.version}? This will create a new version with the configuration from version ${version.version}.`)) {
      this.apiService.rollbackToVersion(this.mapper!.id!, version.id).subscribe({
        next: () => {
          this.loadVersionHistory();
        },
        error: (error) => {
          console.error('Failed to rollback:', error);
        }
      });
    }
  }

  deleteVersion(version: MapperVersion): void {
    if (version.is_active) {
      alert('Cannot delete the active version');
      return;
    }

    if (confirm(`Delete version ${version.version}? This action cannot be undone.`)) {
      this.apiService.deleteMapperVersion(version.id).subscribe({
        next: () => {
          this.loadVersionHistory();
        },
        error: (error) => {
          console.error('Failed to delete version:', error);
        }
      });
    }
  }

  exportVersion(version: MapperVersion): void {
    this.apiService.getMapperVersions(version.id).subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mapper-v${version.version}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Failed to export version:', error);
      }
    });
  }

  getVersionStatusColor(version: MapperVersion): string {
    if (version.is_active) return 'primary';
    if (version.version === this.mapper?.version) return 'accent';
    return '';
  }

  getVersionStatusText(version: MapperVersion): string {
    if (version.is_active) return 'Active';
    if (version.version === this.mapper?.version) return 'Current';
    return 'Inactive';
  }
}

// Dialog component for creating new version (inline for simplicity)
@Component({
  selector: 'app-create-version-dialog',
  template: `
    <h2 mat-dialog-title>Create New Version</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Version Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g., Version 2 - Bug fixes">
          <mat-error *ngIf="form.get('name')?.hasError('required')">
            Name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Changes Summary</mat-label>
          <textarea matInput formControlName="changes_summary" rows="4"
                    placeholder="Describe the changes in this version"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="!form.valid"
              (click)="create()">
        Create Version
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    form { display: flex; flex-direction: column; gap: 16px; padding-top: 16px; }
  `],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,

  ]
})
export class CreateVersionDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CreateVersionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      name: [`Version ${(data.currentVersion || 0) + 1}`, Validators.required],
      changes_summary: ['']
    });
  }

  create(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

// Dialog component for viewing version changes
@Component({
  selector: 'app-version-changes-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon>history</mat-icon>
      Version {{ data.version.version }} Changes
    </h2>
    <mat-dialog-content>
      <div class="version-info">
        <div class="info-row">
          <strong>Created:</strong>
          <span>{{ data.version.created_at | date:'medium' }}</span>
        </div>
        <div class="info-row">
          <strong>Author:</strong>
          <span>{{ data.version.created_by }}</span>
        </div>
        <div class="info-row" *ngIf="data.version.changes_summary">
          <strong>Summary:</strong>
          <span>{{ data.version.changes_summary }}</span>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="changes-section" *ngIf="changes.length > 0">
        <h3>Detailed Changes</h3>
        <div class="change-item" *ngFor="let change of changes">
          <mat-icon [class]="getChangeIconClass(change.type)">
            {{ getChangeIcon(change.type) }}
          </mat-icon>
          <div class="change-details">
            <strong>{{ change.field }}</strong>
            <div class="change-values" *ngIf="change.type === 'modified'">
              <span class="old-value">{{ formatValue(change.oldValue) }}</span>
              <mat-icon>arrow_forward</mat-icon>
              <span class="new-value">{{ formatValue(change.newValue) }}</span>
            </div>
            <div class="change-values" *ngIf="change.type !== 'modified'">
              <span [class]="change.type === 'added' ? 'new-value' : 'old-value'">
                {{ formatValue(change.type === 'added' ? change.newValue : change.oldValue) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="no-changes" *ngIf="changes.length === 0">
        <mat-icon>info</mat-icon>
        <p>No detailed changes available</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { max-height: 60vh; overflow-y: auto; }
    h2 { display: flex; align-items: center; gap: 12px; }
    .version-info { padding: 16px 0; }
    .info-row { display: flex; gap: 12px; margin-bottom: 8px; }
    .info-row strong { min-width: 100px; }
    .changes-section { margin-top: 24px; }
    .changes-section h3 { margin-bottom: 16px; }
    .change-item { display: flex; gap: 12px; padding: 12px; border-radius: 4px; margin-bottom: 8px; background-color: #f5f5f5; }
    .change-icon-added { color: #4caf50; }
    .change-icon-modified { color: #ff9800; }
    .change-icon-removed { color: #f44336; }
    .change-details { flex: 1; }
    .change-values { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .old-value { color: #f44336; text-decoration: line-through; }
    .new-value { color: #4caf50; }
    .no-changes { display: flex; flex-direction: column; align-items: center; padding: 48px; color: #999; }
    .no-changes mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; }
  `],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule
  ]
})
export class VersionChangesDialogComponent {
  changes: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { version: MapperVersion }
  ) {
    // TODO: Load actual changes from API
    this.loadChanges();
  }

  loadChanges(): void {
    // Mock changes for now
    this.changes = [
      { field: 'Target: Employee', type: 'added', newValue: 'New target for employee mapping' },
      { field: 'Field Rule: salary', type: 'modified', oldValue: 'base_salary', newValue: 'gross_salary' },
      { field: 'Transform: calculate_tax', type: 'removed', oldValue: 'Removed tax calculation' }
    ];
  }

  getChangeIcon(type: string): string {
    switch (type) {
      case 'added': return 'add_circle';
      case 'modified': return 'edit';
      case 'removed': return 'remove_circle';
      default: return 'change_circle';
    }
  }

  getChangeIconClass(type: string): string {
    return `change-icon-${type}`;
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
