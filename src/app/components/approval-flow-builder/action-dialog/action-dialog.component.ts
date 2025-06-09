// components/approval-flow-builder/action-dialog/action-dialog.component.ts
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Action, Group, Service } from '../../../models/approval-flow.models';
import { ApprovalFlowApiService, LookupItem } from '../../../services/approval-flow-api.service';

export interface ActionDialogData {
  action?: Action;
  mode: 'create' | 'edit';
}

export interface ActionDialogResult {
  action: Action;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-action-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="action-dialog">
      <h2 mat-dialog-title>
        <mat-icon>{{ data.mode === 'create' ? 'add' : 'edit' }}</mat-icon>
        {{ data.mode === 'create' ? 'Create New Action' : 'Edit Action' }}
      </h2>

      <mat-dialog-content class="dialog-content">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading action data...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="errorMessage" class="error-container">
          <mat-icon color="warn">error</mat-icon>
          <p>{{ errorMessage }}</p>
          <button mat-button (click)="loadData()" color="primary">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>

        <!-- Action Form -->
        <form [formGroup]="actionForm" *ngIf="!isLoading && !errorMessage">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Action Name (English)</mat-label>
              <input matInput formControlName="name" required>
              <mat-hint>Descriptive name for the action</mat-hint>
              <mat-error *ngIf="actionForm.get('name')?.hasError('required')">
                Action name is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Action Name (Arabic)</mat-label>
              <input matInput formControlName="name_ara" required>
              <mat-hint>Arabic translation of the action name</mat-hint>
              <mat-error *ngIf="actionForm.get('name_ara')?.hasError('required')">
                Arabic name is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Action Code</mat-label>
              <input matInput formControlName="code">
              <mat-hint>Optional code identifier for the action</mat-hint>
            </mat-form-field>
          </div>

          <!-- Group Assignment -->
          <div class="form-section">
            <h3>Group Assignment</h3>
            <p class="section-description">Select which groups can perform this action</p>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Authorized Groups</mat-label>
              <mat-select formControlName="groups" multiple required>
                <mat-option *ngFor="let group of availableGroups" [value]="group.id">
                  {{ group.name }}
                </mat-option>
                <mat-option *ngIf="availableGroups.length === 0" [value]="" disabled>
                  {{ isLoading ? 'Loading groups...' : 'No groups available' }}
                </mat-option>
              </mat-select>
              <mat-hint>Select all groups that should be able to perform this action</mat-hint>
              <mat-error *ngIf="actionForm.get('groups')?.hasError('required')">
                At least one group must be selected
              </mat-error>
            </mat-form-field>

            <!-- Selected Groups Preview -->
            <div class="selected-groups" *ngIf="getSelectedGroups().length > 0">
              <h4>Selected Groups:</h4>
              <div class="groups-list">
                <span *ngFor="let group of getSelectedGroups()" class="group-chip">
                  {{ group.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Service Assignment -->
          <div class="form-section">
            <h3>Service Assignment</h3>
            <p class="section-description">Select which services this action applies to</p>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Applicable Services</mat-label>
              <mat-select formControlName="services" multiple required>
                <mat-option *ngFor="let service of availableServices" [value]="service.id">
                  {{ service.name }} ({{ service.name_ara }})
                </mat-option>
                <mat-option *ngIf="availableServices.length === 0" [value]="" disabled>
                  {{ isLoading ? 'Loading services...' : 'No services available' }}
                </mat-option>
              </mat-select>
              <mat-hint>Select all services where this action can be used</mat-hint>
              <mat-error *ngIf="actionForm.get('services')?.hasError('required')">
                At least one service must be selected
              </mat-error>
            </mat-form-field>

            <!-- Selected Services Preview -->
            <div class="selected-services" *ngIf="getSelectedServices().length > 0">
              <h4>Selected Services:</h4>
              <div class="services-list">
                <span *ngFor="let service of getSelectedServices()" class="service-chip">
                  {{ service.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Settings -->
          <div class="form-section">
            <h3>Settings</h3>

            <div class="checkbox-group">
              <mat-checkbox formControlName="active_ind">
                Active
              </mat-checkbox>
              <small>Inactive actions will not be available for selection</small>
            </div>
          </div>

          <!-- Action Preview -->
          <div class="form-section" *ngIf="actionForm.valid">
            <h3>Preview</h3>
            <div class="action-preview">
              <div class="preview-header">
                <mat-icon>play_arrow</mat-icon>
                <span>{{ actionForm.get('name')?.value }}</span>
                <span class="preview-code" *ngIf="actionForm.get('code')?.value">
                  ({{ actionForm.get('code')?.value }})
                </span>
              </div>
              <div class="preview-details">
                <p><strong>Arabic Name:</strong> {{ actionForm.get('name_ara')?.value }}</p>
                <p><strong>Groups:</strong> {{ getSelectedGroups().length }} selected</p>
                <p><strong>Services:</strong> {{ getSelectedServices().length }} selected</p>
                <p><strong>Status:</strong> {{ actionForm.get('active_ind')?.value ? 'Active' : 'Inactive' }}</p>
              </div>
            </div>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>

        <button mat-raised-button
                color="primary"
                (click)="onSave()"
                [disabled]="actionForm.invalid || isSaving">
          <mat-spinner diameter="20" *ngIf="isSaving"></mat-spinner>
          <mat-icon *ngIf="!isSaving">{{ data.mode === 'create' ? 'add' : 'save' }}</mat-icon>
          {{ isSaving ? 'Saving...' : (data.mode === 'create' ? 'Create Action' : 'Save Changes') }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .action-dialog {
      width: 100%;
      max-width: 600px;
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
      padding: 20px;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .loading-container mat-spinner,
    .error-container mat-icon {
      margin-bottom: 16px;
    }

    .loading-container p,
    .error-container p {
      margin: 0;
      color: #666;
    }

    .form-section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #eee;
    }

    .form-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .form-section h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }

    .section-description {
      margin: 0 0 16px 0;
      color: #666;
      font-size: 14px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkbox-group small {
      color: #666;
      font-size: 12px;
      margin-left: 32px;
    }

    .selected-groups,
    .selected-services {
      margin-top: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .selected-groups h4,
    .selected-services h4 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 14px;
      font-weight: 500;
    }

    .groups-list,
    .services-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .group-chip,
    .service-chip {
      display: inline-block;
      padding: 4px 12px;
      background: #e3f2fd;
      color: #1976d2;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }

    .action-preview {
      padding: 16px;
      background: #f0f7ff;
      border: 1px solid #bbdefb;
      border-radius: 6px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-weight: 500;
      color: #1976d2;
    }

    .preview-header mat-icon {
      color: #1976d2;
    }

    .preview-code {
      color: #666;
      font-size: 12px;
    }

    .preview-details {
      font-size: 13px;
      color: #333;
    }

    .preview-details p {
      margin: 4px 0;
    }

    .preview-details strong {
      color: #555;
    }

    mat-dialog-actions {
      padding: 16px 20px;
      border-top: 1px solid #eee;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .action-dialog {
        max-width: 95vw;
      }

      .dialog-content {
        padding: 16px;
      }

      .form-section {
        margin-bottom: 24px;
        padding-bottom: 16px;
      }

      .groups-list,
      .services-list {
        flex-direction: column;
      }
    }
  `]
})
export class ActionDialogComponent implements OnInit, OnDestroy {
  actionForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  availableGroups: Group[] = [];
  availableServices: Service[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ActionDialogData,
    private approvalFlowApiService: ApprovalFlowApiService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.actionForm = this.fb.group({
      name: ['', [Validators.required]],
      name_ara: ['', [Validators.required]],
      code: [''],
      groups: [[], [Validators.required]],
      services: [[], [Validators.required]],
      active_ind: [true]
    });

    // If editing, populate form with existing data
    if (this.data.mode === 'edit' && this.data.action) {
      this.populateFormWithExistingData();
    }
  }

  private populateFormWithExistingData(): void {
    if (!this.data.action) return;

    this.actionForm.patchValue({
      name: this.data.action.name,
      name_ara: this.data.action.name_ara,
      code: this.data.action.code,
      groups: this.data.action.groups.map(g => g.id),
      services: this.data.action.services.map(s => s.id),
      active_ind: this.data.action.active_ind
    });
  }

  public loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (!this.approvalFlowApiService.isConfigured()) {
      this.errorMessage = 'API not configured. Please configure the base URL first.';
      this.isLoading = false;
      return;
    }

    const loadOperations = {
      groups: this.approvalFlowApiService.getGroups().pipe(catchError((error) => {
        console.error('Groups loading failed:', error);
        return of({ count: 0, results: [] as Group[] });
      })),
      services: this.approvalFlowApiService.getServiceTypes().pipe(catchError((error) => {
        console.error('Services loading failed:', error);
        return of({ count: 0, results: [] as LookupItem[] });
      }))
    };

    forkJoin(loadOperations)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          this.availableGroups = responses.groups.results || [];
          this.availableServices = (responses.services.results || []).map(lookup => ({
            id: lookup.id,
            name: lookup.name,
            name_ara: lookup.name_ara,
            code: lookup.code,
            icon: lookup.icon || undefined, // Fix: handle null values
            active_ind: lookup.active_ind
          }));

          this.isLoading = false;

          console.log('Loaded action dialog data:', {
            groups: this.availableGroups.length,
            services: this.availableServices.length
          });
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = `Failed to load data: ${error.message}`;
          console.error('Error loading action dialog data:', error);
        }
      });
  }

  getSelectedGroups(): Group[] {
    const selectedGroupIds = this.actionForm.get('groups')?.value || [];
    return this.availableGroups.filter(group => selectedGroupIds.includes(group.id));
  }

  getSelectedServices(): Service[] {
    const selectedServiceIds = this.actionForm.get('services')?.value || [];
    return this.availableServices.filter(service => selectedServiceIds.includes(service.id));
  }

  onSave(): void {
    if (this.actionForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSaving = true;

    const formValue = this.actionForm.value;
    const actionData: Partial<Action> = {
      name: formValue.name,
      name_ara: formValue.name_ara,
      code: formValue.code || null,
      groups: this.getSelectedGroups(),
      services: this.getSelectedServices(),
      active_ind: formValue.active_ind
    };

    const operation = this.data.mode === 'create'
      ? this.approvalFlowApiService.createAction(actionData)
      : this.approvalFlowApiService.updateAction(this.data.action!.id, actionData);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (action) => {
        this.isSaving = false;

        const message = this.data.mode === 'create'
          ? 'Action created successfully'
          : 'Action updated successfully';

        this.snackBar.open(message, 'Close', { duration: 3000 });

        const result: ActionDialogResult = {
          action,
          mode: this.data.mode
        };

        this.dialogRef.close(result);
      },
      error: (error) => {
        this.isSaving = false;
        const message = this.data.mode === 'create'
          ? 'Failed to create action'
          : 'Failed to update action';

        this.snackBar.open(`${message}: ${error.message}`, 'Close', { duration: 5000 });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.actionForm.controls).forEach(key => {
      const control = this.actionForm.get(key);
      control?.markAsTouched();
    });
  }
}
