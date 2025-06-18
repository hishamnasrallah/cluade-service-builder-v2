// src/app/components/mapper-builder/target-details/target-details.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MapperTarget, ModelOption, LookupOption, TransformFunction, MapperFieldRule } from '../../../models/mapper.models';
import { FieldRuleListComponent } from '../field-rule-list/field-rule-list.component';
import { FieldRuleEditorDialogComponent } from '../components/dialogs/field-rule-editor-dialog/field-rule-editor-dialog.component';

@Component({
  selector: 'app-target-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatTooltipModule,
    MatTabsModule,
    FieldRuleListComponent
  ],
  templateUrl: 'target-details.component.html',
  styleUrl:'target-details.component.scss'
})
export class TargetDetailsComponent implements OnInit, OnChanges {
  @Input() target!: MapperTarget;
  @Input() availableModels: ModelOption[] = [];
  @Input() availableLookups: LookupOption[] = [];
  @Input() availableTransforms: TransformFunction[] = [];

  @Output() targetUpdated = new EventEmitter<{ id: string; changes: Partial<MapperTarget> }>();
  @Output() fieldRuleAdded = new EventEmitter<MapperFieldRule>();
  @Output() fieldRuleUpdated = new EventEmitter<{ ruleId: number; changes: Partial<MapperFieldRule> }>();
  @Output() fieldRuleDeleted = new EventEmitter<number>();

  targetForm!: FormGroup;
  modelSearchControl = this.fb.control('');
  private originalFormValue: any;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadTargetData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['target'] && !changes['target'].firstChange) {
      this.loadTargetData();
    }
  }

  private createForm(): void {
    this.targetForm = this.fb.group({
      name: ['', Validators.required],
      model: ['', Validators.required],
      active_ind: [true],
      root_path: [''],
      finder_function_path: [''],
      processor_function_path: [''],
      post_processor_path: [''],
      filter_function_path: ['']
    });
  }

  private loadTargetData(): void {
    if (this.target) {
      this.targetForm.patchValue({
        name: this.target.name,
        model: this.target.model,
        active_ind: this.target.active_ind,
        root_path: this.target.root_path || '',
        finder_function_path: this.target.finder_function_path || '',
        processor_function_path: this.target.processor_function_path || '',
        post_processor_path: this.target.post_processor_path || '',
        filter_function_path: this.target.filter_function_path || ''
      });

      // Set root path as required if this is a child target
      if (this.target.parent_target) {
        this.targetForm.get('root_path')?.setValidators([Validators.required]);
      } else {
        this.targetForm.get('root_path')?.clearValidators();
      }
      this.targetForm.get('root_path')?.updateValueAndValidity();

      this.originalFormValue = this.targetForm.value;
    }
  }

  getTargetIcon(): string {
    if (!this.target.parent_target) {
      return 'account_tree';
    }
    if (this.target.root_path) {
      return 'all_inclusive';
    }
    return 'description';
  }

  getModelGroups(): { app: string; models: ModelOption[] }[] {
    const groups = new Map<string, ModelOption[]>();

    this.availableModels.forEach(model => {
      if (!groups.has(model.app_label)) {
        groups.set(model.app_label, []);
      }
      groups.get(model.app_label)!.push(model);
    });

    return Array.from(groups.entries())
      .map(([app, models]) => ({ app, models }))
      .sort((a, b) => a.app.localeCompare(b.app));
  }

  getModelValue(model: ModelOption): string {
    return `${model.app_label}.${model.model}`;
  }

  onModelChange(modelValue: string): void {
    // Model changed, might need to update field rules
    console.log('Model changed to:', modelValue);
  }

  isFormDirty(): boolean {
    return JSON.stringify(this.targetForm.value) !== JSON.stringify(this.originalFormValue);
  }

  resetForm(): void {
    this.loadTargetData();
    this.snackBar.open('Form reset to original values', 'Close', { duration: 2000 });
  }

  saveTarget(): void {
    if (this.targetForm.valid && this.target.id) {
      const changes = this.targetForm.value;
      this.targetUpdated.emit({ id: this.target.id, changes });
      this.originalFormValue = this.targetForm.value;
      this.snackBar.open('Target updated successfully', 'Close', { duration: 3000 });
    }
  }

  // Field rule management
  addFieldRule(): void {
    const dialogRef = this.dialog.open(FieldRuleEditorDialogComponent, {
      width: '800px',
      data: {
        targetModel: this.targetForm.get('model')?.value,
        availableTransforms: this.availableTransforms,
        availableLookups: this.availableLookups
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fieldRuleAdded.emit(result);
      }
    });
  }

  onFieldRuleUpdated(event: { ruleId: number; changes: Partial<MapperFieldRule> }): void {
    this.fieldRuleUpdated.emit(event);
  }

  onFieldRuleDeleted(ruleId: number): void {
    this.fieldRuleDeleted.emit(ruleId);
  }

  onFieldRulesReordered(rules: MapperFieldRule[]): void {
    // Handle reordering
    console.log('Field rules reordered:', rules);
  }

  // Function browsers
  browseFinderFunctions(): void {
    // Open function browser dialog
    console.log('Browse finder functions');
  }

  browseProcessorFunctions(): void {
    // Open function browser dialog
    console.log('Browse processor functions');
  }

  browsePostProcessorFunctions(): void {
    // Open function browser dialog
    console.log('Browse post-processor functions');
  }

  browseFilterFunctions(): void {
    // Open function browser dialog
    console.log('Browse filter functions');
  }
}
