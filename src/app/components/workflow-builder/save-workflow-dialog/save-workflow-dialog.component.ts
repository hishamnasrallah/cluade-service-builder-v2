// components/workflow-builder/save-workflow-dialog/save-workflow-dialog.component.ts
import { Component, OnInit, Inject } from '@angular/core';
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

import { ApiService, LookupItem } from '../../../services/api.service';

export interface SaveWorkflowData {
  workflowId?: number;
  name?: string;
  description?: string;
  serviceId?: number;
  isUpdate?: boolean;
}

export interface SaveWorkflowResult {
  name: string;
  description?: string;
  serviceId?: number;
  isActive: boolean;
}

@Component({
  selector: 'app-save-workflow-dialog',
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
    <div class="save-workflow-dialog">
      <h2 mat-dialog-title>
        <mat-icon>{{ data.isUpdate ? 'save' : 'save_as' }}</mat-icon>
        {{ data.isUpdate ? 'Update' : 'Save' }} Service Flow
      </h2>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="saveForm" (ngSubmit)="onSave()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Workflow Name</mat-label>
            <input matInput
                   formControlName="name"
                   placeholder="Enter workflow name"
                   required>
            <mat-error *ngIf="saveForm.get('name')?.hasError('required')">
              Name is required
            </mat-error>
            <mat-error *ngIf="saveForm.get('name')?.hasError('maxlength')">
              Name cannot exceed 100 characters
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput
                      formControlName="description"
                      placeholder="Enter workflow description (optional)"
                      rows="3">
            </textarea>
            <mat-hint>Provide a brief description of what this workflow does</mat-hint>
            <mat-error *ngIf="saveForm.get('description')?.hasError('maxlength')">
              Description cannot exceed 500 characters
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Associated Service</mat-label>
            <mat-select formControlName="serviceId" (openedChange)="onServiceDropdownOpen($event)">
              <mat-option value="">No specific service</mat-option>
              <mat-option *ngFor="let service of services" [value]="service.id">
                {{ service.name }} ({{ service.name_ara }})
              </mat-option>
              <mat-option *ngIf="services.length === 0 && !isLoadingServices" value="" disabled>
                No services available
              </mat-option>
              <mat-option *ngIf="isLoadingServices" value="" disabled>
                Loading services...
              </mat-option>
            </mat-select>
            <mat-hint>Optionally associate this workflow with a specific service</mat-hint>
          </mat-form-field>

          <div class="form-options">
            <mat-checkbox formControlName="isActive">
              Active workflow
            </mat-checkbox>
            <small class="option-hint">
              Inactive workflows are not visible in the main workflow list
            </small>
          </div>

          <div *ngIf="data.isUpdate" class="update-warning">
            <mat-icon>info</mat-icon>
            <span>This will update the existing workflow. The previous version will be overwritten.</span>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" [disabled]="isSaving">
          <mat-icon>close</mat-icon>
          Cancel
        </button>

        <button mat-raised-button
                color="primary"
                (click)="onSave()"
                [disabled]="saveForm.invalid || isSaving">
          <mat-spinner diameter="20" *ngIf="isSaving"></mat-spinner>
          <mat-icon *ngIf="!isSaving">{{ data.isUpdate ? 'save' : 'save_as' }}</mat-icon>
          {{ isSaving ? 'Saving...' : (data.isUpdate ? 'Update' : 'Save') }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .save-workflow-dialog {
      width: 100%;
      max-width: 500px;
    }

    .dialog-content {
      padding: 20px;
      min-height: 300px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-options {
      margin: 16px 0;
    }

    .option-hint {
      display: block;
      margin-top: 4px;
      color: #666;
      font-size: 12px;
    }

    .update-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      margin-top: 16px;
      color: #856404;
    }

    .update-warning mat-icon {
      color: #ff9800;
    }

    mat-dialog-actions {
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
    }

    mat-spinner {
      margin-right: 8px;
    }

    @media (max-width: 768px) {
      .save-workflow-dialog {
        max-width: 90vw;
      }

      .dialog-content {
        padding: 16px;
      }
    }
  `]
})
export class SaveWorkflowDialogComponent implements OnInit {
  saveForm!: FormGroup;
  services: LookupItem[] = [];
  isLoadingServices = false;
  isSaving = false;

  constructor(
    private dialogRef: MatDialogRef<SaveWorkflowDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SaveWorkflowData,
    private fb: FormBuilder,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadServices();
  }

  private initializeForm(): void {
    this.saveForm = this.fb.group({
      name: [
        this.data.name || '',
        [Validators.required, Validators.maxLength(100)]
      ],
      description: [
        this.data.description || '',
        [Validators.maxLength(500)]
      ],
      serviceId: [this.data.serviceId || ''],
      isActive: [true]
    });
  }

  private loadServices(): void {
    if (!this.apiService.isConfigured()) {
      console.warn('API not configured, cannot load services');
      return;
    }

    this.isLoadingServices = true;

    this.apiService.getServices().subscribe({
      next: (response) => {
        this.services = response.results || [];
        this.isLoadingServices = false;
        console.log('Loaded services for save dialog:', this.services);
      },
      error: (error) => {
        this.isLoadingServices = false;
        console.error('Error loading services:', error);
        // Don't show error to user as services are optional
      }
    });
  }

  onServiceDropdownOpen(opened: boolean): void {
    if (opened && this.services.length === 0 && !this.isLoadingServices) {
      this.loadServices();
    }
  }

  onSave(): void {
    if (this.saveForm.valid && !this.isSaving) {
      this.isSaving = true;

      const formValue = this.saveForm.value;
      const result: SaveWorkflowResult = {
        name: formValue.name.trim(),
        description: formValue.description ? formValue.description.trim() : undefined,
        serviceId: formValue.serviceId || undefined,
        isActive: formValue.isActive
      };

      // Simulate save delay for better UX
      setTimeout(() => {
        this.dialogRef.close(result);
      }, 500);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
