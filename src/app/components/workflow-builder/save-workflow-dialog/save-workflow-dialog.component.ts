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
  templateUrl: './save-workflow-dialog.component.html',
  styleUrl: './save-workflow-dialog.component.css'
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
