// src/app/components/mapper-builder/components/version-comparison/version-comparison.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { MapperVersion } from '../../../../models/mapper.models';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

@Component({
  selector: 'app-version-comparison',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <div class="version-comparison-dialog">
      <h2 mat-dialog-title>
        <mat-icon>compare_arrows</mat-icon>
        Version Comparison
      </h2>

      <mat-dialog-content>
        <div class="version-headers">
          <div class="version-info">
            <h3>Version {{ data.v1.version }}</h3>
            <p class="meta">
              <mat-icon>person</mat-icon> {{ data.v1.created_by }}
              <mat-icon>calendar_today</mat-icon> {{ data.v1.created_at | date }}
            </p>
            <p class="changes-summary" *ngIf="data.v1.changes_summary">
              {{ data.v1.changes_summary }}
            </p>
          </div>

          <mat-icon class="comparison-arrow">arrow_forward</mat-icon>

          <div class="version-info">
            <h3>Version {{ data.v2.version }}</h3>
            <p class="meta">
              <mat-icon>person</mat-icon> {{ data.v2.created_by }}
              <mat-icon>calendar_today</mat-icon> {{ data.v2.created_at | date }}
            </p>
            <p class="changes-summary" *ngIf="data.v2.changes_summary">
              {{ data.v2.changes_summary }}
            </p>
          </div>
        </div>

        <mat-divider></mat-divider>

        <mat-tab-group animationDuration="0ms">
          <mat-tab label="Side by Side">
            <div class="side-by-side-view">
              <div class="code-panel">
                <h4>Version {{ data.v1.version }}</h4>
                <pre class="code-block">{{ formatJson(data.v1) }}</pre>
              </div>

              <div class="code-panel">
                <h4>Version {{ data.v2.version }}</h4>
                <pre class="code-block">{{ formatJson(data.v2) }}</pre>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Unified Diff">
            <div class="diff-view">
              <div class="diff-stats" *ngIf="diffStats">
                <mat-chip-listbox>
                  <mat-chip-option color="primary">
                    <mat-icon>add</mat-icon> {{ diffStats.added }} added
                  </mat-chip-option>
                  <mat-chip-option color="warn">
                    <mat-icon>remove</mat-icon> {{ diffStats.removed }} removed
                  </mat-chip-option>
                  <mat-chip-option>
                    <mat-icon>sync_alt</mat-icon> {{ diffStats.modified }} modified
                  </mat-chip-option>
                </mat-chip-listbox>
              </div>

              <div class="diff-content">
                <div *ngFor="let line of diffLines"
                     class="diff-line"
                     [ngClass]="{
                       'added': line.type === 'added',
                       'removed': line.type === 'removed',
                       'unchanged': line.type === 'unchanged'
                     }">
                  <span class="line-number" *ngIf="line.lineNumber">{{ line.lineNumber }}</span>
                  <span class="line-marker">
                    {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}
                  </span>
                  <span class="line-content">{{ line.content }}</span>
                </div>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Summary">
            <div class="summary-view">
              <mat-card>
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>info</mat-icon>
                    Change Summary
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="summary-section">
                    <h4>Key Changes</h4>
                    <ul>
                      <li *ngFor="let change of getKeyChanges()">
                        {{ change }}
                      </li>
                    </ul>
                  </div>

                  <div class="summary-section" *ngIf="data.v2.changes_summary">
                    <h4>Version Notes</h4>
                    <p>{{ data.v2.changes_summary }}</p>
                  </div>

                  <div class="summary-section">
                    <h4>Metadata</h4>
                    <table class="metadata-table">
                      <tr>
                        <td>Version Jump:</td>
                        <td>{{ data.v1.version }} → {{ data.v2.version }}</td>
                      </tr>
                      <tr>
                        <td>Time Between:</td>
                        <td>{{ getTimeDifference() }}</td>
                      </tr>
                      <tr>
                        <td>Modified By:</td>
                        <td>{{ data.v2.created_by }}</td>
                      </tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Close</button>
        <button mat-raised-button color="primary" (click)="restoreVersion()" *ngIf="canRestore()">
          <mat-icon>restore</mat-icon>
          Restore Version {{ data.v1.version }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .version-comparison-dialog {
      width: 900px;
      max-width: 95vw;
      height: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    mat-dialog-content {
      flex: 1;
      padding: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .version-headers {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      gap: 24px;
    }

    .version-info {
      flex: 1;

      h3 {
        margin: 0 0 8px 0;
        color: #333;
      }

      .meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #666;
        margin: 4px 0;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      .changes-summary {
        font-size: 13px;
        color: #666;
        margin: 8px 0 0 0;
        font-style: italic;
      }
    }

    .comparison-arrow {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #666;
    }

    mat-tab-group {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    ::ng-deep .mat-mdc-tab-body-wrapper {
      flex: 1;
    }

    ::ng-deep .mat-mdc-tab-body {
      height: 100%;
      overflow: auto;
    }

    .side-by-side-view {
      display: flex;
      height: 100%;
      gap: 16px;
      padding: 16px;
    }

    .code-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;

      h4 {
        margin: 0;
        padding: 12px 16px;
        background: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
        font-size: 14px;
      }

      .code-block {
        flex: 1;
        margin: 0;
        padding: 16px;
        overflow: auto;
        font-family: 'Roboto Mono', monospace;
        font-size: 12px;
        line-height: 1.5;
        background: #fafafa;
      }
    }

    .diff-view {
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 16px;
    }

    .diff-stats {
      margin-bottom: 16px;

      mat-chip-listbox {
        mat-chip-option {
          font-size: 12px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            margin-right: 4px;
          }
        }
      }
    }

    .diff-content {
      flex: 1;
      overflow: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    .diff-line {
      display: flex;
      padding: 0;

      &.added {
        background: #e6ffed;
        color: #24292e;
      }

      &.removed {
        background: #ffeef0;
        color: #24292e;
      }

      &.unchanged {
        background: white;
        color: #666;
      }

      .line-number {
        width: 50px;
        padding: 2px 8px;
        text-align: right;
        color: #999;
        background: #f5f5f5;
        border-right: 1px solid #e0e0e0;
        user-select: none;
      }

      .line-marker {
        width: 20px;
        padding: 2px 4px;
        text-align: center;
        user-select: none;
      }

      .line-content {
        flex: 1;
        padding: 2px 8px;
        white-space: pre;
        overflow-x: auto;
      }
    }

    .summary-view {
      padding: 16px;
      overflow: auto;
    }

    .summary-section {
      margin-bottom: 24px;

      h4 {
        margin: 0 0 12px 0;
        color: #333;
        font-size: 16px;
      }

      ul {
        margin: 0;
        padding-left: 20px;

        li {
          margin: 4px 0;
        }
      }
    }

    .metadata-table {
      width: 100%;
      border-collapse: collapse;

      td {
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;

        &:first-child {
          font-weight: 500;
          width: 150px;
        }
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .version-comparison-dialog {
        width: 100%;
        height: 100%;
        max-width: 100vw;
        max-height: 100vh;
      }

      .version-headers {
        flex-direction: column;
        gap: 16px;
      }

      .comparison-arrow {
        transform: rotate(90deg);
      }

      .side-by-side-view {
        flex-direction: column;
      }
    }
  `]
})
export class VersionComparisonComponent {
  diffLines: DiffLine[] = [];
  diffStats = { added: 0, removed: 0, modified: 0 };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { v1: MapperVersion; v2: MapperVersion },
    public dialogRef: MatDialogRef<VersionComparisonComponent>
  ) {
    this.calculateDiff();
  }

  formatJson(version: MapperVersion): string {
    // Remove metadata fields for cleaner comparison
    const clean = { ...version };
    // @ts-ignore
    delete clean.id;
    // @ts-ignore
    delete clean.created_at;
    // @ts-ignore
    delete clean.created_by;
    return JSON.stringify(clean, null, 2);
  }

  calculateDiff(): void {
    const lines1 = this.formatJson(this.data.v1).split('\n');
    const lines2 = this.formatJson(this.data.v2).split('\n');

    // Simple line-by-line diff (in production, use a proper diff algorithm)
    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      if (i >= lines1.length) {
        // Added lines
        this.diffLines.push({
          type: 'added',
          content: lines2[i],
          lineNumber: i + 1
        });
        this.diffStats.added++;
      } else if (i >= lines2.length) {
        // Removed lines
        this.diffLines.push({
          type: 'removed',
          content: lines1[i],
          lineNumber: i + 1
        });
        this.diffStats.removed++;
      } else if (lines1[i] !== lines2[i]) {
        // Modified lines
        this.diffLines.push({
          type: 'removed',
          content: lines1[i],
          lineNumber: i + 1
        });
        this.diffLines.push({
          type: 'added',
          content: lines2[i],
          lineNumber: i + 1
        });
        this.diffStats.modified++;
      } else {
        // Unchanged lines
        this.diffLines.push({
          type: 'unchanged',
          content: lines1[i],
          lineNumber: i + 1
        });
      }
    }
  }

  getKeyChanges(): string[] {
    const changes: string[] = [];

    if (this.data.v1.name !== this.data.v2.name) {
      changes.push(`Name changed from "${this.data.v1.name}" to "${this.data.v2.name}"`);
    }

    if (this.data.v1.mapper_id !== this.data.v2.mapper_id) {
      changes.push('Mapper association changed');
    }

    if (this.data.v1.is_active !== this.data.v2.is_active) {
      changes.push(`Status changed to ${this.data.v2.is_active ? 'Active' : 'Inactive'}`);
    }

    if (this.data.v2.parent_version && this.data.v2.parent_version !== this.data.v1.version) {
      changes.push(`Branched from version ${this.data.v2.parent_version}`);
    }

    changes.push(`${this.diffStats.added} additions, ${this.diffStats.removed} deletions, ${this.diffStats.modified} modifications`);

    return changes;
  }

  getTimeDifference(): string {
    const date1 = new Date(this.data.v1.created_at);
    const date2 = new Date(this.data.v2.created_at);
    const diffMs = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      return diffHours === 0 ? 'Less than an hour' : `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }

    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }

  canRestore(): boolean {
    // Only allow restoring older versions
    return this.data.v1.version < this.data.v2.version;
  }

  restoreVersion(): void {
    this.dialogRef.close({ restore: this.data.v1 });
  }

  close(): void {
    this.dialogRef.close();
  }
}
