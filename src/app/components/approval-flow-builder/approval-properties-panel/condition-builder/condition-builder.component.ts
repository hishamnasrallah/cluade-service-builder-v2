// components/workflow-builder/properties-panel/condition-builder/condition-builder.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface ConditionLogic {
  field: string;
  operation: string;
  value: any;
  logical_operator?: 'and' | 'or';
  conditions?: ConditionLogic[]; // For nested conditions
}

export interface FieldReference {
  name: string;
  display_name: string;
  type: string;
}

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
    MatExpansionModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="condition-builder">
      <div class="builder-header">
        <h3>
          <mat-icon>rule</mat-icon>
          Condition Logic Builder
        </h3>
        <p>Define rules and conditions for dynamic behavior</p>

        <div class="header-actions">
          <button mat-button
                  color="accent"
                  (click)="addConditionGroup()"
                  [disabled]="conditionForm.disabled">
            <mat-icon>add</mat-icon>
            Add Condition Group
          </button>

          <button mat-button
                  color="warn"
                  (click)="clearAllConditions()"
                  [disabled]="conditionForm.disabled || conditionGroups.length === 0">
            <mat-icon>clear_all</mat-icon>
            Clear All
          </button>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="builder-content" *ngIf="!isLoading">
        <form [formGroup]="conditionForm">
          <div formArrayName="conditionGroups" class="condition-groups">

            <!-- Empty State -->
            <div *ngIf="conditionGroups.length === 0" class="empty-state">
              <mat-icon>rule</mat-icon>
              <h4>No Conditions Defined</h4>
              <p>Add condition groups to define dynamic logic for your element.</p>
              <button mat-raised-button
                      color="primary"
                      (click)="addConditionGroup()">
                <mat-icon>add</mat-icon>
                Add First Condition
              </button>
            </div>

            <!-- Condition Groups -->
            <div *ngFor="let group of conditionGroups.controls; let groupIndex = index; trackBy: trackGroup"
                 class="condition-group"
                 [formGroupName]="groupIndex">

              <mat-expansion-panel class="group-panel"
                                   [expanded]="groupIndex === 0 || group.value.conditions?.length > 0">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <mat-icon>{{ getGroupIcon(group.value) }}</mat-icon>
                    <span>{{ getGroupTitle(group.value, groupIndex) }}</span>
                  </mat-panel-title>
                  <mat-panel-description>
                    {{ getGroupDescription(group.value) }}
                  </mat-panel-description>
                </mat-expansion-panel-header>

                <div class="group-content">
                  <!-- Logical Operator Selection (for groups with multiple conditions) -->
                  <div *ngIf="getConditionsArray(groupIndex).length > 1" class="logical-operator-section">
                    <mat-form-field appearance="outline" class="operator-field">
                      <mat-label>Group Logic</mat-label>
                      <mat-select formControlName="operation" required>
                        <mat-option value="and">AND - All conditions must be true</mat-option>
                        <mat-option value="or">OR - Any condition can be true</mat-option>
                      </mat-select>
                      <mat-hint>How should conditions in this group be evaluated?</mat-hint>
                    </mat-form-field>
                  </div>

                  <!-- Individual Conditions -->
                  <div formArrayName="conditions" class="conditions-list">
                    <div *ngFor="let condition of getConditionsArray(groupIndex).controls; let condIndex = index; trackBy: trackCondition"
                         class="condition-item"
                         [formGroupName]="condIndex">

                      <div class="condition-header">
                        <span class="condition-number">{{ condIndex + 1 }}</span>
                        <span class="condition-label">Condition</span>
                        <div class="condition-actions">
                          <button mat-icon-button
                                  color="warn"
                                  (click)="removeCondition(groupIndex, condIndex)"
                                  [disabled]="conditionForm.disabled"
                                  matTooltip="Remove condition">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </div>

                      <div class="condition-form">
                        <!-- Field Selection -->
                        <mat-form-field appearance="outline" class="field-select">
                          <mat-label>Field</mat-label>
                          <mat-select formControlName="field"
                                      required
                                      (selectionChange)="onFieldChange(groupIndex, condIndex, $event.value)">
                            <mat-optgroup label="Available Fields">
                              <mat-option *ngFor="let field of availableFields" [value]="field.name">
                                {{ field.display_name || field.name }}
                                <small *ngIf="field.type"> ({{ field.type }})</small>
                              </mat-option>
                            </mat-optgroup>
                            <mat-optgroup label="Special Values">
                              <mat-option value="today">Today's Date</mat-option>
                              <mat-option value="current_user">Current User</mat-option>
                              <mat-option value="current_time">Current Time</mat-option>
                            </mat-optgroup>
                          </mat-select>
                          <mat-error>Field is required</mat-error>
                        </mat-form-field>

                        <!-- Operation Selection -->
                        <mat-form-field appearance="outline" class="operation-select">
                          <mat-label>Operation</mat-label>
                          <mat-select formControlName="operation"
                                      required
                                      (selectionChange)="onOperationChange(groupIndex, condIndex, $event.value)">
                            <mat-optgroup *ngFor="let group of operationGroups" [label]="group.name">
                              <mat-option *ngFor="let op of group.operations" [value]="op.value">
                                {{ op.label }}
                              </mat-option>
                            </mat-optgroup>
                          </mat-select>
                          <mat-error>Operation is required</mat-error>
                        </mat-form-field>

                        <!-- Value Input -->
                        <div class="value-input" [ngSwitch]="getValueInputType(groupIndex, condIndex)">
                          <!-- Text Input -->
                          <mat-form-field *ngSwitchCase="'text'" appearance="outline" class="value-field">
                            <mat-label>Value</mat-label>
                            <input matInput formControlName="value" required>
                            <mat-error>Value is required</mat-error>
                          </mat-form-field>

                          <!-- Number Input -->
                          <mat-form-field *ngSwitchCase="'number'" appearance="outline" class="value-field">
                            <mat-label>Value</mat-label>
                            <input matInput type="number" formControlName="value" required>
                            <mat-error>Value is required</mat-error>
                          </mat-form-field>

                          <!-- Date Input -->
                          <mat-form-field *ngSwitchCase="'date'" appearance="outline" class="value-field">
                            <mat-label>Date Value</mat-label>
                            <input matInput type="date" formControlName="value" required>
                            <mat-error>Date is required</mat-error>
                          </mat-form-field>

                          <!-- List Input (for 'in' operations) -->
                          <div *ngSwitchCase="'list'" class="list-input">
                            <mat-form-field appearance="outline" class="value-field">
                              <mat-label>Values (comma-separated)</mat-label>
                              <input matInput
                                     formControlName="value"
                                     placeholder="value1, value2, value3"
                                     required>
                              <mat-hint>Enter multiple values separated by commas</mat-hint>
                              <mat-error>At least one value is required</mat-error>
                            </mat-form-field>
                          </div>

                          <!-- Field Reference -->
                          <mat-form-field *ngSwitchCase="'field'" appearance="outline" class="value-field">
                            <mat-label>Compare with Field</mat-label>
                            <mat-select formControlName="value" required>
                              <mat-option *ngFor="let field of availableFields" [value]="field.name">
                                {{ field.display_name || field.name }}
                              </mat-option>
                            </mat-select>
                            <mat-error>Field is required</mat-error>
                          </mat-form-field>

                          <!-- Boolean (no value needed for some operations) -->
                          <div *ngSwitchCase="'none'" class="no-value">
                            <span class="no-value-text">No additional value required</span>
                          </div>
                        </div>
                      </div>

                      <!-- Condition Preview -->
                      <div class="condition-preview" *ngIf="isConditionValid(groupIndex, condIndex)">
                        <mat-icon>visibility</mat-icon>
                        <span>{{ getConditionPreview(groupIndex, condIndex) }}</span>
                      </div>
                    </div>

                    <!-- Add Condition Button -->
                    <div class="add-condition-section">
                      <button mat-button
                              color="primary"
                              (click)="addCondition(groupIndex)"
                              [disabled]="conditionForm.disabled">
                        <mat-icon>add</mat-icon>
                        Add Another Condition
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Group Actions -->
                <mat-action-row>
                  <button mat-button
                          color="warn"
                          (click)="removeConditionGroup(groupIndex)"
                          [disabled]="conditionForm.disabled">
                    <mat-icon>delete</mat-icon>
                    Remove Group
                  </button>

                  <button mat-button
                          (click)="duplicateConditionGroup(groupIndex)"
                          [disabled]="conditionForm.disabled">
                    <mat-icon>content_copy</mat-icon>
                    Duplicate Group
                  </button>
                </mat-action-row>
              </mat-expansion-panel>

              <!-- Group Logic Connector -->
              <div *ngIf="groupIndex < conditionGroups.length - 1" class="group-connector">
                <mat-divider></mat-divider>
                <div class="connector-label">AND</div>
                <mat-divider></mat-divider>
              </div>
            </div>
          </div>
        </form>

        <!-- JSON Preview -->
        <mat-expansion-panel class="json-preview" *ngIf="conditionGroups.length > 0">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon>code</mat-icon>
              JSON Preview
            </mat-panel-title>
            <mat-panel-description>
              Generated condition logic
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="json-content">
            <pre>{{ getConditionLogicJson() }}</pre>
          </div>
        </mat-expansion-panel>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <mat-icon>hourglass_empty</mat-icon>
        <p>Loading condition builder...</p>
      </div>
    </div>
  `,
  styles: [`
    .condition-builder {
      display: flex;
      flex-direction: column;
      max-height: 600px;
    }

    .builder-header {
      padding: 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .builder-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      color: #333;
      font-size: 16px;
    }

    .builder-header p {
      margin: 0 0 16px 0;
      color: #666;
      font-size: 13px;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .builder-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state h4 {
      margin: 0 0 8px 0;
      color: #555;
    }

    .empty-state p {
      margin: 0 0 20px 0;
      max-width: 300px;
    }

    .condition-groups {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .condition-group {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }

    .group-panel {
      box-shadow: none !important;
    }

    .group-content {
      padding: 16px;
    }

    .logical-operator-section {
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .operator-field {
      margin-bottom: 0;
    }

    .conditions-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .condition-item {
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 16px;
      background: white;
    }

    .condition-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .condition-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #2196F3;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
    }

    .condition-label {
      flex: 1;
      font-weight: 500;
      color: #333;
    }

    .condition-actions {
      display: flex;
      gap: 4px;
    }

    .condition-form {
      display: grid;
      grid-template-columns: 2fr 1.5fr 2fr;
      gap: 12px;
      align-items: start;
    }

    .field-select,
    .operation-select,
    .value-field {
      margin-bottom: 0;
    }

    .value-input {
      display: flex;
      flex-direction: column;
    }

    .list-input {
      display: flex;
      flex-direction: column;
    }

    .no-value {
      display: flex;
      align-items: center;
      height: 56px;
      padding: 0 12px;
      background: #f5f5f5;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .no-value-text {
      color: #666;
      font-size: 14px;
      font-style: italic;
    }

    .condition-preview {
      margin-top: 12px;
      padding: 8px 12px;
      background: #e3f2fd;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #1976d2;
    }

    .condition-preview mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .add-condition-section {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      text-align: center;
    }

    .group-connector {
      display: flex;
      align-items: center;
      margin: 8px 0;
    }

    .connector-label {
      background: #fff;
      padding: 4px 12px;
      color: #666;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      margin: 0 16px;
    }

    .json-preview {
      margin-top: 16px;
      border: 1px solid #e0e0e0;
    }

    .json-content {
      background: #f8f9fa;
      border-radius: 4px;
      padding: 12px;
      margin: 16px 0;
    }

    .json-content pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #333;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #666;
    }

    .loading-state mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 16px;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .condition-form {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .builder-header {
        padding: 12px;
      }

      .header-actions {
        justify-content: center;
      }

      .group-content {
        padding: 12px;
      }
    }
  `]
})
export class ConditionBuilderComponent implements OnInit, OnChanges {
  @Input() conditionLogic: ConditionLogic[] = [];
  @Input() availableFields: FieldReference[] = [];
  @Input() disabled = false;

  @Output() conditionChanged = new EventEmitter<ConditionLogic[]>();

  conditionForm!: FormGroup;
  isLoading = false;

  operationGroups = [
    {
      name: 'Comparison',
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
      name: 'Text',
      operations: [
        { value: 'contains', label: 'Contains' },
        { value: 'startswith', label: 'Starts With' },
        { value: 'endswith', label: 'Ends With' },
        { value: 'matches', label: 'Matches Regex' }
      ]
    },
    {
      name: 'Set Operations',
      operations: [
        { value: 'in', label: 'In List' },
        { value: 'not in', label: 'Not In List' }
      ]
    },
    {
      name: 'Math',
      operations: [
        { value: '+', label: 'Add (+)' },
        { value: '-', label: 'Subtract (-)' },
        { value: '*', label: 'Multiply (×)' },
        { value: '/', label: 'Divide (÷)' }
      ]
    }
  ];

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.setupFormSubscription();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conditionLogic'] && this.conditionForm) {
      this.loadConditionLogic();
    }

    if (changes['disabled'] && this.conditionForm) {
      if (this.disabled) {
        this.conditionForm.disable();
      } else {
        this.conditionForm.enable();
      }
    }
  }

  private initializeForm(): void {
    this.conditionForm = this.fb.group({
      conditionGroups: this.fb.array([])
    });
  }

  private setupFormSubscription(): void {
    this.conditionForm.valueChanges.subscribe(() => {
      if (this.conditionForm.valid) {
        this.emitConditionChange();
      }
    });
  }

  get conditionGroups(): FormArray {
    return this.conditionForm.get('conditionGroups') as FormArray;
  }

  getConditionsArray(groupIndex: number): FormArray {
    return this.conditionGroups.at(groupIndex).get('conditions') as FormArray;
  }

  private loadConditionLogic(): void {
    this.conditionGroups.clear();

    if (!this.conditionLogic || this.conditionLogic.length === 0) {
      return;
    }

    this.conditionLogic.forEach(group => {
      this.addConditionGroupFromData(group);
    });
  }

  addConditionGroup(): void {
    const groupForm = this.fb.group({
      operation: ['and'],
      conditions: this.fb.array([])
    });

    this.conditionGroups.push(groupForm);
    this.addCondition(this.conditionGroups.length - 1);
  }

  private addConditionGroupFromData(data: ConditionLogic): void {
    const groupForm = this.fb.group({
      operation: [data.operation || 'and'],
      conditions: this.fb.array([])
    });

    const conditionsArray = groupForm.get('conditions') as FormArray;

    if (data.conditions && data.conditions.length > 0) {
      data.conditions.forEach(condition => {
        this.addConditionFromData(conditionsArray, condition);
      });
    } else {
      // Single condition (legacy format)
      this.addConditionFromData(conditionsArray, data);
    }

    this.conditionGroups.push(groupForm);
  }

  addCondition(groupIndex: number): void {
    const conditionForm = this.fb.group({
      field: ['', Validators.required],
      operation: ['=', Validators.required],
      value: ['', Validators.required]
    });

    this.getConditionsArray(groupIndex).push(conditionForm);
  }

  private addConditionFromData(conditionsArray: FormArray, data: ConditionLogic): void {
    const conditionForm = this.fb.group({
      field: [data.field || '', Validators.required],
      operation: [data.operation || '=', Validators.required],
      value: [data.value || '', Validators.required]
    });

    conditionsArray.push(conditionForm);
  }

  removeCondition(groupIndex: number, conditionIndex: number): void {
    this.getConditionsArray(groupIndex).removeAt(conditionIndex);

    // Remove group if no conditions left
    if (this.getConditionsArray(groupIndex).length === 0) {
      this.removeConditionGroup(groupIndex);
    }
  }

  removeConditionGroup(groupIndex: number): void {
    this.conditionGroups.removeAt(groupIndex);
    this.emitConditionChange();
  }

  duplicateConditionGroup(groupIndex: number): void {
    const groupValue = this.conditionGroups.at(groupIndex).value;
    this.addConditionGroupFromData(groupValue);
  }

  clearAllConditions(): void {
    this.conditionGroups.clear();
    this.emitConditionChange();
  }

  onFieldChange(groupIndex: number, conditionIndex: number, fieldName: string): void {
    const field = this.availableFields.find(f => f.name === fieldName);
    const conditionForm = this.getConditionsArray(groupIndex).at(conditionIndex);

    // Reset operation and value when field changes
    conditionForm.patchValue({
      operation: '=',
      value: ''
    });
  }

  onOperationChange(groupIndex: number, conditionIndex: number, operation: string): void {
    const conditionForm = this.getConditionsArray(groupIndex).at(conditionIndex);

    // Reset value when operation changes
    conditionForm.patchValue({ value: '' });

    // Update validators based on operation
    const valueControl = conditionForm.get('value');
    if (this.operationRequiresValue(operation)) {
      valueControl?.setValidators([Validators.required]);
    } else {
      valueControl?.clearValidators();
    }
    valueControl?.updateValueAndValidity();
  }

  getValueInputType(groupIndex: number, conditionIndex: number): string {
    const conditionForm = this.getConditionsArray(groupIndex).at(conditionIndex);
    const operation = conditionForm.get('operation')?.value;
    const fieldName = conditionForm.get('field')?.value;

    if (!this.operationRequiresValue(operation)) {
      return 'none';
    }

    if (operation === 'in' || operation === 'not in') {
      return 'list';
    }

    if (operation === '+' || operation === '-' || operation === '*' || operation === '/') {
      return 'field';
    }

    const field = this.availableFields.find(f => f.name === fieldName);
    if (field) {
      switch (field.type) {
        case 'number':
        case 'decimal':
          return 'number';
        case 'date':
        case 'datetime':
          return 'date';
        default:
          return 'text';
      }
    }

    return 'text';
  }

  private operationRequiresValue(operation: string): boolean {
    const noValueOperations = ['is_empty', 'is_not_empty', 'is_null', 'is_not_null'];
    return !noValueOperations.includes(operation);
  }

  isConditionValid(groupIndex: number, conditionIndex: number): boolean {
    const conditionForm = this.getConditionsArray(groupIndex).at(conditionIndex);
    return conditionForm.valid;
  }

  getConditionPreview(groupIndex: number, conditionIndex: number): string {
    const conditionForm = this.getConditionsArray(groupIndex).at(conditionIndex);
    const values = conditionForm.value;

    if (!values.field || !values.operation) {
      return 'Incomplete condition';
    }

    const field = this.availableFields.find(f => f.name === values.field);
    const fieldDisplay = field?.display_name || values.field;
    const operation = this.getOperationLabel(values.operation);

    if (!this.operationRequiresValue(values.operation)) {
      return `${fieldDisplay} ${operation}`;
    }

    let valueDisplay = values.value;
    if (values.operation === 'in' || values.operation === 'not in') {
      valueDisplay = `[${values.value}]`;
    }

    return `${fieldDisplay} ${operation} ${valueDisplay}`;
  }

  private getOperationLabel(operation: string): string {
    for (const group of this.operationGroups) {
      const op = group.operations.find(o => o.value === operation);
      if (op) {
        return op.label;
      }
    }
    return operation;
  }

  getGroupIcon(groupValue: any): string {
    if (!groupValue.conditions || groupValue.conditions.length === 0) {
      return 'rule';
    }

    return groupValue.operation === 'or' ? 'call_split' : 'call_merge';
  }

  getGroupTitle(groupValue: any, groupIndex: number): string {
    const conditionCount = groupValue.conditions?.length || 0;

    if (conditionCount === 0) {
      return `Group ${groupIndex + 1} (Empty)`;
    }

    const operator = groupValue.operation?.toUpperCase() || 'AND';
    return `Group ${groupIndex + 1} (${conditionCount} condition${conditionCount !== 1 ? 's' : ''} - ${operator})`;
  }

  getGroupDescription(groupValue: any): string {
    const conditionCount = groupValue.conditions?.length || 0;

    if (conditionCount === 0) {
      return 'Add conditions to this group';
    }

    const operator = groupValue.operation || 'and';
    return operator === 'and'
      ? 'All conditions must be true'
      : 'Any condition can be true';
  }

  getConditionLogicJson(): string {
    const logic = this.buildConditionLogic();
    return JSON.stringify(logic, null, 2);
  }

  private emitConditionChange(): void {
    const conditionLogic = this.buildConditionLogic();
    this.conditionChanged.emit(conditionLogic);
  }

  private buildConditionLogic(): ConditionLogic[] {
    const result: ConditionLogic[] = [];

    this.conditionGroups.controls.forEach(groupControl => {
      const groupValue = groupControl.value;
      const conditions = groupValue.conditions || [];

      if (conditions.length === 1) {
        // Single condition - use flat structure
        result.push({
          field: conditions[0].field,
          operation: conditions[0].operation,
          value: this.processValue(conditions[0].value, conditions[0].operation)
        });
      } else if (conditions.length > 1) {
        // Multiple conditions - use nested structure
        result.push({
          operation: groupValue.operation,
          conditions: conditions.map((condition: any) => ({
            field: condition.field,
            operation: condition.operation,
            value: this.processValue(condition.value, condition.operation)
          }))
        } as ConditionLogic);
      }
    });

    return result;
  }

  private processValue(value: any, operation: string): any {
    if (operation === 'in' || operation === 'not in') {
      // Convert comma-separated string to array
      if (typeof value === 'string') {
        return value.split(',').map(v => v.trim()).filter(v => v);
      }
    }

    return value;
  }

  trackGroup(index: number, item: any): number {
    return index;
  }

  trackCondition(index: number, item: any): number {
    return index;
  }
}
