// src/app/components/mapper-builder/model-browser/model-browser.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

import { ModelOption, ModelField } from '../../../models/mapper.models';

interface AppGroup {
  name: string;
  models: ModelOption[];
  expanded: boolean;
}

@Component({
  selector: 'app-model-browser',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: 'model-browser.component.html',
  styleUrl: 'model-browser.component.scss'
})
export class ModelBrowserComponent implements OnInit {
  @Input() models: ModelOption[] = [];
  @Output() modelSelected = new EventEmitter<ModelOption>();

  searchTerm = '';
  appGroups: AppGroup[] = [];
  filteredGroups: AppGroup[] = [];
  expandedModel: ModelOption | null = null;

  ngOnInit(): void {
    this.groupModels();
  }

  private groupModels(): void {
    const groupMap = new Map<string, ModelOption[]>();

    this.models.forEach(model => {
      const appLabel = model.app_label;
      if (!groupMap.has(appLabel)) {
        groupMap.set(appLabel, []);
      }
      groupMap.get(appLabel)!.push(model);
    });

    this.appGroups = Array.from(groupMap.entries())
      .map(([name, models]) => ({
        name,
        models: models.sort((a, b) => a.model.localeCompare(b.model)),
        expanded: false
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    this.filteredGroups = [...this.appGroups];
  }

  filterModels(): void {
    if (!this.searchTerm) {
      this.filteredGroups = [...this.appGroups];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredGroups = this.appGroups
      .map(group => ({
        ...group,
        models: group.models.filter(model =>
          model.model.toLowerCase().includes(term) ||
          model.app_label.toLowerCase().includes(term) ||
          model.fields?.some(field => field.name.toLowerCase().includes(term))
        )
      }))
      .filter(group => group.models.length > 0);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterModels();
  }

  hasSearchTerm(): boolean {
    return this.searchTerm.length > 0;
  }

  selectModel(model: ModelOption): void {
    this.modelSelected.emit(model);
  }

  addTarget(model: ModelOption, event: Event): void {
    event.stopPropagation();
    this.modelSelected.emit(model);
  }

  toggleDetails(model: ModelOption, event: Event): void {
    event.stopPropagation();
    this.expandedModel = this.expandedModel === model ? null : model;
  }

  getDisplayFields(model: ModelOption): ModelField[] {
    if (!model.fields) return [];
    return model.fields.slice(0, 5);
  }

  getFieldIcon(fieldType: string): string {
    const iconMap: { [key: string]: string } = {
      'CharField': 'text_fields',
      'TextField': 'notes',
      'IntegerField': 'looks_one',
      'FloatField': 'looks_two',
      'DecimalField': 'attach_money',
      'BooleanField': 'check_box',
      'DateField': 'event',
      'DateTimeField': 'access_time',
      'EmailField': 'email',
      'URLField': 'link',
      'FileField': 'attach_file',
      'ImageField': 'image',
      'ForeignKey': 'link',
      'ManyToManyField': 'device_hub',
      'OneToOneField': 'linear_scale',
      'JSONField': 'code'
    };

    return iconMap[fieldType] || 'help_outline';
  }

  getFieldTypeTooltip(fieldType: string): string {
    const tooltipMap: { [key: string]: string } = {
      'CharField': 'Short text field',
      'TextField': 'Long text field',
      'IntegerField': 'Whole number',
      'FloatField': 'Decimal number',
      'DecimalField': 'Precise decimal number',
      'BooleanField': 'True/False value',
      'DateField': 'Date only',
      'DateTimeField': 'Date and time',
      'EmailField': 'Email address',
      'URLField': 'Web address',
      'FileField': 'File upload',
      'ImageField': 'Image upload',
      'ForeignKey': 'Link to another record',
      'ManyToManyField': 'Links to multiple records',
      'OneToOneField': 'One-to-one relationship',
      'JSONField': 'JSON data'
    };

    return tooltipMap[fieldType] || fieldType;
  }

  getTotalModelCount(): number {
    return this.models.length;
  }

  refreshModels(): void {
    // Emit event to parent to refresh models
    console.log('Refresh models');
  }
}