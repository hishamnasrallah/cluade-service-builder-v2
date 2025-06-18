// src/app/components/mapper-builder/preview/preview.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';  // Add this for mat-chip-list

import { MapperTarget, PreviewResult } from '../../../models/mapper.models';

interface TestCase {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatListModule  // Add this
  ],
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.scss'
})
export class PreviewComponent implements OnInit {
  @Input() target!: MapperTarget;
  @Input() previewResult?: PreviewResult;
  @Output() runPreview = new EventEmitter<number>();

  testCases: TestCase[] = [
    { id: 1, name: 'Test Case 1', description: 'Basic user registration', created_at: '2024-01-15' },
    { id: 2, name: 'Test Case 2', description: 'Employee onboarding', created_at: '2024-01-20' },
    { id: 3, name: 'Test Case 3', description: 'Complex nested data', created_at: '2024-01-25' }
  ];

  selectedCaseId: number | null = null;
  customCaseId?: number;
  isRunning = false;
  error?: string;

  displayedColumns = ['source_path', 'target_field', 'source_value', 'mapped_value', 'transform', 'condition'];

  ngOnInit(): void {
    // Select first test case by default
    if (this.testCases.length > 0) {
      this.selectedCaseId = this.testCases[0].id;
    }
  }

  canRunPreview(): boolean {
    return this.selectedCaseId !== null || (this.customCaseId !== undefined && this.customCaseId > 0);
  }

  onCaseChange(): void {
    if (this.selectedCaseId !== null) {
      this.customCaseId = undefined;
    }
  }

  onRunPreview(): void {  // Changed from runPreview to onRunPreview
    const caseId = this.selectedCaseId !== null ? this.selectedCaseId : this.customCaseId;
    if (caseId !== undefined) {
      this.isRunning = true;
      this.error = undefined;
      this.runPreview.emit(caseId);

      // Simulate completion
      setTimeout(() => {
        this.isRunning = false;
      }, 2000);
    }
  }

  clearError(): void {
    this.error = undefined;
  }

  getActionIcon(action: string): string {
    switch (action?.toUpperCase()) {
      case 'CREATE': return 'add_circle';
      case 'UPDATE': return 'edit';
      case 'DELETE': return 'delete';
      default: return 'help';
    }
  }

  getActionClass(action: string): string {
    return action?.toLowerCase() || '';
  }

  getActionColor(action: string): 'primary' | 'accent' | 'warn' {
    switch (action?.toUpperCase()) {
      case 'CREATE': return 'primary';
      case 'UPDATE': return 'accent';
      case 'DELETE': return 'warn';
      default: return 'primary';
    }
  }

  formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  formatJson(data: any): string {
    if (!data) return 'No data';
    return JSON.stringify(data, null, 2);
  }

  formatPreview(result: PreviewResult): string {
    if (result.preview_fields) {
      return this.formatJson(result.preview_fields);
    }
    if (result.preview_list) {
      return this.formatJson(result.preview_list);
    }
    return 'No preview data';
  }
}
