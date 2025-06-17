// src/app/components/mapper-builder/components/visual-field-mapper/visual-field-mapper.component.ts

import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import {
  MapperFieldRule,
  ModelField,
  JSONPathSuggestion,
  TransformFunction
} from '../../../models/mapper.models';
import { FieldRuleEditorComponent } from '../components/field-rule-editor/field-rule-editor.component';
import {MatFormField} from '@angular/material/form-field';

interface FieldConnection {
  id: string;
  sourceField: string;
  targetField: string;
  transform?: string;
  condition?: string;
  rule?: MapperFieldRule;
}

interface VisualField {
  name: string;
  type: string;
  path?: string;
  required?: boolean;
  sample?: any;
  connected?: boolean;
}

@Component({
  selector: 'app-visual-field-mapper',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatFormField
  ],
  templateUrl: './visual-field-mapper.component.html',
  styleUrl: './visual-field-mapper.component.scss'
})
export class VisualFieldMapperComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  @Input() targetModel: string = '';
  @Input() modelFields: ModelField[] = [];
  @Input() jsonPathSuggestions: JSONPathSuggestion[] = [];
  @Input() fieldRules: MapperFieldRule[] = [];
  @Input() availableTransforms: TransformFunction[] = [];

  @Output() ruleCreated = new EventEmitter<MapperFieldRule>();
  @Output() ruleUpdated = new EventEmitter<{ ruleId: number; updates: Partial<MapperFieldRule> }>();
  @Output() ruleDeleted = new EventEmitter<number>();

  sourceFields: VisualField[] = [];
  targetFields: VisualField[] = [];
  connections: FieldConnection[] = [];

  searchSourceControl = new FormControl('');
  searchTargetControl = new FormControl('');

  filteredSourceFields: VisualField[] = [];
  filteredTargetFields: VisualField[] = [];

  hoveredConnection: FieldConnection | null = null;
  selectedConnection: FieldConnection | null = null;

  draggedSourceField: VisualField | null = null;
  draggedTargetField: VisualField | null = null;

  isLoading = false;

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.initializeFields();
    this.setupSearch();
    this.drawConnections();
  }

  ngAfterViewInit(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private initializeFields(): void {
    // Initialize source fields from JSONPath suggestions
    this.sourceFields = this.jsonPathSuggestions.map(suggestion => ({
      name: suggestion.path.split('.').pop() || suggestion.path,
      type: suggestion.type,
      path: suggestion.path,
      sample: suggestion.sample_value,
      connected: this.isSourceConnected(suggestion.path)
    }));

    // Initialize target fields from model fields
    this.targetFields = this.modelFields.map(field => ({
      name: field.name,
      type: field.type,
      required: field.required,
      connected: this.isTargetConnected(field.name)
    }));

    // Build connections from existing rules
    this.connections = this.fieldRules.map(rule => ({
      id: `conn-${rule.id}`,
      sourceField: rule.json_path,
      targetField: rule.target_field,
      transform: rule.transform_function_path,
      condition: rule.condition_expression,
      rule: rule
    }));

    this.filteredSourceFields = [...this.sourceFields];
    this.filteredTargetFields = [...this.targetFields];
  }

  private setupSearch(): void {
    this.searchSourceControl.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(search => {
      this.filterSourceFields(search || '');
    });

    this.searchTargetControl.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(search => {
      this.filterTargetFields(search || '');
    });
  }

  private filterSourceFields(search: string): void {
    if (!search) {
      this.filteredSourceFields = [...this.sourceFields];
    } else {
      const searchLower = search.toLowerCase();
      this.filteredSourceFields = this.sourceFields.filter(field =>
        field.name.toLowerCase().includes(searchLower) ||
        field.path?.toLowerCase().includes(searchLower)
      );
    }
  }

  private filterTargetFields(search: string): void {
    if (!search) {
      this.filteredTargetFields = [...this.targetFields];
    } else {
      const searchLower = search.toLowerCase();
      this.filteredTargetFields = this.targetFields.filter(field =>
        field.name.toLowerCase().includes(searchLower)
      );
    }
  }

  private isSourceConnected(path: string): boolean {
    return this.connections.some(conn => conn.sourceField === path);
  }

  private isTargetConnected(fieldName: string): boolean {
    return this.connections.some(conn => conn.targetField === fieldName);
  }

  onSourceFieldDragStart(field: VisualField): void {
    this.draggedSourceField = field;
  }

  onTargetFieldDragStart(field: VisualField): void {
    this.draggedTargetField = field;
  }

  onDragEnd(): void {
    this.draggedSourceField = null;
    this.draggedTargetField = null;
  }

  onDropToTarget(event: any, targetField: VisualField): void {
    if (this.draggedSourceField && this.draggedSourceField.path) {
      this.createConnection(this.draggedSourceField.path, targetField.name);
    }
  }

  onDropToSource(event: any, sourceField: VisualField): void {
    if (this.draggedTargetField && sourceField.path) {
      this.createConnection(sourceField.path, this.draggedTargetField.name);
    }
  }

  private createConnection(sourcePath: string, targetField: string): void {
    // Check if connection already exists
    const existing = this.connections.find(conn =>
      conn.sourceField === sourcePath && conn.targetField === targetField
    );

    if (existing) {
      return;
    }

    // Open field rule editor
    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      data: {
        rule: {
          json_path: sourcePath,
          target_field: targetField
        },
        targetModel: this.targetModel,
        availableLookups: [],
        availableTransforms: this.availableTransforms
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ruleCreated.emit(result);

        // Add connection
        const newConnection: FieldConnection = {
          id: `conn-new-${Date.now()}`,
          sourceField: sourcePath,
          targetField: targetField,
          transform: result.transform_function_path,
          condition: result.condition_expression
        };

        this.connections.push(newConnection);
        this.updateFieldStates();
        this.drawConnections();
      }
    });
  }

  editConnection(connection: FieldConnection): void {
    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      data: {
        rule: connection.rule || {
          json_path: connection.sourceField,
          target_field: connection.targetField,
          transform_function_path: connection.transform,
          condition_expression: connection.condition
        },
        targetModel: this.targetModel,
        availableLookups: [],
        availableTransforms: this.availableTransforms
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && connection.rule?.id) {
        this.ruleUpdated.emit({ ruleId: connection.rule.id, updates: result });

        // Update connection
        connection.transform = result.transform_function_path;
        connection.condition = result.condition_expression;
        this.drawConnections();
      }
    });
  }

  deleteConnection(connection: FieldConnection): void {
    if (confirm('Delete this field mapping?')) {
      if (connection.rule?.id) {
        this.ruleDeleted.emit(connection.rule.id);
      }

      const index = this.connections.indexOf(connection);
      if (index > -1) {
        this.connections.splice(index, 1);
      }

      this.updateFieldStates();
      this.drawConnections();
    }
  }

  private updateFieldStates(): void {
    // Update connected states
    this.sourceFields.forEach(field => {
      field.connected = this.isSourceConnected(field.path || field.name);
    });

    this.targetFields.forEach(field => {
      field.connected = this.isTargetConnected(field.name);
    });
  }

  private resizeCanvas(): void {
    const canvas = this.canvas.nativeElement;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      this.drawConnections();
    }
  }

  public drawConnections(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each connection
    this.connections.forEach(connection => {
      const sourceElem = document.querySelector(`[data-source-field="${connection.sourceField}"]`);
      const targetElem = document.querySelector(`[data-target-field="${connection.targetField}"]`);

      if (sourceElem && targetElem) {
        const sourceRect = sourceElem.getBoundingClientRect();
        const targetRect = targetElem.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const sourceX = sourceRect.right - canvasRect.left;
        const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
        const targetX = targetRect.left - canvasRect.left;
        const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;

        // Draw bezier curve
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);

        const controlX1 = sourceX + (targetX - sourceX) / 3;
        const controlX2 = targetX - (targetX - sourceX) / 3;

        ctx.bezierCurveTo(
          controlX1, sourceY,
          controlX2, targetY,
          targetX, targetY
        );

        // Style based on state
        if (connection === this.selectedConnection) {
          ctx.strokeStyle = '#1976d2';
          ctx.lineWidth = 3;
        } else if (connection === this.hoveredConnection) {
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = connection.condition ? '#ff9800' : '#999';
          ctx.lineWidth = 1;
          if (connection.condition) {
            ctx.setLineDash([5, 5]);
          }
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Draw arrow
        const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
        ctx.save();
        ctx.translate(targetX - 10, targetY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -5);
        ctx.lineTo(-10, 5);
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.restore();
      }
    });
  }

  onCanvasClick(event: MouseEvent): void {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is near any connection
    let clickedConnection: FieldConnection | null = null;

    this.connections.forEach(connection => {
      if (this.isPointNearConnection(x, y, connection)) {
        clickedConnection = connection;
      }
    });

    this.selectedConnection = clickedConnection;
    this.drawConnections();
  }

  private isPointNearConnection(x: number, y: number, connection: FieldConnection): boolean {
    // Simplified hit detection - would need proper bezier curve distance calculation
    // For now, just return false
    return false;
  }

  getFieldIcon(type: string): string {
    switch (type) {
      case 'string': return 'text_fields';
      case 'number': return 'looks_one';
      case 'boolean': return 'toggle_on';
      case 'date': return 'event';
      case 'array': return 'list';
      case 'object': return 'data_object';
      default: return 'help_outline';
    }
  }

  getFieldTypeColor(type: string): string {
    switch (type) {
      case 'string': return '#4caf50';
      case 'number': return '#2196f3';
      case 'boolean': return '#ff9800';
      case 'date': return '#9c27b0';
      case 'array': return '#f44336';
      case 'object': return '#795548';
      default: return '#9e9e9e';
    }
  }

  autoMapFields(): void {
    // Simple auto-mapping based on field names
    const unmappedTargets = this.targetFields.filter(f => !f.connected);

    unmappedTargets.forEach(targetField => {
      // Find matching source field
      const matchingSource = this.sourceFields.find(sourceField => {
        const sourceName = sourceField.path?.split('.').pop() || sourceField.name;
        return sourceName.toLowerCase() === targetField.name.toLowerCase() && !sourceField.connected;
      });

      if (matchingSource && matchingSource.path) {
        this.createConnection(matchingSource.path, targetField.name);
      }
    });
  }

  clearAllMappings(): void {
    if (confirm('Clear all field mappings?')) {
      this.connections.forEach(conn => {
        if (conn.rule?.id) {
          this.ruleDeleted.emit(conn.rule.id);
        }
      });

      this.connections = [];
      this.updateFieldStates();
      this.drawConnections();
    }
  }
}
