// src/app/components/mapper-builder/components/field-rule-editor/field-rule-editor.component.ts

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, FormsModule} from '@angular/forms';
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
    MatSlideToggleModule,
    FormsModule
  ],
  templateUrl:'field-rule-editor.component.html',
  styleUrl:'field-rule-editor.component.scss'
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
      const groupControls: FormGroup[] = [];
      groupConditions.forEach(condition => {
        const conditionForm = this.fb.group({
          condition_path: [condition?.condition_path || ''],
          condition_operator: [condition?.condition_operator || '=='],
          condition_value: [condition?.condition_value || '']
        });
        groupControls.push(conditionForm);
      });
      // Create a FormArray from the FormGroups and push it to the main conditions array
      const groupArray = this.fb.array(groupControls);
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
