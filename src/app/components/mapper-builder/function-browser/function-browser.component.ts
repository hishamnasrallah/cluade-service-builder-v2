// src/app/components/mapper-builder/function-browser/function-browser.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';

import { TransformFunction, FilterFunction, ProcessorFunction } from '../../../models/mapper.models';

interface TransformFunctionGroup {
  name: string;
  functions: TransformFunction[];
  expanded: boolean;
}

@Component({
  selector: 'app-function-browser',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatExpansionModule,
    MatDividerModule
  ],
  templateUrl: './function-browser.component.html',
  styleUrl: './function-browser.component.scss'
})
export class FunctionBrowserComponent implements OnInit {
  @Input() transforms: TransformFunction[] = [];
  @Input() filters: FilterFunction[] = [];
  @Input() processors: ProcessorFunction[] = [];

  searchTerm = '';
  transformGroups: TransformFunctionGroup[] = [];
  filteredTransformGroups: TransformFunctionGroup[] = [];
  filteredFilters: FilterFunction[] = [];
  filteredProcessors: ProcessorFunction[] = [];

  ngOnInit(): void {
    this.groupTransforms();
    this.filterFunctions();
  }

  private groupTransforms(): void {
    // Group transforms by module
    const groupMap = new Map<string, TransformFunction[]>();

    this.transforms.forEach(transform => {
      const module = transform.path.split('.').slice(0, -1).join('.');
      if (!groupMap.has(module)) {
        groupMap.set(module, []);
      }
      groupMap.get(module)!.push(transform);
    });

    this.transformGroups = Array.from(groupMap.entries())
      .map(([name, functions]) => ({
        name: name || 'General',
        functions: functions.sort((a, b) => a.label.localeCompare(b.label)),
        expanded: false
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  filterFunctions(): void {
    if (!this.searchTerm) {
      this.filteredTransformGroups = [...this.transformGroups];
      this.filteredFilters = [...this.filters];
      this.filteredProcessors = [...this.processors];
      return;
    }

    const term = this.searchTerm.toLowerCase();

    // Filter transforms
    this.filteredTransformGroups = this.transformGroups
      .map(group => ({
        ...group,
        functions: group.functions.filter(func =>
          func.label.toLowerCase().includes(term) ||
          func.path.toLowerCase().includes(term) ||
          func.description?.toLowerCase().includes(term)
        )
      }))
      .filter(group => group.functions.length > 0);

    // Filter filters
    this.filteredFilters = this.filters.filter(func =>
      func.label.toLowerCase().includes(term) ||
      func.path.toLowerCase().includes(term) ||
      func.description?.toLowerCase().includes(term)
    );

    // Filter processors
    this.filteredProcessors = this.processors.filter(func =>
      func.label.toLowerCase().includes(term) ||
      func.path.toLowerCase().includes(term) ||
      func.description?.toLowerCase().includes(term)
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterFunctions();
  }

  hasSearchTerm(): boolean {
    return this.searchTerm.length > 0;
  }

  getProcessorsByType(type: 'finder' | 'processor' | 'post_processor'): ProcessorFunction[] {
    return this.filteredProcessors.filter(p => p.type === type);
  }

  copyFunctionPath(func: TransformFunction | FilterFunction | ProcessorFunction): void {
    navigator.clipboard.writeText(func.path).then(() => {
      console.log('Copied to clipboard:', func.path);
      // Show success message
    });
  }

  viewFunctionDetails(func: TransformFunction | FilterFunction | ProcessorFunction): void {
    // Show detailed view of the function
    console.log('View details:', func);
  }
}
