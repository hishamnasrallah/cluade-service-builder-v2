// src/app/components/mapper-builder/components/mapper-canvas/mapper-canvas.component.ts

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import {
  MapperTarget,
  MapperFieldRule,
  ModelOption,
  LookupOption,
  TransformFunction,
  FilterFunction,
  ProcessorFunction
} from '../../../../models/mapper.models';
import { FieldRuleEditorComponent } from '../field-rule-editor/field-rule-editor.component';
import {MatAutocomplete, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {FieldRuleEditorDialogComponent} from '../dialogs/field-rule-editor-dialog/field-rule-editor-dialog.component';

@Component({
  selector: 'app-mapper-canvas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatAutocompleteTrigger,
    MatAutocomplete
  ],
  templateUrl:'mapper-canvas.component.html',
  styleUrl:'mapper-canvas.component.scss'
})
export class MapperCanvasComponent implements OnChanges {
  @Input() selectedTarget: MapperTarget | null | undefined = null;
  @Input() availableModels: ModelOption[] | null = [];
  @Input() availableLookups: LookupOption[] | null = [];
  @Input() availableTransforms: TransformFunction[] | null = [];
  @Input() availableFilters: FilterFunction[] | null = [];

  @Output() targetUpdated = new EventEmitter<Partial<MapperTarget>>();
  @Output() fieldRuleAdded = new EventEmitter<MapperFieldRule>();
  @Output() fieldRuleUpdated = new EventEmitter<{ ruleId: number; updates: Partial<MapperFieldRule> }>();
  @Output() fieldRuleDeleted = new EventEmitter<number>();

  targetForm: FormGroup;
  modelFilterCtrl = this.fb.control('');
  filteredModels$ = this.modelFilterCtrl.valueChanges.pipe(
    startWith(''),
    map(search => this.filterModels(search || ''))
  );

  displayedColumns = ['json_path', 'target_field', 'transform', 'conditions', 'actions'];
  processor: any;
  @Input() availableProcessors!: any[];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.targetForm = this.createTargetForm();
  }

  displayModelFn(value: string): string {
    return value || '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedTarget'] && this.selectedTarget) {
      this.updateTargetForm();
    }
  }

  createTargetForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      model: ['', Validators.required],
      root_path: [''],
      filter_function_path: [null]
    });
  }

  updateTargetForm(): void {
    if (this.selectedTarget) {
      this.targetForm.patchValue({
        name: this.selectedTarget.name,
        model: this.selectedTarget.model,
        root_path: this.selectedTarget.root_path || '',
        filter_function_path: this.selectedTarget.filter_function_path || null
      });
      this.targetForm.markAsPristine();
    }
  }

  filterModels(search: string | any): ModelOption[] {
    const searchStr = typeof search === 'string' ? search : '';
    if (!this.availableModels) return [];
    if (!searchStr) return this.availableModels;

    const searchLower = searchStr.toLowerCase();
    return this.availableModels.filter(model =>
      model.model.toLowerCase().includes(searchLower) ||
      model.app_label.toLowerCase().includes(searchLower)
    );
  }

  onModelChange(model: string): void {
    // Could load model fields here
    console.log('Model changed:', model);
  }

  onActiveToggle(active: boolean): void {
    this.targetUpdated.emit({ active_ind: active });
  }

  saveTargetConfig(): void {
    if (this.targetForm.valid) {
      this.targetUpdated.emit(this.targetForm.value);
      this.targetForm.markAsPristine();
    }
  }

  resetTargetForm(): void {
    this.updateTargetForm();
  }

  hasConditions(rule: MapperFieldRule): boolean {
    return !!(rule.condition_expression || (rule.conditions && rule.conditions.length > 0));
  }

  getTransformLabel(path: string): string {
    const transform = this.availableTransforms?.find(t => t.path === path);
    return transform?.label || path.split('.').pop() || path;
  }

  addFieldRule(): void {
    console.log('Opening Field Rule Dialog with lookups:', this.availableLookups?.length || 0);

    const dialogRef = this.dialog.open(FieldRuleEditorDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        rule: null,
        targetModel: this.selectedTarget?.model,
        availableLookups: this.availableLookups || [],
        availableTransforms: this.availableTransforms || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fieldRuleAdded.emit(result);
      }
    });
  }
  editFieldRule(rule: MapperFieldRule): void {
    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        rule: { ...rule },
        targetModel: this.selectedTarget?.model,
        availableLookups: this.availableLookups,
        availableTransforms: this.availableTransforms
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && rule.id) {
        this.fieldRuleUpdated.emit({ ruleId: rule.id, updates: result });
      }
    });
  }

  duplicateFieldRule(rule: MapperFieldRule): void {
    const newRule = { ...rule, id: undefined };
    this.fieldRuleAdded.emit(newRule);
  }

  deleteFieldRule(rule: MapperFieldRule): void {
    if (rule.id && confirm('Are you sure you want to delete this field rule?')) {
      this.fieldRuleDeleted.emit(rule.id);
    }
  }
}
