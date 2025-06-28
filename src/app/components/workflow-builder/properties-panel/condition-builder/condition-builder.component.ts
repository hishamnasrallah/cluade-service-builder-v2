// components/workflow-builder/properties-panel/condition-builder/condition-builder.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';import { CommonModule } from '@angular/common';
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
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { ConditionLogic } from '../../../../models/workflow.models';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';

interface ConditionItem {
  type: 'simple' | 'group';
  field?: string;
  operation?: string;
  value?: any;
  conditions?: ConditionItem[];
  logical_operator?: 'and' | 'or';
}

@Component({
  selector: 'app-condition-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatRadioModule,
    MatExpansionModule,
    DragDropModule,
    MatButtonToggleGroup,
    MatButtonToggle
  ],
  templateUrl: './condition-builder.component.html', // Ensure this path is correct
  styleUrls: ['./condition-builder.component.scss']  // Ensure this path is correct
})
export class ConditionBuilderComponent implements OnInit, OnChanges {
  @Input() conditionLogic: ConditionLogic[] = [];
  @Input() workflow: any = null;
  @Input() isNested: boolean = false;
  @Output() conditionChanged = new EventEmitter<ConditionLogic[]>();

  public conditionsForm!: FormGroup;
  public jsonText = '';
  public jsonError = '';
  public testValues: { [key: string]: any } = {};
  public testResults: { passed: boolean; details: string }[] = [];
  public overallResult = false;
  public conditionItems: ConditionItem[] = [];

  public availableFields: { value: string; label: string; type?: string }[] = [];

  // Value type options
  valueTypes = [
    { value: 'static', label: 'Static Value' },
    { value: 'field', label: 'Field Reference' },
    { value: 'expression', label: 'Expression' }
  ];

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

  // Advanced examples
  advancedExamples = [
    {
      title: 'Field Addition',
      data: [
        {
          field: 'field1',
          operation: '+',
          value: { field: 'field2' }
        },
        {
          operation: '=',
          field: 'field3',
          value: { field: 'field1' }
        }
      ]
    },
    {
      title: 'OR Group',
      data: [
        {
          operation: 'or',
          conditions: [
            { field: 'first_name', operation: '=', value: 'Hisham' },
            { field: 'last_name', operation: 'startswith', value: 'Nasr' }
          ]
        }
      ]
    },
    {
      title: 'Complex AND Group',
      data: [
        {
          operation: 'and',
          conditions: [
            { field: 'first_name', operation: 'startswith', value: 'nasr' },
            { field: 'last_name', operation: '=', value: { field: 'email' } },
            { field: 'email', operation: 'contains', value: '@asd.com' }
          ]
        }
      ]
    }
  ];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadConditionsFromInput();
    this.updateJsonText();
    if (this.workflow) {
      this.updateAvailableFields(this.workflow);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['workflow'] && changes['workflow'].currentValue) {
      this.updateAvailableFields(changes['workflow'].currentValue);
    }
    if (changes['conditionLogic']) {
      this.loadConditionsFromInput();
      this.updateJsonText();
    }
  }

  private loadConditionsFromInput(): void {
    this.conditionItems = this.transformConditionsToItems(this.conditionLogic);
  }

  private transformConditionsToItems(conditions: any[]): ConditionItem[] {
    if (!conditions || conditions.length === 0) return [];

    return conditions.map(condition => {
      // Check if it's a group condition (has 'conditions' array)
      if (condition.conditions && Array.isArray(condition.conditions)) {
        return {
          type: 'group',
          operation: condition.operation || 'and',
          conditions: this.transformConditionsToItems(condition.conditions)
        };
      }

      // Simple condition
      return {
        type: 'simple',
        field: condition.field,
        operation: condition.operation,
        value: condition.value,
        logical_operator: condition.logical_operator
      };
    });
  }

  // Make this method public so template can access it
  transformItemsToConditions(items: ConditionItem[]): any[] {
    return items.map((item, index) => {
      if (item.type === 'group') {
        return {
          operation: item.operation,
          conditions: this.transformItemsToConditions(item.conditions || [])
        };
      }

      // Simple condition
      const condition: any = {
        field: item.field,
        operation: item.operation,
        value: item.value
      };

      // Add logical operator if not the last item
      if (index < items.length - 1 && item.logical_operator) {
        condition.logical_operator = item.logical_operator;
      }

      return condition;
    });
  }

  addSimpleCondition(): void {
    this.conditionItems.push({
      type: 'simple',
      field: '',
      operation: '=',
      value: '',
      logical_operator: 'and'
    });
    this.updateConditions();
  }

  addGroupCondition(): void {
    this.conditionItems.push({
      type: 'group',
      operation: 'and',
      conditions: []
    });
    this.updateConditions();
  }

  removeCondition(index: number): void {
    this.conditionItems.splice(index, 1);
    this.updateConditions();
  }

  getValueType(item: ConditionItem): string {
    if (item.value && typeof item.value === 'object' && 'field' in item.value) {
      return 'field';
    }
    return 'static';
  }

  onValueTypeChange(index: number, type: string): void {
    const item = this.conditionItems[index];
    if (type === 'field') {
      item.value = { field: '' };
    } else {
      item.value = '';
    }
    this.updateConditions();
  }

  onFieldReferenceChange(index: number, fieldName: string): void {
    const item = this.conditionItems[index];
    item.value = { field: fieldName };
    this.updateConditions();
  }

  getOperationsForField(fieldName: string | undefined): any[] {
    if (!fieldName) return this.operationGroups;

    const field = this.availableFields.find(f => f.value === fieldName);
    const fieldType = field?.type || 'text';

    const allOperations = [...this.operationGroups];

    // Filter operations based on field type
    if (fieldType === 'boolean') {
      return allOperations.filter(group => group.label === 'Comparison')
        .map(group => ({
          ...group,
          operations: group.operations.filter(op => ['=', '!='].includes(op.value))
        }));
    }

    if (fieldType === 'number') {
      return allOperations.filter(group => ['Comparison', 'Math', 'Set'].includes(group.label));
    }

    if (fieldType === 'text') {
      return allOperations.filter(group => ['Comparison', 'Text', 'Set'].includes(group.label));
    }

    return allOperations;
  }

  getFieldType(fieldName: string | undefined): string {
    if (!fieldName) return 'text';
    const field = this.availableFields.find(f => f.value === fieldName);
    return field?.type || 'text';
  }

  getFieldIcon(type?: string): string {
    const iconMap: { [key: string]: string } = {
      'text': 'text_fields',
      'number': 'pin',
      'boolean': 'check_box',
      'date': 'calendar_today',
      'choice': 'list',
      'file': 'attach_file'
    };
    return iconMap[type || 'text'] || 'input';
  }

  getFieldLabel(fieldName: string | undefined): string {
    if (!fieldName) return 'Select Field';
    const field = this.availableFields.find(f => f.value === fieldName);
    return field?.label || fieldName || 'Select Field';
  }

  getInputType(fieldName: string | undefined): string {
    if (!fieldName) return 'text';
    const field = this.availableFields.find(f => f.value === fieldName);
    if (field?.type === 'number') return 'number';
    if (field?.type === 'date') return 'date';
    return 'text';
  }

  // Add missing method
  isListOperation(operation: string | undefined): boolean {
    if (!operation) return false;
    return ['in', 'not in'].includes(operation);
  }

  onNestedConditionChanged(index: number, conditions: any[]): void {
    const item = this.conditionItems[index];
    if (item.type === 'group') {
      // Don't transform back to items - keep as conditions
      // to avoid circular transformation
      item.conditions = conditions.map(c => ({
        type: c.conditions ? 'group' : 'simple',
        ...c
      }));
    }
    this.updateConditions();
  }
  getGroupConditions(item: ConditionItem): any[] {
    if (!item.conditions) return [];
    // Return already transformed conditions to avoid calling transformation in template
    return this.transformItemsToConditions(item.conditions);
  }

  updateConditions(): void {
    const conditions = this.transformItemsToConditions(this.conditionItems);
    this.conditionChanged.emit(conditions);
    this.updateJsonText();
    this.cdr.markForCheck();
  }

  loadExample(example: any): void {
    this.conditionItems = this.transformConditionsToItems(example.data);
    this.updateConditions();
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

  addCondition(): void {
    this.conditionsArray.push(this.createConditionGroup());
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

  // Update to work with ConditionItem instead of FormGroup
  getValuePlaceholder(item: ConditionItem): string {
    const operation = item.operation || '';
    const fieldInfo = this.availableFields.find(f => f.value === item.field);

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

  // Update to work with ConditionItem instead of FormGroup
  getValueHint(item: ConditionItem): string {
    const operation = item.operation || '';

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

  isBooleanField(fieldName: string | undefined): boolean {
    if (!fieldName) return false;
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

  // Update to work with conditionItems
  private updateJsonText(): void {
    try {
      const conditions = this.transformItemsToConditions(this.conditionItems);
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
        this.conditionItems = this.transformConditionsToItems(parsed);
        this.emitChanges();
        this.jsonError = '';
      } else {
        this.jsonError = 'JSON must be an array of conditions';
      }
    } catch (error) {
      this.jsonError = 'Invalid JSON format';
    }
  }

  getUniqueFields(): { value: string; label: string }[] {
    const usedFields = new Set<string>();

    // Collect fields from conditionItems instead of conditionsArray
    const collectFields = (items: ConditionItem[]) => {
      items.forEach(item => {
        if (item.type === 'simple' && item.field) {
          usedFields.add(item.field);
        } else if (item.type === 'group' && item.conditions) {
          collectFields(item.conditions);
        }
      });
    };

    collectFields(this.conditionItems);

    return this.availableFields.filter(field => usedFields.has(field.value));
  }

  evaluateTestConditions(): void {
    this.testResults = [];
    const conditions = this.transformItemsToConditions(this.conditionItems);

    const evaluateConditionList = (condList: any[]): void => {
      condList.forEach((condition: any) => {
        if (condition.conditions) {
          // It's a group condition
          evaluateConditionList(condition.conditions);
        } else {
          // It's a simple condition
          const result = this.evaluateCondition(condition);
          this.testResults.push(result);
        }
      });
    };

    evaluateConditionList(conditions);

    // Calculate overall result
    this.overallResult = this.calculateOverallResult(conditions);
  }

  private evaluateCondition(condition: ConditionLogic): { passed: boolean; details: string } {
    const fieldName = condition.field || '';
    const fieldValue = this.testValues[fieldName];
    const conditionValue = condition.value;
    let passed = false;
    let details = '';

    if (!fieldName || fieldValue === undefined || fieldValue === '') {
      return {
        passed: false,
        details: `Field '${fieldName || 'undefined'}' has no test value`
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
          const inArray = String(conditionValue).split(',').map(v => v.trim());
          passed = inArray.includes(String(fieldValue));
          break;
        case 'not in':
          const notInArray = String(conditionValue).split(',').map(v => v.trim());
          passed = !notInArray.includes(String(fieldValue));
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

  private calculateOverallResult(conditions: any[]): boolean {
    if (conditions.length === 0) return true;

    let resultIndex = 0;

    const evaluateGroup = (condList: any[]): boolean => {
      if (condList.length === 0) return true;

      let result = true;
      let currentGroupResult = true;

      for (let i = 0; i < condList.length; i++) {
        const condition = condList[i];

        if (condition.conditions) {
          // It's a group
          currentGroupResult = evaluateGroup(condition.conditions);

          if (condition.operation === 'not') {
            currentGroupResult = !currentGroupResult;
          } else if (condition.operation === 'or') {
            let orResult = false;
            for (const subCond of condition.conditions) {
              if (subCond.conditions) {
                orResult = orResult || evaluateGroup([subCond]);
              } else {
                orResult = orResult || (this.testResults[resultIndex++]?.passed || false);
              }
            }
            currentGroupResult = orResult;
          }
        } else {
          // It's a simple condition
          currentGroupResult = this.testResults[resultIndex++]?.passed || false;
        }

        if (i === 0) {
          result = currentGroupResult;
        } else {
          const prevCondition = condList[i - 1];
          if (prevCondition.logical_operator === 'or') {
            result = result || currentGroupResult;
          } else {
            result = result && currentGroupResult;
          }
        }
      }

      return result;
    };

    return evaluateGroup(conditions);
  }

  trackCondition(index: number, item: any): number {
    return index;
  }

  getOperatorSymbol(operation: string | undefined): string {
    if (!operation) return '';

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

  // Update to work with ConditionItem
  formatVisualValue(item: ConditionItem): string {
    const value = item.value;

    if (value === null || value === undefined || value === '') {
      return 'Enter value';
    }

    // Handle field reference
    if (typeof value === 'object' && 'field' in value && value.field) {
      return this.getFieldLabel(value.field);
    }

    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'string' && this.isListOperation(item.operation)) {
      return `[${value}]`;
    }

    return String(value);
  }
}
