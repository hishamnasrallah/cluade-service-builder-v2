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
  templateUrl:'preview-panel.component.html',
  styleUrl:'preview-panel.component.scss'
})
export class PreviewPanelComponent {
  @Input() previewResult: PreviewResult | null | undefined = null;
  @Input() selectedTarget: MapperTarget | null | undefined = null;
  @Output() runPreviewEvent = new EventEmitter<number>(); // Renamed from runPreview

  previewForm: FormGroup;
  viewMode: 'formatted' | 'json' | 'table' = 'formatted';
  isLoading = false;

  constructor(private fb: FormBuilder) {
    this.previewForm = this.fb.group({
      caseId: [1, [Validators.required, Validators.min(1)]]
    });
  }

  runPreview(): void { // This is now the method
    if (this.previewForm.valid) {
      const caseId = this.previewForm.get('caseId')?.value;
      this.runPreviewEvent.emit(caseId); // Emit using the renamed output
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
