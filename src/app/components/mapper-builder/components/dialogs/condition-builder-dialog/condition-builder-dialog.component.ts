// src/app/components/mapper-builder/components/dialogs/condition-builder-dialog/condition-builder-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Condition[];
}

interface Condition {
  field: string;
  operator: string;
  value: string;
  type?: string;
}

interface DialogData {
  expression?: string;
  fieldSuggestions?: string[];
  availableFields?: Array<{ name: string; type: string; description?: string }>;
}

@Component({
  selector: 'app-condition-builder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule,
    MatDividerModule,
    MatAutocompleteModule,
    DragDropModule
  ],
  templateUrl:'condition-builder-dialog.component.html',
  styleUrl:'condition-builder-dialog.component.scss'
})
export class ConditionBuilderDialogComponent implements OnInit {
  builderMode: 'visual' | 'expression' = 'visual';
  expressionText = '';

  conditionGroups: ConditionGroup[] = [{
    logic: 'AND',
    conditions: [{ field: '', operator: '==', value: '' }]
  }];

  constructor(
    private dialogRef: MatDialogRef<ConditionBuilderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    if (this.data.expression) {
      this.expressionText = this.data.expression;
      // Try to parse expression into visual builder
      this.parseExpression(this.data.expression);
    }
  }

  // Visual Builder Methods
  addGroup(): void {
    this.conditionGroups.push({
      logic: 'OR',
      conditions: [{ field: '', operator: '==', value: '' }]
    });
  }

  removeGroup(index: number): void {
    this.conditionGroups.splice(index, 1);
  }

  addCondition(groupIndex: number): void {
    this.conditionGroups[groupIndex].conditions.push({
      field: '',
      operator: '==',
      value: ''
    });
  }

  removeCondition(groupIndex: number, conditionIndex: number): void {
    this.conditionGroups[groupIndex].conditions.splice(conditionIndex, 1);

    // Remove group if empty
    if (this.conditionGroups[groupIndex].conditions.length === 0) {
      this.removeGroup(groupIndex);
    }
  }

  dropGroup(event: CdkDragDrop<ConditionGroup[]>): void {
    moveItemInArray(this.conditionGroups, event.previousIndex, event.currentIndex);
  }

  dropCondition(event: CdkDragDrop<Condition[]>, groupIndex: number): void {
    moveItemInArray(
      this.conditionGroups[groupIndex].conditions,
      event.previousIndex,
      event.currentIndex
    );
  }

  onFieldSelected(fieldName: string, condition: Condition): void {
    const field = this.data.availableFields?.find(f => f.name === fieldName);
    if (field) {
      condition.type = field.type;
    }
  }

  getFilteredFields(searchTerm: string): any[] {
    if (!this.data.availableFields) return [];
    if (!searchTerm) return this.data.availableFields;

    const term = searchTerm.toLowerCase();
    return this.data.availableFields.filter(field =>
      field.name.toLowerCase().includes(term)
    );
  }

  getInputType(condition: Condition): string {
    switch (condition.type) {
      case 'number':
      case 'integer':
        return 'number';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'text';
    }
  }

  generateExpression(): string {
    if (this.conditionGroups.length === 0) return '';

    const groupExpressions = this.conditionGroups.map(group => {
      const conditions = group.conditions
        .filter(c => c.field && c.operator)
        .map(c => {
          let value = c.value;

          // Format value based on type
          if (c.type === 'string' && !['is_null', 'is_not_null'].includes(c.operator)) {
            value = `'${value}'`;
          } else if (c.operator === 'in' || c.operator === 'not in') {
            // Parse as list
            const items = value.split(',').map(v => v.trim());
            value = `[${items.map(v => `'${v}'`).join(', ')}]`;
          }

          // Build condition
          switch (c.operator) {
            case 'is_null':
              return `${c.field} is None`;
            case 'is_not_null':
              return `${c.field} is not None`;
            case 'startswith':
              return `${c.field}.startswith(${value})`;
            case 'endswith':
              return `${c.field}.endswith(${value})`;
            default:
              return `${c.field} ${c.operator} ${value}`;
          }
        });

      if (conditions.length === 0) return '';
      if (conditions.length === 1) return conditions[0];

      return `(${conditions.join(` ${group.logic.toLowerCase()} `)})`;
    }).filter(expr => expr !== '');

    if (groupExpressions.length === 0) return '';
    if (groupExpressions.length === 1) return groupExpressions[0];

    // Groups are combined with OR
    return groupExpressions.join(' or ');
  }

  // Expression Editor Methods
  insertField(fieldName: string): void {
    if (this.builderMode === 'expression') {
      // Insert at cursor position
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = this.expressionText;
        this.expressionText = text.substring(0, start) + fieldName + text.substring(end);

        // Set cursor position after inserted text
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + fieldName.length;
          textarea.focus();
        });
      }
    }
  }

  parseExpression(expression: string): void {
    // Simple parser - in real implementation, use a proper expression parser
    // This is a basic implementation for demonstration
    this.conditionGroups = [{
      logic: 'AND',
      conditions: [{ field: '', operator: '==', value: '' }]
    }];
  }

  isValid(): boolean {
    if (this.builderMode === 'visual') {
      return this.conditionGroups.some(group =>
        group.conditions.some(c => c.field && c.operator && (c.value || ['is_null', 'is_not_null'].includes(c.operator)))
      );
    } else {
      return this.expressionText.trim().length > 0;
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    const result = this.builderMode === 'visual'
      ? this.generateExpression()
      : this.expressionText;

    this.dialogRef.close(result);
  }
}
