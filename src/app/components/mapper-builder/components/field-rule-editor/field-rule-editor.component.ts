// src/app/components/mapper-builder/components/field-rule-editor/field-rule-editor.component.ts

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import {
  MapperFieldRule,
  LookupOption,
  TransformFunction,
  ConditionOperator,
  MapperFieldRuleCondition
} from '../../../../models/mapper.models';

interface DialogData {
  rule: MapperFieldRule | null;
  targetModel: string;
  availableLookups: LookupOption[];
  availableTransforms: TransformFunction[];
}

@Component({
  selector: 'app-field-rule-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatExpansionModule,
    MatRadioModule,
    MatDividerModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="field-rule-editor">
      <h2 mat-dialog-title>
        <mat-icon>rule</mat-icon>
        {{ data.rule ? 'Edit' : 'Create' }} Field Rule
      </h2>

      <mat-dialog-content>
        <mat-tab-group dynamicHeight animationDuration="300ms">
          <!-- Basic Tab -->
          <mat-tab label="Basic">
            <div class="tab-content">
              <form [formGroup]="ruleForm" class="rule-form">
                <div class="form-section">
                  <h3>Source Configuration</h3>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>JSON Path</mat-label>
                    <input
                      matInput
                      formControlName="json_path"
                      [matAutocomplete]="pathAuto"
                      placeholder="e.g., user.profile.name">
                    <mat-icon matSuffix matTooltip="Path to extract value from JSON data">route</mat-icon>
                    <mat-hint>Dot notation path to source value</mat-hint>
                    <mat-error *ngIf="ruleForm.get('json_path')?.hasError('required')">
                      JSON path is required
                    </mat-error>
                    <mat-autocomplete #pathAuto="matAutocomplete">
                      <mat-option *ngFor="let path of filteredPaths$ | async" [value]="path">
                        {{ path }}
                      </mat-option>
                    </mat-autocomplete>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Target Field</mat-label>
                    <mat-select formControlName="target_field">
                      <mat-option *ngFor="let field of targetFields" [value]="field">
                        {{ field }}
                      </mat-option>
                    </mat-select>
                    <mat-icon matSuffix>flag</mat-icon>
                    <mat-error *ngIf="ruleForm.get('target_field')?.hasError('required')">
                      Target field is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Default Value (Optional)</mat-label>
                    <input
                      matInput
                      formControlName="default_value"
                      placeholder="Value to use if conditions fail or path is empty">
                    <mat-icon matSuffix>backup</mat-icon>
                    <mat-hint>Fallback value when source is empty or conditions fail</mat-hint>
                  </mat-form-field>
                </div>

                <mat-divider></mat-divider>

                <div class="form-section">
                  <h3>Transformations</h3>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Transform Function</mat-label>
                    <mat-select formControlName="transform_function_path">
                      <mat-option [value]="null">None</mat-option>
                      <mat-option *ngFor="let transform of data.availableTransforms" [value]="transform.path">
                        <span class="transform-option">
                          <strong>{{ transform.label }}</strong>
                          <small *ngIf="transform.description">{{ transform.description }}</small>
                        </span>
                      </mat-option>
                    </mat-select>
                    <mat-icon matSuffix>transform</mat-icon>
                    <mat-hint>Function to transform the extracted value</mat-hint>
                  </mat-form-field>
                </div>

                <mat-divider></mat-divider>

                <div class="form-section">
                  <h3>Lookup Translation</h3>

                  <div class="lookup-row">
                    <mat-form-field appearance="outline" class="lookup-field">
                      <mat-label>Source Lookup</mat-label>
                      <mat-select formControlName="source_lookup">
                        <mat-option [value]="null">None</mat-option>
                        <mat-option *ngFor="let lookup of data.availableLookups" [value]="lookup.id">
                          {{ lookup.label }}
                        </mat-option>
                      </mat-select>
                      <mat-icon matSuffix>search</mat-icon>
                    </mat-form-field>

                    <mat-icon class="arrow-icon">arrow_forward</mat-icon>

                    <mat-form-field appearance="outline" class="lookup-field">
                      <mat-label>Target Lookup</mat-label>
                      <mat-select formControlName="target_lookup">
                        <mat-option [value]="null">None</mat-option>
                        <mat-option *ngFor="let lookup of data.availableLookups" [value]="lookup.id">
                          {{ lookup.label }}
                        </mat-option>
                      </mat-select>
                      <mat-icon matSuffix>flag</mat-icon>
                    </mat-form-field>
                  </div>

                  <mat-hint class="lookup-hint">
                    Use lookups to translate codes between different systems
                  </mat-hint>
                </div>
              </form>
            </div>
          </mat-tab>

          <!-- Conditions Tab -->
          <mat-tab label="Conditions">
            <div class="tab-content">
              <div class="condition-mode">
                <mat-radio-group [(value)]="conditionMode" (change)="onConditionModeChange($event.value)">
                  <mat-radio-button value="simple">Simple Conditions</mat-radio-button>
                  <mat-radio-button value="expression">Expression-based</mat-radio-button>
                </mat-radio-group>
              </div>

              <!-- Expression Mode -->
              <div *ngIf="conditionMode === 'expression'" class="expression-section">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Condition Expression</mat-label>
                  <textarea
                    matInput
                    formControlName="condition_expression"
                    rows="4"
                    placeholder="e.g., income > 5000 and age < 30">
                  </textarea>
                  <mat-hint>Python-style boolean expression using field names from JSON data</mat-hint>
                </mat-form-field>

                <div class="expression-help">
                  <mat-icon>info</mat-icon>
                  <div>
                    <strong>Available operators:</strong> ==, !=, >, <, >=, <=, and, or, in, not in<br>
                    <strong>Example:</strong> status == 'active' and (age > 18 or parent_consent == true)
                  </div>
                </div>
              </div>

              <!-- Simple Mode -->
              <div *ngIf="conditionMode === 'simple'" class="conditions-section">
                <div formArrayName="conditions" class="condition-groups">
                  <mat-expansion-panel
                    *ngFor="let group of conditionGroups; let i = index"
                    [expanded]="true"
                    class="condition-group">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        Condition Group {{ i + 1 }} ({{ getGroupLogic(group) }})
                      </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div [formArrayName]="i" class="group-conditions">
                      <div
                        *ngFor="let condition of getGroupConditions(i).controls; let j = index"
                        [formGroupName]="j"
                        class="condition-row">

                        <mat-form-field appearance="outline" class="condition-field">
                          <mat-label>Field Path</mat-label>
                          <input matInput formControlName="condition_path" placeholder="e.g., user.age">
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="operator-field">
                          <mat-label>Operator</mat-label>
                          <mat-select formControlName="condition_operator">
                            <mat-option value="==">Equals</mat-option>
                            <mat-option value="!=">Not Equals</mat-option>
                            <mat-option value=">">Greater Than</mat-option>
                            <mat-option value="<">Less Than</mat-option>
                            <mat-option value="in">Contains</mat-option>
                            <mat-option value="not_in">Not Contains</mat-option>
                          </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="value-field">
                          <mat-label>Value</mat-label>
                          <input matInput formControlName="condition_value">
                        </mat-form-field>

                        <button
                          mat-icon-button
                          color="warn"
                          (click)="removeCondition(i, j)"
                          matTooltip="Remove condition">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>

                      <button
                        mat-stroked-button
                        (click)="addCondition(i)"
                        class="add-condition-btn">
                        <mat-icon>add</mat-icon>
                        Add Condition
                      </button>
                    </div>
                  </mat-expansion-panel>
                </div>

                <button
                  mat-raised-button
                  (click)="addConditionGroup()"
                  class="add-group-btn">
                  <mat-icon>add_circle</mat-icon>
                  Add New Group (OR)
                </button>
              </div>
            </div>
          </mat-tab>

          <!-- Advanced Tab -->
          <mat-tab label="Advanced">
            <div class="tab-content">
              <div class="advanced-section">
                <h3>Processing Options</h3>

                <mat-slide-toggle formControlName="skip_empty">
                  Skip if source value is empty
                </mat-slide-toggle>

                <mat-slide-toggle formControlName="trim_whitespace">
                  Trim whitespace from values
                </mat-slide-toggle>

                <mat-slide-toggle formControlName="convert_types">
                  Automatically convert data types
                </mat-slide-toggle>
              </div>

              <mat-divider></mat-divider>

              <div class="advanced-section">
                <h3>Debug Information</h3>

                <div class="debug-info">
                  <div class="info-row">
                    <strong>Target Model:</strong>
                    <code>{{ data.targetModel }}</code>
                  </div>
                  <div class="info-row" *ngIf="data.rule">
                    <strong>Rule ID:</strong>
                    <code>{{ data.rule.id }}</code>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          (click)="save()"
          [disabled]="!ruleForm.valid">
          <mat-icon>save</mat-icon>
          {{ data.rule ? 'Update' : 'Create' }} Rule
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .field-rule-editor {
      min-width: 600px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    mat-dialog-content {
      padding: 0;
      max-height: 70vh;
      overflow: hidden;
    }

    mat-tab-group {
      height: 100%;
    }

    .tab-content {
      padding: 24px;
      overflow-y: auto;
      max-height: calc(70vh - 48px);
    }

    .rule-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-section h3 {
      margin: 0 0 8px 0;
      color: #424242;
      font-size: 16px;
    }

    .full-width {
      width: 100%;
    }

    .lookup-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .lookup-field {
      flex: 1;
    }

    .arrow-icon {
      color: #666;
    }

    .lookup-hint {
      margin-top: 8px;
      color: #666;
    }

    .transform-option {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .transform-option small {
      color: #666;
      font-size: 11px;
    }

    .condition-mode {
      margin-bottom: 24px;
    }

    mat-radio-button {
      margin-right: 24px;
    }

    .expression-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .expression-help {
      display: flex;
      gap: 12px;
      padding: 12px;
      background-color: #e3f2fd;
      border-radius: 4px;
      font-size: 13px;
    }

    .expression-help mat-icon {
      color: #1976d2;
    }

    .condition-groups {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .condition-group {
      background-color: #f5f5f5;
    }

    .group-conditions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }

    .condition-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .condition-field {
      flex: 2;
    }

    .operator-field {
      flex: 1;
      min-width: 120px;
    }

    .value-field {
      flex: 2;
    }

    .add-condition-btn {
      align-self: flex-start;
    }

    .add-group-btn {
      margin-top: 16px;
    }

    .advanced-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .advanced-section h3 {
      margin: 0 0 12px 0;
      color: #424242;
      font-size: 16px;
    }

    mat-slide-toggle {
      margin-bottom: 12px;
    }

    .debug-info {
      background-color: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
    }

    .info-row {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .lookup-row {
        flex-direction: column;
      }

      .arrow-icon {
        transform: rotate(90deg);
      }

      .condition-row {
        flex-wrap: wrap;
      }

      .condition-field,
      .operator-field,
      .value-field {
        flex: 1 1 100%;
      }
    }
  `]
})
export class FieldRuleEditorComponent implements OnInit {
  ruleForm: FormGroup;
  conditionMode: 'simple' | 'expression' = 'simple';

  // Mock data - should come from API
  targetFields: string[] = ['id', 'name', 'full_name', 'birth_date', 'status', 'created_at'];
  suggestedPaths: string[] = [
    'user.name',
    'user.profile.full_name',
    'user.birth_date',
    'applicant.name',
    'case_data.citizen_info.name'
  ];

  filteredPaths$: Observable<string[]>;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FieldRuleEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.ruleForm = this.createRuleForm();

    this.filteredPaths$ = this.ruleForm.get('json_path')!.valueChanges.pipe(
      startWith(''),
      map(value => this.filterPaths(value || ''))
    );
  }

  ngOnInit(): void {
    if (this.data.rule) {
      this.populateForm(this.data.rule);
    }

    // Load model fields based on target model
    this.loadModelFields();
  }

  createRuleForm(): FormGroup {
    return this.fb.group({
      json_path: ['', Validators.required],
      target_field: ['', Validators.required],
      default_value: [''],
      transform_function_path: [null],
      source_lookup: [null],
      target_lookup: [null],
      condition_expression: [''],
      conditions: this.fb.array([]),
      // Advanced options
      skip_empty: [false],
      trim_whitespace: [true],
      convert_types: [true]
    });
  }

  populateForm(rule: MapperFieldRule): void {
    this.ruleForm.patchValue({
      json_path: rule.json_path,
      target_field: rule.target_field,
      default_value: rule.default_value || '',
      transform_function_path: rule.transform_function_path || null,
      source_lookup: rule.source_lookup || null,
      target_lookup: rule.target_lookup || null,
      condition_expression: rule.condition_expression || ''
    });

    // Set condition mode
    if (rule.condition_expression) {
      this.conditionMode = 'expression';
    } else if (rule.conditions && rule.conditions.length > 0) {
      this.conditionMode = 'simple';
      this.populateConditions(rule.conditions);
    }
  }

  populateConditions(conditions: MapperFieldRuleCondition[]): void {
    const conditionsArray = this.ruleForm.get('conditions') as FormArray;
    conditionsArray.clear();

    // Group conditions by group name
    const groups = new Map<string, MapperFieldRuleCondition[]>();
    conditions.forEach(condition => {
      const group = condition.group || 'default';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(condition);
    });

    // Create form groups for each condition group
    groups.forEach((groupConditions) => {
      const groupArray = this.fb.array([]);
      groupConditions.forEach(condition => {
        groupArray.push(this.createConditionForm(condition));
      });
      conditionsArray.push(groupArray);
    });
  }

  createConditionForm(condition?: Partial<MapperFieldRuleCondition>): FormGroup {
    return this.fb.group({
      condition_path: [condition?.condition_path || ''],
      condition_operator: [condition?.condition_operator || '=='],
      condition_value: [condition?.condition_value || '']
    });
  }

  get conditionGroups(): FormArray[] {
    return (this.ruleForm.get('conditions') as FormArray).controls as FormArray[];
  }

  getGroupConditions(groupIndex: number): FormArray {
    return (this.ruleForm.get('conditions') as FormArray).at(groupIndex) as FormArray;
  }

  getGroupLogic(group: any): string {
    return 'AND';
  }

  addConditionGroup(): void {
    const conditionsArray = this.ruleForm.get('conditions') as FormArray;
    const newGroup = this.fb.array([this.createConditionForm()]);
    conditionsArray.push(newGroup);
  }

  addCondition(groupIndex: number): void {
    const group = this.getGroupConditions(groupIndex);
    group.push(this.createConditionForm());
  }

  removeCondition(groupIndex: number, conditionIndex: number): void {
    const group = this.getGroupConditions(groupIndex);
    group.removeAt(conditionIndex);

    // Remove group if empty
    if (group.length === 0) {
      const conditionsArray = this.ruleForm.get('conditions') as FormArray;
      conditionsArray.removeAt(groupIndex);
    }
  }

  onConditionModeChange(mode: 'simple' | 'expression'): void {
    if (mode === 'expression') {
      // Clear simple conditions
      const conditionsArray = this.ruleForm.get('conditions') as FormArray;
      conditionsArray.clear();
    } else {
      // Clear expression
      this.ruleForm.patchValue({ condition_expression: '' });
      // Add default condition group if none exist
      if ((this.ruleForm.get('conditions') as FormArray).length === 0) {
        this.addConditionGroup();
      }
    }
  }

  filterPaths(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.suggestedPaths.filter(path =>
      path.toLowerCase().includes(filterValue)
    );
  }

  loadModelFields(): void {
    // TODO: Load actual model fields from API
    // For now using mock data
    if (this.data.targetModel === 'citizen.Citizen') {
      this.targetFields = ['id', 'full_name', 'birth_date', 'national_id', 'gender', 'marital_status'];
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.ruleForm.valid) {
      const formValue = this.ruleForm.value;
      const result: Partial<MapperFieldRule> = {
        json_path: formValue.json_path,
        target_field: formValue.target_field,
        default_value: formValue.default_value || undefined,
        transform_function_path: formValue.transform_function_path || undefined,
        source_lookup: formValue.source_lookup || undefined,
        target_lookup: formValue.target_lookup || undefined
      };

      // Handle conditions based on mode
      if (this.conditionMode === 'expression' && formValue.condition_expression) {
        result.condition_expression = formValue.condition_expression;
      } else if (this.conditionMode === 'simple' && formValue.conditions.length > 0) {
        result.conditions = this.buildConditions(formValue.conditions);
      }

      this.dialogRef.close(result);
    }
  }

  private buildConditions(conditionGroups: any[]): MapperFieldRuleCondition[] {
    const conditions: MapperFieldRuleCondition[] = [];

    conditionGroups.forEach((group, groupIndex) => {
      const groupName = `group_${groupIndex}`;
      group.forEach((condition: any) => {
        if (condition.condition_path) {
          conditions.push({
            field_rule: 0, // Will be set by backend
            group: groupName,
            condition_path: condition.condition_path,
            condition_operator: condition.condition_operator as ConditionOperator,
            condition_value: condition.condition_value
          });
        }
      });
    });

    return conditions;
  }
}
