// components/workflow-builder/properties-panel/properties-panel.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';

import { WorkflowElement, ElementType } from '../../../models/workflow.models';
import { ApiService, LookupItem, Page, Category, Field, FieldType } from '../../../services/api.service';
import { ConditionBuilderComponent } from './condition-builder/condition-builder.component';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatChipsModule,
    MatDividerModule,
    ConditionBuilderComponent
  ],
  template: `
    <div class="properties-panel" *ngIf="selectedElement || selectedConnection">
      <!-- Element Properties -->
      <div *ngIf="selectedElement" class="element-properties">
        <div class="panel-header">
          <h3>
            <mat-icon>{{ getElementIcon() }}</mat-icon>
            {{ getElementTitle() }}
          </h3>
          <p>{{ getElementDescription() }}</p>
        </div>

        <form [formGroup]="propertiesForm" (ngSubmit)="saveProperties()">
          <mat-tab-group *ngIf="selectedElement.type !== 'start'" animationDuration="200ms">
            <!-- Basic Properties Tab -->
            <mat-tab label="Basic">
              <div class="tab-content">
                <ng-container [ngSwitch]="selectedElement.type">

                  <!-- Page Properties -->
                  <div *ngSwitchCase="'page'">
                    <mat-checkbox formControlName="useExisting" class="use-existing-checkbox">
                      Use existing page
                    </mat-checkbox>

                    <div *ngIf="propertiesForm.get('useExisting')?.value">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Select Existing Page</mat-label>
                        <mat-select formControlName="existingPageId" (selectionChange)="onExistingPageSelected($event.value)">
                          <mat-option *ngFor="let page of existingPages" [value]="page.id">
                            {{ page.name }} - {{ getServiceName(page.service) }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>

                    <div *ngIf="!propertiesForm.get('useExisting')?.value">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Service</mat-label>
                        <mat-select formControlName="service">
                          <mat-option *ngFor="let service of services" [value]="service.id">
                            {{ service.name }} ({{ service.name_ara }})
                          </mat-option>
                        </mat-select>
                        <mat-error>Service is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Sequence Number</mat-label>
                        <mat-select formControlName="sequence_number">
                          <mat-option *ngFor="let step of flowSteps" [value]="step.id">
                            {{ step.name }} ({{ step.name_ara }})
                          </mat-option>
                        </mat-select>
                        <mat-error>Sequence number is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Applicant Type</mat-label>
                        <mat-select formControlName="applicant_type">
                          <mat-option *ngFor="let type of applicantTypes" [value]="type.id">
                            {{ type.name }} ({{ type.name_ara }})
                          </mat-option>
                        </mat-select>
                        <mat-error>Applicant type is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Name</mat-label>
                        <input matInput formControlName="name" required>
                        <mat-error>Name is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Arabic Name</mat-label>
                        <input matInput formControlName="name_ara">
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Description</mat-label>
                        <textarea matInput formControlName="description" rows="3"></textarea>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Arabic Description</mat-label>
                        <textarea matInput formControlName="description_ara" rows="3"></textarea>
                      </mat-form-field>
                    </div>
                  </div>

                  <!-- Category Properties -->
                  <div *ngSwitchCase="'category'">
                    <mat-checkbox formControlName="useExisting" class="use-existing-checkbox">
                      Use existing category
                    </mat-checkbox>

                    <div *ngIf="propertiesForm.get('useExisting')?.value">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Select Existing Category</mat-label>
                        <mat-select formControlName="existingCategoryId" (selectionChange)="onExistingCategorySelected($event.value)">
                          <mat-option *ngFor="let category of existingCategories" [value]="category.id">
                            {{ category.name }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>

                    <div *ngIf="!propertiesForm.get('useExisting')?.value">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Name</mat-label>
                        <input matInput formControlName="name" required>
                        <mat-error>Name is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Arabic Name</mat-label>
                        <input matInput formControlName="name_ara">
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Code</mat-label>
                        <input matInput formControlName="code">
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Description</mat-label>
                        <textarea matInput formControlName="description" rows="3"></textarea>
                      </mat-form-field>

                      <mat-checkbox formControlName="is_repeatable">
                        Is Repeatable
                      </mat-checkbox>
                    </div>
                  </div>

                  <!-- Field Properties -->
                  <div *ngSwitchCase="'field'">
                    <mat-checkbox formControlName="useExisting" class="use-existing-checkbox">
                      Use existing field
                    </mat-checkbox>

                    <div *ngIf="propertiesForm.get('useExisting')?.value">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Select Existing Field</mat-label>
                        <mat-select formControlName="existingFieldId" (selectionChange)="onExistingFieldSelected($event.value)">
                          <mat-option *ngFor="let field of existingFields" [value]="field.id">
                            {{ field._field_display_name }} ({{ field._field_name }})
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>

                    <div *ngIf="!propertiesForm.get('useExisting')?.value">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Field Name</mat-label>
                        <input matInput formControlName="_field_name" required>
                        <mat-hint>Internal field name (snake_case)</mat-hint>
                        <mat-error>Field name is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Display Name</mat-label>
                        <input matInput formControlName="_field_display_name" required>
                        <mat-error>Display name is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Arabic Display Name</mat-label>
                        <input matInput formControlName="_field_display_name_ara">
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Field Type</mat-label>
                        <mat-select formControlName="_field_type" required>
                          <mat-option *ngFor="let type of fieldTypes" [value]="type.id">
                            {{ type.name }} ({{ type.name_ara }})
                          </mat-option>
                        </mat-select>
                        <mat-error>Field type is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Sequence</mat-label>
                        <input matInput type="number" formControlName="_sequence">
                      </mat-form-field>

                      <div class="checkbox-group">
                        <mat-checkbox formControlName="_mandatory">Mandatory</mat-checkbox>
                        <mat-checkbox formControlName="_is_hidden">Hidden</mat-checkbox>
                        <mat-checkbox formControlName="_is_disabled">Disabled</mat-checkbox>
                      </div>
                    </div>
                  </div>

                  <!-- Condition Properties -->
                  <div *ngSwitchCase="'condition'">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Name</mat-label>
                      <input matInput formControlName="name" required>
                      <mat-error>Name is required</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Description</mat-label>
                      <textarea matInput formControlName="description" rows="2"></textarea>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Target Field</mat-label>
                      <input matInput formControlName="target_field">
                      <mat-hint>Field to show when condition is true</mat-hint>
                    </mat-form-field>
                  </div>

                  <!-- End Properties -->
                  <div *ngSwitchCase="'end'">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Name</mat-label>
                      <input matInput formControlName="name" required>
                      <mat-error>Name is required</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Action</mat-label>
                      <mat-select formControlName="action">
                        <mat-option value="submit">Submit Form</mat-option>
                        <mat-option value="save_draft">Save as Draft</mat-option>
                        <mat-option value="cancel">Cancel</mat-option>
                        <mat-option value="redirect">Redirect</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </ng-container>
              </div>
            </mat-tab>

            <!-- Advanced Properties Tab (for Field) -->
            <mat-tab label="Validation" *ngIf="selectedElement.type === 'field' && !propertiesForm.get('useExisting')?.value">
              <div class="tab-content">
                <!-- Text Validation -->
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>Text Validation</mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="validation-content">
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Min Length</mat-label>
                        <input matInput type="number" formControlName="_min_length">
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Max Length</mat-label>
                        <input matInput type="number" formControlName="_max_length">
                      </mat-form-field>
                    </div>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Regex Pattern</mat-label>
                      <input matInput formControlName="_regex_pattern">
                      <mat-hint>Regular expression for validation</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Allowed Characters</mat-label>
                      <input matInput formControlName="_allowed_characters">
                      <mat-hint>Allowed character set</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Forbidden Words</mat-label>
                      <textarea matInput formControlName="_forbidden_words" rows="2"></textarea>
                      <mat-hint>Comma-separated list of forbidden words</mat-hint>
                    </mat-form-field>
                  </div>
                </mat-expansion-panel>

                <!-- Number Validation -->
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>Number Validation</mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="validation-content">
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Min Value</mat-label>
                        <input matInput type="number" formControlName="_value_greater_than">
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Max Value</mat-label>
                        <input matInput type="number" formControlName="_value_less_than">
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Precision</mat-label>
                        <input matInput type="number" formControlName="_precision">
                        <mat-hint>Decimal places</mat-hint>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Default Value</mat-label>
                        <input matInput formControlName="_default_value">
                      </mat-form-field>
                    </div>

                    <div class="checkbox-group">
                      <mat-checkbox formControlName="_integer_only">Integer Only</mat-checkbox>
                      <mat-checkbox formControlName="_positive_only">Positive Only</mat-checkbox>
                      <mat-checkbox formControlName="_unique">Unique Value</mat-checkbox>
                    </div>
                  </div>
                </mat-expansion-panel>

                <!-- Date Validation -->
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>Date Validation</mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="validation-content">
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Min Date</mat-label>
                        <input matInput type="date" formControlName="_date_greater_than">
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Max Date</mat-label>
                        <input matInput type="date" formControlName="_date_less_than">
                      </mat-form-field>
                    </div>

                    <div class="checkbox-group">
                      <mat-checkbox formControlName="_future_only">Future Only</mat-checkbox>
                      <mat-checkbox formControlName="_past_only">Past Only</mat-checkbox>
                    </div>
                  </div>
                </mat-expansion-panel>

                <!-- File Validation -->
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>File Validation</mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="validation-content">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Allowed File Types</mat-label>
                      <input matInput formControlName="_file_types">
                      <mat-hint>e.g., .pdf,.doc,.jpg</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Max File Size (bytes)</mat-label>
                      <input matInput type="number" formControlName="_max_file_size">
                    </mat-form-field>

                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Max Image Width</mat-label>
                        <input matInput type="number" formControlName="_image_max_width">
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Max Image Height</mat-label>
                        <input matInput type="number" formControlName="_image_max_height">
                      </mat-form-field>
                    </div>
                  </div>
                </mat-expansion-panel>
              </div>
            </mat-tab>

            <!-- Condition Logic Tab (for Condition) -->
            <mat-tab label="Logic" *ngIf="selectedElement.type === 'condition'">
              <div class="tab-content">
                <app-condition-builder
                  [conditionLogic]="propertiesForm.get('condition_logic')?.value || []"
                  (conditionChanged)="onConditionLogicChanged($event)">
                </app-condition-builder>
              </div>
            </mat-tab>
          </mat-tab-group>

          <!-- Start Element (No Tabs) -->
          <div *ngIf="selectedElement.type === 'start'" class="start-properties">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" required>
              <mat-error>Name is required</mat-error>
            </mat-form-field>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button mat-raised-button color="primary" type="submit" [disabled]="propertiesForm.invalid">
              <mat-icon>save</mat-icon>
              Save Properties
            </button>

            <button mat-button type="button" (click)="resetForm()">
              <mat-icon>refresh</mat-icon>
              Reset
            </button>
          </div>
        </form>
      </div>

      <!-- Connection Properties -->
      <div *ngIf="selectedConnection" class="connection-properties">
        <div class="panel-header">
          <h3>
            <mat-icon>arrow_forward</mat-icon>
            Connection Properties
          </h3>
          <p>Configure connection settings</p>
        </div>

        <div class="connection-info">
          <p><strong>Source:</strong> {{ getSourceElementName() }}</p>
          <p><strong>Target:</strong> {{ getTargetElementName() }}</p>
        </div>

        <button mat-raised-button color="warn" (click)="deleteConnection()">
          <mat-icon>delete</mat-icon>
          Delete Connection
        </button>
      </div>
    </div>

    <!-- No Selection State -->
    <div *ngIf="!selectedElement && !selectedConnection" class="no-selection">
      <mat-icon>info</mat-icon>
      <h3>No Element Selected</h3>
      <p>Select an element or connection to view and edit its properties.</p>
    </div>
  `,
  styles: [`
    .properties-panel {
      height: 100%;
      overflow-y: auto;
      padding: 16px;
    }

    .panel-header {
      margin-bottom: 20px;
      text-align: center;
    }

    .panel-header h3 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 0 0 8px 0;
      color: #333;
    }

    .panel-header p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .tab-content {
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .use-existing-checkbox {
      margin-bottom: 16px;
      font-weight: 500;
    }

    .form-row {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 16px 0;
    }

    .validation-content {
      padding: 16px 0;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .start-properties {
      padding: 16px 0;
    }

    .connection-properties {
      padding: 16px 0;
    }

    .connection-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      margin: 16px 0;
    }

    .connection-info p {
      margin: 4px 0;
    }

    .no-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: #666;
    }

    .no-selection mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .no-selection h3 {
      margin: 0 0 8px 0;
    }

    .no-selection p {
      margin: 0;
      max-width: 200px;
    }

    @media (max-width: 768px) {
      .properties-panel {
        padding: 12px;
      }

      .form-row {
        flex-direction: column;
        gap: 8px;
      }

      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class PropertiesPanelComponent implements OnInit, OnChanges {
  @Input() selectedElement?: WorkflowElement;
  @Input() selectedConnection?: any;

  @Output() elementUpdated = new EventEmitter<{ id: string; properties: any }>();
  @Output() connectionUpdated = new EventEmitter<any>();

  propertiesForm!: FormGroup;

  // Lookup Data
  services: LookupItem[] = [];
  flowSteps: LookupItem[] = [];
  applicantTypes: LookupItem[] = [];
  fieldTypes: FieldType[] = [];

  // Existing Data
  existingPages: Page[] = [];
  existingCategories: Category[] = [];
  existingFields: Field[] = [];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadLookupData();
    this.loadExistingData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedElement']) {
      this.updateFormForElement();
    }
  }

  private initializeForm(): void {
    this.propertiesForm = this.fb.group({
      // Common properties
      name: ['', Validators.required],
      description: [''],

      // Page properties
      useExisting: [false],
      existingPageId: [''],
      service: [''],
      sequence_number: [''],
      applicant_type: [''],
      name_ara: [''],
      description_ara: [''],

      // Category properties
      existingCategoryId: [''],
      code: [''],
      is_repeatable: [false],

      // Field properties
      existingFieldId: [''],
      _field_name: [''],
      _field_display_name: [''],
      _field_display_name_ara: [''],
      _field_type: [''],
      _sequence: [''],
      _mandatory: [false],
      _is_hidden: [false],
      _is_disabled: [false],

      // Field validation properties
      _min_length: [''],
      _max_length: [''],
      _regex_pattern: [''],
      _allowed_characters: [''],
      _forbidden_words: [''],
      _value_greater_than: [''],
      _value_less_than: [''],
      _integer_only: [false],
      _positive_only: [false],
      _date_greater_than: [''],
      _date_less_than: [''],
      _future_only: [false],
      _past_only: [false],
      _file_types: [''],
      _max_file_size: [''],
      _image_max_width: [''],
      _image_max_height: [''],
      _precision: [''],
      _unique: [false],
      _default_value: [''],

      // Condition properties
      target_field: [''],
      condition_logic: [[]],

      // End properties
      action: ['submit']
    });
  }

  private updateFormForElement(): void {
    if (!this.selectedElement) return;

    const properties = this.selectedElement.properties;

    // Reset form
    this.propertiesForm.reset();

    // Set common properties
    this.propertiesForm.patchValue({
      name: properties.name || '',
      description: properties.description || ''
    });

    // Set element-specific properties
    switch (this.selectedElement.type) {
      case ElementType.PAGE:
        this.propertiesForm.patchValue({
          useExisting: properties.useExisting || false,
          existingPageId: properties.existingPageId || '',
          service: properties.service || '',
          sequence_number: properties.sequence_number || '',
          applicant_type: properties.applicant_type || '',
          name_ara: properties.name_ara || '',
          description_ara: properties.description_ara || ''
        });
        break;

      case ElementType.CATEGORY:
        this.propertiesForm.patchValue({
          useExisting: properties.useExisting || false,
          existingCategoryId: properties.existingCategoryId || '',
          code: properties.code || '',
          is_repeatable: properties.is_repeatable || false
        });
        break;

      case ElementType.FIELD:
        this.propertiesForm.patchValue({
          useExisting: properties.useExisting || false,
          existingFieldId: properties.existingFieldId || '',
          _field_name: properties._field_name || '',
          _field_display_name: properties._field_display_name || '',
          _field_display_name_ara: properties._field_display_name_ara || '',
          _field_type: properties._field_type || '',
          _sequence: properties._sequence || '',
          _mandatory: properties._mandatory || false,
          _is_hidden: properties._is_hidden || false,
          _is_disabled: properties._is_disabled || false,
          // Validation properties
          _min_length: properties._min_length || '',
          _max_length: properties._max_length || '',
          _regex_pattern: properties._regex_pattern || '',
          _allowed_characters: properties._allowed_characters || '',
          _forbidden_words: properties._forbidden_words || '',
          _value_greater_than: properties._value_greater_than || '',
          _value_less_than: properties._value_less_than || '',
          _integer_only: properties._integer_only || false,
          _positive_only: properties._positive_only || false,
          _date_greater_than: properties._date_greater_than || '',
          _date_less_than: properties._date_less_than || '',
          _future_only: properties._future_only || false,
          _past_only: properties._past_only || false,
          _file_types: properties._file_types || '',
          _max_file_size: properties._max_file_size || '',
          _image_max_width: properties._image_max_width || '',
          _image_max_height: properties._image_max_height || '',
          _precision: properties._precision || '',
          _unique: properties._unique || false,
          _default_value: properties._default_value || ''
        });
        break;

      case ElementType.CONDITION:
        this.propertiesForm.patchValue({
          target_field: properties.target_field || '',
          condition_logic: properties.condition_logic || []
        });
        break;

      case ElementType.END:
        this.propertiesForm.patchValue({
          action: properties.action || 'submit'
        });
        break;
    }

    // Update validators based on element type
    this.updateValidators();
  }

  private updateValidators(): void {
    if (!this.selectedElement) return;

    // Clear all validators
    Object.keys(this.propertiesForm.controls).forEach(key => {
      this.propertiesForm.get(key)?.clearValidators();
    });

    // Add required validators based on element type
    this.propertiesForm.get('name')?.setValidators([Validators.required]);

    switch (this.selectedElement.type) {
      case ElementType.PAGE:
        if (!this.propertiesForm.get('useExisting')?.value) {
          this.propertiesForm.get('service')?.setValidators([Validators.required]);
          this.propertiesForm.get('sequence_number')?.setValidators([Validators.required]);
          this.propertiesForm.get('applicant_type')?.setValidators([Validators.required]);
        }
        break;

      case ElementType.FIELD:
        if (!this.propertiesForm.get('useExisting')?.value) {
          this.propertiesForm.get('_field_name')?.setValidators([Validators.required]);
          this.propertiesForm.get('_field_display_name')?.setValidators([Validators.required]);
          this.propertiesForm.get('_field_type')?.setValidators([Validators.required]);
        }
        break;
    }

    // Update form validation
    this.propertiesForm.updateValueAndValidity();
  }

  private loadLookupData(): void {
    // Load Services
    this.apiService.getLookups('Service').subscribe({
      next: (response) => this.services = response.results,
      error: (error) => console.error('Error loading services:', error)
    });

    // Load Flow Steps
    this.apiService.getLookups('Flow Step').subscribe({
      next: (response) => this.flowSteps = response.results,
      error: (error) => console.error('Error loading flow steps:', error)
    });

    // Load Applicant Types
    this.apiService.getLookups('Applicant Type').subscribe({
      next: (response) => this.applicantTypes = response.results,
      error: (error) => console.error('Error loading applicant types:', error)
    });

    // Load Field Types
    this.apiService.getFieldTypes().subscribe({
      next: (response) => this.fieldTypes = response.results,
      error: (error) => console.error('Error loading field types:', error)
    });
  }

  private loadExistingData(): void {
    // Load existing pages
    this.apiService.getPages().subscribe({
      next: (response) => this.existingPages = response.results,
      error: (error) => console.error('Error loading pages:', error)
    });

    // Load existing categories
    this.apiService.getCategories().subscribe({
      next: (response) => this.existingCategories = response.results,
      error: (error) => console.error('Error loading categories:', error)
    });

    // Load existing fields
    this.apiService.getFields().subscribe({
      next: (response) => this.existingFields = response.results,
      error: (error) => console.error('Error loading fields:', error)
    });
  }

  onExistingPageSelected(pageId: number): void {
    const page = this.existingPages.find(p => p.id === pageId);
    if (page) {
      this.propertiesForm.patchValue({
        name: page.name,
        name_ara: page.name_ara,
        description: page.description,
        description_ara: page.description_ara,
        service: page.service,
        sequence_number: page.sequence_number,
        applicant_type: page.applicant_type
      });
    }
  }

  onExistingCategorySelected(categoryId: number): void {
    const category = this.existingCategories.find(c => c.id === categoryId);
    if (category) {
      this.propertiesForm.patchValue({
        name: category.name,
        name_ara: category.name_ara,
        description: category.description,
        code: category.code,
        is_repeatable: category.is_repeatable
      });
    }
  }

  onExistingFieldSelected(fieldId: number): void {
    const field = this.existingFields.find(f => f.id === fieldId);
    if (field) {
      this.propertiesForm.patchValue({
        _field_name: field._field_name,
        _field_display_name: field._field_display_name,
        _field_display_name_ara: field._field_display_name_ara,
        _field_type: field._field_type,
        _sequence: field._sequence,
        _mandatory: field._mandatory,
        _is_hidden: field._is_hidden,
        _is_disabled: field._is_disabled
      });
    }
  }

  onConditionLogicChanged(conditionLogic: any[]): void {
    this.propertiesForm.patchValue({ condition_logic: conditionLogic });
  }

  saveProperties(): void {
    if (this.propertiesForm.valid && this.selectedElement) {
      const formValue = this.propertiesForm.value;

      // Clean up the form value based on element type
      const cleanedProperties = this.cleanFormValue(formValue);

      this.elementUpdated.emit({
        id: this.selectedElement.id,
        properties: cleanedProperties
      });

      this.snackBar.open('Properties saved', 'Close', { duration: 2000 });
    } else {
      this.snackBar.open('Please fix validation errors', 'Close', { duration: 3000 });
    }
  }

  private cleanFormValue(formValue: any): any {
    if (!this.selectedElement) return formValue;

    const cleaned: any = {};

    // Include common properties
    if (formValue.name) cleaned.name = formValue.name;
    if (formValue.description) cleaned.description = formValue.description;

    // Include element-specific properties
    switch (this.selectedElement.type) {
      case ElementType.PAGE:
        if (formValue.useExisting) {
          cleaned.useExisting = true;
          cleaned.existingPageId = formValue.existingPageId;
        } else {
          Object.keys(formValue).forEach(key => {
            if (key.startsWith('service') || key.startsWith('sequence') ||
              key.startsWith('applicant') || key.includes('ara')) {
              if (formValue[key] !== null && formValue[key] !== '') {
                cleaned[key] = formValue[key];
              }
            }
          });
        }
        break;

      case ElementType.CATEGORY:
        if (formValue.useExisting) {
          cleaned.useExisting = true;
          cleaned.existingCategoryId = formValue.existingCategoryId;
        } else {
          ['code', 'is_repeatable'].forEach(key => {
            if (formValue[key] !== null && formValue[key] !== '') {
              cleaned[key] = formValue[key];
            }
          });
        }
        break;

      case ElementType.FIELD:
        if (formValue.useExisting) {
          cleaned.useExisting = true;
          cleaned.existingFieldId = formValue.existingFieldId;
        } else {
          Object.keys(formValue).forEach(key => {
            if (key.startsWith('_')) {
              if (formValue[key] !== null && formValue[key] !== '') {
                cleaned[key] = formValue[key];
              }
            }
          });
        }
        break;

      case ElementType.CONDITION:
        ['target_field', 'condition_logic'].forEach(key => {
          if (formValue[key] !== null && formValue[key] !== '') {
            cleaned[key] = formValue[key];
          }
        });
        break;

      case ElementType.END:
        if (formValue.action) cleaned.action = formValue.action;
        break;
    }

    return cleaned;
  }

  resetForm(): void {
    this.updateFormForElement();
    this.snackBar.open('Form reset', 'Close', { duration: 2000 });
  }

  deleteConnection(): void {
    if (this.selectedConnection) {
      this.connectionUpdated.emit({ action: 'delete', connection: this.selectedConnection });
    }
  }

  getElementIcon(): string {
    const icons: { [key: string]: string } = {
      [ElementType.START]: 'play_circle',
      [ElementType.PAGE]: 'description',
      [ElementType.CATEGORY]: 'category',
      [ElementType.FIELD]: 'input',
      [ElementType.CONDITION]: 'help',
      [ElementType.END]: 'stop_circle'
    };
    return icons[this.selectedElement?.type || ''] || 'help';
  }

  getElementTitle(): string {
    const elementName = this.selectedElement?.properties?.name;
    const elementType = this.selectedElement?.type;

    if (elementName) {
      return elementName;
    }

    if (elementType) {
      return elementType.charAt(0).toUpperCase() + elementType.slice(1);
    }

    return 'Element';
  }

  getElementDescription(): string {
    const descriptions: { [key: string]: string } = {
      [ElementType.START]: 'Configure the starting point of your workflow',
      [ElementType.PAGE]: 'Define form pages with fields and validation',
      [ElementType.CATEGORY]: 'Group related fields into categories',
      [ElementType.FIELD]: 'Configure input fields and validation rules',
      [ElementType.CONDITION]: 'Set up conditional logic and branching',
      [ElementType.END]: 'Define workflow completion actions'
    };
    return descriptions[this.selectedElement?.type || ''] || '';
  }

  getSourceElementName(): string {
    // This would be implemented to get the actual source element name
    return 'Source Element';
  }

  getTargetElementName(): string {
    // This would be implemented to get the actual target element name
    return 'Target Element';
  }

  getServiceName(serviceId: number): string {
    const service = this.services.find(s => s.id === serviceId);
    return service ? service.name : `Service ${serviceId}`;
  }
}
