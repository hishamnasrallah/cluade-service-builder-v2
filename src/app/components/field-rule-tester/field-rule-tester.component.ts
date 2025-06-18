// src/app/components/field-rule-tester/field-rule-tester.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MapperFieldRule, TestResult } from '../../models/mapper.models';
import { MapperApiService } from '../../services/mapper-api.service';

@Component({
  selector: 'app-field-rule-tester',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl:'field-rule-tester.component.html',
  styles: [`
    .field-rule-tester {
      max-width: 600px;
      margin: 16px auto;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    .test-actions {
      margin: 16px 0;
      text-align: center;
    }

    .test-result {
      margin-top: 16px;
    }

    .result-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .result-status.success {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .result-status.error {
      background-color: #ffebee;
      color: #c62828;
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .result-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    pre {
      background-color: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 0;
    }

    .error-message {
      color: #c62828;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
    }

    .loading p {
      margin-top: 16px;
      color: #666;
    }
  `]
})
export class FieldRuleTesterComponent {
  @Input() fieldRule?: MapperFieldRule;
  @Output() testCompleted = new EventEmitter<TestResult>();

  testInput = '';
  testResult?: TestResult;
  testing = false;

  constructor(private mapperApi: MapperApiService) {}

  runTest(): void {
    if (!this.fieldRule || !this.fieldRule.id) return;

    this.testing = true;
    this.testResult = undefined;

    let testData;
    try {
      testData = JSON.parse(this.testInput || '{}');
    } catch (e) {
      this.testing = false;
      this.testResult = {
        field_rule_id: this.fieldRule.id,
        input_value: this.testInput,
        output_value: null,
        success: false,
        error: 'Invalid JSON input',
        execution_time_ms: 0
      };
      return;
    }

    this.mapperApi.testFieldRule(this.fieldRule.id, testData).subscribe({
      next: (result) => {
        this.testResult = result;
        this.testing = false;
        this.testCompleted.emit(result);
      },
      error: (error) => {
        this.testing = false;
        this.testResult = {
          field_rule_id: this.fieldRule!.id!,
          input_value: testData,
          output_value: null,
          success: false,
          error: error.message || 'Test failed',
          execution_time_ms: 0
        };
      }
    });
  }

  formatJson(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
