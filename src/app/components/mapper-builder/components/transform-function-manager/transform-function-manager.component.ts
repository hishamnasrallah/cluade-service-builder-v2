// src/app/components/mapper-builder/components/transform-function-manager/transform-function-manager.component.ts

import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
// Note: MonacoEditorModule would need to be installed separately
// import { MonacoEditorModule } from 'ngx-monaco-editor';

import { TransformFunction } from '../../../../models/mapper.models';
import { MapperApiService } from '../../../../services/mapper-api.service';

@Component({
  selector: 'app-transform-function-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatTabsModule,
    MatChipsModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSnackBarModule,
    // MonacoEditorModule
  ],
  templateUrl:'./transform-function-manager.component.html',
  styleUrls:['../transform-function-manager/transform-function-manager.scss']
})
export class TransformFunctionManagerComponent implements OnInit {
  transformFunctions: TransformFunction[] = [];
  displayedColumns = ['name', 'description', 'module', 'builtin', 'actions'];

  selectedFunction?: TransformFunction;
  testForm: FormGroup;
  testResult?: any;

  constructor(
    private fb: FormBuilder,
    private apiService: MapperApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.testForm = this.fb.group({
      testValue: ['', Validators.required],
      contextData: ['{}']
    });
  }

  ngOnInit(): void {
    this.loadTransformFunctions();
  }

  loadTransformFunctions(): void {
    this.apiService.getTransformFunctions().subscribe({
      next: (functions) => {
        this.transformFunctions = functions;
      },
      error: (error) => {
        console.error('Failed to load transform functions:', error);
        this.snackBar.open('Failed to load transform functions', 'Close', { duration: 5000 });
      }
    });
  }

  createNewFunction(): void {
    // Open dialog to create new function
    const dialogRef = this.dialog.open(TransformFunctionEditorDialogComponent, {
      width: '800px',
      data: { function: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTransformFunctions();
      }
    });
  }

  editFunction(func: TransformFunction): void {
    const dialogRef = this.dialog.open(TransformFunctionEditorDialogComponent, {
      width: '800px',
      data: { function: func }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTransformFunctions();
      }
    });
  }

  testFunction(func: TransformFunction): void {
    this.selectedFunction = func;
  }

  runTest(): void {
    if (!this.selectedFunction || !this.testForm.valid) return;

    const testData = {
      value: this.testForm.get('testValue')?.value,
      context: JSON.parse(this.testForm.get('contextData')?.value || '{}')
    };

    // In real implementation, this would call an API to test the function
    this.snackBar.open('Testing function...', '', { duration: 2000 });

    // Simulate test result
    setTimeout(() => {
      this.testResult = {
        input: testData.value,
        output: `TRANSFORMED: ${testData.value}`,
        success: true
      };
    }, 1000);
  }

  deleteFunction(func: TransformFunction): void {
    if (func.is_builtin) {
      this.snackBar.open('Cannot delete built-in functions', 'Close', { duration: 3000 });
      return;
    }

    if (confirm(`Delete transform function "${func.label}"?`)) {
      // API call to delete
      this.snackBar.open('Function deleted', 'Close', { duration: 3000 });
      this.loadTransformFunctions();
    }
  }
}

// Dialog component for editing transform functions
@Component({
  selector: 'app-transform-function-editor-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.function ? 'edit' : 'add' }}</mat-icon>
      {{ data.function ? 'Edit' : 'Create' }} Transform Function
    </h2>

    <mat-dialog-content>
      <form [formGroup]="functionForm" class="function-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Function Name</mat-label>
          <input matInput formControlName="name" placeholder="my_transform">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Module Path</mat-label>
          <input matInput formControlName="module" placeholder="myapp.transforms">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Label</mat-label>
          <input matInput formControlName="label" placeholder="My Transform">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <div class="code-editor-section">
          <label>Function Code:</label>
          <div class="code-editor">
            <textarea
              formControlName="code"
              class="code-textarea"
              placeholder="def my_transform(value, context=None):
    # Transform logic here
    return transformed_value">
            </textarea>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!functionForm.valid">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .function-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 600px;
    }

    .full-width {
      width: 100%;
    }

    .code-editor-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .code-editor-section label {
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }

    .code-textarea {
      width: 100%;
      min-height: 300px;
      padding: 12px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class TransformFunctionEditorDialogComponent {
  functionForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TransformFunctionEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { function: TransformFunction | null }
  ) {
    this.functionForm = this.fb.group({
      name: [data.function?.path.split('.').pop() || '', Validators.required],
      module: [data.function?.path.split('.').slice(0, -1).join('.') || '', Validators.required],
      label: [data.function?.label || '', Validators.required],
      description: [data.function?.description || ''],
      code: [data.function?.code || '', Validators.required]
    });
  }

  save(): void {
    if (this.functionForm.valid) {
      const formValue = this.functionForm.value;
      const result = {
        path: `${formValue.module}.${formValue.name}`,
        label: formValue.label,
        description: formValue.description,
        code: formValue.code
      };
      this.dialogRef.close(result);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}