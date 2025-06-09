// components/approval-flow-builder/approval-flow-selector-dialog/approval-flow-selector-dialog.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { ApprovalFlowApiService, ApprovalFlowSummary } from '../../../services/approval-flow-api.service';

export interface ApprovalFlowSelectionResult {
  action: 'create' | 'load';
  serviceCode?: string;
  serviceName?: string;
}

@Component({
  selector: 'app-approval-flow-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    FormsModule,
    DatePipe
  ],
  template: `
    <div class="approval-flow-selector-dialog">
      <h2 mat-dialog-title>
        <mat-icon>account_tree</mat-icon>
        Select Approval Flow
      </h2>

      <mat-dialog-content class="dialog-content">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading approval flows...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="errorMessage" class="error-container">
          <mat-icon color="warn">error</mat-icon>
          <p>{{ errorMessage }}</p>
          <button mat-button (click)="loadApprovalFlows()" color="primary">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>

        <!-- Search and Filters -->
        <div *ngIf="!isLoading && !errorMessage" class="filters-section">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search approval flows</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput
                   [(ngModel)]="searchTerm"
                   (input)="applyFilter()"
                   placeholder="Search by service code or name">
          </mat-form-field>

          <div class="flow-stats">
            <mat-chip-set>
              <mat-chip>{{ filteredApprovalFlows.length }} approval flows found</mat-chip>
              <mat-chip *ngIf="searchTerm">Filtered</mat-chip>
            </mat-chip-set>
          </div>
        </div>

        <!-- Approval Flows List -->
        <div *ngIf="!isLoading && !errorMessage" class="flows-container">
          <div *ngIf="filteredApprovalFlows.length === 0" class="no-flows">
            <mat-icon>account_tree</mat-icon>
            <h3>No Approval Flows Found</h3>
            <p *ngIf="searchTerm; else noFlowsMessage">
              No approval flows match your search criteria. Try adjusting your search terms.
            </p>
            <ng-template #noFlowsMessage>
              <p>No approval flows have been configured yet. Contact your administrator to set up approval flows.</p>
            </ng-template>
          </div>

          <div class="flow-grid" *ngIf="filteredApprovalFlows.length > 0">
            <mat-card *ngFor="let approvalFlow of filteredApprovalFlows; trackBy: trackApprovalFlow"
                      class="flow-card"
                      [class.selected]="selectedServiceCode === approvalFlow.service_code"
                      (click)="selectApprovalFlow(approvalFlow)">

              <mat-card-header>
                <div class="flow-header">
                  <div class="flow-info">
                    <mat-card-title>
                      <span class="service-code">{{ approvalFlow.service_code }}</span>
                      {{ approvalFlow.service_name }}
                    </mat-card-title>
                    <mat-card-subtitle>
                      Service Code: {{ approvalFlow.service_code }}
                    </mat-card-subtitle>
                  </div>

                  <div class="flow-status">
                    <mat-chip [color]="approvalFlow.is_active ? 'primary' : 'warn'">
                      {{ approvalFlow.is_active ? 'Active' : 'Inactive' }}
                    </mat-chip>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div class="flow-metadata">
                  <div class="metadata-row">
                    <div class="metadata-item">
                      <mat-icon>approval</mat-icon>
                      <span>{{ approvalFlow.step_count }} approval steps</span>
                    </div>

                    <div class="metadata-item">
                      <mat-icon>play_arrow</mat-icon>
                      <span>{{ approvalFlow.action_count }} actions</span>
                    </div>
                  </div>

                  <div class="metadata-row" *ngIf="approvalFlow.last_updated">
                    <div class="metadata-item">
                      <mat-icon>schedule</mat-icon>
                      <span>{{ approvalFlow.last_updated | date:'short' }}</span>
                    </div>

                    <div class="metadata-item">
                      <mat-icon>business</mat-icon>
                      <span>Service Flow</span>
                    </div>
                  </div>
                </div>

                <!-- Flow Preview -->
                <div class="flow-preview">
                  <div class="preview-header">
                    <mat-icon>visibility</mat-icon>
                    <span>Quick Preview</span>
                  </div>
                  <div class="preview-content">
                    <span class="preview-text">
                      This approval flow contains {{ approvalFlow.step_count }} approval step{{ approvalFlow.step_count !== 1 ? 's' : '' }}
                      with {{ approvalFlow.action_count }} total action{{ approvalFlow.action_count !== 1 ? 's' : '' }}.
                    </span>
                  </div>
                </div>

                <!-- Flow Complexity Indicator -->
                <div class="complexity-indicator">
                  <span class="complexity-label">Complexity:</span>
                  <div class="complexity-bar">
                    <div class="complexity-fill"
                         [style.width.%]="getComplexityPercentage(approvalFlow)"
                         [ngClass]="getComplexityClass(approvalFlow)">
                    </div>
                  </div>
                  <span class="complexity-text">{{ getComplexityText(approvalFlow) }}</span>
                </div>
              </mat-card-content>

              <mat-card-actions>
                <button mat-button
                        color="primary"
                        (click)="loadApprovalFlow(approvalFlow, $event)">
                  <mat-icon>open_in_new</mat-icon>
                  Open Flow
                </button>

                <button mat-icon-button
                        (click)="viewFlowDetails(approvalFlow, $event)"
                        matTooltip="View flow details">
                  <mat-icon>info</mat-icon>
                </button>

                <button mat-icon-button
                        (click)="duplicateFlow(approvalFlow, $event)"
                        matTooltip="Duplicate flow">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>

        <button mat-button (click)="createNewFlow()" color="accent">
          <mat-icon>add</mat-icon>
          Create New Flow
        </button>

        <button mat-raised-button
                color="primary"
                (click)="onLoadSelected()"
                [disabled]="!selectedServiceCode">
          <mat-icon>open_in_new</mat-icon>
          Open Selected
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .approval-flow-selector-dialog {
      width: 100%;
      max-width: 900px;
    }

    .dialog-content {
      max-height: 600px;
      padding: 20px;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .loading-container p,
    .error-container p {
      margin: 16px 0;
      color: #666;
    }

    .filters-section {
      margin-bottom: 20px;
    }

    .search-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .flow-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .flows-container {
      max-height: 400px;
      overflow-y: auto;
    }

    .no-flows {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #666;
    }

    .no-flows mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .no-flows h3 {
      margin: 0 0 8px 0;
    }

    .flow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
    }

    .flow-card {
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      position: relative;
    }

    .flow-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .flow-card.selected {
      border-color: #2196F3;
      box-shadow: 0 0 0 1px rgba(33, 150, 243, 0.3);
    }

    .flow-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }

    .flow-info {
      flex: 1;
    }

    .service-code {
      display: inline-block;
      background: #1976d2;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
    }

    .flow-status {
      margin-left: 8px;
    }

    .flow-metadata {
      margin: 16px 0;
    }

    .metadata-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #666;
      flex: 1;
    }

    .metadata-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #888;
    }

    .flow-preview {
      background: #f8f9fa;
      border-radius: 4px;
      padding: 12px;
      margin-top: 16px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }

    .preview-header mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .preview-text {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }

    .complexity-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 12px;
    }

    .complexity-label {
      color: #666;
      font-weight: 500;
    }

    .complexity-bar {
      flex: 1;
      height: 6px;
      background: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
    }

    .complexity-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .complexity-fill.low {
      background: #4CAF50;
    }

    .complexity-fill.medium {
      background: #FF9800;
    }

    .complexity-fill.high {
      background: #F44336;
    }

    .complexity-text {
      color: #666;
      font-weight: 500;
      min-width: 60px;
    }

    mat-card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    mat-dialog-actions {
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .flow-grid {
        grid-template-columns: 1fr;
      }

      .flow-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .flow-status {
        margin: 8px 0 0 0;
      }

      .metadata-row {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class ApprovalFlowSelectorDialogComponent implements OnInit {
  approvalFlows: ApprovalFlowSummary[] = [];
  filteredApprovalFlows: ApprovalFlowSummary[] = [];
  selectedServiceCode?: string;
  selectedApprovalFlow?: ApprovalFlowSummary;
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private dialogRef: MatDialogRef<ApprovalFlowSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private approvalFlowApiService: ApprovalFlowApiService
  ) {}

  ngOnInit(): void {
    this.loadApprovalFlows();
  }

  loadApprovalFlows(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.approvalFlowApiService.getApprovalFlowSummaries().subscribe({
      next: (summaries) => {
        this.approvalFlows = summaries || [];
        this.filteredApprovalFlows = [...this.approvalFlows];
        this.isLoading = false;
        console.log('Loaded approval flow summaries:', this.approvalFlows);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Failed to load approval flows: ${error.message}`;
        console.error('Error loading approval flows:', error);
      }
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredApprovalFlows = [...this.approvalFlows];
      return;
    }

    this.filteredApprovalFlows = this.approvalFlows.filter(approvalFlow =>
      approvalFlow.service_code.toLowerCase().includes(term) ||
      (approvalFlow.service_name && approvalFlow.service_name.toLowerCase().includes(term))
    );
  }

  selectApprovalFlow(approvalFlow: ApprovalFlowSummary): void {
    this.selectedServiceCode = approvalFlow.service_code;
    this.selectedApprovalFlow = approvalFlow;
  }

  loadApprovalFlow(approvalFlow: ApprovalFlowSummary, event: Event): void {
    event.stopPropagation();
    this.dialogRef.close({
      action: 'load',
      serviceCode: approvalFlow.service_code,
      serviceName: approvalFlow.service_name
    } as ApprovalFlowSelectionResult);
  }

  viewFlowDetails(approvalFlow: ApprovalFlowSummary, event: Event): void {
    event.stopPropagation();

    // Here you could open another dialog with detailed flow information
    console.log('View details for approval flow:', approvalFlow);

    // For now, just select the flow
    this.selectApprovalFlow(approvalFlow);
  }

  duplicateFlow(approvalFlow: ApprovalFlowSummary, event: Event): void {
    event.stopPropagation();

    // Here you could implement flow duplication logic
    console.log('Duplicate approval flow:', approvalFlow);

    // For now, just show a message
    // You would typically create a copy with a new service code
  }

  createNewFlow(): void {
    this.dialogRef.close({
      action: 'create'
    } as ApprovalFlowSelectionResult);
  }

  onLoadSelected(): void {
    if (this.selectedApprovalFlow) {
      this.dialogRef.close({
        action: 'load',
        serviceCode: this.selectedApprovalFlow.service_code,
        serviceName: this.selectedApprovalFlow.service_name
      } as ApprovalFlowSelectionResult);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Complexity calculation methods
  getComplexityPercentage(flow: ApprovalFlowSummary): number {
    // Calculate complexity based on steps and actions
    const totalElements = flow.step_count + flow.action_count;

    if (totalElements <= 5) return 30;  // Low complexity
    if (totalElements <= 15) return 60; // Medium complexity
    return 90; // High complexity
  }

  getComplexityClass(flow: ApprovalFlowSummary): string {
    const percentage = this.getComplexityPercentage(flow);

    if (percentage <= 30) return 'low';
    if (percentage <= 60) return 'medium';
    return 'high';
  }

  getComplexityText(flow: ApprovalFlowSummary): string {
    const percentage = this.getComplexityPercentage(flow);

    if (percentage <= 30) return 'Low';
    if (percentage <= 60) return 'Medium';
    return 'High';
  }

  trackApprovalFlow(index: number, approvalFlow: ApprovalFlowSummary): string {
    return approvalFlow.service_code;
  }
}
