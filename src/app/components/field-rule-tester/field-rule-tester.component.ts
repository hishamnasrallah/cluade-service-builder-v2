// src/app/components/mapper-builder/components/field-rule-tester/field-rule-tester.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MonacoEditorModule } from 'ngx-monaco-editor';

import { MapperFieldRule, TestResult } from '../../models/mapper.models';
import { MapperApiService } from '../../services/mapper-api.service';

@Component({
  selector: 'app-field-rule-tester',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MonacoEditorModule
  ],
  templateUrl: './field-rule-tester.component.html',
  styleUrls: ['./field-rule-tester.component.scss']
})
export class FieldRuleTesterComponent implements OnInit {
  @Input() fieldRule?: MapperFieldRule;
  @Input() caseData?: any;

  testForm: FormGroup;
  testResult?: TestResult;
  isLoading = false;

  editorOptions = {
    theme: 'vs-light',
    language: 'json',
    automaticLayout: true,
    minimap: { enabled: false }
  };

  constructor(
    private fb: FormBuilder,
    private apiService: MapperApiService
  ) {
    this.testForm = this.fb.group({
      testData: ['{\n  "user": {\n    "name": "John Doe",\n    "age": 30\n  }\n}'],
      contextOverride: ['{}']
    });
  }

  ngOnInit(): void {
    if (this.caseData) {
      this.testForm.patchValue({
        testData: JSON.stringify(this.caseData, null, 2)
      });
    }
  }

  runTest(): void {
    if (!this.fieldRule || !this.fieldRule.id) return;

    try {
      const testData = JSON.parse(this.testForm.get('testData')?.value);
      const context = JSON.parse(this.testForm.get('contextOverride')?.value);

      this.isLoading = true;
      this.testResult = undefined;

      this.apiService.testFieldRule(this.fieldRule.id, {
        data: testData,
        context: context
      }).subscribe({
        next: (result) => {
          this.testResult = result;
          this.isLoading = false;
        },
        error: (error) => {
          this.testResult = {
            success: false,
            error: error.message || 'Test failed',
            execution_time: 0
          };
          this.isLoading = false;
        }
      });
    } catch (e) {
      this.testResult = {
        success: false,
        error: 'Invalid JSON in test data',
        execution_time: 0
      };
    }
  }

  getExtractedPath(): string {
    if (!this.testResult || !this.testResult.extracted_value) {
      return 'No value extracted';
    }
    return JSON.stringify(this.testResult.extracted_value, null, 2);
  }

  getTransformedValue(): string {
    if (!this.testResult || !this.testResult.transformed_value) {
      return 'No transformation applied';
    }
    return JSON.stringify(this.testResult.transformed_value, null, 2);
  }

  getFinalValue(): string {
    if (!this.testResult || !this.testResult.final_value) {
      return 'No final value';
    }
    return JSON.stringify(this.testResult.final_value, null, 2);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }
}
