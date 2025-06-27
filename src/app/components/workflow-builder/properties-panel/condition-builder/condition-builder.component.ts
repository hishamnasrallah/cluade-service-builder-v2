// components/workflow-builder/properties-panel/condition-builder/condition-builder.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
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
    DragDropModule
  ],
  templateUrl: './condition-builder.component.html',
  styleUrls: ['./condition-builder.component.scss']
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

  @Input() set workflow(value: any) {
    if (value) {
      this.updateAvailableFields(value);
    }
  }

  availableFields: { value: string; label: string; type?: string }[] = [];

  private updateAvailableFields(workflow: any): void {
    const fields: { value: string; label: string; type?: string }[] = [];

    // Extract all fields from the workflow
    if (workflow && workflow.elements) {
      workflow.elements.forEach((element: any) => {
        if (element.type === 'field') {
          const fieldName = element.properties._field_name || element.properties.name;
          const displayName = element.properties._field_display_name || element.properties.name || fieldName;
          const fieldType = element.properties._field_type || 'text';

          if (fieldName) {
            fields.push({
              value: fieldName,
              label: displayName,
              type: this.getFieldTypeString(fieldType)
            });
          }
        }
      });
    }

    // If no fields found, use some defaults for demonstration
    if (fields.length === 0) {
      fields.push(
        { value: 'field1', label: 'Field 1', type: 'text' },
        { value: 'field2', label: 'Field 2', type: 'number' },
        { value: 'field3', label: 'Field 3', type: 'boolean' }
      );
    }

    this.availableFields = fields;
  }

  private getFieldTypeString(fieldType: any): string {
    if (typeof fieldType === 'object' && fieldType.name) {
      return fieldType.name.toLowerCase();
    }
    if (typeof fieldType === 'number') {
      // Map common field type IDs to strings
      const typeMap: { [key: number]: string } = {
        1: 'text',
        2: 'number',
        3: 'boolean',
        4: 'date',
        5: 'choice',
        6: 'file'
      };
      return typeMap[fieldType] || 'text';
    }
    return String(fieldType).toLowerCase();
  }

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
      moveItemInArray(this.conditionsArray.controls, event.previousIndex, event.currentIndex);
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

  getValuePlaceholder(conditionGroup: FormGroup): string {
    const field = conditionGroup.get('field')?.value;
    const operation = conditionGroup.get('operation')?.value;
    const fieldInfo = this.availableFields.find(f => f.value === field);

    if (operation === 'matches') {
      return 'Enter regex pattern (e.g., ^[A-Z].*$)';
    }
    if (operation === 'in' || operation === 'not in') {
      return 'Enter comma-separated values';
    }
    if (fieldInfo?.type === 'number') {
      return 'Enter a number';
    }
    if (fieldInfo?.type === 'date') {
      return 'Select a date';
    }

    return 'Enter value';
  }

  getValueHint(conditionGroup: FormGroup): string {
    const operation = conditionGroup.get('operation')?.value;

    if (operation === 'matches') {
      return 'Regular expression pattern for matching';
    }
    if (operation === 'in' || operation === 'not in') {
      return 'Multiple values separated by commas';
    }
    if (['contains', 'startswith', 'endswith'].includes(operation)) {
      return 'Case-sensitive text comparison';
    }

    return '';
  }

  isBooleanField(fieldName: string): boolean {
    const field = this.availableFields.find(f => f.value === fieldName);
    return field?.type === 'boolean';
  }

  shouldShowFieldComparison(operation: string): boolean {
    // For mathematical operations, we might want to compare with other fields
    return ['+', '-', '*', '/', '**'].includes(operation);
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

  getFieldIcon(fieldName: string): string {
    const field = this.availableFields.find(f => f.value === fieldName);
    const iconMap: { [key: string]: string } = {
      'text': 'text_fields',
      'number': 'pin',
      'boolean': 'check_box',
      'date': 'calendar_today',
      'choice': 'list',
      'file': 'attach_file'
    };
    return iconMap[field?.type || 'text'] || 'input';
  }

  getFieldLabel(fieldName: string): string {
    const field = this.availableFields.find(f => f.value === fieldName);
    return field?.label || fieldName || 'Select Field';
  }

  getOperatorSymbol(operation: string): string {
    const symbolMap: { [key: string]: string } = {
      '=': '=',
      '!=': '≠',
      '>': '>',
      '<': '<',
      '>=': '≥',
      '<=': '≤',
      'contains': 'contains',
      'startswith': 'starts with',
      'endswith': 'ends with',
      'matches': 'matches pattern',
      'in': 'in list',
      'not in': 'not in list',
      '+': '+',
      '-': '-',
      '*': '×',
      '/': '÷',
      '**': '^'
    };
    return symbolMap[operation] || operation;
  }

  formatVisualValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return 'Enter value';
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'string' && value.includes(',')) {
      return `[${value}]`;
    }
    return String(value);
  }
}
