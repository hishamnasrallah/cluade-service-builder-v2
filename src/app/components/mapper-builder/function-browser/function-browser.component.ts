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

interface FunctionGroup {
  name: string;
  functions: (TransformFunction | FilterFunction | ProcessorFunction)[];
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
  templateUrl:'function-browser.component.html',
  styles: [`
    .function-browser {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: white;
    }

    .browser-header {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .search-field {
      width: 100%;
    }

    .function-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .function-groups {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .function-count {
      margin-left: auto;
      min-height: 20px;
      font-size: 11px;
      padding: 0 8px;
    }

    .function-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 0;
    }

    .function-card {
      cursor: default;
      transition: all 0.2s ease;
    }

    .function-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .function-icon {
      margin-right: 8px;
      color: #9c27b0;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      font-size: 16px;
    }

    mat-card-subtitle code {
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      color: #666;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .function-description {
      margin: 12px 0;
      color: #666;
      line-height: 1.5;
    }

    .parameters {
      margin: 16px 0;
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
    }

    .parameters h4 {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #333;
    }

    .parameter-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 13px;
    }

    .param-name {
      font-weight: 500;
      font-family: 'Roboto Mono', monospace;
    }

    .param-type {
      color: #666;
      font-size: 12px;
    }

    .param-default {
      color: #999;
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
    }

    .required-icon {
      font-size: 12px;
      color: #ff9800;
    }

    .example {
      margin: 16px 0;
      background: #263238;
      color: #aed581;
      padding: 12px;
      border-radius: 4px;
    }

    .example h4 {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #fff;
    }

    .example-code {
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    mat-card-actions {
      padding: 8px;
      margin: 0;
      border-top: 1px solid #e0e0e0;
    }

    .processor-sections {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .processor-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      color: #333;
    }

    .section-description {
      margin: 0 0 16px 0;
      color: #666;
      font-size: 14px;
    }

    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #666;
    }

    .no-results mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .browser-footer {
      padding: 12px 16px;
      border-top: 1px solid #e0e0e0;
      background: #f5f5f5;
    }

    .footer-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #666;
    }

    /* Expansion panel customization */
    ::ng-deep .mat-expansion-panel-header {
      height: 48px;
    }

    ::ng-deep .mat-expansion-panel-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    ::ng-deep .mat-expansion-panel-body {
      padding: 0 16px 16px;
    }

    @media (max-width: 768px) {
      .browser-header {
        padding: 12px;
      }

      .tab-content {
        padding: 12px;
      }

      .example {
        font-size: 11px;
      }
    }
  `]
})
export class FunctionBrowserComponent implements OnInit {
  @Input() transforms: TransformFunction[] = [];
  @Input() filters: FilterFunction[] = [];
  @Input() processors: ProcessorFunction[] = [];

  searchTerm = '';
  transformGroups: FunctionGroup[] = [];
  filteredTransformGroups: FunctionGroup[] = [];
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
