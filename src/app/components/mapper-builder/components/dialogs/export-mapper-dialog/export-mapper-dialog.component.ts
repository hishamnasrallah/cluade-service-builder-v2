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

import { CaseMapper, MapperExportData } from '../../../../models/mapper.models';
import { MapperApiService } from '../../../../services/mapper-api.service';

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
  templateUrl:'export-mapper-dialog.component.html',
  styleUrl:'export-mapper-dialog.component.scss'
})
export class ExportMapperDialogComponent {
  exportForm: FormGroup;
  isExporting = false;
  exportPreview: MapperExportData | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ExportMapperDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mapper: CaseMapper; targets?: any[] },
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
      this.apiService.getExportPreview(this.data.mapper.id).subscribe({
        next: (preview) => {
          this.exportPreview = preview;
        },
        error: (error) => {
          console.error('Failed to load export preview:', error);
          // Create basic preview from available data
          this.exportPreview = {
            version: '1.0',
            exported_at: new Date().toISOString(),
            mapper: this.data.mapper,
            targets: this.data.targets || []
          };
        }
      });
    }
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
    const options = this.exportForm.value;

    this.apiService.exportMapper(this.data.mapper.id, options).subscribe({
      next: (exportData) => {
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
      error: (error) => {
        console.error('Export failed:', error);
        this.isExporting = false;
      }
    });
  }

  processExportData(data: MapperExportData, options: any): MapperExportData {
    // Apply export options
    const processed = { ...data };

    if (!options.includeMetadata) {
      delete processed.metadata;
      delete processed.exported_at;
      delete processed.exported_by;
    }

    if (!options.includeInactive && processed.targets) {
      processed.targets = processed.targets.filter(t => t.active_ind);
    }

    if (options.anonymizeUserData) {
      if (processed.mapper) {
        delete processed.mapper.created_by;
        delete processed.mapper.updated_by;
      }
      if (processed.targets) {
        processed.targets.forEach(target => {
          delete target.created_by;
          delete target.updated_by;
        });
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
