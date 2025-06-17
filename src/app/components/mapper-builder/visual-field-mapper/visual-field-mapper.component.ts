// src/app/components/mapper-builder/visual-field-mapper/visual-field-mapper.component.ts

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem, CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';
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
import { debounceTime, Subject, takeUntil } from 'rxjs';
import {
  MapperFieldRule,
  ModelField,
  JSONPathSuggestion,
  TransformFunction
} from '../../../models/mapper.models';
import { FieldRuleEditorComponent } from '../components/field-rule-editor/field-rule-editor.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRippleModule } from '@angular/material/core';

interface FieldConnection {
  id: string;
  sourceField: string;
  targetField: string;
  transform?: string;
  condition?: string;
  rule?: MapperFieldRule;
  path?: { x1: number; y1: number; x2: number; y2: number };
}

interface VisualField {
  name: string;
  type: string;
  path?: string;
  required?: boolean;
  sample?: any;
  connected?: boolean;
  element?: HTMLElement;
  description?: string;
}

interface DragPreview {
  active: boolean;
  sourceX: number;
  sourceY: number;
  currentX: number;
  currentY: number;
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
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatRippleModule
  ],
  templateUrl: './visual-field-mapper.component.html',
  styleUrl: './visual-field-mapper.component.scss'
})
export class VisualFieldMapperComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('connectionArea') connectionArea!: ElementRef<HTMLDivElement>;

  @Input() targetModel: string = '';
  @Input() modelFields: ModelField[] = [];
  @Input({
    transform: (value: string[] | JSONPathSuggestion[]): JSONPathSuggestion[] => {
      if (!value) return [];
      if (value.length > 0 && typeof value[0] === 'object' && 'path' in value[0]) {
        return value as JSONPathSuggestion[];
      }
      return (value as string[]).map(path => ({
        path: path,
        description: `JSON path: ${path}`,
        type: 'string'
      }));
    }
  }) jsonPathSuggestions: JSONPathSuggestion[] = [];

  @Input() fieldRules: MapperFieldRule[] = [];
  @Input({transform: (value: TransformFunction[] | null): TransformFunction[] => {
      return value && Array.isArray(value) ? value : [];
    }}) availableTransforms: TransformFunction[] = [];

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

  dragPreview: DragPreview = {
    active: false,
    sourceX: 0,
    sourceY: 0,
    currentX: 0,
    currentY: 0
  };
  // Helper properties
  showRequiredOnly = false;
  showUnmappedOnly = false;
  selectedSourceCategory = '';
  connectionDetailsPosition = { x: 0, y: 0 };
  tooltipPosition = { x: 0, y: 0 };
  isDragActive = false;
  sourceCategories = ['User Data', 'Personal Info', 'Financial', 'Documents', 'Custom'];

  fieldTypes = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'DateTime' },
    { value: 'array', label: 'List' },
    { value: 'object', label: 'Object' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'choice', label: 'Choice' }
  ];

  isLoading = false;
  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;
  private animationFrame?: number;

  // Visual connection drawing
  private connectionPaths = new Map<string, SVGPathElement>();
  private svg?: SVGSVGElement;

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.initializeFields();
    this.setupSearch();
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.resizeCanvas();

    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.drawConnections();
    });

    if (this.connectionArea) {
      this.resizeObserver.observe(this.connectionArea.nativeElement);
    }

    // Initial draw after view is ready
    setTimeout(() => this.drawConnections(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
  // Additional helper methods
  getConnectedFieldsCount(): number {
    const connectedSources = new Set(this.connections.map(c => c.sourceField)).size;
    const connectedTargets = new Set(this.connections.map(c => c.targetField)).size;
    return connectedSources + connectedTargets;
  }

  getUnmappedRequiredCount(): number {
    return this.targetFields.filter(f => f.required && !f.connected).length;
  }

  getMappedCount(): number {
    return this.targetFields.filter(f => f.connected).length;
  }

  getFilteredTargetFields(): VisualField[] {
    let fields = this.filteredTargetFields;

    if (this.showRequiredOnly) {
      fields = fields.filter(f => f.required);
    }

    if (this.showUnmappedOnly) {
      fields = fields.filter(f => !f.connected);
    }

    return fields;
  }

  filterByCategory(type: 'source' | 'target', category: string): void {
    if (type === 'source') {
      this.selectedSourceCategory = this.selectedSourceCategory === category ? '' : category;
      // Apply category filter logic
      this.filterSourceFields(this.searchSourceControl.value || '');
    }
  }

  isFieldHighlighted(field: VisualField): boolean {
    // Highlight fields that match certain criteria
    return false;
  }

  canDropOn(field: VisualField): boolean {
    // Check if current drag can be dropped on this field
    if (this.draggedSourceField) {
      return !field.connected || this.areTypesCompatible(this.draggedSourceField.type, field.type);
    }
    return false;
  }

  formatSampleValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value.length > 30 ? value.substring(0, 30) + '...' : value;
    if (typeof value === 'object') return '{...}';
    return String(value);
  }

  getConnectedSource(targetField: VisualField): string {
    const connection = this.connections.find(c => c.targetField === targetField.name);
    return connection ? connection.sourceField : '';
  }

  getTransformLabel(transformPath: string): string {
    const transform = this.availableTransforms.find(t => t.path === transformPath);
    return transform?.label || transformPath.split('.').pop() || transformPath;
  }

  // UI Action methods
  collapseAllSource(): void {
    // Implement collapse logic
    console.log('Collapse all source fields');
  }

  expandAllSource(): void {
    // Implement expand logic
    console.log('Expand all source fields');
  }

  showFieldDetails(field: VisualField): void {
    // Show detailed field information in a dialog
    console.log('Show field details:', field);
  }

  suggestTargetsFor(sourceField: VisualField): void {
    // Find and highlight potential target fields
    const suggestions = this.targetFields.filter(target => {
      if (target.connected) return false;
      return this.areTypesCompatible(sourceField.type, target.type) ||
        this.calculateStringSimilarity(sourceField.name, target.name) > 0.5;
    });

    // Highlight suggested fields
    suggestions.forEach(field => {
      const element = document.querySelector(`[data-target-field="${field.name}"]`);
      if (element) {
        element.classList.add('highlighted');
        setTimeout(() => element.classList.remove('highlighted'), 3000);
      }
    });
  }

  suggestSourcesFor(targetField: VisualField): void {
    // Find and highlight potential source fields
    const suggestions = this.sourceFields.filter(source => {
      if (source.connected) return false;
      return this.areTypesCompatible(source.type, targetField.type) ||
        this.calculateStringSimilarity(source.name, targetField.name) > 0.5;
    });

    // Highlight suggested fields
    suggestions.forEach(field => {
      const element = document.querySelector(`[data-source-field="${field.path}"]`);
      if (element) {
        element.classList.add('highlighted');
        setTimeout(() => element.classList.remove('highlighted'), 3000);
      }
    });
  }

  disconnectField(field: VisualField, type: 'source' | 'target'): void {
    const connectionsToDelete = this.connections.filter(c =>
      type === 'source' ? c.sourceField === field.path : c.targetField === field.name
    );

    if (connectionsToDelete.length > 0 && confirm(`Disconnect ${connectionsToDelete.length} connection(s)?`)) {
      connectionsToDelete.forEach(conn => this.deleteConnection(conn));
    }
  }

  createCustomMapping(targetField: VisualField): void {
    // Open dialog to create custom mapping with expression
    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      data: {
        rule: {
          target_field: targetField.name,
          json_path: '' // Will be filled with custom expression
        },
        targetModel: this.targetModel,
        availableLookups: [],
        availableTransforms: this.availableTransforms,
        isCustomMapping: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ruleCreated.emit(result);
      }
    });
  }

  testConnection(connection: FieldConnection): void {
    // Test the connection with sample data
    console.log('Testing connection:', connection);
    // Could open a dialog showing test results
  }

  resetTargetFilters(): void {
    this.showRequiredOnly = false;
    this.showUnmappedOnly = false;
    this.searchTargetControl.setValue('');
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

    if (clickedConnection) {
      this.selectedConnection = clickedConnection;
      this.connectionDetailsPosition = { x: x + 20, y: y - 50 };
    } else {
      this.selectedConnection = null;
    }

    this.drawConnections();
  }

  onCanvasMouseMove(event: MouseEvent): void {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update tooltip position
    this.tooltipPosition = { x: x + 10, y: y - 30 };

    // Check hover on connections
    let hoveredConnection: FieldConnection | null = null;
    this.connections.forEach(connection => {
      if (this.isPointNearConnection(x, y, connection)) {
        hoveredConnection = connection;
      }
    });

    if (hoveredConnection !== this.hoveredConnection) {
      this.hoveredConnection = hoveredConnection;
      this.drawConnections();
    }
  }

  private isPointNearConnection(x: number, y: number, connection: FieldConnection): boolean {
    if (!connection.path) return false;

    // Simple distance calculation to bezier curve
    const tolerance = 10;
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.getBezierPoint(
        connection.path.x1, connection.path.y1,
        connection.path.x2, connection.path.y2,
        t
      );

      const distance = Math.sqrt(
        Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
      );

      if (distance < tolerance) {
        return true;
      }
    }

    return false;
  }

  private getBezierPoint(x1: number, y1: number, x2: number, y2: number, t: number): { x: number; y: number } {
    const controlX1 = x1 + (x2 - x1) / 3;
    const controlX2 = x2 - (x2 - x1) / 3;

    const x = Math.pow(1 - t, 3) * x1 +
      3 * Math.pow(1 - t, 2) * t * controlX1 +
      3 * (1 - t) * Math.pow(t, 2) * controlX2 +
      Math.pow(t, 3) * x2;

    const y = Math.pow(1 - t, 3) * y1 +
      3 * Math.pow(1 - t, 2) * t * y1 +
      3 * (1 - t) * Math.pow(t, 2) * y2 +
      Math.pow(t, 3) * y2;

    return { x, y };
  }

  // Export/Import functionality
  exportMappings(): void {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      mapper: {
        targetModel: this.targetModel,
        connections: this.connections.map(c => ({
          source: c.sourceField,
          target: c.targetField,
          transform: c.transform,
          condition: c.condition
        }))
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `field-mappings-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  importMappings(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const data = JSON.parse(e.target.result);
            // Validate and import mappings
            console.log('Importing mappings:', data);
          } catch (error) {
            console.error('Failed to import mappings:', error);
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  // UI Options
  toggleConnectionLabels(): void {
    // Toggle labels on connections
    document.querySelectorAll('.connection-path').forEach(path => {
      path.classList.toggle('show-labels');
    });
  }

  toggleAnimations(): void {
    // Toggle animations
    document.body.classList.toggle('disable-animations');
  }

  toggleCompactMode(): void {
    // Toggle compact view
    this.connectionArea.nativeElement.classList.toggle('compact-mode');
  }

  showHelp(): void {
    // Show help dialog
    console.log('Show help');
  }

  showKeyboardShortcuts(): void {
    // Show keyboard shortcuts dialog
    console.log('Show keyboard shortcuts');
  }

  showMappingSuggestions(): void {
    // Show AI-powered mapping suggestions
    console.log('Show mapping suggestions');
  }

  private setupCanvas(): void {
    const canvas = this.canvas.nativeElement;
    const container = canvas.parentElement;

    // Create SVG for smoother connections
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.pointerEvents = 'none';

    if (container) {
      container.appendChild(this.svg);
    }
  }

  private initializeFields(): void {
    // Initialize source fields with enhanced metadata
    this.sourceFields = this.jsonPathSuggestions.map(suggestion => ({
      name: suggestion.path.split('.').pop() || suggestion.path,
      type: suggestion.type,
      path: suggestion.path,
      sample: suggestion.sample_value,
      description: suggestion.description,
      connected: this.isSourceConnected(suggestion.path)
    }));

    // Initialize target fields with validation info
    this.targetFields = this.modelFields.map(field => ({
      name: field.name,
      type: field.type,
      required: field.required,
      description: field.help_text,
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
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(search => {
      this.filterSourceFields(search || '');
    });

    this.searchTargetControl.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
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
        field.path?.toLowerCase().includes(searchLower) ||
        field.description?.toLowerCase().includes(searchLower)
      );
    }
  }

  private filterTargetFields(search: string): void {
    if (!search) {
      this.filteredTargetFields = [...this.targetFields];
    } else {
      const searchLower = search.toLowerCase();
      this.filteredTargetFields = this.targetFields.filter(field =>
        field.name.toLowerCase().includes(searchLower) ||
        field.description?.toLowerCase().includes(searchLower)
      );
    }
  }

  private isSourceConnected(path: string): boolean {
    return this.connections.some(conn => conn.sourceField === path);
  }

  private isTargetConnected(fieldName: string): boolean {
    return this.connections.some(conn => conn.targetField === fieldName);
  }

  onDragStarted(event: CdkDragStart, field: VisualField, type: 'source' | 'target'): void {
    if (type === 'source') {
      this.draggedSourceField = field;
    } else {
      this.draggedTargetField = field;
    }

    // Start drag preview
    const element = event.source.element.nativeElement;
    const rect = element.getBoundingClientRect();
    const canvasRect = this.canvas.nativeElement.getBoundingClientRect();

    this.dragPreview = {
      active: true,
      sourceX: rect.right - canvasRect.left,
      sourceY: rect.top + rect.height / 2 - canvasRect.top,
      currentX: rect.right - canvasRect.left,
      currentY: rect.top + rect.height / 2 - canvasRect.top
    };

    // Add visual feedback
    element.classList.add('dragging');
  }

  onDragMoved(event: any): void {
    if (this.dragPreview.active) {
      const canvasRect = this.canvas.nativeElement.getBoundingClientRect();
      this.dragPreview.currentX = event.pointerPosition.x - canvasRect.left;
      this.dragPreview.currentY = event.pointerPosition.y - canvasRect.top;

      // Draw preview connection
      this.drawDragPreview();
    }
  }

  onDragEnded(event: CdkDragEnd): void {
    this.dragPreview.active = false;
    this.draggedSourceField = null;
    this.draggedTargetField = null;

    // Remove visual feedback
    event.source.element.nativeElement.classList.remove('dragging');

    // Clear preview
    this.clearDragPreview();
  }

  onDropped(event: CdkDragDrop<VisualField[]>, targetField?: VisualField, sourceField?: VisualField): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Handle cross-list drop for connection creation
      const draggedField = event.previousContainer.data[event.previousIndex];

      if (targetField && draggedField.path) {
        this.createConnection(draggedField.path, targetField.name);
      } else if (sourceField && this.draggedTargetField) {
        this.createConnection(sourceField.path!, this.draggedTargetField.name);
      }
    }
  }

  private createConnection(sourcePath: string, targetField: string): void {
    // Check if connection already exists
    const existing = this.connections.find(conn =>
      conn.sourceField === sourcePath && conn.targetField === targetField
    );

    if (existing) {
      this.showConnectionExists(existing);
      return;
    }

    // Open enhanced field rule editor
    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        rule: {
          json_path: sourcePath,
          target_field: targetField
        },
        targetModel: this.targetModel,
        availableLookups: [],
        availableTransforms: this.availableTransforms,
        sourceField: this.sourceFields.find(f => f.path === sourcePath),
        targetField: this.targetFields.find(f => f.name === targetField)
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ruleCreated.emit(result);

        // Add connection with animation
        const newConnection: FieldConnection = {
          id: `conn-new-${Date.now()}`,
          sourceField: sourcePath,
          targetField: targetField,
          transform: result.transform_function_path,
          condition: result.condition_expression
        };

        this.connections.push(newConnection);
        this.updateFieldStates();
        this.animateNewConnection(newConnection);
      }
    });
  }

  private showConnectionExists(connection: FieldConnection): void {
    // Highlight existing connection
    this.selectedConnection = connection;
    this.drawConnections();

    // Flash the connection
    setTimeout(() => {
      const path = this.connectionPaths.get(connection.id);
      if (path) {
        path.classList.add('flash');
        setTimeout(() => path.classList.remove('flash'), 1000);
      }
    }, 100);
  }

  editConnection(connection: FieldConnection): void {
    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      maxHeight: '90vh',
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
        // Animate removal
        const path = this.connectionPaths.get(connection.id);
        if (path) {
          path.classList.add('removing');
          setTimeout(() => {
            this.connections.splice(index, 1);
            this.updateFieldStates();
            this.drawConnections();
          }, 300);
        } else {
          this.connections.splice(index, 1);
          this.updateFieldStates();
          this.drawConnections();
        }
      }
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

    // Update filtered lists
    this.filterSourceFields(this.searchSourceControl.value || '');
    this.filterTargetFields(this.searchTargetControl.value || '');
  }

  private resizeCanvas(): void {
    const canvas = this.canvas.nativeElement;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;

      if (this.svg) {
        this.svg.setAttribute('width', container.offsetWidth.toString());
        this.svg.setAttribute('height', container.offsetHeight.toString());
      }
    }
  }

  drawConnections(): void {
    if (!this.svg) return;

    // Clear existing paths
    this.svg.innerHTML = '';
    this.connectionPaths.clear();

    // Draw each connection
    this.connections.forEach(connection => {
      const sourceElem = document.querySelector(`[data-source-field="${connection.sourceField}"]`);
      const targetElem = document.querySelector(`[data-target-field="${connection.targetField}"]`);

      if (sourceElem && targetElem) {
        const path = this.createConnectionPath(sourceElem as HTMLElement, targetElem as HTMLElement, connection);
        if (path) {
          this.svg!.appendChild(path);
          this.connectionPaths.set(connection.id, path);
        }
      }
    });
  }

  private createConnectionPath(sourceElem: HTMLElement, targetElem: HTMLElement, connection: FieldConnection): SVGPathElement {
    const sourceRect = sourceElem.getBoundingClientRect();
    const targetRect = targetElem.getBoundingClientRect();
    const containerRect = this.connectionArea.nativeElement.getBoundingClientRect();

    const sourceX = sourceRect.right - containerRect.left;
    const sourceY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
    const targetX = targetRect.left - containerRect.left;
    const targetY = targetRect.top + targetRect.height / 2 - containerRect.top;

    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Calculate control points for smooth curve
    const controlX1 = sourceX + (targetX - sourceX) / 3;
    const controlX2 = targetX - (targetX - sourceX) / 3;

    const d = `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY}, ${controlX2} ${targetY}, ${targetX} ${targetY}`;
    path.setAttribute('d', d);

    // Style based on connection properties
    path.classList.add('connection-path');

    if (connection === this.selectedConnection) {
      path.classList.add('selected');
    }

    if (connection.condition) {
      path.classList.add('conditional');
    }

    if (connection.transform) {
      path.classList.add('transformed');
    }

    // Add interaction
    path.addEventListener('click', () => {
      this.selectedConnection = connection;
      this.drawConnections();
    });

    path.addEventListener('dblclick', () => {
      this.editConnection(connection);
    });

    path.addEventListener('mouseenter', () => {
      this.hoveredConnection = connection;
      path.classList.add('hovered');
    });

    path.addEventListener('mouseleave', () => {
      this.hoveredConnection = null;
      path.classList.remove('hovered');
    });

    // Store path coordinates for hit testing
    connection.path = { x1: sourceX, y1: sourceY, x2: targetX, y2: targetY };

    return path;
  }

  private drawDragPreview(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw preview line
    ctx.beginPath();
    ctx.moveTo(this.dragPreview.sourceX, this.dragPreview.sourceY);

    const controlX1 = this.dragPreview.sourceX + (this.dragPreview.currentX - this.dragPreview.sourceX) / 3;
    const controlX2 = this.dragPreview.currentX - (this.dragPreview.currentX - this.dragPreview.sourceX) / 3;

    ctx.bezierCurveTo(
      controlX1, this.dragPreview.sourceY,
      controlX2, this.dragPreview.currentY,
      this.dragPreview.currentX, this.dragPreview.currentY
    );

    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();

    // Draw target indicator
    ctx.beginPath();
    ctx.arc(this.dragPreview.currentX, this.dragPreview.currentY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#1976d2';
    ctx.fill();
  }

  private clearDragPreview(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private animateNewConnection(connection: FieldConnection): void {
    // Redraw connections
    this.drawConnections();

    // Animate the new connection
    setTimeout(() => {
      const path = this.connectionPaths.get(connection.id);
      if (path) {
        path.classList.add('new-connection');
        setTimeout(() => path.classList.remove('new-connection'), 1000);
      }
    }, 100);
  }

  getFieldIcon(type: string): string {
    switch (type) {
      case 'string': return 'text_fields';
      case 'number': return 'looks_one';
      case 'boolean': return 'toggle_on';
      case 'date': return 'event';
      case 'datetime': return 'schedule';
      case 'array': return 'list';
      case 'object': return 'data_object';
      case 'email': return 'email';
      case 'url': return 'link';
      case 'choice': return 'list_alt';
      default: return 'help_outline';
    }
  }

  getFieldTypeColor(type: string): string {
    switch (type) {
      case 'string': return '#4caf50';
      case 'number': return '#2196f3';
      case 'boolean': return '#ff9800';
      case 'date': return '#9c27b0';
      case 'datetime': return '#673ab7';
      case 'array': return '#f44336';
      case 'object': return '#795548';
      case 'email': return '#00bcd4';
      case 'url': return '#3f51b5';
      case 'choice': return '#009688';
      default: return '#9e9e9e';
    }
  }

  getConnectionCount(field: VisualField, type: 'source' | 'target'): number {
    if (type === 'source') {
      return this.connections.filter(c => c.sourceField === field.path).length;
    } else {
      return this.connections.filter(c => c.targetField === field.name).length;
    }
  }

  autoMapFields(): void {
    // Enhanced auto-mapping with type matching
    const unmappedTargets = this.targetFields.filter(f => !f.connected);
    let mappedCount = 0;

    unmappedTargets.forEach(targetField => {
      // Find best matching source field
      const matchingSource = this.findBestMatch(targetField);

      if (matchingSource && matchingSource.path) {
        this.createConnection(matchingSource.path, targetField.name);
        mappedCount++;
      }
    });

    // Show result
    if (mappedCount > 0) {
      this.showAutoMapResult(mappedCount);
    } else {
      this.showNoMatchesFound();
    }
  }

  private findBestMatch(targetField: VisualField): VisualField | null {
    const unmappedSources = this.sourceFields.filter(f => !f.connected);

    // Score each source field
    const scores = unmappedSources.map(sourceField => {
      let score = 0;

      // Name similarity
      const sourceName = sourceField.path?.split('.').pop() || sourceField.name;
      const nameScore = this.calculateStringSimilarity(
        sourceName.toLowerCase(),
        targetField.name.toLowerCase()
      );
      score += nameScore * 50;

      // Type compatibility
      if (this.areTypesCompatible(sourceField.type, targetField.type)) {
        score += 30;
      }

      // Exact name match bonus
      if (sourceName.toLowerCase() === targetField.name.toLowerCase()) {
        score += 20;
      }

      return { field: sourceField, score };
    });

    // Find best match with minimum threshold
    const bestMatch = scores.reduce((best, current) =>
        current.score > best.score ? current : best,
      { field: null as VisualField | null, score: 0 }
    );

    return bestMatch.score > 40 ? bestMatch.field : null;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private getEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private areTypesCompatible(sourceType: string, targetType: string): boolean {
    // Type compatibility matrix
    const compatibilityMap: { [key: string]: string[] } = {
      'string': ['string', 'text', 'char', 'varchar', 'email', 'url', 'choice'],
      'number': ['number', 'integer', 'float', 'decimal', 'bigint'],
      'boolean': ['boolean', 'bool'],
      'date': ['date', 'datetime', 'timestamp'],
      'array': ['array', 'list', 'jsonarray'],
      'object': ['object', 'json', 'jsonobject']
    };

    const sourceGroup = Object.keys(compatibilityMap).find(key =>
      compatibilityMap[key].includes(sourceType.toLowerCase())
    );

    const targetGroup = Object.keys(compatibilityMap).find(key =>
      compatibilityMap[key].includes(targetType.toLowerCase())
    );

    return sourceGroup === targetGroup;
  }

  private showAutoMapResult(count: number): void {
    // Could use a snackbar or dialog
    console.log(`Successfully mapped ${count} fields`);
  }

  private showNoMatchesFound(): void {
    console.log('No suitable matches found for auto-mapping');
  }

  clearAllMappings(): void {
    if (confirm('Clear all field mappings? This will remove all connections.')) {
      // Animate removal
      this.connections.forEach(conn => {
        const path = this.connectionPaths.get(conn.id);
        if (path) {
          path.classList.add('removing');
        }
      });

      setTimeout(() => {
        this.connections.forEach(conn => {
          if (conn.rule?.id) {
            this.ruleDeleted.emit(conn.rule.id);
          }
        });

        this.connections = [];
        this.updateFieldStates();
        this.drawConnections();
      }, 300);
    }
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'a':
          if (event.shiftKey) {
            event.preventDefault();
            this.autoMapFields();
          }
          break;
        case 'd':
          if (this.selectedConnection) {
            event.preventDefault();
            this.deleteConnection(this.selectedConnection);
          }
          break;
      }
    }
  }
}
