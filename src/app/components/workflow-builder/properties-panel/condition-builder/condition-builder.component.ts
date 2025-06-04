// components/workflow-builder/properties-panel/condition-builder/condition-builder.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators, FormsModule} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { ConditionLogic } from '../../../../models/workflow.models';

@Component({
  selector: 'app-condition-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    DragDropModule,
    FormsModule
  ],
  template: `
    <div class="condition-builder">
      <mat-tab-group animationDuration="200ms">
        <!-- Visual Builder Tab -->
        <mat-tab label="Visual Builder">
          <div class="visual-builder">
            <div class="builder-header">
              <h4>Condition Rules</h4>
              <button mat-icon-button (click)="addCondition()" color="primary" matTooltip="Add Rule">
                <mat-icon>add</mat-icon>
              </button>
            </div>

            <div class="conditions-list"
                 cdkDropList
                 (cdkDropListDropped)="onConditionDrop($event)">

              <mat-card *ngFor="let condition of conditionsArray.controls; let i = index; trackBy: trackCondition"
                        class="condition-card"
                        cdkDrag>

                <mat-card-header>
                  <div class="condition-header">
                    <span class="condition-number">{{ i + 1 }}</span>
                    <span class="drag-handle" cdkDragHandle>
                      <mat-icon>drag_indicator</mat-icon>
                    </span>
                    <span class="spacer"></span>
                    <button mat-icon-button
                            (click)="removeCondition(i)"
                            color="warn"
                            matTooltip="Remove Rule">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </mat-card-header>

                <mat-card-content [formGroup]="getConditionGroup(i)">
                  <div class="condition-content">
                    <!-- Field Selection -->
                    <mat-form-field appearance="outline" class="condition-field">
                      <mat-label>Field</mat-label>
                      <mat-select formControlName="field" required>
                        <mat-option *ngFor="let field of availableFields" [value]="field.value">
                          {{ field.label }}
                        </mat-option>
                      </mat-select>
                      <mat-error>Field is required</mat-error>
                    </mat-form-field>

                    <!-- Operation Selection -->
                    <mat-form-field appearance="outline" class="condition-operation">
                      <mat-label>Operation</mat-label>
                      <mat-select formControlName="operation" required>
                        <mat-optgroup *ngFor="let group of operationGroups" [label]="group.label">
                          <mat-option *ngFor="let op of group.operations" [value]="op.value">
                            {{ op.label }}
                          </mat-option>
                        </mat-optgroup>
                      </mat-select>
                      <mat-error>Operation is required</mat-error>
                    </mat-form-field>

                    <!-- Value Input -->
                    <mat-form-field appearance="outline" class="condition-value">
                      <mat-label>Value</mat-label>
                      <input matInput
                             formControlName="value"
                             [type]="getValueInputType(getConditionGroup(i).get('operation')?.value)"
                             required>
                      <mat-error>Value is required</mat-error>
                    </mat-form-field>

                    <!-- Logical Operator (for multiple conditions) -->
                    <mat-form-field appearance="outline"
                                    class="logical-operator"
                                    *ngIf="i < conditionsArray.length - 1">
                      <mat-label>Then</mat-label>
                      <mat-select formControlName="logical_operator">
                        <mat-option value="and">AND</mat-option>
                        <mat-option value="or">OR</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>

                  <!-- Condition Preview -->
                  <div class="condition-preview">
                    <mat-icon>visibility</mat-icon>
                    <span>{{ getConditionPreview(i) }}</span>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <!-- Add Condition Button -->
            <div class="add-condition" *ngIf="conditionsArray.length === 0">
              <button mat-raised-button color="primary" (click)="addCondition()">
                <mat-icon>add</mat-icon>
                Add First Condition
              </button>
              <p>No conditions defined. Add a condition to get started.</p>
            </div>
          </div>
        </mat-tab>

        <!-- JSON Editor Tab -->
        <mat-tab label="JSON Editor">
          <div class="json-editor">
            <div class="json-header">
              <h4>JSON Configuration</h4>
              <div class="json-actions">
                <button mat-button (click)="formatJson()" matTooltip="Format JSON">
                  <mat-icon>code</mat-icon>
                  Format
                </button>
                <button mat-button (click)="validateJson()" matTooltip="Validate JSON">
                  <mat-icon>check_circle</mat-icon>
                  Validate
                </button>
                <button mat-button (click)="importFromJson()" matTooltip="Import from JSON">
                  <mat-icon>upload</mat-icon>
                  Import
                </button>
              </div>
            </div>

            <mat-form-field appearance="outline" class="json-textarea">
              <mat-label>Condition Logic JSON</mat-label>
              <textarea matInput
                        [(ngModel)]="jsonText"
                        (blur)="onJsonChange()"
                        rows="15"
                        placeholder='[{"field": "field_name", "operation": "=", "value": "some_value", "logical_operator": "and"}]'>
              </textarea>
              <mat-hint>Enter condition logic as JSON array</mat-hint>
              <mat-error *ngIf="jsonError">{{ jsonError }}</mat-error>
            </mat-form-field>

            <!-- JSON Examples -->
            <div class="json-examples">
              <h5>Examples:</h5>
              <mat-card class="example-card" *ngFor="let example of jsonExamples">
                <mat-card-header>
                  <mat-card-title>{{ example.title }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <pre class="example-code">{{ example.code }}</pre>
                  <button mat-button (click)="loadExample(example)" color="primary">
                    Use This Example
                  </button>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Test Tab -->
        <mat-tab label="Test">
          <div class="condition-tester">
            <h4>Test Conditions</h4>
            <p>Enter test values to see if your conditions evaluate correctly.</p>

            <div class="test-inputs">
              <mat-form-field *ngFor="let field of getUniqueFields()"
                              appearance="outline"
                              class="test-field">
                <mat-label>{{ field.label }}</mat-label>
                <input matInput
                       [(ngModel)]="testValues[field.value]"
                       (input)="evaluateTestConditions()">
              </mat-form-field>
            </div>

            <mat-divider></mat-divider>

            <div class="test-results">
              <h5>Results:</h5>
              <div class="result-item" *ngFor="let result of testResults; let i = index">
                <span class="result-condition">Condition {{ i + 1 }}:</span>
                <mat-icon [class.success]="result.passed" [class.failed]="!result.passed">
                  {{ result.passed ? 'check_circle' : 'cancel' }}
                </mat-icon>
                <span [class.success]="result.passed" [class.failed]="!result.passed">
                  {{ result.passed ? 'PASS' : 'FAIL' }}
                </span>
                <span class="result-details">{{ result.details }}</span>
              </div>

              <div class="overall-result">
                <strong>Overall Result: </strong>
                <mat-icon [class.success]="overallResult" [class.failed]="!overallResult">
                  {{ overallResult ? 'check_circle' : 'cancel' }}
                </mat-icon>
                <span [class.success]="overallResult" [class.failed]="!overallResult">
                  {{ overallResult ? 'CONDITIONS MET' : 'CONDITIONS NOT MET' }}
                </span>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .condition-builder {
      width: 100%;
      min-height: 400px;
    }

    .visual-builder {
      padding: 16px 0;
    }

    .builder-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .builder-header h4 {
      margin: 0;
      color: #333;
    }

    .conditions-list {
      min-height: 200px;
    }

    .condition-card {
      margin-bottom: 16px;
      transition: all 0.2s ease;
    }

    .condition-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .condition-card.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .condition-header {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .condition-number {
      background: #2196F3;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
    }

    .drag-handle {
      cursor: move;
      color: #666;
    }

    .spacer {
      flex: 1;
    }

    .condition-content {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: start;
      margin-bottom: 16px;
    }

    .condition-field,
    .condition-operation,
    .condition-value,
    .logical-operator {
      min-width: 120px;
    }

    .condition-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f5f5f5;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #666;
    }

    .add-condition {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .add-condition p {
      margin: 8px 0 0 0;
      font-size: 14px;
    }

    .json-editor {
      padding: 16px 0;
    }

    .json-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .json-header h4 {
      margin: 0;
    }

    .json-actions {
      display: flex;
      gap: 8px;
    }

    .json-textarea {
      width: 100%;
      font-family: 'Courier New', monospace;
    }

    .json-textarea textarea {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.4;
    }

    .json-examples {
      margin-top: 24px;
    }

    .json-examples h5 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .example-card {
      margin-bottom: 16px;
    }

    .example-code {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      margin: 12px 0;
    }

    .condition-tester {
      padding: 16px 0;
    }

    .condition-tester h4 {
      margin: 0 0 8px 0;
    }

    .condition-tester p {
      margin: 0 0 24px 0;
      color: #666;
    }

    .test-inputs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .test-results {
      background: #f9f9f9;
      padding: 16px;
      border-radius: 4px;
    }

    .test-results h5 {
      margin: 0 0 16px 0;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding: 8px;
      background: white;
      border-radius: 4px;
    }

    .result-condition {
      font-weight: 500;
      min-width: 100px;
    }

    .result-details {
      font-size: 12px;
      color: #666;
      margin-left: auto;
    }

    .overall-result {
      margin-top: 16px;
      padding: 12px;
      background: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
    }

    .success {
      color: #4CAF50;
    }

    .failed {
      color: #f44336;
    }

    @media (max-width: 768px) {
      .condition-content {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .json-actions {
        flex-direction: column;
      }

      .test-inputs {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ConditionBuilderComponent implements OnInit {
  @Input() conditionLogic: ConditionLogic[] = [];
  @Output() conditionChanged = new EventEmitter<ConditionLogic[]>();

  conditionsForm!: FormGroup;
  jsonText = '';
  jsonError = '';
  testValues: { [key: string]: any } = {};
  testResults: { passed: boolean; details: string }[] = [];
  overallResult = false;

  availableFields = [
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'age', label: 'Age' },
    { value: 'salary', label: 'Salary' },
    { value: 'gender', label: 'Gender' },
    { value: 'has_children', label: 'Has Children' },
    { value: 'number_of_children', label: 'Number of Children' }
  ];

  operationGroups = [
    {
      label: 'Comparison',
      operations: [
        { value: '=', label: 'Equals (=)' },
        { value: '!=', label: 'Not Equals (≠)' },
        { value: '>', label: 'Greater Than (>)' },
        { value: '<', label: 'Less Than (<)' },
        { value: '>=', label: 'Greater Than or Equal (≥)' },
        { value: '<=', label: 'Less Than or Equal (≤)' }
      ]
    },
    {
      label: 'Text',
      operations: [
        { value: 'contains', label: 'Contains' },
        { value: 'startswith', label: 'Starts With' },
        { value: 'endswith', label: 'Ends With' },
        { value: 'matches', label: 'Matches Regex' }
      ]
    },
    {
      label: 'Set',
      operations: [
        { value: 'in', label: 'In List' },
        { value: 'not in', label: 'Not In List' }
      ]
    },
    {
      label: 'Math',
      operations: [
        { value: '+', label: 'Add (+)' },
        { value: '-', label: 'Subtract (-)' },
        { value: '*', label: 'Multiply (×)' },
        { value: '/', label: 'Divide (÷)' },
        { value: '**', label: 'Power (^)' }
      ]
    }
  ];

  jsonExamples = [
    {
      title: 'Simple Equality Check',
      code: `[
  {
    "field": "age",
    "operation": ">=",
    "value": 18
  }
]`,
      data: [{ field: 'age', operation: '>=', value: 18 }]
    },
    {
      title: 'Multiple Conditions with AND',
      code: `[
  {
    "field": "age",
    "operation": ">=",
    "value": 18,
    "logical_operator": "and"
  },
  {
    "field": "salary",
    "operation": ">",
    "value": 30000
  }
]`,
      data: [
        { field: 'age', operation: '>=', value: 18, logical_operator: 'and' },
        { field: 'salary', operation: '>', value: 30000 }
      ]
    },
    {
      title: 'Text Contains Check',
      code: `[
  {
    "field": "first_name",
    "operation": "contains",
    "value": "John"
  }
]`,
      data: [{ field: 'first_name', operation: 'contains', value: 'John' }]
    }
  ];

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadConditionsFromInput();
    this.updateJsonText();
  }

  private initializeForm(): void {
    this.conditionsForm = this.fb.group({
      conditions: this.fb.array([])
    });
  }

  get conditionsArray(): FormArray {
    return this.conditionsForm.get('conditions') as FormArray;
  }

  private createConditionGroup(condition?: ConditionLogic): FormGroup {
    return this.fb.group({
      field: [condition?.field || '', Validators.required],
      operation: [condition?.operation || '', Validators.required],
      value: [condition?.value || '', Validators.required],
      logical_operator: [condition?.logical_operator || 'and']
    });
  }

  private loadConditionsFromInput(): void {
    this.conditionsArray.clear();

    if (this.conditionLogic && this.conditionLogic.length > 0) {
      this.conditionLogic.forEach(condition => {
        this.conditionsArray.push(this.createConditionGroup(condition));
      });
    }
  }

  addCondition(): void {
    this.conditionsArray.push(this.createConditionGroup());
    this.emitChanges();
  }

  removeCondition(index: number): void {
    this.conditionsArray.removeAt(index);
    this.emitChanges();
  }

  getConditionGroup(index: number): FormGroup {
    return this.conditionsArray.at(index) as FormGroup;
  }

  onConditionDrop(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      const conditionsArray = this.conditionsArray;
      const item = conditionsArray.at(event.previousIndex);
      conditionsArray.removeAt(event.previousIndex);
      conditionsArray.insert(event.currentIndex, item);
      this.emitChanges();
    }
  }

  getConditionPreview(index: number): string {
    const condition = this.getConditionGroup(index);
    const field = condition.get('field')?.value || 'field';
    const operation = condition.get('operation')?.value || 'op';
    const value = condition.get('value')?.value || 'value';
    const logicalOp = condition.get('logical_operator')?.value || '';

    let preview = `${field} ${operation} ${value}`;
    if (index < this.conditionsArray.length - 1) {
      preview += ` ${logicalOp.toUpperCase()}`;
    }

    return preview;
  }

  getValueInputType(operation: string): string {
    if (['>', '<', '>=', '<=', '+', '-', '*', '/', '**'].includes(operation)) {
      return 'number';
    }
    return 'text';
  }

  private emitChanges(): void {
    const conditions = this.conditionsArray.value;
    this.conditionChanged.emit(conditions);
    this.updateJsonText();
  }

  private updateJsonText(): void {
    try {
      const conditions = this.conditionsArray.value;
      this.jsonText = JSON.stringify(conditions, null, 2);
      this.jsonError = '';
    } catch (error) {
      this.jsonError = 'Error generating JSON';
    }
  }

  onJsonChange(): void {
    this.validateJson();
  }

  formatJson(): void {
    try {
      const parsed = JSON.parse(this.jsonText);
      this.jsonText = JSON.stringify(parsed, null, 2);
      this.jsonError = '';
    } catch (error) {
      this.jsonError = 'Invalid JSON format';
    }
  }

  validateJson(): void {
    try {
      const parsed = JSON.parse(this.jsonText);
      if (Array.isArray(parsed)) {
        this.jsonError = '';
        return;
      }
      this.jsonError = 'JSON must be an array of conditions';
    } catch (error) {
      this.jsonError = 'Invalid JSON format';
    }
  }

  importFromJson(): void {
    try {
      const parsed = JSON.parse(this.jsonText);
      if (Array.isArray(parsed)) {
        this.conditionsArray.clear();
        parsed.forEach(condition => {
          this.conditionsArray.push(this.createConditionGroup(condition));
        });
        this.emitChanges();
        this.jsonError = '';
      } else {
        this.jsonError = 'JSON must be an array of conditions';
      }
    } catch (error) {
      this.jsonError = 'Invalid JSON format';
    }
  }

  loadExample(example: any): void {
    this.conditionsArray.clear();
    example.data.forEach((condition: ConditionLogic) => {
      this.conditionsArray.push(this.createConditionGroup(condition));
    });
    this.emitChanges();
  }

  getUniqueFields(): { value: string; label: string }[] {
    const usedFields = new Set(
      this.conditionsArray.value.map((c: any) => c.field).filter(Boolean)
    );
    return this.availableFields.filter(field => usedFields.has(field.value));
  }

  evaluateTestConditions(): void {
    this.testResults = [];
    const conditions = this.conditionsArray.value;

    conditions.forEach((condition: ConditionLogic, index: number) => {
      const result = this.evaluateCondition(condition);
      this.testResults.push(result);
    });

    // Calculate overall result
    this.overallResult = this.calculateOverallResult(conditions);
  }

  private evaluateCondition(condition: ConditionLogic): { passed: boolean; details: string } {
    const fieldValue = this.testValues[condition.field];
    const conditionValue = condition.value;
    let passed = false;
    let details = '';

    if (fieldValue === undefined || fieldValue === '') {
      return {
        passed: false,
        details: `Field '${condition.field}' has no test value`
      };
    }

    try {
      switch (condition.operation) {
        case '=':
          passed = fieldValue == conditionValue;
          break;
        case '!=':
          passed = fieldValue != conditionValue;
          break;
        case '>':
          passed = Number(fieldValue) > Number(conditionValue);
          break;
        case '<':
          passed = Number(fieldValue) < Number(conditionValue);
          break;
        case '>=':
          passed = Number(fieldValue) >= Number(conditionValue);
          break;
        case '<=':
          passed = Number(fieldValue) <= Number(conditionValue);
          break;
        case 'contains':
          passed = String(fieldValue).includes(String(conditionValue));
          break;
        case 'startswith':
          passed = String(fieldValue).startsWith(String(conditionValue));
          break;
        case 'endswith':
          passed = String(fieldValue).endsWith(String(conditionValue));
          break;
        case 'matches':
          const regex = new RegExp(String(conditionValue));
          passed = regex.test(String(fieldValue));
          break;
        case 'in':
          const inArray = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
          passed = inArray.includes(fieldValue);
          break;
        case 'not in':
          const notInArray = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
          passed = !notInArray.includes(fieldValue);
          break;
        default:
          passed = false;
          details = `Unknown operation: ${condition.operation}`;
      }

      if (!details) {
        details = `${fieldValue} ${condition.operation} ${conditionValue}`;
      }
    } catch (error) {
      passed = false;
      details = `Error evaluating condition: ${error}`;
    }

    return { passed, details };
  }

  private calculateOverallResult(conditions: ConditionLogic[]): boolean {
    if (conditions.length === 0) return true;

    let result = this.testResults[0]?.passed || false;

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i - 1];
      const currentResult = this.testResults[i]?.passed || false;

      if (condition.logical_operator === 'or') {
        result = result || currentResult;
      } else { // default to 'and'
        result = result && currentResult;
      }
    }

    return result;
  }

  trackCondition(index: number, item: any): number {
    return index;
  }
}
