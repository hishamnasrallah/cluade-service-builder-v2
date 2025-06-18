// src/app/components/mapper-builder/dialogs/import-mapper-dialog/import-mapper-dialog.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';

import { MapperExportData } from '../../../../models/mapper.models';
import { MapperApiService } from '../../../../services/mapper-api.service';

@Component({
  selector: 'app-import-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatRadioModule,
    MatCheckboxModule,
    MatStepperModule,
    MatListModule,
    MatChipsModule,
    MatExpansionModule
  ],
  templateUrl:"import-mapper-dialog.component.html",
  styleUrl:"import-mapper-dialog.component.css"
})
export class ImportMapperDialogComponent implements OnInit {
  fileForm: FormGroup;
  validationForm: FormGroup;
  optionsForm: FormGroup;

  selectedFile: File | null = null;
  importData: MapperExportData | null = null;
  validationErrors: string[] = [];
  validationWarnings: string[] = [];
  isImporting = false;
  importResult: any = null;
  isDragOver = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ImportMapperDialogComponent>,
    private apiService: MapperApiService
  ) {
    this.fileForm = this.fb.group({
      importMethod: ['file', Validators.required],
      jsonContent: ['']
    });

    this.validationForm = this.fb.group({
      validated: [false, Validators.requiredTrue]
    });

    this.optionsForm = this.fb.group({
      importAction: ['new', Validators.required],
      setAsActive: [true],
      preserveIds: [false],
      importLogs: [false]
    });
  }

  ngOnInit(): void {
    // Add JSON validation
    this.fileForm.get('jsonContent')?.valueChanges.subscribe(value => {
      if (value && this.fileForm.get('importMethod')?.value === 'paste') {
        try {
          JSON.parse(value);
          this.fileForm.get('jsonContent')?.setErrors(null);
        } catch {
          this.fileForm.get('jsonContent')?.setErrors({ invalidJson: true });
        }
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (file.type !== 'application/json') {
      // Show error
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.fileForm.patchValue({ jsonContent: content });
    };

    reader.readAsText(file);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileForm.patchValue({ jsonContent: '' });
  }

  canProceedToValidation(): boolean {
    const method = this.fileForm.get('importMethod')?.value;
    if (method === 'file') {
      return !!this.selectedFile;
    } else {
      const content = this.fileForm.get('jsonContent')?.value;
      return !!content && !this.fileForm.get('jsonContent')?.hasError('invalidJson');
    }
  }

  parseImportData(): void {
    try {
      const content = this.fileForm.get('jsonContent')?.value;
      this.importData = JSON.parse(content);
      this.validateImportData();
    } catch (error) {
      this.validationErrors = ['Failed to parse import data'];
    }
  }

  validateImportData(): void {
    this.validationErrors = [];
    this.validationWarnings = [];

    if (!this.importData) {
      this.validationErrors.push('No import data found');
      return;
    }

    // Validate mapper
    if (!this.importData.mapper) {
      this.validationErrors.push('Mapper configuration is missing');
    } else {
      if (!this.importData.mapper.name) {
        this.validationErrors.push('Mapper name is required');
      }
      if (!this.importData.mapper.case_type) {
        this.validationErrors.push('Case type is required');
      }
    }

    // Validate targets
    if (!this.importData.targets || this.importData.targets.length === 0) {
      this.validationWarnings.push('No targets found in import data');
    } else {
      this.importData.targets.forEach((target, index) => {
        if (!target.name) {
          this.validationErrors.push(`Target ${index + 1} is missing a name`);
        }
        if (!target.model) {
          this.validationErrors.push(`Target ${index + 1} is missing a model`);
        }
      });
    }

    // Check for conflicts
    if (this.importData.mapper?.name) {
      // Could check if mapper name already exists
      this.validationWarnings.push('A mapper with this name might already exist');
    }

    // Set validation status
    this.validationForm.patchValue({
      validated: this.validationErrors.length === 0
    });
  }

  performImport(): void {
    if (!this.importData) return;

    this.isImporting = true;
    const options = this.optionsForm.value;

    this.apiService.importMapper(this.importData).subscribe({
      next: (result) => {
        this.importResult = {
          success: true,
          message: 'Mapper imported successfully',
          mapperId: result.mapper_id,
          targetsCreated: result.target_ids?.length || 0,
          rulesCreated: this.importData?.targets?.reduce((sum, t) => sum + (t.field_rules?.length || 0), 0) || 0
        };
        this.isImporting = false;
      },
      error: (error) => {
        this.importResult = {
          success: false,
          message: 'Failed to import mapper',
          error: error.error?.message || error.message
        };
        this.isImporting = false;
      }
    });
  }

  reset(): void {
    this.selectedFile = null;
    this.importData = null;
    this.validationErrors = [];
    this.validationWarnings = [];
    this.importResult = null;
    this.fileForm.reset({ importMethod: 'file' });
    this.validationForm.reset();
    this.optionsForm.reset({
      importAction: 'new',
      setAsActive: true,
      preserveIds: false,
      importLogs: false
    });
  }

  close(): void {
    this.dialogRef.close(this.importResult);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
