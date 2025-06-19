// src/app/components/mapper-builder/components/batch-operations/batch-operations.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';

import { MapperTarget, BatchOperationRequest } from '../../../../models/mapper.models';
import { MapperApiService } from '../../../../services/mapper-api.service';

export interface BatchOperationDialogData {
  targets: MapperTarget[];
  selectedTargets?: string[];
}

@Component({
  selector: 'app-batch-operations',
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
    MatChipsModule,
    MatProgressBarModule,
    MatListModule
  ],
  templateUrl: './batch-operations.component.html'
})
export class BatchOperationsComponent {
  operationForm: FormGroup;
  selectedTargets: Set<string> = new Set();
  isProcessing = false;
  progress = 0;

  operations = [
    { value: 'activate', label: 'Activate Targets', icon: 'visibility' },
    { value: 'deactivate', label: 'Deactivate Targets', icon: 'visibility_off' },
    { value: 'update_model', label: 'Update Model', icon: 'data_object' },
    { value: 'add_processor', label: 'Add Processor Function', icon: 'functions' },
    { value: 'remove_processor', label: 'Remove Processor Function', icon: 'remove_circle' },
    { value: 'bulk_delete', label: 'Delete Targets', icon: 'delete', danger: true }
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: MapperApiService,
    public dialogRef: MatDialogRef<BatchOperationsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BatchOperationDialogData
  ) {
    this.operationForm = this.fb.group({
      operation: ['', Validators.required],
      targetModel: [''],
      processorPath: [''],
      confirmDelete: [false]
    });

    // Pre-select targets if provided
    if (data.selectedTargets) {
      data.selectedTargets.forEach(id => this.selectedTargets.add(id));
    }
  }

  toggleTarget(targetId: string): void {
    if (this.selectedTargets.has(targetId)) {
      this.selectedTargets.delete(targetId);
    } else {
      this.selectedTargets.add(targetId);
    }
  }

  selectAll(): void {
    this.data.targets.forEach(target => {
      if (target.id) {
        this.selectedTargets.add(target.id);
      }
    });
  }

  deselectAll(): void {
    this.selectedTargets.clear();
  }

  getSelectedCount(): number {
    return this.selectedTargets.size;
  }

  isTargetSelected(targetId: string): boolean {
    return this.selectedTargets.has(targetId);
  }

  getOperationIcon(operation: string): string {
    const op = this.operations.find(o => o.value === operation);
    return op?.icon || 'settings';
  }

  isOperationDangerous(operation: string): boolean {
    const op = this.operations.find(o => o.value === operation);
    return op?.danger || false;
  }

  canExecute(): boolean {
    const form = this.operationForm.value;

    if (this.selectedTargets.size === 0) return false;
    if (!form.operation) return false;

    if (form.operation === 'bulk_delete' && !form.confirmDelete) return false;
    if (form.operation === 'update_model' && !form.targetModel) return false;
    if (['add_processor', 'remove_processor'].includes(form.operation) && !form.processorPath) return false;

    return true;
  }

  execute(): void {
    if (!this.canExecute()) return;

    const form = this.operationForm.value;
    const targetIds = Array.from(this.selectedTargets);

    const request: BatchOperationRequest = {
      operation: form.operation,
      target_ids: targetIds,
      data: {}
    };

    // Add operation-specific data
    switch (form.operation) {
      case 'update_model':
        request.data.model = form.targetModel;
        break;
      case 'add_processor':
      case 'remove_processor':
        request.data.processor_path = form.processorPath;
        break;
    }

    this.isProcessing = true;
    this.progress = 0;

    // Simulate progress
    const progressInterval = setInterval(() => {
      this.progress += 10;
      if (this.progress >= 90) {
        clearInterval(progressInterval);
      }
    }, 200);

    this.apiService.batchUpdateTargets(request).subscribe({
      next: (result) => {
        clearInterval(progressInterval);
        this.progress = 100;
        setTimeout(() => {
          this.dialogRef.close(result);
        }, 500);
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.isProcessing = false;
        console.error('Batch operation failed:', error);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}