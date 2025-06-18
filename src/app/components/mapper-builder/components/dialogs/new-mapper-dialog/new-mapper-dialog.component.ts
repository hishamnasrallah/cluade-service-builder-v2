// src/app/components/mapper-builder/dialogs/new-mapper-dialog/new-mapper-dialog.component.ts


import {MatSelectModule} from '@angular/material/select';

@Component({
  selector: 'app-new-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl:'new-mapper-dialog.component.html',
  styleUrl:'new-mapper-dialog.component.scss'
})
export class NewMapperDialogComponent implements OnInit {
  mapperForm!: FormGroup;
  caseTypes: string[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NewMapperDialogComponent>,
    private mapperApi: MapperApiService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadCaseTypes();
  }

  private createForm(): void {
    this.mapperForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      caseType: ['', Validators.required],
      description: [''],
      createFromTemplate: [false],
      template: ['']
    });
  }

  private loadCaseTypes(): void {
    this.mapperApi.getCaseTypes().subscribe({
      next: (types) => {
        this.caseTypes = types;
      },
      error: (error) => {
        console.error('Failed to load case types:', error);
        // Use default types as fallback
        this.caseTypes = ['USER_REG', 'EMPLOYEE_BENEFITS', 'APPLICATION_FORM'];
      }
    });
  }

  onCreate(): void {
    if (this.mapperForm.valid) {
      this.isLoading = true;
      const formValue = this.mapperForm.value;

      // Simulate creation delay
      setTimeout(() => {
        this.dialogRef.close({
          name: formValue.name,
          caseType: formValue.caseType,
          description: formValue.description,
          template: formValue.createFromTemplate ? formValue.template : null
        });
      }, 500);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

// =============================================================================
// src/app/components/mapper-builder/dialogs/open-mapper-dialog/open-mapper-dialog.component.ts
import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatDialogRef, MatDialogModule, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';

import { CaseMapper } from '../../../../models/mapper.models';
import { MapperApiService } from '../../../../services/mapper-api.service';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatTabsModule} from '@angular/material/tabs';
import {MatRadioModule} from '@angular/material/radio';
import {MatDivider} from '@angular/material/divider';

@Component({
  selector: 'app-open-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDivider
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>folder_open</mat-icon>
      Open Case Mapper
    </h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>Search mappers</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="searchTerm" (input)="applyFilter()" placeholder="Search by name or type...">
      </mat-form-field>

      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="mapper-table">
          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
            <td mat-cell *matCellDef="let mapper">{{ mapper.name }}</td>
          </ng-container>

          <!-- Case Type Column -->
          <ng-container matColumnDef="case_type">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Case Type</th>
            <td mat-cell *matCellDef="let mapper">
              <mat-chip>{{ mapper.case_type }}</mat-chip>
            </td>
          </ng-container>

          <!-- Version Column -->
          <ng-container matColumnDef="version">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Version</th>
            <td mat-cell *matCellDef="let mapper">v{{ mapper.version }}</td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="active_ind">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let mapper">
              <mat-icon [class]="mapper.active_ind ? 'active' : 'inactive'">
                {{ mapper.active_ind ? 'check_circle' : 'cancel' }}
              </mat-icon>
            </td>
          </ng-container>

          <!-- Modified Column -->
          <ng-container matColumnDef="updated_at">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Modified</th>
            <td mat-cell *matCellDef="let mapper">
              {{ mapper.updated_at ? (mapper.updated_at | date:'short') : 'N/A' }}
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let mapper">
              <button mat-icon-button [matMenuTriggerFor]="menu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="openMapper(mapper)">
                  <mat-icon>open_in_new</mat-icon>
                  <span>Open</span>
                </button>
                <button mat-menu-item (click)="cloneMapper(mapper)">
                  <mat-icon>content_copy</mat-icon>
                  <span>Clone</span>
                </button>
                <button mat-menu-item (click)="exportMapper(mapper)">
                  <mat-icon>download</mat-icon>
                  <span>Export</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteMapper(mapper)" *ngIf="!mapper.active_ind">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              (dblclick)="openMapper(row)"
              class="mapper-row"></tr>
        </table>

        <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
      </div>

      <div class="loading-overlay" *ngIf="isLoading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading mappers...</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onOpen()" [disabled]="!selectedMapper">
        <mat-icon>open_in_new</mat-icon>
        Open Selected
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 20px;
      min-width: 700px;
      position: relative;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .table-container {
      position: relative;
      max-height: 400px;
      overflow: auto;
    }

    .mapper-table {
      width: 100%;
    }

    .mapper-row:hover {
      background: #f5f5f5;
      cursor: pointer;
    }

    mat-icon.active {
      color: #4caf50;
    }

    mat-icon.inactive {
      color: #f44336;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .loading-overlay p {
      margin-top: 16px;
      color: #666;
    }
  `]
})
export class OpenMapperDialogComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  mappers: CaseMapper[] = [];
  dataSource = new MatTableDataSource<CaseMapper>([]);
  displayedColumns = ['name', 'case_type', 'version', 'active_ind', 'updated_at', 'actions'];
  searchTerm = '';
  selectedMapper?: CaseMapper;
  isLoading = false;

  constructor(
    private dialogRef: MatDialogRef<OpenMapperDialogComponent>,
    private mapperApi: MapperApiService
  ) {}

  ngOnInit(): void {
    this.loadMappers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadMappers(): void {
    this.isLoading = true;
    this.mapperApi.getCaseMappers().subscribe({
      next: (mappers) => {
        this.mappers = mappers;
        this.dataSource.data = mappers;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load mappers:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
  }

  openMapper(mapper: CaseMapper): void {
    this.selectedMapper = mapper;
    this.onOpen();
  }

  cloneMapper(mapper: CaseMapper): void {
    if (mapper.id) {
      this.isLoading = true;
      this.mapperApi.cloneMapper(mapper.id).subscribe({
        next: (cloned) => {
          this.loadMappers();
        },
        error: (error) => {
          console.error('Failed to clone mapper:', error);
          this.isLoading = false;
        }
      });
    }
  }

  exportMapper(mapper: CaseMapper): void {
    if (mapper.id) {
      this.mapperApi.exportMapper(mapper.id).subscribe({
        next: (data) => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `mapper-${mapper.name}-v${mapper.version}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Failed to export mapper:', error);
        }
      });
    }
  }

  deleteMapper(mapper: CaseMapper): void {
    if (confirm(`Delete mapper "${mapper.name}"?`)) {
      // Implement delete
      console.log('Delete mapper:', mapper);
    }
  }

  onOpen(): void {
    if (this.selectedMapper) {
      this.dialogRef.close(this.selectedMapper);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

// =============================================================================
// src/app/components/mapper-builder/dialogs/save-mapper-dialog/save-mapper-dialog.component.ts
@Component({
  selector: 'app-save-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>save_as</mat-icon>
      Save Mapper As
    </h2>

    <mat-dialog-content>
      <form [formGroup]="saveForm">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" required>
          <mat-error *ngIf="saveForm.get('name')?.hasError('required')">
            Name is required
          </mat-error>
        </mat-form-field>

        <mat-checkbox formControlName="createNewVersion" color="primary">
          Create new version
        </mat-checkbox>

        <mat-form-field appearance="outline" *ngIf="saveForm.get('createNewVersion')?.value">
          <mat-label>Version Notes</mat-label>
          <textarea matInput formControlName="versionNotes" rows="3"
                    placeholder="Describe changes in this version"></textarea>
        </mat-form-field>

        <mat-checkbox formControlName="setAsActive" color="primary">
          Set as active version
        </mat-checkbox>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!saveForm.valid">
        <mat-icon>save</mat-icon>
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 20px;
      min-width: 400px;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    mat-checkbox {
      margin-bottom: 16px;
    }
  `]
})
export class SaveMapperDialogComponent implements OnInit {
  saveForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SaveMapperDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mapper: CaseMapper }
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    if (this.data.mapper) {
      this.saveForm.patchValue({
        name: this.data.mapper.name
      });
    }
  }

  private createForm(): void {
    this.saveForm = this.fb.group({
      name: ['', Validators.required],
      createNewVersion: [true],
      versionNotes: [''],
      setAsActive: [true]
    });
  }

  onSave(): void {
    if (this.saveForm.valid) {
      this.dialogRef.close(this.saveForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

// =============================================================================
// src/app/components/mapper-builder/dialogs/import-mapper-dialog/import-mapper-dialog.component.ts
@Component({
  selector: 'app-import-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>upload</mat-icon>
      Import Mapper
    </h2>

    <mat-dialog-content>
      <mat-tab-group>
        <mat-tab label="Upload File">
          <div class="tab-content">
            <div class="file-upload">
              <input type="file" #fileInput accept=".json" (change)="onFileSelected($event)" hidden>
              <button mat-raised-button (click)="fileInput.click()">
                <mat-icon>attach_file</mat-icon>
                Choose File
              </button>
              <span class="file-name">{{ selectedFile?.name || 'No file selected' }}</span>
            </div>

            <div class="file-preview" *ngIf="fileContent">
              <h4>Preview:</h4>
              <pre>{{ filePreview }}</pre>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Paste JSON">
          <div class="tab-content">
            <mat-form-field appearance="outline">
              <mat-label>Mapper JSON</mat-label>
              <textarea matInput [(ngModel)]="jsonContent" rows="15"
                        placeholder="Paste mapper JSON here..."></textarea>
            </mat-form-field>
          </div>
        </mat-tab>
      </mat-tab-group>

      <div class="import-options" *ngIf="parsedData">
        <h4>Import Summary:</h4>
        <div class="summary-item">
          <label>Mapper Name:</label>
          <span>{{ parsedData.mapper?.name }}</span>
        </div>
        <div class="summary-item">
          <label>Case Type:</label>
          <span>{{ parsedData.mapper?.case_type }}</span>
        </div>
        <div class="summary-item">
          <label>Targets:</label>
          <span>{{ parsedData.targets?.length || 0 }}</span>
        </div>
      </div>

      <div class="error-message" *ngIf="error">
        <mat-icon>error</mat-icon>
        <span>{{ error }}</span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onImport()"
              [disabled]="!parsedData || isImporting">
        <mat-spinner diameter="20" *ngIf="isImporting"></mat-spinner>
        <mat-icon *ngIf="!isImporting">upload</mat-icon>
        Import
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 20px;
      min-width: 500px;
      max-height: 600px;
    }

    .tab-content {
      padding: 20px 0;
    }

    .file-upload {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .file-name {
      font-style: italic;
      color: #666;
    }

    .file-preview {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 16px;
      max-height: 200px;
      overflow-y: auto;
    }

    .file-preview h4 {
      margin: 0 0 12px 0;
    }

    .file-preview pre {
      margin: 0;
      font-size: 12px;
      white-space: pre-wrap;
    }

    mat-form-field {
      width: 100%;
    }

    .import-options {
      margin-top: 20px;
      padding: 16px;
      background: #e3f2fd;
      border-radius: 4px;
    }

    .import-options h4 {
      margin: 0 0 12px 0;
      color: #1976d2;
    }

    .summary-item {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
    }

    .summary-item label {
      font-weight: 500;
      min-width: 100px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
      color: #c62828;
    }

    mat-spinner {
      margin-right: 8px;
    }
  `]
})
export class ImportMapperDialogComponent {
  selectedFile?: File;
  fileContent?: string;
  filePreview?: string;
  jsonContent = '';
  parsedData?: any;
  error?: string;
  isImporting = false;

  constructor(
    private dialogRef: MatDialogRef<ImportMapperDialogComponent>,
    private mapperApi: MapperApiService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.readFile();
    }
  }

  private readFile(): void {
    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.fileContent = e.target?.result as string;
        this.filePreview = this.fileContent.substring(0, 500) + '...';
        this.parseContent(this.fileContent);
      };
      reader.readAsText(this.selectedFile);
    }
  }

  private parseContent(content: string): void {
    try {
      this.parsedData = JSON.parse(content);
      this.error = undefined;
    } catch (e) {
      this.error = 'Invalid JSON format';
      this.parsedData = undefined;
    }
  }

  onImport(): void {
    if (this.parsedData) {
      this.isImporting = true;
      this.mapperApi.importMapper(this.parsedData).subscribe({
        next: (mapper) => {
          this.dialogRef.close(mapper);
        },
        error: (error) => {
          this.error = error.message;
          this.isImporting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

// =============================================================================
// src/app/components/mapper-builder/dialogs/export-mapper-dialog/export-mapper-dialog.component.ts
@Component({
  selector: 'app-export-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatRadioModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>download</mat-icon>
      Export Mapper
    </h2>

    <mat-dialog-content>
      <form [formGroup]="exportForm">
        <div class="form-section">
          <h4>Export Format</h4>
          <mat-radio-group formControlName="format">
            <mat-radio-button value="json">JSON (recommended)</mat-radio-button>
          </mat-radio-group>
        </div>

        <div class="form-section">
          <h4>Export Options</h4>
          <mat-checkbox formControlName="includeMetadata" color="primary">
            Include metadata (timestamps, user info)
          </mat-checkbox>
          <mat-checkbox formControlName="includeExecutionLogs" color="primary">
            Include execution logs
          </mat-checkbox>
          <mat-checkbox formControlName="anonymizeUserData" color="primary">
            Anonymize user data
          </mat-checkbox>
        </div>

        <div class="export-info">
          <mat-icon>info</mat-icon>
          <p>The exported file will contain the complete mapper configuration including all targets and field rules.</p>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onExport()">
        <mat-icon>download</mat-icon>
        Export
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 20px;
      min-width: 400px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .form-section h4 {
      margin: 0 0 12px 0;
      color: #333;
    }

    mat-radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    mat-checkbox {
      display: block;
      margin-bottom: 12px;
    }

    .export-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #e3f2fd;
      border-radius: 4px;
    }

    .export-info mat-icon {
      color: #1976d2;
    }

    .export-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  `]
})
export class ExportMapperDialogComponent {
  exportForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ExportMapperDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mapper: CaseMapper }
  ) {
    this.exportForm = this.fb.group({
      format: ['json'],
      includeMetadata: [true],
      includeExecutionLogs: [false],
      anonymizeUserData: [false]
    });
  }

  onExport(): void {
    this.dialogRef.close(this.exportForm.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
