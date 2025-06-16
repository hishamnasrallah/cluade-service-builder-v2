// src/app/components/mapper-builder/components/preview-panel/preview-panel.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { PreviewResult, MapperTarget } from '../../../../models/mapper.models';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatButtonToggleModule
  ],
  template: `
    <div class="preview-panel">
      <div class="preview-controls">
        <form [formGroup]="previewForm" class="case-selector">
          <mat-form-field appearance="outline" class="case-id-field">
            <mat-label>Case ID</mat-label>
            <input
              matInput
              type="number"
              formControlName="caseId"
              placeholder="Enter case ID">
            <mat-icon matSuffix>fingerprint</mat-icon>
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            (click)="runPreview()"
            [disabled]="!previewForm.valid || !selectedTarget">
            <mat-icon>play_arrow</mat-icon>
            Run Preview
          </button>
        </form>

        <mat-button-toggle-group
          [(value)]="viewMode"
          class="view-toggle">
          <mat-button-toggle value="formatted">
            <mat-icon>view_agenda</mat-icon>
            Formatted
          </mat-button-toggle>
          <mat-button-toggle value="json">
            <mat-icon>code</mat-icon>
            JSON
          </mat-button-toggle>
          <mat-button-toggle value="table">
            <mat-icon>table_chart</mat-icon>
            Table
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <mat-divider></mat-divider>

      <!-- Preview Results -->
      <div class="preview-content" *ngIf="previewResult">
        <!-- Summary Card -->
        <mat-card class="summary-card" *ngIf="previewResult.summary">
          <mat-card-header>
            <mat-card-title>Execution Summary</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="summary-stats">
              <div class="stat">
                <mat-icon>timer</mat-icon>
                <div>
                  <strong>{{ previewResult.summary.execution_time_ms }}ms</strong>
                  <span>Execution Time</span>
                </div>
              </div>
              <div class="stat">
                <mat-icon>description</mat-icon>
                <div>
                  <strong>{{ previewResult.summary.record_count }}</strong>
                  <span>Records</span>
                </div>
              </div>
              <div class="stat">
                <mat-icon>rule</mat-icon>
                <div>
                  <strong>{{ previewResult.summary.mapped_fields_count }}</strong>
                  <span>Fields Mapped</span>
                </div>
              </div>
              <div class="stat">
                <mat-icon>account_tree</mat-icon>
                <div>
                  <strong>{{ previewResult.summary.child_targets_count }}</strong>
                  <span>Child Targets</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Error Display -->
        <mat-card class="error-card" *ngIf="previewResult.error">
          <mat-card-header>
            <mat-card-title class="error-title">
              <mat-icon>error</mat-icon>
              Preview Error
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <pre class="error-message">{{ previewResult.error }}</pre>
          </mat-card-content>
        </mat-card>

        <!-- Formatted View -->
        <div *ngIf="viewMode === 'formatted' && !previewResult.error" class="formatted-view">
          <mat-expansion-panel [expanded]="true" class="result-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>{{ previewResult.preview_list ? 'list' : 'description' }}</mat-icon>
                {{ previewResult.target }}
              </mat-panel-title>
              <mat-panel-description>
                {{ previewResult.action }}
              </mat-panel-description>
            </mat-expansion-panel-header>

            <!-- Single Record Preview -->
            <div *ngIf="previewResult.preview_fields" class="fields-preview">
              <div *ngFor="let field of getFieldEntries(previewResult.preview_fields)" class="field-row">
                <span class="field-name">{{ field.key }}:</span>
                <span class="field-value">{{ formatValue(field.value) }}</span>
              </div>
            </div>

            <!-- List Records Preview -->
            <div *ngIf="previewResult.preview_list" class="list-preview">
              <mat-expansion-panel
                *ngFor="let item of previewResult.preview_list; let i = index"
                class="list-item-panel">
                <mat-expansion-panel-header>
                  <mat-panel-title>Record {{ i + 1 }}</mat-panel-title>
                </mat-expansion-panel-header>

                <div class="fields-preview">
                  <div *ngFor="let field of getFieldEntries(item)" class="field-row">
                    <span class="field-name">{{ field.key }}:</span>
                    <span class="field-value">{{ formatValue(field.value) }}</span>
                  </div>
                </div>
              </mat-expansion-panel>
            </div>

            <!-- Child Targets -->
            <div *ngIf="previewResult.children && previewResult.children.length > 0" class="children-preview">
              <h4>Child Targets</h4>
              <app-preview-result-tree
                [results]="previewResult.children"
                [depth]="1">
              </app-preview-result-tree>
            </div>
          </mat-expansion-panel>
        </div>

        <!-- JSON View -->
        <div *ngIf="viewMode === 'json' && !previewResult.error" class="json-view">
          <pre>{{ previewResult | json }}</pre>
        </div>

        <!-- Table View -->
        <div *ngIf="viewMode === 'table' && !previewResult.error" class="table-view">
          <div *ngIf="previewResult.preview_fields" class="single-record-table">
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let field of getFieldEntries(previewResult.preview_fields)">
                  <td class="field-name">{{ field.key }}</td>
                  <td class="field-value">{{ formatValue(field.value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="previewResult.preview_list" class="list-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th *ngFor="let key of getListHeaders(previewResult.preview_list)">
                    {{ key }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of previewResult.preview_list; let i = index">
                  <td>{{ i + 1 }}</td>
                  <td *ngFor="let key of getListHeaders(previewResult.preview_list)">
                    {{ formatValue(item[key]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!previewResult">
        <mat-icon>preview</mat-icon>
        <h3>No Preview Available</h3>
        <p>Enter a case ID and run preview to see mapping results</p>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Running preview...</p>
      </div>
    </div>
  `,
  styles: [`
    .preview-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #fafafa;
    }

    .preview-controls {
      padding: 16px;
      background-color: white;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .case-selector {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .case-id-field {
      flex: 1;
    }

    .view-toggle {
      align-self: center;
    }

    .preview-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .summary-card {
      margin-bottom: 16px;
      background-color: #e3f2fd;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat mat-icon {
      color: #1976d2;
    }

    .stat div {
      display: flex;
      flex-direction: column;
    }

    .stat strong {
      font-size: 18px;
      color: #333;
    }

    .stat span {
      font-size: 12px;
      color: #666;
    }

    .error-card {
      background-color: #ffebee;
      margin-bottom: 16px;
    }

    .error-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #d32f2f;
    }

    .error-message {
      background-color: #ffcdd2;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 0;
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
    }

    .formatted-view {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .result-panel {
      background-color: white;
    }

    .fields-preview {
      padding: 16px;
    }

    .field-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .field-row:last-child {
      border-bottom: none;
    }

    .field-name {
      font-weight: 500;
      color: #666;
      min-width: 150px;
      margin-right: 16px;
    }

    .field-value {
      flex: 1;
      color: #333;
      font-family: 'Roboto Mono', monospace;
      word-break: break-word;
    }

    .list-preview {
      padding: 16px;
    }

    .list-item-panel {
      margin-bottom: 8px;
    }

    .children-preview {
      padding: 16px;
      background-color: #f5f5f5;
      border-top: 1px solid #e0e0e0;
    }

    .children-preview h4 {
      margin: 0 0 12px 0;
      color: #666;
    }

    .json-view {
      background-color: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .json-view pre {
      margin: 0;
      overflow-x: auto;
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
    }

    .table-view {
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    th {
      background-color: #f5f5f5;
      font-weight: 500;
      color: #666;
    }

    td {
      color: #333;
    }

    tbody tr:hover {
      background-color: #f8f8f8;
    }

    .empty-state,
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
    }

    .empty-state mat-icon,
    .loading-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      color: #666;
    }

    .empty-state p,
    .loading-state p {
      margin: 0;
      color: #999;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .summary-stats {
        grid-template-columns: 1fr;
      }

      .case-selector {
        flex-direction: column;
      }

      .case-id-field {
        width: 100%;
      }
    }
  `]
})
export class PreviewPanelComponent {
  @Input() previewResult: PreviewResult | null | undefined = null;
  @Input() selectedTarget: MapperTarget | null | undefined = null;
  @Output() runPreview = new EventEmitter<number>();

  previewForm: FormGroup;
  viewMode: 'formatted' | 'json' | 'table' = 'formatted';
  isLoading = false;

  constructor(private fb: FormBuilder) {
    this.previewForm = this.fb.group({
      caseId: [1, [Validators.required, Validators.min(1)]]
    });
  }

  runPreview(): void {
    if (this.previewForm.valid) {
      const caseId = this.previewForm.get('caseId')?.value;
      this.runPreview.emit(caseId);
    }
  }

  getFieldEntries(obj: any): { key: string; value: any }[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  getListHeaders(list: any[]): string[] {
    if (!list || list.length === 0) return [];
    const headers = new Set<string>();
    list.forEach(item => {
      Object.keys(item).forEach(key => headers.add(key));
    });
    return Array.from(headers);
  }
}
