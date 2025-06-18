// src/app/components/mapper-builder/dialogs/export-mapper-dialog/export-mapper-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';

import { CaseMapper, MapperExportData, MapperTarget } from '../../../../../models/mapper.models';
import { MapperApiService } from '../../../../../services/mapper-api.service';

export interface ExportOptions {
  exportFormat: string;
  includeMetadata: boolean;
  includeInactive: boolean;
  includeExecutionLogs: boolean;
  includeTestCases: boolean;
  includeComments: boolean;
  anonymizeUserData: boolean;
  excludeSensitivePaths: boolean;
  fileName: string;
}

@Component({
  selector: 'app-export-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatRadioModule,
    MatChipsModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatListModule
  ],
  templateUrl: 'export-mapper-dialog.component.html',
  styleUrl: 'export-mapper-dialog.component.scss'
})
export class ExportMapperDialogComponent {
  exportForm: FormGroup;
  isExporting = false;
  exportPreview: MapperExportData | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ExportMapperDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mapper: CaseMapper; targets?: MapperTarget[] },
    private apiService: MapperApiService
  ) {
    const defaultFileName = `mapper-${data.mapper.name.toLowerCase().replace(/\s+/g, '-')}-v${data.mapper.version}`;

    this.exportForm = this.fb.group({
      exportFormat: ['json'],
      includeMetadata: [true],
      includeInactive: [false],
      includeExecutionLogs: [false],
      includeTestCases: [false],
      includeComments: [true],
      anonymizeUserData: [false],
      excludeSensitivePaths: [false],
      fileName: [defaultFileName]
    });

    // Load export preview
    this.loadExportPreview();
  }

  loadExportPreview(): void {
    if (this.data.mapper.id) {
      // Since getExportPreview doesn't exist, we'll use exportMapper to get the data
      // In a real implementation, you might want to add a preview endpoint
      this.apiService.exportMapper(this.data.mapper.id).subscribe({
        next: (preview: MapperExportData) => {
          this.exportPreview = preview;
        },
        error: (error: any) => {
          console.error('Failed to load export preview:', error);
          // Create basic preview from available data
          this.exportPreview = {
            version: '1.0',
            exported_at: new Date().toISOString(),
            mapper: this.data.mapper,
            targets: this.data.targets || [],
            metadata: {
              total_rules: this.calculateTotalRules(),
              total_targets: this.data.targets?.length || 0
            }
          };
        }
      });
    }
  }

  calculateTotalRules(): number {
    if (!this.data.targets) return 0;
    return this.data.targets.reduce((total, target) => {
      return total + (target.field_rules?.length || 0);
    }, 0);
  }

  getTargetCount(): number {
    const includeInactive = this.exportForm.get('includeInactive')?.value;
    if (includeInactive) {
      return this.exportPreview?.targets?.length || 0;
    } else {
      return this.exportPreview?.targets?.filter(t => t.active_ind).length || 0;
    }
  }

  export(): void {
    if (!this.data.mapper.id) return;

    this.isExporting = true;
    const options: ExportOptions = this.exportForm.value;

    this.apiService.exportMapper(this.data.mapper.id).subscribe({
      next: (exportData: MapperExportData) => {
        // Process export data based on options
        const processedData = this.processExportData(exportData, options);

        // Create and download file
        const blob = new Blob([JSON.stringify(processedData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${options.fileName || this.getDefaultFileName()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.isExporting = false;
        this.dialogRef.close({ exported: true });
      },
      error: (error: any) => {
        console.error('Export failed:', error);
        this.isExporting = false;
      }
    });
  }

  processExportData(data: MapperExportData, options: ExportOptions): MapperExportData {
    // Apply export options
    const processed: MapperExportData = { ...data };

    if (!options.includeMetadata) {
      // Create a new object without metadata fields
      const { metadata, exported_at, exported_by, ...dataWithoutMeta } = processed;
      return dataWithoutMeta as MapperExportData;
    }

    if (!options.includeInactive && processed.targets) {
      processed.targets = processed.targets.filter(t => t.active_ind);
    }

    if (options.anonymizeUserData) {
      if (processed.mapper) {
        // Create new mapper object without user fields
        const { created_by, updated_by, ...mapperWithoutUsers } = processed.mapper;
        processed.mapper = mapperWithoutUsers as CaseMapper;
      }

      // Remove exported_by if it exists
      if (processed.exported_by) {
        const { exported_by, ...processedWithoutExportedBy } = processed;
        Object.assign(processed, processedWithoutExportedBy);
      }
    }

    if (options.excludeSensitivePaths && processed.targets) {
      const sensitiveKeywords = ['password', 'secret', 'token', 'key', 'credential'];
      processed.targets.forEach(target => {
        if (target.field_rules) {
          target.field_rules = target.field_rules.filter(rule => {
            const pathLower = rule.json_path.toLowerCase();
            return !sensitiveKeywords.some(keyword => pathLower.includes(keyword));
          });
        }
      });
    }

    return processed;
  }

  getDefaultFileName(): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `mapper-export-${timestamp}`;
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
