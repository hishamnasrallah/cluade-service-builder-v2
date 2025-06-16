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
  FilterFunction
} from '../../../../models/mapper.models';
import { FieldRuleEditorComponent } from '../field-rule-editor/field-rule-editor.component';
import {MatAutocomplete, MatAutocompleteTrigger} from '@angular/material/autocomplete';

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
  template: `
    <div class="mapper-canvas">
      <mat-card class="target-config-card" *ngIf="selectedTarget">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="header-icon">settings</mat-icon>
            Target Configuration
          </mat-card-title>
          <div class="header-actions">
            <mat-slide-toggle
              [checked]="selectedTarget.active_ind"
              (change)="onActiveToggle($event.checked)"
              matTooltip="Toggle target active state">
              Active
            </mat-slide-toggle>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="targetForm" class="target-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Target Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter target name">
                <mat-icon matSuffix>label</mat-icon>
                <mat-error *ngIf="targetForm.get('name')?.hasError('required')">
                  Name is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Model</mat-label>
                <input type="text"
                       matInput
                       formControlName="model"
                       placeholder="Search and select model..."
                       [matAutocomplete]="modelAuto">
                <mat-autocomplete #modelAuto="matAutocomplete"
                                  [displayWith]="displayModelFn"
                                  (optionSelected)="onModelChange($event.option.value)">
                  <mat-option *ngFor="let model of filteredModels$ | async"
                              [value]="model.app_label + '.' + model.model">
                <span class="model-option">
                  <strong>{{ model.model }}</strong>
                  <small>{{ model.app_label }}</small>
                </span>
                  </mat-option>
                </mat-autocomplete>
                <mat-icon matSuffix>data_object</mat-icon>
                <mat-error *ngIf="targetForm.get('model')?.hasError('required')">
                  Model is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row" *ngIf="selectedTarget.parent_target">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Root Path (JSON Path)</mat-label>
                <input
                  matInput
                  formControlName="root_path"
                  placeholder="e.g., children, items, records">
                <mat-icon matSuffix matTooltip="Path to list in parent's data">format_list_bulleted</mat-icon>
                <mat-hint>JSON path to the list of items to map</mat-hint>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Filter Function (Optional)</mat-label>
                <mat-select formControlName="filter_function_path">
                  <mat-option [value]="null">None</mat-option>
                  <mat-option *ngFor="let filter of availableFilters" [value]="filter.path">
                    {{ filter.label }}
                  </mat-option>
                </mat-select>
                <mat-icon matSuffix>filter_alt</mat-icon>
                <mat-hint>Function to filter items in list mapping</mat-hint>
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button
                mat-raised-button
                color="primary"
                (click)="saveTargetConfig()"
                [disabled]="!targetForm.valid || !targetForm.dirty">
                <mat-icon>save</mat-icon>
                Save Configuration
              </button>
              <button
                mat-button
                (click)="resetTargetForm()"
                [disabled]="!targetForm.dirty">
                <mat-icon>undo</mat-icon>
                Reset
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Field Rules Section -->
      <mat-card class="field-rules-card" *ngIf="selectedTarget">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="header-icon">rule</mat-icon>
            Field Mapping Rules
          </mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="accent" (click)="addFieldRule()">
              <mat-icon>add</mat-icon>
              Add Field Rule
            </button>
          </div>
        </mat-card-header>

        <mat-card-content>
          <div class="field-rules-table" *ngIf="selectedTarget.field_rules && selectedTarget.field_rules.length > 0">
            <table mat-table [dataSource]="selectedTarget.field_rules" class="full-width">
              <!-- JSON Path Column -->
              <ng-container matColumnDef="json_path">
                <th mat-header-cell *matHeaderCellDef>Source Path</th>
                <td mat-cell *matCellDef="let rule">
                  <code class="json-path">{{ rule.json_path }}</code>
                </td>
              </ng-container>

              <!-- Target Field Column -->
              <ng-container matColumnDef="target_field">
                <th mat-header-cell *matHeaderCellDef>Target Field</th>
                <td mat-cell *matCellDef="let rule">
                  <span class="target-field">{{ rule.target_field }}</span>
                </td>
              </ng-container>

              <!-- Transform Column -->
              <ng-container matColumnDef="transform">
                <th mat-header-cell *matHeaderCellDef>Transform</th>
                <td mat-cell *matCellDef="let rule">
                  <mat-chip-listbox class="transform-chip" *ngIf="rule.transform_function_path">
                    <mat-chip>{{ getTransformLabel(rule.transform_function_path) }}</mat-chip>
                  </mat-chip-listbox>
                  <span *ngIf="!rule.transform_function_path" class="no-transform">None</span>
                </td>
              </ng-container>

              <!-- Conditions Column -->
              <ng-container matColumnDef="conditions">
                <th mat-header-cell *matHeaderCellDef>Conditions</th>
                <td mat-cell *matCellDef="let rule">
                  <mat-icon
                    *ngIf="hasConditions(rule)"
                    class="condition-indicator"
                    matTooltip="Has conditions">
                    check_circle
                  </mat-icon>
                  <mat-icon
                    *ngIf="!hasConditions(rule)"
                    class="no-condition-indicator">
                    radio_button_unchecked
                  </mat-icon>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let rule">
                  <button mat-icon-button (click)="editFieldRule(rule)" matTooltip="Edit rule">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="duplicateFieldRule(rule)" matTooltip="Duplicate rule">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                  <button mat-icon-button (click)="deleteFieldRule(rule)" matTooltip="Delete rule" color="warn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="field-rule-row"></tr>
            </table>
          </div>

          <div class="empty-rules" *ngIf="!selectedTarget.field_rules || selectedTarget.field_rules.length === 0">
            <mat-icon>rule_folder</mat-icon>
            <p>No field rules defined</p>
            <button mat-raised-button color="primary" (click)="addFieldRule()">
              <mat-icon>add</mat-icon>
              Create First Rule
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- No Target Selected -->
      <div class="no-target-selected" *ngIf="!selectedTarget">
        <mat-icon>touch_app</mat-icon>
        <h3>No Target Selected</h3>
        <p>Select a target from the tree to configure its mapping rules</p>
      </div>
    </div>
  `,
  styles: [`
    .mapper-canvas {
      height: 100%;
      overflow-y: auto;
    }

    .target-config-card,
    .field-rules-card {
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    mat-card-header {
      background-color: #f5f5f5;
      padding: 16px 24px;
      margin: -16px -16px 24px -16px;
      border-bottom: 1px solid #e0e0e0;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    .header-icon {
      color: #666;
    }

    .header-actions {
      margin-left: auto;
    }

    .target-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .model-option {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .model-option small {
      color: #666;
    }

    .model-search {
      width: calc(100% - 16px);
      padding: 8px;
      margin: 8px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .field-rules-table {
      overflow-x: auto;
    }

    table {
      min-width: 600px;
    }

    .field-rule-row {
      transition: background-color 0.2s ease;
    }

    .field-rule-row:hover {
      background-color: #f5f5f5;
    }

    .json-path {
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
      background-color: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .target-field {
      font-weight: 500;
      color: #1976d2;
    }

    .transform-chip {
      min-height: auto;
    }

    .transform-chip mat-chip {
      min-height: 24px;
      font-size: 12px;
    }

    .no-transform {
      color: #999;
      font-style: italic;
    }

    .condition-indicator {
      color: #4caf50;
    }

    .no-condition-indicator {
      color: #ccc;
    }

    .empty-rules,
    .no-target-selected {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .empty-rules mat-icon,
    .no-target-selected mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-rules p,
    .no-target-selected p {
      color: #666;
      margin-bottom: 24px;
    }

    .no-target-selected h3 {
      margin: 0 0 8px 0;
      color: #424242;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
      }

      .header-actions {
        margin-left: 0;
        margin-top: 12px;
      }

      mat-card-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
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

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.targetForm = this.createTargetForm();
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
    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        rule: null,
        targetModel: this.selectedTarget?.model,
        availableLookups: this.availableLookups,
        availableTransforms: this.availableTransforms
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
