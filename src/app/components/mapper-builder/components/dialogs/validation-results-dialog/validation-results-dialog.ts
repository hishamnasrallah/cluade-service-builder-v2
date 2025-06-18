// src/app/components/mapper-builder/components/dialogs/validation-results-dialog/validation-results-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';

import { ValidationResult, ValidationError } from '../../../../models/mapper.models';

interface DialogData {
  result: ValidationResult;
  mapperName: string;
}

@Component({
  selector: 'app-validation-results-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule,
    MatChipsModule,
    MatTooltipModule,
    MatTabsModule,
    MatBadgeModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon [class.success]="data.result.valid" [class.error]="!data.result.valid">
        {{ data.result.valid ? 'check_circle' : 'error' }}
      </mat-icon>
      Validation Results: {{ data.mapperName }}
    </h2>

    <mat-dialog-content>
      <!-- Summary -->
      <div class="validation-summary" [class.valid]="data.result.valid" [class.invalid]="!data.result.valid">
        <mat-icon>{{ data.result.valid ? 'check_circle' : 'error' }}</mat-icon>
        <div class="summary-content">
          <h3>{{ data.result.valid ? 'Validation Passed' : 'Validation Failed' }}</h3>
          <p *ngIf="!data.result.valid">
            Found {{ errorCount }} error<ng-container *ngIf="errorCount !== 1">s</ng-container>
            <ng-container *ngIf="warningCount > 0">
              and {{ warningCount }} warning<ng-container *ngIf="warningCount !== 1">s</ng-container>
            </ng-container>
          </p>
          <p *ngIf="data.result.valid && warningCount > 0">
            Found {{ warningCount }} warning<ng-container *ngIf="warningCount !== 1">s</ng-container>
          </p>
        </div>
      </div>

      <!-- Tabs for Errors and Warnings -->
      <mat-tab-group *ngIf="!data.result.valid || warningCount > 0" class="results-tabs">
        <!-- Errors Tab -->
        <mat-tab *ngIf="errorsByCategory.size > 0">
          <ng-template mat-tab-label>
            <mat-icon>error</mat-icon>
            Errors
            <span class="tab-badge error">{{ errorCount }}</span>
          </ng-template>

          <div class="tab-content">
            <mat-accordion>
              <mat-expansion-panel *ngFor="let category of errorCategories" [expanded]="errorCategories.length === 1">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <div class="category-header">
                      <mat-icon>{{ getCategoryIcon(category) }}</mat-icon>
                      {{ category }}
                    </div>
                  </mat-panel-title>
                  <mat-panel-description>
                    {{ errorsByCategory.get(category)?.length }} issue<ng-container *ngIf="errorsByCategory.get(category)?.length !== 1">s</ng-container>
                  </mat-panel-description>
                </mat-expansion-panel-header>

                <mat-list class="error-list">
                  <mat-list-item *ngFor="let error of errorsByCategory.get(category)" class="error-item">
                    <mat-icon matListItemIcon class="error-icon">error_outline</mat-icon>
                    <div matListItemTitle class="error-field">{{ error.field }}</div>
                    <div matListItemLine class="error-message">{{ error.message }}</div>
                    <button mat-icon-button matListItemMeta (click)="navigateToError(error)" matTooltip="Go to error">
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  </mat-list-item>
                </mat-list>
              </mat-expansion-panel>
            </mat-accordion>
          </div>
        </mat-tab>

        <!-- Warnings Tab -->
        <mat-tab *ngIf="warningsByCategory.size > 0">
          <ng-template mat-tab-label>
            <mat-icon>warning</mat-icon>
            Warnings
            <span class="tab-badge warning">{{ warningCount }}</span>
          </ng-template>

          <div class="tab-content">
            <mat-accordion>
              <mat-expansion-panel *ngFor="let category of warningCategories" [expanded]="warningCategories.length === 1">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <div class="category-header">
                      <mat-icon>{{ getCategoryIcon(category) }}</mat-icon>
                      {{ category }}
                    </div>
                  </mat-panel-title>
                  <mat-panel-description>
                    {{ warningsByCategory.get(category)?.length }} warning<ng-container *ngIf="warningsByCategory.get(category)?.length !== 1">s</ng-container>
                  </mat-panel-description>
                </mat-expansion-panel-header>

                <mat-list class="warning-list">
                  <mat-list-item *ngFor="let warning of warningsByCategory.get(category)" class="warning-item">
                    <mat-icon matListItemIcon class="warning-icon">warning</mat-icon>
                    <div matListItemTitle class="warning-field">{{ warning.field }}</div>
                    <div matListItemLine class="warning-message">{{ warning.message }}</div>
                  </mat-list-item>
                </mat-list>
              </mat-expansion-panel>
            </mat-accordion>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Validation Rules Info -->
      <div class="validation-info" *ngIf="data.result.valid && warningCount === 0">
        <h4>All validation checks passed:</h4>
        <mat-list>
          <mat-list-item>
            <mat-icon matListItemIcon class="check-icon">check</mat-icon>
            <span matListItemTitle>Mapper configuration is valid</span>
          </mat-list-item>
          <mat-list-item>
            <mat-icon matListItemIcon class="check-icon">check</mat-icon>
            <span matListItemTitle>All targets have valid models</span>
          </mat-list-item>
          <mat-list-item>
            <mat-icon matListItemIcon class="check-icon">check</mat-icon>
            <span matListItemTitle>Field mappings are correctly configured</span>
          </mat-list-item>
          <mat-list-item>
            <mat-icon matListItemIcon class="check-icon">check</mat-icon>
            <span matListItemTitle>No circular dependencies detected</span>
          </mat-list-item>
          <mat-list-item>
            <mat-icon matListItemIcon class="check-icon">check</mat-icon>
            <span matListItemTitle>All functions and lookups exist</span>
          </mat-list-item>
        </mat-list>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button
              (click)="exportReport()"
              *ngIf="!data.result.valid || warningCount > 0">
        <mat-icon>download</mat-icon>
        Export Report
      </button>
      <button mat-raised-button
              [color]="data.result.valid ? 'primary' : 'warn'"
              (click)="close()">
        {{ data.result.valid ? 'Close' : 'Fix Issues' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;

      mat-icon {
        &.success {
          color: #4caf50;
        }

        &.error {
          color: #f44336;
        }
      }
    }

    mat-dialog-content {
      min-width: 600px;
      max-width: 800px;
      max-height: 70vh;
    }

    .validation-summary {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;

      &.valid {
        background-color: #e8f5e9;
        color: #2e7d32;

        mat-icon {
          color: #4caf50;
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }

      &.invalid {
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
      h3 {
        margin: 0 0 4px 0;
        font-size: 20px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .results-tabs {
      margin-top: 16px;
    }

    .tab-badge {
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;

      &.error {
        background-color: #f44336;
        color: white;
      }

      &.warning {
        background-color: #ff9800;
        color: white;
      }
    }

    .tab-content {
      padding: 16px 0;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .error-list,
    .warning-list {
      padding: 0;
    }

    .error-item,
    .warning-item {
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 16px;

      &:last-child {
        border-bottom: none;
      }
    }

    .error-icon {
      color: #f44336;
    }

    .warning-icon {
      color: #ff9800;
    }

    .error-field,
    .warning-field {
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .error-message,
    .warning-message {
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }

    .validation-info {
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 4px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #424242;
      }

      mat-list {
        padding: 0;
      }

      mat-list-item {
        height: auto;
        padding: 8px 0;
      }

      .check-icon {
        color: #4caf50;
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class ValidationResultsDialogComponent {
  errorCount: number;
  warningCount: number;
  errorsByCategory = new Map<string, ValidationError[]>();
  warningsByCategory = new Map<string, ValidationError[]>();
  errorCategories: string[] = [];
  warningCategories: string[] = [];

  constructor(
    private dialogRef: MatDialogRef<ValidationResultsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.processValidationResult();
    this.errorCount = data.result.errors.filter(e => e.severity !== 'warning').length;
    this.warningCount = (data.result.warnings?.length || 0) +
      data.result.errors.filter(e => e.severity === 'warning').length;
  }

  private processValidationResult(): void {
    // Process errors
    this.data.result.errors.forEach(error => {
      if (error.severity === 'warning') {
        this.addToCategory(this.warningsByCategory, error);
      } else {
        this.addToCategory(this.errorsByCategory, error);
      }
    });

    // Process warnings
    this.data.result.warnings?.forEach(warning => {
      const error: ValidationError = {
        field: warning.field,
        message: warning.message,
        severity: 'warning'
      };
      this.addToCategory(this.warningsByCategory, error);
    });

    this.errorCategories = Array.from(this.errorsByCategory.keys());
    this.warningCategories = Array.from(this.warningsByCategory.keys());
  }

  private addToCategory(categoryMap: Map<string, ValidationError[]>, error: ValidationError): void {
    const category = this.getErrorCategory(error);
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(error);
  }

  private getErrorCategory(error: ValidationError): string {
    const field = error.field.toLowerCase();

    if (field.includes('mapper') || field.includes('name') || field.includes('version')) {
      return 'Mapper Configuration';
    } else if (field.includes('target') || field.includes('model')) {
      return 'Target Configuration';
    } else if (field.includes('field') || field.includes('rule') || field.includes('json_path')) {
      return 'Field Rules';
    } else if (field.includes('function') || field.includes('transform') || field.includes('processor')) {
      return 'Functions';
    } else if (field.includes('condition') || field.includes('expression')) {
      return 'Conditions';
    } else if (field.includes('lookup')) {
      return 'Lookups';
    } else {
      return 'Other';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'Mapper Configuration':
        return 'settings';
      case 'Target Configuration':
        return 'flag';
      case 'Field Rules':
        return 'rule';
      case 'Functions':
        return 'functions';
      case 'Conditions':
        return 'code';
      case 'Lookups':
        return 'search';
      default:
        return 'info';
    }
  }

  navigateToError(error: ValidationError): void {
    // Emit navigation event
    this.dialogRef.close({ action: 'navigate', error });
  }

  exportReport(): void {
    const report = this.generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-report-${this.data.mapperName.replace(/\s+/g, '_')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private generateReport(): string {
    let report = `Validation Report for: ${this.data.mapperName}\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Status: ${this.data.result.valid ? 'PASSED' : 'FAILED'}\n\n`;

    if (this.errorsByCategory.size > 0) {
      report += 'ERRORS:\n';
      report += '=======\n';
      this.errorsByCategory.forEach((errors, category) => {
        report += `\n${category}:\n`;
        errors.forEach(error => {
          report += `  - ${error.field}: ${error.message}\n`;
        });
      });
    }

    if (this.warningsByCategory.size > 0) {
      report += '\n\nWARNINGS:\n';
      report += '=========\n';
      this.warningsByCategory.forEach((warnings, category) => {
        report += `\n${category}:\n`;
        warnings.forEach(warning => {
          report += `  - ${warning.field}: ${warning.message}\n`;
        });
      });
    }

    return report;
  }

  close(): void {
    this.dialogRef.close(this.data.result.valid ? null : { action: 'fix' });
  }
}
