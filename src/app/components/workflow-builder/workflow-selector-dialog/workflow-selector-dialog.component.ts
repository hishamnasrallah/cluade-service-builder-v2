// components/workflow-builder/service-flow-selector-dialog/service-flow-selector-dialog.component.ts
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

import { ApiService, ServiceFlowSummary } from '../../../services/api.service';

export interface ServiceFlowSelectionResult {
  action: 'create' | 'load';
  serviceCode?: string;
  serviceName?: string;
}

@Component({
  selector: 'app-service-flow-selector-dialog',
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
    <div class="service-flow-selector-dialog">
      <h2 mat-dialog-title>
        <mat-icon>account_tree</mat-icon>
        Select Service Flow
      </h2>

      <mat-dialog-content class="dialog-content">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading service flows...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="errorMessage" class="error-container">
          <mat-icon color="warn">error</mat-icon>
          <p>{{ errorMessage }}</p>
          <button mat-button (click)="loadServiceFlows()" color="primary">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>

        <!-- Search and Filters -->
        <div *ngIf="!isLoading && !errorMessage" class="filters-section">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search service flows</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput
                   [(ngModel)]="searchTerm"
                   (input)="applyFilter()"
                   placeholder="Search by service code or name">
          </mat-form-field>

          <div class="flow-stats">
            <mat-chip-set>
              <mat-chip>{{ filteredServiceFlows.length }} service flows found</mat-chip>
              <mat-chip *ngIf="searchTerm">Filtered</mat-chip>
            </mat-chip-set>
          </div>
        </div>

        <!-- Service Flows List -->
        <div *ngIf="!isLoading && !errorMessage" class="flows-container">
          <div *ngIf="filteredServiceFlows.length === 0" class="no-flows">
            <mat-icon>account_tree</mat-icon>
            <h3>No Service Flows Found</h3>
            <p *ngIf="searchTerm; else noFlowsMessage">
              No service flows match your search criteria. Try adjusting your search terms.
            </p>
            <ng-template #noFlowsMessage>
              <p>No service flows have been configured yet. Contact your administrator to set up service flows.</p>
            </ng-template>
          </div>

          <div class="flow-grid" *ngIf="filteredServiceFlows.length > 0">
            <mat-card *ngFor="let serviceFlow of filteredServiceFlows; trackBy: trackServiceFlow"
                      class="flow-card"
                      [class.selected]="selectedServiceCode === serviceFlow.service_code"
                      (click)="selectServiceFlow(serviceFlow)">

              <mat-card-header>
                <div class="flow-header">
                  <div class="flow-info">
                    <mat-card-title>
                      <span class="service-code">{{ serviceFlow.service_code }}</span>
                      {{ serviceFlow.service_name }}
                    </mat-card-title>
                    <mat-card-subtitle>
                      Service Code: {{ serviceFlow.service_code }}
                    </mat-card-subtitle>
                  </div>

                  <div class="flow-status">
                    <mat-chip [color]="serviceFlow.is_active ? 'primary' : 'warn'">
                      {{ serviceFlow.is_active ? 'Active' : 'Inactive' }}
                    </mat-chip>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div class="flow-metadata">
                  <div class="metadata-row">
                    <div class="metadata-item">
                      <mat-icon>description</mat-icon>
                      <span>{{ serviceFlow.page_count }} pages</span>
                    </div>

                    <div class="metadata-item">
                      <mat-icon>category</mat-icon>
                      <span>{{ serviceFlow.category_count }} categories</span>
                    </div>
                  </div>

                  <div class="metadata-row">
                    <div class="metadata-item">
                      <mat-icon>input</mat-icon>
                      <span>{{ serviceFlow.field_count }} fields</span>
                    </div>

                    <div class="metadata-item" *ngIf="serviceFlow.last_updated">
                      <mat-icon>schedule</mat-icon>
                      <span>{{ serviceFlow.last_updated | date:'short' }}</span>
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
                      This service flow contains {{ serviceFlow.page_count }} step{{ serviceFlow.page_count !== 1 ? 's' : '' }}
                      with {{ serviceFlow.field_count }} total input{{ serviceFlow.field_count !== 1 ? 's' : '' }}.
                    </span>
                  </div>
                </div>
              </mat-card-content>

              <mat-card-actions>
                <button mat-button
                        color="primary"
                        (click)="loadServiceFlow(serviceFlow, $event)">
                  <mat-icon>open_in_new</mat-icon>
                  Open Flow
                </button>

                <button mat-icon-button
                        (click)="viewFlowDetails(serviceFlow, $event)"
                        matTooltip="View flow details">
                  <mat-icon>info</mat-icon>
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
    .service-flow-selector-dialog {
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
export class ServiceFlowSelectorDialogComponent implements OnInit {
  serviceFlows: ServiceFlowSummary[] = [];
  filteredServiceFlows: ServiceFlowSummary[] = [];
  selectedServiceCode?: string;
  selectedServiceFlow?: ServiceFlowSummary;
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private dialogRef: MatDialogRef<ServiceFlowSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadServiceFlows();
  }

  loadServiceFlows(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getServiceFlowSummaries().subscribe({
      next: (summaries) => {
        this.serviceFlows = summaries || [];
        this.filteredServiceFlows = [...this.serviceFlows];
        this.isLoading = false;
        console.log('Loaded service flow summaries:', this.serviceFlows);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Failed to load service flows: ${error.message}`;
        console.error('Error loading service flows:', error);
      }
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredServiceFlows = [...this.serviceFlows];
      return;
    }

    this.filteredServiceFlows = this.serviceFlows.filter(serviceFlow =>
      serviceFlow.service_code.toLowerCase().includes(term) ||
      (serviceFlow.service_name && serviceFlow.service_name.toLowerCase().includes(term))
    );
  }

  selectServiceFlow(serviceFlow: ServiceFlowSummary): void {
    this.selectedServiceCode = serviceFlow.service_code;
    this.selectedServiceFlow = serviceFlow;
  }

  loadServiceFlow(serviceFlow: ServiceFlowSummary, event: Event): void {
    event.stopPropagation();
    this.dialogRef.close({
      action: 'load',
      serviceCode: serviceFlow.service_code,
      serviceName: serviceFlow.service_name
    } as ServiceFlowSelectionResult);
  }

  viewFlowDetails(serviceFlow: ServiceFlowSummary, event: Event): void {
    event.stopPropagation();

    // Here you could open another dialog with detailed flow information
    console.log('View details for service flow:', serviceFlow);

    // For now, just select the flow
    this.selectServiceFlow(serviceFlow);
  }

  createNewFlow(): void {
    this.dialogRef.close({
      action: 'create'
    } as ServiceFlowSelectionResult);
  }

  onLoadSelected(): void {
    if (this.selectedServiceFlow) {
      this.dialogRef.close({
        action: 'load',
        serviceCode: this.selectedServiceFlow.service_code,
        serviceName: this.selectedServiceFlow.service_name
      } as ServiceFlowSelectionResult);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  trackServiceFlow(index: number, serviceFlow: ServiceFlowSummary): string {
    return serviceFlow.service_code;
  }
}
