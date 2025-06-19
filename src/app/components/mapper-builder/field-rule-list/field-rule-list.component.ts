// src/app/components/mapper-builder/field-rule-list/field-rule-list.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { MapperFieldRule, TransformFunction, LookupOption } from '../../../models/mapper.models';
// Import the actual component, not a dialog wrapper
import { FieldRuleEditorComponent } from '../components/field-rule-editor/field-rule-editor.component';

@Component({
  selector: 'app-field-rule-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl:'field-rule-list.component.html',
  styleUrl:'field-rule-list.component.scss'
})
export class FieldRuleListComponent implements OnInit, OnChanges {
  @Input() fieldRules: MapperFieldRule[] = [];
  @Input() targetModel?: string;
  @Input() availableTransforms: TransformFunction[] = [];
  @Input() availableLookups: LookupOption[] = [];

  @Output() ruleUpdated = new EventEmitter<{ ruleId: number; changes: Partial<MapperFieldRule> }>();
  @Output() ruleDeleted = new EventEmitter<number>();
  @Output() ruleReordered = new EventEmitter<MapperFieldRule[]>();
  @Output() ruleAdded = new EventEmitter<Partial<MapperFieldRule>>();

  searchTerm = '';
  filteredRules: MapperFieldRule[] = [];
  expandedRules = new Set<number>();
  isFiltering = false;

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.filteredRules = [...this.fieldRules];
    console.log('FieldRuleList initialized with:', {
      lookups: this.availableLookups?.length || 0,
      transforms: this.availableTransforms?.length || 0,
      rules: this.fieldRules?.length || 0
    });
    if (this.availableLookups && this.availableLookups.length > 0) {
      console.log('Sample lookup in FieldRuleList:', this.availableLookups[0]);
    }
  }

  ngOnChanges(): void {
    // Update filtered rules when input changes
    this.filterRules();
    console.log('FieldRuleList inputs changed, lookups:', this.availableLookups?.length || 0);
  }

  filterRules(): void {
    if (!this.searchTerm) {
      this.filteredRules = [...this.fieldRules];
      this.isFiltering = false;
      return;
    }

    this.isFiltering = true;
    const term = this.searchTerm.toLowerCase();

    this.filteredRules = this.fieldRules.filter(rule =>
      rule.target_field.toLowerCase().includes(term) ||
      rule.json_path.toLowerCase().includes(term) ||
      rule.transform_function_path?.toLowerCase().includes(term) ||
      rule.default_value?.toLowerCase().includes(term)
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterRules();
  }

  expandAll(): void {
    this.fieldRules.forEach(rule => {
      if (rule.id) {
        this.expandedRules.add(rule.id);
      }
    });
  }

  collapseAll(): void {
    this.expandedRules.clear();
  }

  onExpansionChange(ruleId: number, expanded: boolean): void {
    if (expanded) {
      this.expandedRules.add(ruleId);
    } else {
      this.expandedRules.delete(ruleId);
    }
  }

  drop(event: CdkDragDrop<MapperFieldRule[]>): void {
    if (!this.isFiltering) {
      moveItemInArray(this.fieldRules, event.previousIndex, event.currentIndex);
      this.ruleReordered.emit(this.fieldRules);
    }
  }

  addRule(): void {
    console.log('Opening dialog with lookups:', this.availableLookups);

    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      data: {
        rule: null,
        targetModel: this.targetModel || '',
        availableTransforms: this.availableTransforms || [],
        availableLookups: this.availableLookups || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('New rule to add:', result);
        this.ruleAdded.emit(result);
      }
    });
  }

  editRule(rule: MapperFieldRule): void {
    console.log('Editing rule with lookups:', this.availableLookups);

    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      data: {
        rule: rule,
        targetModel: this.targetModel || '',
        availableTransforms: this.availableTransforms || [],
        availableLookups: this.availableLookups || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && rule.id) {
        this.ruleUpdated.emit({ ruleId: rule.id, changes: result });
      }
    });
  }

  duplicateRule(rule: MapperFieldRule): void {
    const duplicate = {
      ...rule,
      id: undefined,
      target_field: `${rule.target_field}_copy`
    };

    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      data: {
        rule: duplicate,
        targetModel: this.targetModel || '',
        availableTransforms: this.availableTransforms || [],
        availableLookups: this.availableLookups || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Duplicate rule to add:', result);
        this.ruleAdded.emit(result);
      }
    });
  }

  deleteRule(rule: MapperFieldRule): void {
    if (confirm(`Delete field rule for "${rule.target_field}"?`)) {
      if (rule.id) {
        this.ruleDeleted.emit(rule.id);
      }
    }
  }

  testRule(rule: MapperFieldRule): void {
    // Open test dialog
    console.log('Test rule:', rule);
  }

  viewHistory(rule: MapperFieldRule): void {
    // Open history dialog
    console.log('View history for rule:', rule);
  }

  getOriginalIndex(rule: MapperFieldRule): number {
    return this.fieldRules.findIndex(r => r.id === rule.id);
  }

  getTransformLabel(path: string): string {
    const transform = this.availableTransforms.find(t => t.path === path);
    return transform?.label || path.split('.').pop() || path;
  }

  getLookupLabel(lookupId: number): string {
    if (!this.availableLookups || this.availableLookups.length === 0) {
      return `Lookup ${lookupId}`;
    }
    const lookup = this.availableLookups.find(l => l.id === lookupId);
    return lookup?.label || `Lookup ${lookupId}`;
  }
}
