// src/app/components/mapper-builder/dialogs/field-rule-editor-dialog/field-rule-editor-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, map, startWith } from 'rxjs';

import {
  MapperFieldRule,
  TransformFunction,
  LookupOption,
  ModelField,
  ConditionOperator,
  MapperFieldRuleCondition
} from '../../../../../models/mapper.models';
import { MapperApiService } from '../../../../../services/mapper-api.service';

interface DialogData {
  rule?: MapperFieldRule;
  targetModel: string;
  availableTransforms: TransformFunction[];
  availableLookups: LookupOption[];
}

@Component({
  selector: 'app-field-rule-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatTooltipModule
  ],
  templateUrl: 'field-rule-editor-dialog.component.html',
  styleUrl: 'field-rule-editor-dialog.component.scss'
})
export class FieldRuleEditorDialogComponent implements OnInit {
  ruleForm!: FormGroup;
  targetFields: ModelField[] = [];
  filteredTargetFields!: Observable<ModelField[]>;
  transformGroups: { name: string; transforms: TransformFunction[] }[] = [];
  selectedTransform?: TransformFunction;

  testData = '';
  testResult?: {
    sourceValue: any;
    transformedValue?: any;
    finalValue: any;
    conditionResult?: boolean;
  };

  get conditionsArray() {
    return this.ruleForm.get('conditions') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<FieldRuleEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private mapperApi: MapperApiService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadTargetFields();
    this.groupTransforms();
    this.setupAutocomplete();
    this.setupTransformWatcher();
    this.setupLookupWatcher();

    if (this.data.rule) {
      this.loadRuleData();
    }
  }

  private createForm(): void {
    this.ruleForm = this.fb.group({
      target_field: ['', Validators.required],
      json_path: ['', Validators.required],
      default_value: [''],
      transform_function_path: [''],
      use_lookup: [false],
      source_lookup: [''],
      target_lookup: [''],
      condition_type: ['always'],
      condition_expression: [''],
      conditions: this.fb.array([])
    });
  }

  private loadTargetFields(): void {
    if (this.data.targetModel) {
      this.mapperApi.getModelFields(this.data.targetModel).subscribe({
        next: (fields: ModelField[]) => {
          this.targetFields = fields;
        },
        error: (error: any) => {
          console.error('Failed to load model fields:', error);
        }
      });
    }
  }

  private groupTransforms(): void {
    const groups = new Map<string, TransformFunction[]>();

    this.data.availableTransforms.forEach(transform => {
      const module = transform.path.split('.').slice(0, -1).join('.');
      if (!groups.has(module)) {
        groups.set(module, []);
      }
      groups.get(module)!.push(transform);
    });

    this.transformGroups = Array.from(groups.entries())
      .map(([name, transforms]) => ({ name: name || 'General', transforms }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private setupAutocomplete(): void {
    this.filteredTargetFields = this.ruleForm.get('target_field')!.valueChanges.pipe(
      startWith(''),
      map(value => this.filterFields(value || ''))
    );
  }

  private filterFields(value: string): ModelField[] {
    const filterValue = value.toLowerCase();
    return this.targetFields.filter(field =>
      field.name.toLowerCase().includes(filterValue)
    );
  }

  private setupTransformWatcher(): void {
    this.ruleForm.get('transform_function_path')?.valueChanges.subscribe(path => {
      this.selectedTransform = this.data.availableTransforms.find(t => t.path === path);
    });
  }

  private setupLookupWatcher(): void {
    this.ruleForm.get('use_lookup')?.valueChanges.subscribe(useLookup => {
      if (useLookup) {
        this.ruleForm.get('source_lookup')?.setValidators([Validators.required]);
        this.ruleForm.get('target_lookup')?.setValidators([Validators.required]);
      } else {
        this.ruleForm.get('source_lookup')?.clearValidators();
        this.ruleForm.get('target_lookup')?.clearValidators();
        this.ruleForm.patchValue({
          source_lookup: '',
          target_lookup: ''
        });
      }
      this.ruleForm.get('source_lookup')?.updateValueAndValidity();
      this.ruleForm.get('target_lookup')?.updateValueAndValidity();
    });
  }

  private loadRuleData(): void {
    const rule = this.data.rule!;

    this.ruleForm.patchValue({
      target_field: rule.target_field,
      json_path: rule.json_path,
      default_value: rule.default_value || '',
      transform_function_path: rule.transform_function_path || '',
      use_lookup: !!(rule.source_lookup && rule.target_lookup),
      source_lookup: rule.source_lookup || '',
      target_lookup: rule.target_lookup || ''
    });

    if (rule.condition_expression) {
      this.ruleForm.patchValue({
        condition_type: 'expression',
        condition_expression: rule.condition_expression
      });
    } else if (rule.conditions && rule.conditions.length > 0) {
      this.ruleForm.patchValue({ condition_type: 'simple' });
      rule.conditions.forEach(condition => {
        this.addCondition(condition);
      });
    }
  }

  applyPathExample(example: string): void {
    this.ruleForm.patchValue({ json_path: example });
  }

  addCondition(data?: Partial<MapperFieldRuleCondition>): void {
    const condition = this.fb.group({
      condition_path: [data?.condition_path || '', Validators.required],
      condition_operator: [data?.condition_operator || '==', Validators.required],
      condition_value: [data?.condition_value || '', Validators.required],
      group: [data?.group || 'AND']
    });
    this.conditionsArray.push(condition);
  }

  removeCondition(index: number): void {
    this.conditionsArray.removeAt(index);
  }

  testJsonPath(): void {
    // Implement JSON path testing
    console.log('Test JSON path:', this.ruleForm.get('json_path')?.value);
  }

  runTest(): void {
    try {
      const testDataObj = JSON.parse(this.testData);
      const jsonPath = this.ruleForm.get('json_path')?.value;

      // Simple path resolution (in real app, use proper JSONPath library)
      const pathParts = jsonPath.split('.');
      let value = testDataObj;

      for (const part of pathParts) {
        value = value?.[part];
      }

      this.testResult = {
        sourceValue: value !== undefined ? value : 'undefined',
        transformedValue: value, // Would apply transform here
        finalValue: value !== undefined ? value : this.ruleForm.get('default_value')?.value || 'null',
        conditionResult: true // Would evaluate condition here
      };
    } catch (error) {
      console.error('Test error:', error);
    }
  }

  onSave(): void {
    if (this.ruleForm.valid) {
      const formValue = this.ruleForm.value;
      const result: Partial<MapperFieldRule> = {
        target_field: formValue.target_field,
        json_path: formValue.json_path,
        default_value: formValue.default_value || undefined,
        transform_function_path: formValue.transform_function_path || undefined
      };

      // Handle lookups
      if (formValue.use_lookup) {
        result.source_lookup = formValue.source_lookup;
        result.target_lookup = formValue.target_lookup;
      }

      // Handle conditions
      if (formValue.condition_type === 'expression' && formValue.condition_expression) {
        result.condition_expression = formValue.condition_expression;
      } else if (formValue.condition_type === 'simple' && formValue.conditions.length > 0) {
        result.conditions = formValue.conditions;
      }

      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
