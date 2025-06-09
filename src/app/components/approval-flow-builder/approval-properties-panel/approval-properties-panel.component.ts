// components/approval-flow-builder/approval-properties-panel/approval-properties-panel.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  ApprovalFlowElement,
  ApprovalElementType,
  ApprovalConnection,
  StepType,
  ConditionType,
  Action,
  Group,
  Service,
  Status
} from '../../../models/approval-flow.models';
import { ApprovalFlowApiService, LookupItem } from '../../../services/approval-flow-api.service';
import { ApprovalConditionBuilderComponent } from '../approval-condition-builder/approval-condition-builder.component';

@Component({
  selector: 'app-approval-properties-panel',
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
    MatProgressSpinnerModule,
    ApprovalConditionBuilderComponent
  ],
  template: `
    <div class="approval-properties-panel" *ngIf="selectedElement || selectedConnection">
      <!-- Element Properties -->
      <div *ngIf="selectedElement" class="element-properties">
        <div class="properties-content">
          <div class="panel-header">
            <div class="header-content">
              <div class="header-text">
                <h3>
                  <mat-icon>{{ getElementIcon() }}</mat-icon>
                  {{ getElementTitle() }}
                </h3>
                <p>{{ getElementDescription() }}</p>
              </div>
              <button mat-icon-button
                      (click)="resetForm()"
                      [disabled]="isLoading"
                      title="Reset to saved values"
                      class="reset-button">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
          </div>

          <!-- Scrollable Content Area -->
          <div class="scrollable-content">
            <!-- Loading Spinner -->
            <div *ngIf="isLoading" class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading data...</p>
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage" class="error-container">
              <mat-icon color="warn">error</mat-icon>
              <p>{{ errorMessage }}</p>
              <div class="error-actions">
                <button mat-button (click)="loadLookupData()" color="primary">
                  <mat-icon>refresh</mat-icon>
                  Retry Loading Data
                </button>
                <button mat-button (click)="testApiConnection()" color="accent">
                  <mat-icon>wifi</mat-icon>
                  Test API Connection
                </button>
              </div>
            </div>

            <form [formGroup]="propertiesForm" *ngIf="!isLoading && !errorMessage">
              <mat-tab-group *ngIf="selectedElement.type !== 'start'" animationDuration="200ms">
                <!-- Basic Properties Tab -->
                <mat-tab label="Basic">
                  <div class="tab-content">
                    <ng-container [ngSwitch]="selectedElement.type">

                      <!-- Approval Step Properties -->
                      <div *ngSwitchCase="'approval_step'">
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Name</mat-label>
                          <input matInput formControlName="name" required>
                          <mat-error>Name is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Service Type</mat-label>
                          <mat-select formControlName="service_type" required (openedChange)="onServiceTypeDropdownOpen($event)">
                            <mat-option *ngFor="let service of serviceTypes" [value]="service.id">
                              {{ service.name }} ({{ service.name_ara }})
                            </mat-option>
                            <mat-option *ngIf="serviceTypes.length === 0" [value]="" disabled>
                              {{ isLoading ? 'Loading service types...' : 'No service types available' }}
                            </mat-option>
                          </mat-select>
                          <mat-error>Service type is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Sequence Number</mat-label>
                          <input matInput type="number" formControlName="seq" required min="1">
                          <mat-hint>Order of this step in the approval flow</mat-hint>
                          <mat-error>Sequence number is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Step Type</mat-label>
                          <mat-select formControlName="step_type" required (selectionChange)="onStepTypeChange($event.value)">
                            <mat-option [value]="1">Auto</mat-option>
                            <mat-option [value]="2">Action Based</mat-option>
                          </mat-select>
                          <mat-error>Step type is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Status</mat-label>
                          <mat-select formControlName="status" required (openedChange)="onStatusDropdownOpen($event)">
                            <mat-option *ngFor="let status of caseStatuses" [value]="status.id">
                              {{ status.name }} ({{ status.name_ara }})
                            </mat-option>
                            <mat-option *ngIf="caseStatuses.length === 0" [value]="" disabled>
                              {{ isLoading ? 'Loading statuses...' : 'No statuses available' }}
                            </mat-option>
                          </mat-select>
                          <mat-error>Status is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Assigned Group</mat-label>
                          <mat-select formControlName="group" required (openedChange)="onGroupDropdownOpen($event)">
                            <mat-option *ngFor="let group of groups" [value]="group.id">
                              {{ group.name }}
                            </mat-option>
                            <mat-option *ngIf="groups.length === 0" [value]="" disabled>
                              {{ isLoading ? 'Loading groups...' : 'No groups available' }}
                            </mat-option>
                          </mat-select>
                          <mat-error>Group is required</mat-error>
                        </mat-form-field>

                        <!-- Parallel Approval Section -->
                        <mat-expansion-panel class="parallel-section">
                          <mat-expansion-panel-header>
                            <mat-panel-title>Parallel Approval Settings</mat-panel-title>
                            <mat-panel-description>
                              Configure parallel approval requirements
                            </mat-panel-description>
                          </mat-expansion-panel-header>

                          <div class="parallel-content">
                            <mat-form-field appearance="outline" class="full-width">
                              <mat-label>Required Approvals</mat-label>
                              <input matInput type="number" formControlName="required_approvals" min="1" (input)="onRequiredApprovalsChange()">
                              <mat-hint>Number of approvals required for parallel approval</mat-hint>
                            </mat-form-field>

                            <div *ngIf="showParallelFields" class="parallel-fields">
                              <mat-form-field appearance="outline" class="full-width">
                                <mat-label>Priority Approver Groups</mat-label>
                                <mat-select formControlName="priority_approver_groups" multiple>
                                  <mat-option *ngFor="let group of groups" [value]="group.id">
                                    {{ group.name }}
                                  </mat-option>
                                </mat-select>
                                <mat-hint>Groups whose members can approve independently</mat-hint>
                              </mat-form-field>
                            </div>
                          </div>
                        </mat-expansion-panel>

                        <div class="form-options">
                          <mat-checkbox formControlName="active_ind">Active</mat-checkbox>
                        </div>
                      </div>

                      <!-- Action Step Properties -->
                      <div *ngSwitchCase="'action_step'">
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Name</mat-label>
                          <input matInput formControlName="name" required>
                          <mat-error>Name is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Action</mat-label>
                          <mat-select formControlName="action" required (openedChange)="onActionDropdownOpen($event)" (selectionChange)="onActionSelected($event.value)">
                            <mat-option *ngFor="let action of actions" [value]="action.id">
                              {{ action.name }} ({{ action.name_ara }})
                            </mat-option>
                            <mat-option *ngIf="actions.length === 0" [value]="" disabled>
                              {{ isLoading ? 'Loading actions...' : 'No actions available' }}
                            </mat-option>
                          </mat-select>
                          <mat-error>Action is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Target Status</mat-label>
                          <mat-select formControlName="to_status" required>
                            <mat-option *ngFor="let status of caseStatuses" [value]="status.id">
                              {{ status.name }} ({{ status.name_ara }})
                            </mat-option>
                          </mat-select>
                          <mat-error>Target status is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Sub Status</mat-label>
                          <mat-select formControlName="sub_status">
                            <mat-option value="">None</mat-option>
                            <mat-option *ngFor="let status of caseSubStatuses" [value]="status.id">
                              {{ status.name }} ({{ status.name_ara }})
                            </mat-option>
                          </mat-select>
                        </mat-form-field>

                        <div class="form-options">
                          <mat-checkbox formControlName="active_ind">Active</mat-checkbox>
                        </div>
                      </div>

                      <!-- Condition Step Properties -->
                      <div *ngSwitchCase="'condition_step'">
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Name</mat-label>
                          <input matInput formControlName="name" required>
                          <mat-error>Name is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Condition Type</mat-label>
                          <mat-select formControlName="type" required>
                            <mat-option [value]="1">Condition</mat-option>
                            <mat-option [value]="2">Automatic Action</mat-option>
                          </mat-select>
                          <mat-error>Condition type is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Target Status</mat-label>
                          <mat-select formControlName="to_status">
                            <mat-option value="">None</mat-option>
                            <mat-option *ngFor="let status of caseStatuses" [value]="status.id">
                              {{ status.name }} ({{ status.name_ara }})
                            </mat-option>
                          </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Sub Status</mat-label>
                          <mat-select formControlName="sub_status">
                            <mat-option value="">None</mat-option>
                            <mat-option *ngFor="let status of caseSubStatuses" [value]="status.id">
                              {{ status.name }} ({{ status.name_ara }})
                            </mat-option>
                          </mat-select>
                        </mat-form-field>

                        <div class="form-options">
                          <mat-checkbox formControlName="active_ind">Active</mat-checkbox>
                        </div>
                      </div>

                      <!-- Parallel Group Properties -->
                      <div *ngSwitchCase="'parallel_group'">
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Name</mat-label>
                          <input matInput formControlName="name" required>
                          <mat-error>Name is required</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Parallel Groups</mat-label>
                          <mat-select formControlName="parallel_groups" multiple required>
                            <mat-option *ngFor="let group of groups" [value]="group.id">
                              {{ group.name }}
                            </mat-option>
                          </mat-select>
                          <mat-hint>Select groups that can provide parallel approval</mat-hint>
                          <mat-error>At least one group is required</mat-error>
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
                            <mat-option value="complete">Complete Flow</mat-option>
                            <mat-option value="approve">Approve</mat-option>
                            <mat-option value="reject">Reject</mat-option>
                            <mat-option value="return">Return to Previous Step</mat-option>
                          </mat-select>
                        </mat-form-field>
                      </div>
                    </ng-container>
                  </div>
                </mat-tab>

                <!-- Condition Logic Tab (for Condition Step) -->
                <mat-tab label="Logic" *ngIf="selectedElement.type === 'condition_step'">
                  <div class="tab-content">
                    <app-approval-condition-builder
                      [conditionLogic]="propertiesForm.get('condition_logic')?.value || []"
                      [availableFields]="getAvailableFields()"
                      (conditionChanged)="onConditionLogicChanged($event)">
                    </app-approval-condition-builder>
                  </div>
                </mat-tab>

                <!-- Advanced Tab (for Approval Step) -->
                <mat-tab label="Advanced" *ngIf="selectedElement.type === 'approval_step'">
                  <div class="tab-content">
                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>Action Configuration</mat-panel-title>
                        <mat-panel-description>
                          Configure actions available in this step
                        </mat-panel-description>
                      </mat-expansion-panel-header>

                      <div class="actions-config">
                        <p>Available actions for this approval step will be automatically determined based on connected action step elements.</p>

                        <div class="action-list" *ngIf="getConnectedActions().length > 0">
                          <h4>Connected Actions:</h4>
                          <mat-chip-set>
                            <mat-chip *ngFor="let actionName of getConnectedActions()">
                              {{ actionName }}
                            </mat-chip>
                          </mat-chip-set>
                        </div>
                      </div>
                    </mat-expansion-panel>

                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>Timing Configuration</mat-panel-title>
                        <mat-panel-description>
                          Configure step timing and timeouts
                        </mat-panel-description>
                      </mat-expansion-panel-header>

                      <div class="timing-config">
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Step Timeout (hours)</mat-label>
                          <input matInput type="number" formControlName="timeout_hours" min="1">
                          <mat-hint>Hours before this step times out</mat-hint>
                        </mat-form-field>

                        <mat-checkbox formControlName="auto_escalate">
                          Auto-escalate on timeout
                        </mat-checkbox>
                      </div>
                    </mat-expansion-panel>
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
            </form>
          </div>

          <!-- Auto-save Status -->
          <div class="auto-save-status" *ngIf="!isLoading && !errorMessage && showAutoSaveStatus">
            <div class="status-indicator" [ngClass]="autoSaveStatus">
              <mat-icon>{{ getAutoSaveIcon() }}</mat-icon>
              <span>{{ getAutoSaveMessage() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Connection Properties -->
      <div *ngIf="selectedConnection" class="connection-properties">
        <div class="panel-header">
          <div class="header-content">
            <div class="header-text">
              <h3>
                <mat-icon>arrow_forward</mat-icon>
                Connection Properties
              </h3>
              <p>Configure connection settings</p>
            </div>
          </div>
        </div>

        <div class="scrollable-content">
          <div class="connection-info">
            <p><strong>Source:</strong> {{ getSourceElementName() }}</p>
            <p><strong>Target:</strong> {{ getTargetElementName() }}</p>
            <p *ngIf="selectedConnection.actionId"><strong>Action ID:</strong> {{ selectedConnection.actionId }}</p>
          </div>

          <button mat-raised-button color="warn" (click)="deleteConnection()">
            <mat-icon>delete</mat-icon>
            Delete Connection
          </button>
        </div>
      </div>
    </div>

    <!-- No Selection State -->
    <div *ngIf="!selectedElement && !selectedConnection" class="no-selection">
      <div class="no-selection-content">
        <mat-icon>info</mat-icon>
        <h3>No Element Selected</h3>
        <p>Select an element or connection to view and edit its properties.</p>
      </div>
    </div>
  `,
  styles: [`
    .approval-properties-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f8f9fa;
    }

    .properties-content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .panel-header {
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      flex-shrink: 0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-text {
      flex: 1;
    }

    .header-text h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }

    .header-text p {
      margin: 0;
      color: #666;
      font-size: 13px;
      line-height: 1.4;
    }

    .reset-button {
      margin-left: 8px;
    }

    .scrollable-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .loading-container mat-spinner {
      margin-bottom: 16px;
    }

    .loading-container p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #f44336;
    }

    .error-container mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 16px;
    }

    .error-container p {
      margin: 0 0 16px 0;
      color: #666;
      font-size: 14px;
    }

    .error-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
    }

    .tab-content {
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
    }

    .form-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .parallel-section {
      margin-top: 16px;
    }

    .parallel-content {
      padding-top: 16px;
    }

    .parallel-fields {
      margin-top: 16px;
    }

    .start-properties {
      padding: 16px 0;
    }

    .connection-properties {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .connection-info {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .connection-info p {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #333;
    }

    .connection-info p:last-child {
      margin-bottom: 0;
    }

    .connection-info strong {
      font-weight: 500;
      color: #555;
    }

    .no-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px 20px;
      text-align: center;
      color: #666;
    }

    .no-selection-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .no-selection mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ccc;
    }

    .no-selection h3 {
      margin: 0;
      color: #555;
      font-size: 18px;
    }

    .no-selection p {
      margin: 0;
      color: #666;
      font-size: 14px;
      max-width: 280px;
      line-height: 1.4;
    }

    .auto-save-status {
      position: sticky;
      bottom: 0;
      background: white;
      border-top: 1px solid #e0e0e0;
      padding: 12px 16px;
      margin: 0 -16px -16px -16px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .status-indicator mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-indicator.saved mat-icon {
      color: #4caf50;
    }

    .status-indicator.saving mat-icon {
      color: #ff9800;
      animation: spin 1s linear infinite;
    }

    .status-indicator.error mat-icon {
      color: #f44336;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .mat-expansion-panel {
      box-shadow: none !important;
      border: 1px solid #e0e0e0;
      border-radius: 6px !important;
      margin-bottom: 16px;
    }

    .mat-expansion-panel-header {
      padding: 12px 16px;
    }

    .mat-expansion-panel-content .mat-expansion-panel-body {
      padding: 0 16px 16px;
    }

    .mat-form-field {
      margin-bottom: 16px;
    }

    .mat-form-field:last-child {
      margin-bottom: 0;
    }

    .mat-tab-group {
      background: transparent;
    }

    .mat-tab-body-content {
      overflow: visible !important;
    }

    .mat-chip-set {
      margin: 8px 0;
    }

    .mat-chip {
      font-size: 11px !important;
      min-height: 24px !important;
      border-radius: 12px !important;
    }

    @media (max-width: 768px) {
      .scrollable-content {
        padding: 12px;
      }

      .panel-header {
        padding: 12px;
      }

      .header-text h3 {
        font-size: 14px;
      }

      .header-text p {
        font-size: 12px;
      }

      .parallel-content,
      .parallel-fields {
        padding-top: 12px;
        margin-top: 12px;
      }
    }
  `]
})
export class ApprovalPropertiesPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() selectedElement?: ApprovalFlowElement;
  @Input() selectedConnection?: ApprovalConnection;
  @Input() allElements: ApprovalFlowElement[] = [];
  @Input() allConnections: ApprovalConnection[] = [];

  @Output() elementUpdated = new EventEmitter<{ id: string; properties: any }>();
  @Output() connectionUpdated = new EventEmitter<any>();

  propertiesForm!: FormGroup;
  private destroy$ = new Subject<void>();

  // Loading and error states
  isLoading = false;
  errorMessage = '';

  // Auto-save status
  showAutoSaveStatus = false;
  autoSaveStatus: 'saved' | 'saving' | 'error' = 'saved';
  private autoSaveTimeout?: any;

  // Lookup Data
  serviceTypes: LookupItem[] = [];
  caseStatuses: LookupItem[] = [];
  caseSubStatuses: LookupItem[] = [];
  groups: Group[] = [];
  actions: Action[] = [];

  // Form state
  showParallelFields = false;

  constructor(
    private fb: FormBuilder,
    public approvalFlowApiService: ApprovalFlowApiService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    console.log('Approval properties panel initialized');
    this.setupAutoSave();
  }

  private setupAutoSave(): void {
    this.propertiesForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((formValue) => {
        if (this.selectedElement &&
          this.propertiesForm.valid &&
          this.showAutoSaveStatus) {
          this.autoSaveProperties(formValue);
        }
      });
  }

  private async ensureDataLoaded(): Promise<void> {
    const hasLookupData = this.serviceTypes.length > 0 || this.caseStatuses.length > 0 ||
      this.groups.length > 0 || this.actions.length > 0;

    console.log('Data check:', { hasLookupData });

    if (!hasLookupData) {
      console.log('Loading lookup data...');
      await this.loadLookupDataAsync();
    }
  }

  private async loadLookupDataAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.approvalFlowApiService.isConfigured()) {
        this.errorMessage = 'API not configured. Please configure the base URL first.';
        console.error('API not configured');
        reject(new Error('API not configured'));
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';
      console.log('Starting lookup data load...');

      const loadOperations = {
        serviceTypes: this.approvalFlowApiService.getServiceTypes().pipe(catchError((error) => {
          console.error('Service types loading failed:', error);
          return of({ count: 0, results: [] as LookupItem[] });
        })),
        caseStatuses: this.approvalFlowApiService.getCaseStatuses().pipe(catchError((error) => {
          console.error('Case statuses loading failed:', error);
          return of({ count: 0, results: [] as LookupItem[] });
        })),
        caseSubStatuses: this.approvalFlowApiService.getCaseSubStatuses().pipe(catchError((error) => {
          console.error('Case sub statuses loading failed:', error);
          return of({ count: 0, results: [] as LookupItem[] });
        })),
        groups: this.approvalFlowApiService.getGroups().pipe(catchError((error) => {
          console.error('Groups loading failed:', error);
          return of({ count: 0, results: [] as Group[] });
        })),
        actions: this.approvalFlowApiService.getActions().pipe(catchError((error) => {
          console.error('Actions loading failed:', error);
          return of({ count: 0, results: [] as Action[] });
        }))
      };

      forkJoin(loadOperations)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (responses) => {
            console.log('Raw responses:', responses);

            this.serviceTypes = responses.serviceTypes.results || [];
            this.caseStatuses = responses.caseStatuses.results || [];
            this.caseSubStatuses = responses.caseSubStatuses.results || [];
            this.groups = responses.groups.results || [];
            this.actions = responses.actions.results || [];

            this.isLoading = false;
            console.log('Lookup data loaded successfully:', {
              serviceTypes: this.serviceTypes.length,
              caseStatuses: this.caseStatuses.length,
              caseSubStatuses: this.caseSubStatuses.length,
              groups: this.groups.length,
              actions: this.actions.length
            });

            if (this.serviceTypes.length === 0 && this.caseStatuses.length === 0 &&
              this.groups.length === 0 && this.actions.length === 0) {
              this.errorMessage = 'No data received from API. Please check your API endpoints.';
              reject(new Error('No data received'));
            } else {
              resolve();
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = `Failed to load lookup data: ${error.message}`;
            console.error('Error loading lookup data:', error);
            reject(error);
          }
        });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedElement']) {
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = undefined;
      }

      this.showAutoSaveStatus = false;

      this.ensureDataLoaded().then(() => {
        this.updateFormForElement();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  private initializeForm(): void {
    this.propertiesForm = this.fb.group({
      // Common properties
      name: ['', Validators.required],
      description: [''],

      // Approval Step properties
      service_type: [''],
      seq: [''],
      step_type: [''],
      status: [''],
      group: [''],
      required_approvals: [''],
      priority_approver_groups: [[]],
      active_ind: [true],

      // Action Step properties
      action: [''],
      to_status: [''],
      sub_status: [''],

      // Condition Step properties
      type: [''],
      condition_logic: [[]],

      // Parallel Group properties
      parallel_groups: [[]],

      // End properties
      // action: ['complete'],

      // Advanced properties
      timeout_hours: [''],
      auto_escalate: [false]
    });
  }

  loadLookupData(): void {
    this.loadLookupDataAsync().catch(error => {
      console.error('Failed to load lookup data:', error);
    });
  }

  // Dropdown open handlers
  onServiceTypeDropdownOpen(opened: boolean): void {
    if (opened && this.serviceTypes.length === 0 && !this.isLoading) {
      console.log('Service type dropdown opened with no data, loading...');
      this.loadLookupData();
    }
  }

  onStatusDropdownOpen(opened: boolean): void {
    if (opened && this.caseStatuses.length === 0 && !this.isLoading) {
      console.log('Status dropdown opened with no data, loading...');
      this.loadLookupData();
    }
  }

  onGroupDropdownOpen(opened: boolean): void {
    if (opened && this.groups.length === 0 && !this.isLoading) {
      console.log('Group dropdown opened with no data, loading...');
      this.loadLookupData();
    }
  }

  onActionDropdownOpen(opened: boolean): void {
    if (opened && this.actions.length === 0 && !this.isLoading) {
      console.log('Action dropdown opened with no data, loading...');
      this.loadLookupData();
    }
  }

  // Event handlers
  onStepTypeChange(stepType: number): void {
    if (stepType === StepType.AUTO) {
      console.log('Changed to Auto step type');
    } else {
      console.log('Changed to Action Based step type');
    }
  }

  onRequiredApprovalsChange(): void {
    const requiredApprovals = this.propertiesForm.get('required_approvals')?.value;
    this.showParallelFields = !!requiredApprovals && requiredApprovals > 0;
  }

  onActionSelected(actionId: number): void {
    const selectedAction = this.actions.find(a => a.id === actionId);
    if (selectedAction) {
      this.propertiesForm.patchValue({
        name: selectedAction.name
      });
    }
  }

  onConditionLogicChanged(conditionLogic: any[]): void {
    const currentElement = this.selectedElement;
    if (currentElement && currentElement.type === ApprovalElementType.CONDITION_STEP) {
      console.log('Condition logic changed for element:', currentElement.id, conditionLogic);
      const conditionLogicCopy = JSON.parse(JSON.stringify(conditionLogic));
      this.propertiesForm.patchValue({ condition_logic: conditionLogicCopy });
    }
  }

  getAvailableFields(): any[] {
    // Return available fields for condition building
    return [
      { name: 'application_id', display_name: 'Application ID', type: 'text' },
      { name: 'applicant_type', display_name: 'Applicant Type', type: 'text' },
      { name: 'service_type', display_name: 'Service Type', type: 'text' },
      { name: 'current_status', display_name: 'Current Status', type: 'text' },
      { name: 'submission_date', display_name: 'Submission Date', type: 'date' },
      { name: 'amount', display_name: 'Amount', type: 'number' },
      { name: 'priority', display_name: 'Priority', type: 'text' },
      { name: 'urgency', display_name: 'Urgency', type: 'text' },
      { name: 'approval_level', display_name: 'Approval Level', type: 'number' }
    ];
  }

  private updateFormForElement(): void {
    if (!this.selectedElement) {
      this.propertiesForm.reset();
      this.showAutoSaveStatus = false;
      return;
    }

    console.log('Updating form for element:', this.selectedElement.id, this.selectedElement.properties);

    this.showAutoSaveStatus = false;

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = undefined;
    }

    const properties = JSON.parse(JSON.stringify(this.selectedElement.properties || {}));

    this.propertiesForm.reset();

    setTimeout(() => {
      this.propertiesForm.patchValue({
        name: properties.name || '',
        description: properties.description || ''
      });

      this.setElementSpecificProperties(properties);
      this.updateValidators();

      setTimeout(() => {
        this.showAutoSaveStatus = true;
        this.autoSaveStatus = 'saved';
      }, 200);
    }, 50);
  }

  private setElementSpecificProperties(properties: any): void {
    if (!this.selectedElement) return;

    switch (this.selectedElement.type) {
      case ApprovalElementType.APPROVAL_STEP:
        this.propertiesForm.patchValue({
          service_type: properties.service_type || '',
          seq: properties.seq || '',
          step_type: properties.step_type || 2,
          status: properties.status || '',
          group: properties.group || '',
          required_approvals: properties.required_approvals || '',
          priority_approver_groups: properties.priority_approver_groups || [],
          active_ind: properties.active_ind !== false,
          timeout_hours: properties.timeout_hours || '',
          auto_escalate: properties.auto_escalate || false
        });

        this.showParallelFields = !!properties.required_approvals && properties.required_approvals > 0;
        break;

      case ApprovalElementType.ACTION_STEP:
        this.propertiesForm.patchValue({
          action: properties.action || '',
          to_status: properties.to_status || '',
          sub_status: properties.sub_status || '',
          active_ind: properties.active_ind !== false
        });
        break;

      case ApprovalElementType.CONDITION_STEP:
        this.propertiesForm.patchValue({
          type: properties.type || 1,
          condition_logic: properties.condition_logic || [],
          to_status: properties.to_status || '',
          sub_status: properties.sub_status || '',
          active_ind: properties.active_ind !== false
        });
        break;

      case ApprovalElementType.PARALLEL_GROUP:
        this.propertiesForm.patchValue({
          parallel_groups: properties.parallel_groups || []
        });
        break;

      case ApprovalElementType.END:
        this.propertiesForm.patchValue({
          action: properties.action || 'complete'
        });
        break;
    }
  }

  private autoSaveProperties(formValue: any): void {
    if (!this.selectedElement) {
      console.log('Auto-save cancelled: No element selected');
      return;
    }

    if (!this.propertiesForm.valid) {
      console.log('Auto-save cancelled: Form is invalid');
      return;
    }

    const currentElementId = this.selectedElement.id;

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveStatus = 'saving';
    this.showAutoSaveStatus = true;

    this.autoSaveTimeout = setTimeout(() => {
      if (!this.selectedElement || this.selectedElement.id !== currentElementId) {
        console.log('Auto-save cancelled: Element changed during timeout');
        return;
      }

      try {
        const cleanedProperties = this.cleanFormValue(formValue);

        console.log('Auto-saving for element:', currentElementId, cleanedProperties);

        this.elementUpdated.emit({
          id: currentElementId,
          properties: cleanedProperties
        });

        this.autoSaveStatus = 'saved';

        setTimeout(() => {
          this.showAutoSaveStatus = false;
        }, 2000);

      } catch (error) {
        console.error('Auto-save error:', error);
        this.autoSaveStatus = 'error';

        setTimeout(() => {
          this.showAutoSaveStatus = false;
        }, 5000);
      }
    }, 500);
  }

  private updateValidators(): void {
    if (!this.selectedElement) return;

    Object.keys(this.propertiesForm.controls).forEach(key => {
      this.propertiesForm.get(key)?.clearValidators();
    });

    this.propertiesForm.get('name')?.setValidators([Validators.required]);

    switch (this.selectedElement.type) {
      case ApprovalElementType.APPROVAL_STEP:
        this.propertiesForm.get('service_type')?.setValidators([Validators.required]);
        this.propertiesForm.get('seq')?.setValidators([Validators.required]);
        this.propertiesForm.get('step_type')?.setValidators([Validators.required]);
        this.propertiesForm.get('status')?.setValidators([Validators.required]);
        this.propertiesForm.get('group')?.setValidators([Validators.required]);
        break;

      case ApprovalElementType.ACTION_STEP:
        this.propertiesForm.get('action')?.setValidators([Validators.required]);
        this.propertiesForm.get('to_status')?.setValidators([Validators.required]);
        break;

      case ApprovalElementType.CONDITION_STEP:
        this.propertiesForm.get('type')?.setValidators([Validators.required]);
        break;

      case ApprovalElementType.PARALLEL_GROUP:
        this.propertiesForm.get('parallel_groups')?.setValidators([Validators.required]);
        break;
    }

    this.propertiesForm.updateValueAndValidity();
  }

  private cleanFormValue(formValue: any): any {
    if (!this.selectedElement) return {};

    const cleaned: any = {};

    if (formValue.name !== null && formValue.name !== undefined) {
      cleaned.name = formValue.name;
    }
    if (formValue.description !== null && formValue.description !== undefined) {
      cleaned.description = formValue.description;
    }

    switch (this.selectedElement.type) {
      case ApprovalElementType.APPROVAL_STEP:
        ['service_type', 'seq', 'step_type', 'status', 'group', 'required_approvals', 'active_ind', 'timeout_hours', 'auto_escalate'].forEach(key => {
          if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
            cleaned[key] = formValue[key];
          }
        });

        if (formValue.priority_approver_groups && Array.isArray(formValue.priority_approver_groups)) {
          cleaned.priority_approver_groups = [...formValue.priority_approver_groups];
        }
        break;

      case ApprovalElementType.ACTION_STEP:
        ['action', 'to_status', 'sub_status', 'active_ind'].forEach(key => {
          if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
            cleaned[key] = formValue[key];
          }
        });
        break;

      case ApprovalElementType.CONDITION_STEP:
        ['type', 'to_status', 'sub_status', 'active_ind'].forEach(key => {
          if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
            cleaned[key] = formValue[key];
          }
        });

        if (formValue.condition_logic && Array.isArray(formValue.condition_logic)) {
          cleaned.condition_logic = [...formValue.condition_logic];
        }
        break;

      case ApprovalElementType.PARALLEL_GROUP:
        if (formValue.parallel_groups && Array.isArray(formValue.parallel_groups)) {
          cleaned.parallel_groups = [...formValue.parallel_groups];
        }
        break;

      case ApprovalElementType.END:
        if (formValue.action) {
          cleaned.action = formValue.action;
        }
        break;
    }

    console.log('Cleaned form value for', this.selectedElement.type, ':', cleaned);
    return cleaned;
  }

  resetForm(): void {
    if (this.selectedElement) {
      console.log('Resetting form for element:', this.selectedElement.id);
      this.updateFormForElement();
      this.snackBar.open('Form reset to saved values', 'Close', { duration: 2000 });
    }
  }

  deleteConnection(): void {
    if (this.selectedConnection) {
      this.connectionUpdated.emit({ action: 'delete', connection: this.selectedConnection });
    }
  }

  testApiConnection(): void {
    console.log('Testing API connection...');
    console.log('Base URL:', this.approvalFlowApiService.getBaseUrl());
    console.log('Is configured:', this.approvalFlowApiService.isConfigured());

    if (this.approvalFlowApiService.isConfigured()) {
      this.approvalFlowApiService.getServiceTypes().subscribe({
        next: (response) => {
          console.log('API test successful:', response);
          this.snackBar.open('API connection successful!', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('API test failed:', error);
          this.snackBar.open(`API test failed: ${error.message}`, 'Close', { duration: 5000 });
        }
      });
    } else {
      this.snackBar.open('API not configured. Please configure base URL first.', 'Close', { duration: 5000 });
    }
  }

  getConnectedActions(): string[] {
    if (!this.selectedElement || !this.allConnections) return [];

    const connectedActionElements = this.allConnections
      .filter(conn => conn.sourceId === this.selectedElement!.id)
      .map(conn => this.allElements.find(el => el.id === conn.targetId && el.type === ApprovalElementType.ACTION_STEP))
      .filter(el => el != null)
      .map(el => el!.properties.name || 'Unnamed Action');

    return connectedActionElements;
  }

  getElementIcon(): string {
    const icons: { [key: string]: string } = {
      [ApprovalElementType.START]: 'play_circle',
      [ApprovalElementType.APPROVAL_STEP]: 'approval',
      [ApprovalElementType.ACTION_STEP]: 'play_arrow',
      [ApprovalElementType.CONDITION_STEP]: 'help',
      [ApprovalElementType.PARALLEL_GROUP]: 'account_tree',
      [ApprovalElementType.END]: 'stop_circle'
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
      return elementType.charAt(0).toUpperCase() + elementType.slice(1).replace('_', ' ');
    }

    return 'Element';
  }

  getElementDescription(): string {
    const descriptions: { [key: string]: string } = {
      [ApprovalElementType.START]: 'Configure the starting point of your approval flow',
      [ApprovalElementType.APPROVAL_STEP]: 'Define approval steps with groups and status transitions',
      [ApprovalElementType.ACTION_STEP]: 'Configure specific actions within approval steps',
      [ApprovalElementType.CONDITION_STEP]: 'Set up conditional logic and automatic actions',
      [ApprovalElementType.PARALLEL_GROUP]: 'Configure parallel approval groups',
      [ApprovalElementType.END]: 'Define approval flow completion actions'
    };
    return descriptions[this.selectedElement?.type || ''] || '';
  }

  getSourceElementName(): string {
    if (!this.selectedConnection || !this.allElements) return 'Unknown';
    const sourceElement = this.allElements.find(el => el.id === this.selectedConnection!.sourceId);
    return sourceElement?.properties.name || 'Source Element';
  }

  getTargetElementName(): string {
    if (!this.selectedConnection || !this.allElements) return 'Unknown';
    const targetElement = this.allElements.find(el => el.id === this.selectedConnection!.targetId);
    return targetElement?.properties.name || 'Target Element';
  }

  getAutoSaveIcon(): string {
    switch (this.autoSaveStatus) {
      case 'saving': return 'sync';
      case 'saved': return 'check_circle';
      case 'error': return 'error';
      default: return 'check_circle';
    }
  }

  getAutoSaveMessage(): string {
    switch (this.autoSaveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Changes saved';
      case 'error': return 'Save failed';
      default: return 'Changes saved';
    }
  }
}
