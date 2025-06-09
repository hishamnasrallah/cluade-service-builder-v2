// components/approval-flow-builder/approval-condition-builder/approval-condition-builder.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
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
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface ApprovalConditionLogic {
  field?: string;
  operation: string;
  value?: any;
  conditions?: ApprovalConditionLogic[];
}

export interface ApprovalFieldReference {
  name: string;
  display_name: string;
  type: string;
}

@Component({
  selector: 'app-approval-condition-builder',
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
    MatSlideToggleModule,
    MatCheckboxModule,
    FormsModule
  ],
  template: `
    <div class="approval-condition-builder">
      <div class="builder-header">
        <h3>
          <mat-icon>rule</mat-icon>
          Approval Condition Logic Builder
        </h3>
        <p>Define rules and conditions for approval flow logic</p>

        <div class="header-actions">
          <button mat-button
                  color="accent"
                  (click)="addConditionGroup()"
                  [disabled]="conditionForm.disabled">
            <mat-icon>add</mat-icon>
            Add Condition
          </button>

          <button mat-button
                  (click)="toggleAdvancedMode()"
                  [color]="advancedMode ? 'accent' : ''">
            <mat-icon>{{ advancedMode ? 'code_off' : 'code' }}</mat-icon>
            {{ advancedMode ? 'Visual Mode' : 'JSON Mode' }}
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

        <!-- JSON Editor Mode -->
        <div *ngIf="advancedMode" class="json-editor-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Condition Logic JSON</mat-label>
            <textarea matInput
                      [(ngModel)]="jsonText"
                      (ngModelChange)="onJsonTextChange($event)"
                      [class.error]="jsonError"
                      rows="12"
                      placeholder="Enter condition logic as JSON...">
            </textarea>
            <mat-hint *ngIf="!jsonError">Enter valid JSON for condition logic</mat-hint>
            <mat-error *ngIf="jsonError">{{ jsonError }}</mat-error>
          </mat-form-field>

          <div class="json-actions">
            <button mat-button (click)="formatJson()">
              <mat-icon>format_align_left</mat-icon>
              Format JSON
            </button>
            <button mat-button (click)="validateJson()">
              <mat-icon>check_circle</mat-icon>
              Validate
            </button>
            <button mat-button (click)="loadSampleJson()">
              <mat-icon>lightbulb</mat-icon>
              Load Sample
            </button>
          </div>
        </div>

        <!-- Visual Builder Mode -->
        <form [formGroup]="conditionForm" *ngIf="!advancedMode">
          <div formArrayName="conditionGroups" class="condition-groups">

            <!-- Empty State -->
            <div *ngIf="conditionGroups.length === 0" class="empty-state">
              <mat-icon>rule</mat-icon>
              <h4>No Conditions Defined</h4>
              <p>Add condition groups to define dynamic logic for your approval flow.</p>
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
                  <!-- Logical Operator Selection -->
                  <div *ngIf="getConditionsArray(groupIndex).length > 1" class="logical-operator-section">
                    <mat-form-field appearance="outline" class="operator-field">
                      <mat-label>Group Logic</mat-label>
                      <mat-select formControlName="operation" required>
                        <mat-option value="and">AND - All conditions must be true</mat-option>
                        <mat-option value="or">OR - Any condition can be true</mat-option>
                        <mat-option value="not">NOT - Negate all conditions</mat-option>
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
                                  color="primary"
                                  (click)="duplicateCondition(groupIndex, condIndex)"
                                  [disabled]="conditionForm.disabled"
                                  matTooltip="Duplicate condition">
                            <mat-icon>content_copy</mat-icon>
                          </button>
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
                            <mat-optgroup label="Application Fields">
                              <mat-option *ngFor="let field of availableFields" [value]="field.name">
                                {{ field.display_name || field.name }}
                                <small *ngIf="field.type"> ({{ field.type }})</small>
                              </mat-option>
                            </mat-optgroup>
                            <mat-optgroup label="System Fields">
                              <mat-option value="application_id">Application ID</mat-option>
                              <mat-option value="applicant_type">Applicant Type</mat-option>
                              <mat-option value="service_type">Service Type</mat-option>
                              <mat-option value="current_status">Current Status</mat-option>
                              <mat-option value="submission_date">Submission Date</mat-option>
                              <mat-option value="current_user">Current User</mat-option>
                              <mat-option value="current_group">Current Group</mat-option>
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

                          <!-- Boolean Input -->
                          <div *ngSwitchCase="'boolean'" class="boolean-input">
                            <mat-slide-toggle formControlName="value">
                              {{ getConditionForm(groupIndex, condIndex).get('value')?.value ? 'True' : 'False' }}
                            </mat-slide-toggle>
                          </div>

                          <!-- List Input -->
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

                          <!-- No Value Required -->
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

        <!-- Sample Conditions -->
        <mat-expansion-panel class="samples-panel" *ngIf="!advancedMode">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon>lightbulb</mat-icon>
              Sample Approval Conditions
            </mat-panel-title>
            <mat-panel-description>
              Common patterns for approval flows
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="samples-content">
            <div class="sample-grid">
              <div *ngFor="let sample of sampleConditions"
                   class="sample-item"
                   (click)="loadSample(sample)">
                <div class="sample-header">
                  <mat-icon>{{ sample.icon }}</mat-icon>
                  <span>{{ sample.name }}</span>
                </div>
                <p class="sample-description">{{ sample.description }}</p>
                <div class="sample-preview">
                  <code>{{ sample.preview }}</code>
                </div>
              </div>
            </div>
          </div>
        </mat-expansion-panel>

        <!-- JSON Preview -->
        <mat-expansion-panel class="json-preview" *ngIf="conditionGroups.length > 0 && !advancedMode">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon>code</mat-icon>
              Generated JSON
            </mat-panel-title>
            <mat-panel-description>
              Generated condition logic
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="json-content">
            <pre>{{ getConditionLogicJson() }}</pre>

            <div class="json-actions">
              <button mat-button (click)="copyToClipboard()">
                <mat-icon>content_copy</mat-icon>
                Copy JSON
              </button>
              <button mat-button (click)="switchToAdvancedMode()">
                <mat-icon>edit</mat-icon>
                Edit as JSON
              </button>
            </div>
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
    .approval-condition-builder {
      display: flex;
      flex-direction: column;
      max-height: 700px;
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

    .json-editor-section {
      margin-bottom: 16px;
    }

    .json-editor-section .full-width {
      width: 100%;
    }

    .json-editor-section textarea.error {
      border-color: #f44336;
    }

    .json-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
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

    .boolean-input {
      display: flex;
      align-items: center;
      height: 56px;
      padding: 0 12px;
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

    .json-preview,
    .samples-panel {
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
      margin: 0 0 12px 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #333;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      background: white;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }

    .samples-content {
      padding: 16px;
    }

    .sample-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .sample-item {
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .sample-item:hover {
      border-color: #2196F3;
      background: #f8f9ff;
    }

    .sample-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    }

    .sample-header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #2196F3;
    }

    .sample-description {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #666;
    }

    .sample-preview {
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      color: #555;
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

      .sample-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ApprovalConditionBuilderComponent implements OnInit, OnChanges {
  @Input() conditionLogic: ApprovalConditionLogic[] = [];
  @Input() availableFields: ApprovalFieldReference[] = [];
  @Input() disabled = false;

  @Output() conditionChanged = new EventEmitter<ApprovalConditionLogic[]>();

  conditionForm!: FormGroup;
  isLoading = false;
  advancedMode = false;
  jsonText = '';
  jsonError = '';

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
      name: 'Text Operations',
      operations: [
        { value: 'contains', label: 'Contains' },
        { value: 'startswith', label: 'Starts With' },
        { value: 'endswith', label: 'Ends With' },
        { value: 'matches', label: 'Matches Pattern' }
      ]
    },
    {
      name: 'List Operations',
      operations: [
        { value: 'in', label: 'In List' },
        { value: 'not in', label: 'Not In List' }
      ]
    },
    {
      name: 'Approval Specific',
      operations: [
        { value: 'is_approved_by', label: 'Is Approved By' },
        { value: 'is_rejected_by', label: 'Is Rejected By' },
        { value: 'pending_approval_from', label: 'Pending Approval From' },
        { value: 'has_role', label: 'User Has Role' },
        { value: 'in_group', label: 'User In Group' }
      ]
    },
    {
      name: 'Status Operations',
      operations: [
        { value: 'is_empty', label: 'Is Empty' },
        { value: 'is_not_empty', label: 'Is Not Empty' },
        { value: 'is_null', label: 'Is Null' },
        { value: 'is_not_null', label: 'Is Not Null' }
      ]
    }
  ];

  sampleConditions = [
    {
      name: 'User Group Check',
      icon: 'group',
      description: 'Check if user belongs to specific group',
      preview: 'current_user in_group "managers"',
      logic: [{ field: 'current_user', operation: 'in_group', value: 'managers' }]
    },
    {
      name: 'Application Type Routing',
      icon: 'route',
      description: 'Route based on application type',
      preview: 'applicant_type = "01"',
      logic: [{ field: 'applicant_type', operation: '=', value: '01' }]
    },
    {
      name: 'Multi-Level Approval',
      icon: 'approval',
      description: 'Complex approval condition with multiple criteria',
      preview: 'amount > 1000 AND current_user in_group "senior_approvers"',
      logic: [
        {
          operation: 'and',
          conditions: [
            { field: 'amount', operation: '>', value: 1000 },
            { field: 'current_user', operation: 'in_group', value: 'senior_approvers' }
          ]
        }
      ]
    },
    {
      name: 'Date-based Routing',
      icon: 'schedule',
      description: 'Route based on submission date',
      preview: 'submission_date >= "2024-01-01"',
      logic: [{ field: 'submission_date', operation: '>=', value: '2024-01-01' }]
    },
    {
      name: 'Service Type Check',
      icon: 'business',
      description: 'Check service type for routing',
      preview: 'service_type IN ["01", "02", "03"]',
      logic: [{ field: 'service_type', operation: 'in', value: '01,02,03' }]
    }
  ];

  constructor(private fb: FormBuilder) {
    this.initializeForm();
    this.initializeFields();
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

  private initializeFields(): void {
    if (this.availableFields.length === 0) {
      this.availableFields = [
        { name: 'first_name', display_name: 'First Name', type: 'text' },
        { name: 'last_name', display_name: 'Last Name', type: 'text' },
        { name: 'email', display_name: 'Email', type: 'email' },
        { name: 'age', display_name: 'Age', type: 'number' },
        { name: 'amount', display_name: 'Amount', type: 'number' },
        { name: 'application_type', display_name: 'Application Type', type: 'text' },
        { name: 'service_type', display_name: 'Service Type', type: 'text' }
      ];
    }
  }

  private setupFormSubscription(): void {
    this.conditionForm.valueChanges.subscribe(() => {
      if (this.conditionForm.valid && !this.advancedMode) {
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

  getConditionForm(groupIndex: number, conditionIndex: number): FormGroup {
    return this.getConditionsArray(groupIndex).at(conditionIndex) as FormGroup;
  }

  // Advanced Mode Methods
  toggleAdvancedMode(): void {
    this.advancedMode = !this.advancedMode;

    if (this.advancedMode) {
      this.switchToAdvancedMode();
    } else {
      this.switchToSimpleMode();
    }
  }

  switchToAdvancedMode(): void {
    this.advancedMode = true;
    this.jsonText = this.getConditionLogicJson();
  }

  switchToSimpleMode(): void {
    this.advancedMode = false;
    if (this.jsonText) {
      this.parseJsonToForm();
    }
  }

  onJsonTextChange(text: string): void {
    this.jsonText = text;
    this.validateJson();
  }

  validateJson(): boolean {
    try {
      if (this.jsonText.trim()) {
        const parsed = JSON.parse(this.jsonText);
        this.jsonError = '';
        this.emitConditionChange();
        return true;
      } else {
        this.jsonError = '';
        return true;
      }
    } catch (error) {
      this.jsonError = 'Invalid JSON format';
      return false;
    }
  }

  formatJson(): void {
    if (this.validateJson()) {
      try {
        const parsed = JSON.parse(this.jsonText);
        this.jsonText = JSON.stringify(parsed, null, 2);
      } catch (error) {
        // Error already handled in validateJson
      }
    }
  }

  loadSampleJson(): void {
    const sampleJson = {
      "operation": "and",
      "conditions": [
        {
          "field": "current_user",
          "operation": "in_group",
          "value": "managers"
        },
        {
          "field": "amount",
          "operation": ">",
          "value": 1000
        }
      ]
    };

    this.jsonText = JSON.stringify([sampleJson], null, 2);
    this.validateJson();
  }

  private parseJsonToForm(): void {
    try {
      const logic = JSON.parse(this.jsonText);
      this.conditionLogic = Array.isArray(logic) ? logic : [logic];
      this.loadConditionLogic();
    } catch (error) {
      console.error('Error parsing JSON to form:', error);
    }
  }

  // Form Management Methods
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

  private addConditionGroupFromData(data: ApprovalConditionLogic): void {
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

  private addConditionFromData(conditionsArray: FormArray, data: ApprovalConditionLogic): void {
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

  duplicateCondition(groupIndex: number, conditionIndex: number): void {
    const conditionValue = this.getConditionsArray(groupIndex).at(conditionIndex).value;
    this.addConditionFromData(this.getConditionsArray(groupIndex), conditionValue);
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

  // Event Handlers
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

  // Utility Methods
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
        case 'boolean':
          return 'boolean';
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
      : operator === 'or'
        ? 'Any condition can be true'
        : 'Negated condition group';
  }

  getConditionLogicJson(): string {
    const logic = this.buildConditionLogic();
    return JSON.stringify(logic, null, 2);
  }

  // Sample Loading
  loadSample(sample: any): void {
    this.conditionLogic = sample.logic;
    this.loadConditionLogic();
    this.emitConditionChange();
  }

  // Clipboard
  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getConditionLogicJson());
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  // Output
  private emitConditionChange(): void {
    if (this.advancedMode) {
      try {
        const parsed = JSON.parse(this.jsonText);
        this.conditionChanged.emit(Array.isArray(parsed) ? parsed : [parsed]);
      } catch (error) {
        // Don't emit if JSON is invalid
      }
    } else {
      const conditionLogic = this.buildConditionLogic();
      this.conditionChanged.emit(conditionLogic);
    }
  }

  private buildConditionLogic(): ApprovalConditionLogic[] {
    const result: ApprovalConditionLogic[] = [];

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
        } as ApprovalConditionLogic);
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
