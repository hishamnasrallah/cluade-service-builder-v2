// src/app/components/mapper-builder/components/transform-function-manager/transform-function-manager.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MonacoEditorModule } from 'ngx-monaco-editor';

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
    MonacoEditorModule
  ],
  templateUrl: './transform-function-manager.component.html',
  styleUrls: ['./transform-function-manager.component.scss']
})
export class TransformFunctionManagerComponent implements OnInit {
  transformFunctions: TransformFunction[] = [];
  displayedColumns = ['name', 'description', 'module', 'builtin', 'actions'];

  // Code editor options
  editorOptions = {
    theme: 'vs-dark',
    language: 'python',
    automaticLayout: true,
    minimap: { enabled: false }
  };

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
  template: `<!-- See separate file -->`,
  styles: [`/* See separate file */`],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MonacoEditorModule
  ]
})
export class TransformFunctionEditorDialogComponent {
  // Implementation in separate file
}
