// src/app/components/mapper-builder/properties-editor/properties-editor.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MapperTarget } from '../../../models/mapper.models';

interface PropertyGroup {
  name: string;
  icon: string;
  properties: Property[];
  expanded: boolean;
}

interface Property {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'readonly';
  value: any;
  options?: { value: any; label: string }[];
  hint?: string;
  readonly?: boolean;
}

@Component({
  selector: 'app-properties-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl:'properties-editor.component.html',
  styleUrl:'properties-editor.component.scss'
})
export class PropertiesEditorComponent implements OnChanges {
  @Input() target!: MapperTarget;
  @Output() propertyChanged = new EventEmitter<{ property: string; value: any }>();

  propertyGroups: PropertyGroup[] = [];
  showAdvanced = false;
  hasChanges = false;
  private originalValues = new Map<string, any>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['target']) {
      this.buildPropertyGroups();
    }
  }

  private buildPropertyGroups(): void {
    if (!this.target) {
      this.propertyGroups = [];
      return;
    }

    this.propertyGroups = [
      {
        name: 'Basic Properties',
        icon: 'info',
        expanded: true,
        properties: [
          {
            key: 'id',
            label: 'Target ID',
            type: 'readonly',
            value: this.target.id || 'Not assigned',
            hint: 'Unique identifier for this target'
          },
          {
            key: 'name',
            label: 'Name',
            type: 'text',
            value: this.target.name,
            hint: 'Display name for this target'
          },
          {
            key: 'active_ind',
            label: 'Active',
            type: 'boolean',
            value: this.target.active_ind,
            hint: 'Whether this target is active'
          }
        ]
      },
      {
        name: 'Model Configuration',
        icon: 'table_chart',
        expanded: true,
        properties: [
          {
            key: 'model',
            label: 'Django Model',
            type: 'text',
            value: this.target.model,
            readonly: true,
            hint: 'Target Django model (app_label.ModelName)'
          },
          {
            key: 'content_type',
            label: 'Content Type',
            type: 'readonly',
            value: this.target.content_type || 'Auto',
            hint: 'Django content type ID'
          }
        ]
      }
    ];

    // Add array processing properties if applicable
    if (this.target.parent_target || this.target.root_path) {
      this.propertyGroups.push({
        name: 'Array Processing',
        icon: 'all_inclusive',
        expanded: false,
        properties: [
          {
            key: 'parent_target',
            label: 'Parent Target',
            type: 'readonly',
            value: this.target.parent_target || 'None',
            hint: 'Parent target ID'
          },
          {
            key: 'root_path',
            label: 'Root Path',
            type: 'text',
            value: this.target.root_path || '',
            hint: 'JSONPath to array data'
          }
        ]
      });
    }

    // Add function properties if any are defined
    const functionProps = [];
    if (this.target.finder_function_path) {
      functionProps.push({
        key: 'finder_function_path',
        label: 'Finder Function',
        type: 'text' as const,
        value: this.target.finder_function_path,
        hint: 'Python path to finder function'
      });
    }
    if (this.target.processor_function_path) {
      functionProps.push({
        key: 'processor_function_path',
        label: 'Processor Function',
        type: 'text' as const,
        value: this.target.processor_function_path,
        hint: 'Python path to processor function'
      });
    }
    if (this.target.post_processor_path) {
      functionProps.push({
        key: 'post_processor_path',
        label: 'Post-Processor',
        type: 'text' as const,
        value: this.target.post_processor_path,
        hint: 'Python path to post-processor function'
      });
    }
    if (this.target.filter_function_path) {
      functionProps.push({
        key: 'filter_function_path',
        label: 'Filter Function',
        type: 'text' as const,
        value: this.target.filter_function_path,
        hint: 'Python path to filter function'
      });
    }

    if (functionProps.length > 0) {
      this.propertyGroups.push({
        name: 'Processing Functions',
        icon: 'functions',
        expanded: false,
        properties: functionProps
      });
    }

    // Store original values
    this.originalValues.clear();
    this.propertyGroups.forEach(group => {
      group.properties.forEach(prop => {
        this.originalValues.set(prop.key, prop.value);
      });
    });
  }

  onPropertyChange(property: Property): void {
    this.checkForChanges();
    this.propertyChanged.emit({
      property: property.key,
      value: property.value
    });
  }

  onBooleanChange(property: Property, event: any): void {
    property.value = event.value;
    this.onPropertyChange(property);
  }

  copyValue(value: any): void {
    navigator.clipboard.writeText(String(value)).then(() => {
      console.log('Copied to clipboard:', value);
    });
  }

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
  }

  refreshProperties(): void {
    this.buildPropertyGroups();
    this.hasChanges = false;
  }

  resetProperties(): void {
    this.propertyGroups.forEach(group => {
      group.properties.forEach(prop => {
        const originalValue = this.originalValues.get(prop.key);
        if (originalValue !== undefined) {
          prop.value = originalValue;
        }
      });
    });
    this.hasChanges = false;
  }

  applyChanges(): void {
    // Emit all changed properties
    this.propertyGroups.forEach(group => {
      group.properties.forEach(prop => {
        const originalValue = this.originalValues.get(prop.key);
        if (prop.value !== originalValue) {
          this.propertyChanged.emit({
            property: prop.key,
            value: prop.value
          });
        }
      });
    });

    // Update original values
    this.propertyGroups.forEach(group => {
      group.properties.forEach(prop => {
        this.originalValues.set(prop.key, prop.value);
      });
    });

    this.hasChanges = false;
  }

  private checkForChanges(): void {
    this.hasChanges = false;
    this.propertyGroups.forEach(group => {
      group.properties.forEach(prop => {
        const originalValue = this.originalValues.get(prop.key);
        if (prop.value !== originalValue) {
          this.hasChanges = true;
        }
      });
    });
  }
}
