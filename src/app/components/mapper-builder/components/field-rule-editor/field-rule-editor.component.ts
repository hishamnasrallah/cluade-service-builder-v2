// src/app/components/mapper-builder/components/field-rule-editor/field-rule-editor.component.ts
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import {
  MapperFieldRule,
  LookupOption,
  TransformFunction,
  ConditionOperator,
  MapperFieldRuleCondition,
  ModelField
} from '../../../../models/mapper.models';
import { MapperApiService } from '../../../../services/mapper-api.service';

interface DialogData {
  rule: MapperFieldRule | null;
  targetModel: string;
  availableLookups: LookupOption[];
  availableTransforms: TransformFunction[];
  modelFields?: ModelField[];
  jsonPathSuggestions?: string[];
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
    MatProgressSpinnerModule,
    MatCheckboxModule,
    FormsModule,
    DragDropModule
  ],
  templateUrl: 'field-rule-editor.component.html',
  styleUrl: 'field-rule-editor.component.scss'
})
export class FieldRuleEditorComponent implements OnInit {
  ruleForm: FormGroup;
  conditionMode: 'simple' | 'expression' = 'simple';

  // Dynamic data from API
  targetFields: string[] = [];
  suggestedPaths: string[] = [];
  isLoadingFields = false;
  arrayIndices: number[] = [];
  filteredPaths$: Observable<string[]>;
  visualConditionMode = false;
  conditionBuilder = {
    field: '',
    operator: '==',
    value: ''
  };
  advancedOptions = {
    skip_empty: false,
    trim_whitespace: true,
    convert_types: true,
    array_index_notation: false
  };

  // Store lookups locally and ensure they're loaded
  lookups: LookupOption[] = [];
  isLoadingLookups = false;

  constructor(
    private fb: FormBuilder,
    private apiService: MapperApiService,
    public dialogRef: MatDialogRef<FieldRuleEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    console.log('FieldRuleEditor constructor - Dialog data:', {
      hasRule: !!data.rule,
      targetModel: data.targetModel,
      availableLookupsCount: data.availableLookups?.length || 0,
      availableTransformsCount: data.availableTransforms?.length || 0
    });

    this.ruleForm = this.createRuleForm();

    this.filteredPaths$ = this.ruleForm.get('json_path')!.valueChanges.pipe(
      startWith(''),
      map(value => this.filterPaths(value || ''))
    );

    // Initialize lookups from dialog data
    this.lookups = this.data.availableLookups || [];
    if (this.lookups.length > 0) {
      console.log('Initial lookups loaded from dialog data:', this.lookups);
    } else {
      console.log('No lookups in dialog data, will load from API');
    }
  }

  ngOnInit(): void {
    // Setup lookup watcher first
    this.setupLookupWatcher();

    if (this.data.rule) {
      this.populateForm(this.data.rule);
    }

    // Load model fields based on target model
    if (this.data.targetModel && !this.data.modelFields) {
      this.loadModelFields();
    }

    // Load JSONPath suggestions
    this.loadJSONPathSuggestions();

    // Always load lookups to ensure we have the latest data
    console.log('Loading lookups...');
    this.loadLookups();
  }

  createRuleForm(): FormGroup {
    return this.fb.group({
      json_path: ['', Validators.required],
      target_field: ['', Validators.required],
      default_value: [''],
      transform_function_path: [null],
      use_lookup: [false],
      source_lookup: [null],
      target_lookup: [null],
      condition_expression: [''],
      conditions: this.fb.array([]),
      // Advanced options
      skip_empty: [false],
      trim_whitespace: [true],
      convert_types: [true],
      use_array_index: [false],
      array_indices: this.fb.array([]),
      array_index_notation: [false],
      validate_on_save: [true]
    });
  }

  // Add this method to load lookups if not provided
  loadLookups(): void {
    this.isLoadingLookups = true;
    this.apiService.getAvailableLookups().subscribe({
      next: (lookups) => {
        console.log('Loaded lookups from API:', lookups);
        this.lookups = lookups || [];
        this.data.availableLookups = this.lookups; // Update the data object
        this.isLoadingLookups = false;
      },
      error: (error) => {
        console.error('Failed to load lookups:', error);
        this.isLoadingLookups = false;
        // Use mock data as fallback
        this.lookups = this.getMockLookups();
        this.data.availableLookups = this.lookups;
      }
    });
  }

  // Add mock lookups for fallback
  getMockLookups(): LookupOption[] {
    return [
      {
        id: 1,
        code: '03',
        label: 'Phone Types',
        values: [
          { id: 2, code: '01', label: 'Fax' },
          { id: 3, code: '02', label: 'Mobile' },
          { id: 4, code: '03', label: 'Line' }
        ]
      },
      {
        id: 5,
        code: '01',
        label: 'User Types',
        values: [
          { id: 6, code: '01', label: 'Admin' },
          { id: 7, code: '02', label: 'Public User' }
        ]
      },
      {
        id: 10,
        code: '04',
        label: 'Case Status',
        values: [
          { id: 11, code: '01', label: 'Submitted' },
          { id: 20, code: '', label: 'Draft' },
          { id: 21, code: '04', label: 'Return To Applicant' },
          { id: 57, code: '55', label: 'Completed' }
        ]
      },
      {
        id: 12,
        code: '05',
        label: 'Applicant Type',
        values: [
          { id: 13, code: '', label: 'Self' },
          { id: 52, code: '', label: 'Father' }
        ]
      },
      {
        id: 31,
        code: '08',
        label: 'Gender',
        values: [
          { id: 32, code: '01', label: 'Male' },
          { id: 33, code: '02', label: 'Female' }
        ]
      }
    ];
  }

  private setupLookupWatcher(): void {
    this.ruleForm.get('use_lookup')?.valueChanges.subscribe(useLookup => {
      const sourceLookupControl = this.ruleForm.get('source_lookup');
      const targetLookupControl = this.ruleForm.get('target_lookup');

      if (useLookup) {
        sourceLookupControl?.setValidators([Validators.required]);
        targetLookupControl?.setValidators([Validators.required]);
      } else {
        sourceLookupControl?.clearValidators();
        targetLookupControl?.clearValidators();
        sourceLookupControl?.setValue('');
        targetLookupControl?.setValue('');
      }

      sourceLookupControl?.updateValueAndValidity();
      targetLookupControl?.updateValueAndValidity();
    });
  }

  loadModelFields(): void {
    if (this.data.targetModel) {
      this.isLoadingFields = true;
      this.apiService.getModelFields(this.data.targetModel).subscribe({
        next: (fields: ModelField[]) => {
          this.targetFields = fields.map(f => f.name);
          this.isLoadingFields = false;
        },
        error: (error) => {
          console.error('Failed to load model fields:', error);
          this.isLoadingFields = false;
          // Fallback to some default fields
          this.targetFields = ['id', 'name', 'created_at', 'updated_at'];
        }
      });
    }
  }

  loadJSONPathSuggestions(): void {
    // Get case type from somewhere (could be passed in data)
    const caseType = 'default'; // You might want to pass this from parent

    this.apiService.getJSONPathSuggestions(caseType).subscribe({
      next: (suggestions) => {
        this.suggestedPaths = suggestions.map(s => s.path);
      },
      error: (error) => {
        console.error('Failed to load JSONPath suggestions:', error);
        // Fallback suggestions
        this.suggestedPaths = [
          'user.name',
          'user.profile.full_name',
          'user.birth_date',
          'applicant.name',
          'case_data.citizen_info.name'
        ];
      }
    });
  }

  populateForm(rule: MapperFieldRule): void {
    this.ruleForm.patchValue({
      json_path: rule.json_path,
      target_field: rule.target_field,
      default_value: rule.default_value || '',
      transform_function_path: rule.transform_function_path || null,
      use_lookup: !!(rule.source_lookup && rule.target_lookup),
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

  // Additional methods
  addArrayIndex(): void {
    const indices = this.ruleForm.get('array_indices') as FormArray;
    indices.push(this.fb.control(0));
  }

  removeArrayIndex(index: number): void {
    const indices = this.ruleForm.get('array_indices') as FormArray;
    indices.removeAt(index);
  }

  buildJsonPath(): string {
    const basePath = this.ruleForm.get('json_path')?.value;
    const useArrayIndex = this.ruleForm.get('use_array_index')?.value;

    if (!useArrayIndex) return basePath;

    const indices = this.ruleForm.get('array_indices')?.value || [];
    let path = basePath;

    indices.forEach((index: number) => {
      path += `.${index}`;
    });

    return path;
  }

  buildConditionFromVisual(): void {
    const condition = `${this.conditionBuilder.field} ${this.conditionBuilder.operator} '${this.conditionBuilder.value}'`;
    this.ruleForm.patchValue({ condition_expression: condition });
  }

  // Drag and drop for condition ordering
  dropCondition(event: CdkDragDrop<any[]>): void {
    const conditionsArray = this.ruleForm.get('conditions') as FormArray;
    const conditions = conditionsArray.value;
    moveItemInArray(conditions, event.previousIndex, event.currentIndex);
    conditionsArray.setValue(conditions);
  }

  // Real-time validation
  validateJsonPath(): void {
    const path = this.ruleForm.get('json_path')?.value;
    if (!path) return;

    // Check against suggestions
    const isValid = this.validatePathFormat(path);
    if (!isValid) {
      this.ruleForm.get('json_path')?.setErrors({ invalidPath: true });
    }
  }

  validatePathFormat(path: string): boolean {
    // Implementation from validation service
    const segments = path.split('.');
    for (const segment of segments) {
      if (segment === '') return false;
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(segment) && !/^\d+$/.test(segment)) {
        return false;
      }
    }
    return true;
  }

  validateRule(): string[] {
    const errors: string[] = [];
    const formValue = this.ruleForm.value;

    // Validate JSONPath
    if (!this.validatePathFormat(formValue.json_path)) {
      errors.push('Invalid JSON path format');
    }

    // Validate target field
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formValue.target_field)) {
      errors.push('Target field must be a valid Python identifier');
    }

    // Validate lookups
    if (formValue.use_lookup && formValue.source_lookup && !formValue.target_lookup) {
      errors.push('Target lookup required when source lookup is specified');
    }

    return errors;
  }

  showValidationErrors(errors: string[]): void {
    // Show errors in a dialog or snackbar
    console.error('Validation errors:', errors);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.ruleForm.get('validate_on_save')?.value) {
      const validationErrors = this.validateRule();
      if (validationErrors.length > 0) {
        // Show validation errors
        this.showValidationErrors(validationErrors);
        return;
      }
    }

    const formValue = this.ruleForm.value;
    const result: Partial<MapperFieldRule> = {
      json_path: formValue.json_path,
      target_field: formValue.target_field,
      default_value: formValue.default_value || undefined,
      transform_function_path: formValue.transform_function_path || undefined
    };

    // Handle lookups based on use_lookup checkbox
    if (formValue.use_lookup && formValue.source_lookup && formValue.target_lookup) {
      result.source_lookup = formValue.source_lookup;
      result.target_lookup = formValue.target_lookup;
    } else {
      result.source_lookup = undefined;
      result.target_lookup = undefined;
    }

    // Handle conditions based on mode
    if (this.conditionMode === 'expression' && formValue.condition_expression) {
      result.condition_expression = formValue.condition_expression;
    } else if (this.conditionMode === 'simple' && formValue.conditions.length > 0) {
      result.conditions = this.buildConditions(formValue.conditions);
    }

    this.dialogRef.close(result);
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
