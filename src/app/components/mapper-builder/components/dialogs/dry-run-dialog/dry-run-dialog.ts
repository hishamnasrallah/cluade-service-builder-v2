// src/app/components/mapper-builder/components/dialogs/dry-run-dialog/dry-run-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { PreviewResult } from '../../../../../models/mapper.models';
import { MapperApiService } from '../../../../../services/mapper-api.service';

interface DialogData {
  mapperId: number;
  targetId: string;
  mapperName: string;
  targetName: string;
}

interface TreeNode {
  name: string;
  target: string;
  action: string;
  recordCount: number;
  success: boolean;
  children?: TreeNode[];
  data?: PreviewResult;
}

@Component({
  selector: 'app-dry-run-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTreeModule,
    MatExpansionModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>preview</mat-icon>
      Dry Run Preview: {{ data.mapperName }}
    </h2>

    <mat-dialog-content>
      <!-- Case Selection -->
      <div class="case-selection" *ngIf="!isRunning && !previewResult">
        <h3>Select Test Case</h3>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Test Case</mat-label>
          <mat-select [formControl]="caseControl">
            <mat-option *ngFor="let case of availableCases" [value]="case.id">
              <span class="case-option">
                <strong>#{{ case.id }}</strong> - {{ case.title || 'Untitled' }}
                <small>{{ case.created_at | date:'short' }}</small>
              </span>
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>folder</mat-icon>
          <mat-hint>Select a case to preview the mapping</mat-hint>
        </mat-form-field>

        <div class="info-panel">
          <mat-icon>info</mat-icon>
          <div>
            <strong>What is a Dry Run?</strong>
            <p>A dry run simulates the mapping process without creating or updating any records.
              It shows you exactly what would happen if you ran the mapper for real.</p>
          </div>
        </div>
      </div>

      <!-- Running State -->
      <div class="running-state" *ngIf="isRunning">
        <mat-spinner diameter="60"></mat-spinner>
        <h3>Running Dry Run...</h3>
        <p>Analyzing mapping for case #{{ caseControl.value }}</p>
        <p class="progress-text">{{ progressMessage }}</p>
      </div>

      <!-- Results -->
      <div class="results-container" *ngIf="previewResult && !isRunning">
        <!-- Summary -->
        <div class="summary-panel" [class.success]="!hasErrors" [class.error]="hasErrors">
          <mat-icon>{{ hasErrors ? 'error' : 'check_circle' }}</mat-icon>
          <div class="summary-content">
            <h3>{{ hasErrors ? 'Dry Run Completed with Errors' : 'Dry Run Successful' }}</h3>
            <div class="summary-stats">
              <span>{{ totalRecords }} record<ng-container *ngIf="totalRecords !== 1">s</ng-container> would be affected</span>
              <span>•</span>
              <span>{{ createCount }} to create</span>
              <span>•</span>
              <span>{{ updateCount }} to update</span>
              <span *ngIf="errorCount > 0">•</span>
              <span *ngIf="errorCount > 0" class="error-count">{{ errorCount }} errors</span>
            </div>
          </div>
        </div>

        <!-- Results Tabs -->
        <mat-tab-group class="results-tabs">
          <!-- Tree View Tab -->
          <mat-tab label="Hierarchy View">
            <ng-template mat-tab-label>
              <mat-icon>account_tree</mat-icon>
              Hierarchy
            </ng-template>

            <div class="tree-container">
              <mat-tree [dataSource]="treeDataSource" [treeControl]="treeControl">
                <!-- Node Template -->
                <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
                  <button mat-icon-button disabled></button>
                  <div class="tree-node-content" (click)="selectNode(node)">
                    <mat-icon [class.success]="node.success" [class.error]="!node.success">
                      {{ node.success ? 'check_circle' : 'error' }}
                    </mat-icon>
                    <span class="node-name">{{ node.name }}</span>
                    <mat-chip class="action-chip" [class.create]="node.action === 'CREATE'" [class.update]="node.action === 'UPDATE'">
                      {{ node.action }}
                    </mat-chip>
                    <span class="record-count">{{ node.recordCount }} record<ng-container *ngIf="node.recordCount !== 1">s</ng-container></span>
                  </div>
                </mat-tree-node>

                <!-- Expandable Node Template -->
                <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
                  <button mat-icon-button matTreeNodeToggle [attr.aria-label]="'Toggle ' + node.name">
                    <mat-icon>
                      {{ treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
                    </mat-icon>
                  </button>
                  <div class="tree-node-content" (click)="selectNode(node)">
                    <mat-icon [class.success]="node.success" [class.error]="!node.success">
                      {{ node.success ? 'check_circle' : 'error' }}
                    </mat-icon>
                    <span class="node-name">{{ node.name }}</span>
                    <mat-chip class="action-chip" [class.create]="node.action === 'CREATE'" [class.update]="node.action === 'UPDATE'">
                      {{ node.action }}
                    </mat-chip>
                    <span class="record-count">{{ node.recordCount }} record<ng-container *ngIf="node.recordCount !== 1">s</ng-container></span>
                  </div>
                </mat-tree-node>
              </mat-tree>
            </div>
          </mat-tab>

          <!-- Field Mappings Tab -->
          <mat-tab label="Field Mappings">
            <ng-template mat-tab-label>
              <mat-icon>swap_horiz</mat-icon>
              Mappings
            </ng-template>

            <div class="mappings-container">
              <div class="target-section" *ngFor="let node of flattenedNodes">
                <h4>
                  <mat-icon>flag</mat-icon>
                  {{ node.name }}
                </h4>

                <table mat-table [dataSource]="node.data?.field_mappings || []" class="mappings-table">
                  <!-- Source Path Column -->
                  <ng-container matColumnDef="source_path">
                    <th mat-header-cell *matHeaderCellDef>Source Path</th>
                    <td mat-cell *matCellDef="let mapping">
                      <code>{{ mapping.source_path }}</code>
                    </td>
                  </ng-container>

                  <!-- Source Value Column -->
                  <ng-container matColumnDef="source_value">
                    <th mat-header-cell *matHeaderCellDef>Source Value</th>
                    <td mat-cell *matCellDef="let mapping">
                      <span class="value-display">{{ formatValue(mapping.source_value) }}</span>
                    </td>
                  </ng-container>

                  <!-- Arrow Column -->
                  <ng-container matColumnDef="arrow">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let mapping">
                      <mat-icon class="arrow-icon" [matTooltip]="getTransformTooltip(mapping)">
                        {{ mapping.transform_applied ? 'transform' : 'arrow_forward' }}
                      </mat-icon>
                    </td>
                  </ng-container>

                  <!-- Target Field Column -->
                  <ng-container matColumnDef="target_field">
                    <th mat-header-cell *matHeaderCellDef>Target Field</th>
                    <td mat-cell *matCellDef="let mapping">
                      <strong>{{ mapping.target_field }}</strong>
                    </td>
                  </ng-container>

                  <!-- Mapped Value Column -->
                  <ng-container matColumnDef="mapped_value">
                    <th mat-header-cell *matHeaderCellDef>Mapped Value</th>
                    <td mat-cell *matCellDef="let mapping">
                      <span class="value-display mapped">{{ formatValue(mapping.mapped_value) }}</span>
                    </td>
                  </ng-container>

                  <!-- Condition Column -->
                  <ng-container matColumnDef="condition">
                    <th mat-header-cell *matHeaderCellDef>Condition</th>
                    <td mat-cell *matCellDef="let mapping">
                      <mat-icon *ngIf="mapping.condition_matched === true" class="condition-icon matched" matTooltip="Condition matched">
                        check_circle
                      </mat-icon>
                      <mat-icon *ngIf="mapping.condition_matched === false" class="condition-icon not-matched" matTooltip="Condition not matched">
                        cancel
                      </mat-icon>
                      <span *ngIf="mapping.condition_matched === undefined">-</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="mappingColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: mappingColumns;"></tr>
                </table>

                <div class="no-mappings" *ngIf="!node.data?.field_mappings || node.data?.field_mappings?.length === 0">
                  No field mappings to display
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Raw Data Tab -->
          <mat-tab label="Raw Data">
            <ng-template mat-tab-label>
              <mat-icon>code</mat-icon>
              Raw
            </ng-template>

            <div class="raw-data-container">
              <div class="data-section" *ngFor="let node of flattenedNodes">
                <h4>{{ node.name }}</h4>
                <div class="data-content">
                  <h5>Preview Data:</h5>
                  <pre>{{ formatJson(node.data?.preview_fields || node.data?.preview_list) }}</pre>

<!--                  <div *ngIf="node.data?.summary" class="summary-data">-->
<!--                    <h5>Summary:</h5>-->
<!--                    <pre>{{ formatJson(node.data.summary) }}</pre>-->
<!--                  </div>-->

<!--                  <div *ngIf="node.data?.error" class="error-data">-->
<!--                    <h5>Error:</h5>-->
<!--                    <pre class="error-text">{{ node.data.error }}</pre>-->
<!--                  </div>-->
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Close</button>

      <button mat-button
              (click)="runAnother()"
              *ngIf="previewResult && !isRunning">
        <mat-icon>refresh</mat-icon>
        Run Another
      </button>

      <button mat-raised-button
              color="primary"
              (click)="runDryRun()"
              [disabled]="!caseControl.value || isRunning"
              *ngIf="!previewResult">
        <mat-icon>play_arrow</mat-icon>
        Run Dry Run
      </button>

      <button mat-raised-button
              color="accent"
              (click)="proceedToRun()"
              *ngIf="previewResult && !hasErrors"
              matTooltip="Execute the actual mapping">
        <mat-icon>play_circle</mat-icon>
        Run for Real
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 800px;
      max-width: 1000px;
      height: 600px;
      display: flex;
      flex-direction: column;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
    }

    .full-width {
      width: 100%;
    }

    .case-selection {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .case-option {
      display: flex;
      align-items: center;
      gap: 8px;

      small {
        color: #666;
        margin-left: auto;
      }
    }

    .info-panel {
      display: flex;
      gap: 16px;
      padding: 16px;
      background-color: #e3f2fd;
      border-radius: 4px;

      mat-icon {
        color: #1976d2;
      }

      p {
        margin: 4px 0 0 0;
        font-size: 13px;
        color: #666;
      }
    }

    .running-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      text-align: center;

      h3 {
        margin: 16px 0 8px 0;
      }

      p {
        margin: 4px 0;
        color: #666;
      }

      .progress-text {
        font-size: 13px;
        font-style: italic;
      }
    }

    .results-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: hidden;
    }

    .summary-panel {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 8px;

      &.success {
        background-color: #e8f5e9;
        color: #2e7d32;

        mat-icon {
          color: #4caf50;
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }

      &.error {
        background-color: #ffebee;
        color: #c62828;

        mat-icon {
          color: #f44336;
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }
    }

    .summary-content {
      flex: 1;

      h3 {
        margin: 0 0 8px 0;
      }
    }

    .summary-stats {
      display: flex;
      gap: 8px;
      font-size: 14px;

      .error-count {
        color: #c62828;
        font-weight: 500;
      }
    }

    .results-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .tree-container,
    .mappings-container,
    .raw-data-container {
      padding: 16px;
      overflow-y: auto;
      height: 100%;
    }

    .tree-node-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f5f5f5;
      }

      mat-icon {
        &.success {
          color: #4caf50;
        }

        &.error {
          color: #f44336;
        }
      }

      .node-name {
        font-weight: 500;
      }

      .action-chip {
        font-size: 11px;
        min-height: 20px;
        padding: 0 8px;

        &.create {
          background-color: #4caf50;
          color: white;
        }

        &.update {
          background-color: #2196f3;
          color: white;
        }
      }

      .record-count {
        margin-left: auto;
        font-size: 13px;
        color: #666;
      }
    }

    .target-section {
      margin-bottom: 32px;

      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 16px 0;
        font-size: 16px;
        color: #424242;
      }
    }

    .mappings-table {
      width: 100%;
      background-color: #fafafa;

      .arrow-icon {
        color: #666;
      }

      code {
        font-family: 'Roboto Mono', monospace;
        font-size: 12px;
        background-color: #f5f5f5;
        padding: 2px 4px;
        border-radius: 2px;
      }

      .value-display {
        font-size: 13px;

        &.mapped {
          font-weight: 500;
          color: #1976d2;
        }
      }

      .condition-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;

        &.matched {
          color: #4caf50;
        }

        &.not-matched {
          color: #9e9e9e;
        }
      }
    }

    .no-mappings {
      text-align: center;
      padding: 24px;
      color: #666;
      font-style: italic;
    }

    .data-section {
      margin-bottom: 24px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #424242;
      }

      h5 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #666;
      }
    }

    .data-content {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 4px;

      pre {
        margin: 0;
        font-family: 'Roboto Mono', monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .error-text {
        color: #c62828;
      }
    }

    .summary-data {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .error-data {
      margin-top: 16px;
      padding: 16px;
      background-color: #ffebee;
      border-radius: 4px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class DryRunDialogComponent implements OnInit {
  caseControl = new FormControl<number | null>(null);
  availableCases: any[] = [];
  isRunning = false;
  progressMessage = '';
  previewResult: PreviewResult | null = null;
  hasErrors = false;

  // Tree
  treeControl = new NestedTreeControl<TreeNode>(node => node.children);
  treeDataSource = new MatTreeNestedDataSource<TreeNode>();
  hasChild = (_: number, node: TreeNode) => !!node.children && node.children.length > 0;

  // Flattened nodes for tabs
  flattenedNodes: TreeNode[] = [];

  // Statistics
  totalRecords = 0;
  createCount = 0;
  updateCount = 0;
  errorCount = 0;

  // Table columns
  mappingColumns = ['source_path', 'source_value', 'arrow', 'target_field', 'mapped_value', 'condition'];

  constructor(
    private dialogRef: MatDialogRef<DryRunDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private apiService: MapperApiService
  ) {}

  ngOnInit(): void {
    this.loadAvailableCases();
  }

  private loadAvailableCases(): void {
    // Mock data - in real implementation, load from API
    this.availableCases = [
      { id: 101, title: 'Test Case - Employee Registration', created_at: new Date() },
      { id: 102, title: 'Test Case - Benefits Enrollment', created_at: new Date() },
      { id: 103, title: 'Test Case - Complex Hierarchy', created_at: new Date() }
    ];
  }

  runDryRun(): void {
    if (!this.caseControl.value) return;

    this.isRunning = true;
    this.progressMessage = 'Initializing dry run...';

    // Simulate progress messages
    const messages = [
      'Loading case data...',
      'Analyzing target configuration...',
      'Processing field mappings...',
      'Applying transformations...',
      'Evaluating conditions...',
      'Building preview results...'
    ];

    let messageIndex = 0;
    const progressInterval = setInterval(() => {
      if (messageIndex < messages.length) {
        this.progressMessage = messages[messageIndex++];
      }
    }, 500);

    this.apiService.runDryRun(this.caseControl.value, this.data.targetId).subscribe({
      next: (result) => {
        clearInterval(progressInterval);
        this.previewResult = result;
        this.processResults(result);
        this.isRunning = false;
      },
      error: (error) => {
        clearInterval(progressInterval);
        console.error('Dry run failed:', error);
        this.isRunning = false;
        // Show error dialog
      }
    });
  }

  private processResults(result: PreviewResult): void {
    // Build tree structure
    const rootNode = this.buildTreeNode(result);
    this.treeDataSource.data = [rootNode];
    this.treeControl.expandAll();

    // Flatten for other views
    this.flattenedNodes = [];
    this.flattenTree(rootNode);

    // Calculate statistics
    this.calculateStats(rootNode);
  }

  private buildTreeNode(result: PreviewResult): TreeNode {
    const node: TreeNode = {
      name: result.target,
      target: result.target,
      action: result.action,
      recordCount: this.getRecordCount(result),
      success: !result.error,
      data: result,
      children: []
    };

    if (result.children) {
      node.children = result.children.map(child => this.buildTreeNode(child));
    }

    return node;
  }

  private getRecordCount(result: PreviewResult): number {
    if (result.preview_list) {
      return result.preview_list.length;
    } else if (result.preview_fields) {
      return 1;
    }
    return 0;
  }

  private flattenTree(node: TreeNode): void {
    this.flattenedNodes.push(node);
    if (node.children) {
      node.children.forEach(child => this.flattenTree(child));
    }
  }

  private calculateStats(node: TreeNode): void {
    if (!node.success) {
      this.hasErrors = true;
      this.errorCount++;
    }

    this.totalRecords += node.recordCount;

    if (node.action === 'CREATE') {
      this.createCount += node.recordCount;
    } else if (node.action === 'UPDATE') {
      this.updateCount += node.recordCount;
    }

    if (node.children) {
      node.children.forEach(child => this.calculateStats(child));
    }
  }

  selectNode(node: TreeNode): void {
    // Could expand details or navigate to specific result
    console.log('Selected node:', node);
  }

  formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  formatJson(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  getTransformTooltip(mapping: any): string {
    if (mapping.transform_applied) {
      return `Transform applied: ${mapping.transform_applied}`;
    }
    return 'Direct mapping';
  }

  runAnother(): void {
    this.previewResult = null;
    this.hasErrors = false;
    this.caseControl.reset();
    this.flattenedNodes = [];
    this.totalRecords = 0;
    this.createCount = 0;
    this.updateCount = 0;
    this.errorCount = 0;
  }

  proceedToRun(): void {
    if (confirm(`This will create ${this.createCount} records and update ${this.updateCount} records. Continue?`)) {
      this.dialogRef.close({
        action: 'run',
        caseId: this.caseControl.value,
        targetId: this.data.targetId
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
