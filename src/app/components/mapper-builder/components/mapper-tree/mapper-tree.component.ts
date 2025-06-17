// src/app/components/mapper-builder/components/mapper-tree/mapper-tree.component.ts

import { Component, Input, Output, EventEmitter, ViewChild, OnChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTreeModule, CdkTreeNode } from '@angular/cdk/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeModule, MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatRippleModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule, CdkDragDrop, CdkDragStart, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MapperTreeNode } from '../../../../models/mapper.models';
import {MatChip, MatChipListbox} from '@angular/material/chips';
import {MatFormField, MatLabel} from '@angular/material/form-field';

interface FlatNode {
  expandable: boolean;
  name: string;
  level: number;
  id: string;
  model: string;
  rootPath?: string;
  active: boolean;
  node: MapperTreeNode;
  hasErrors?: boolean;
  fieldRuleCount?: number;
  parentId?: string;
}

interface DragState {
  isDragging: boolean;
  draggedNode?: FlatNode;
  dropTarget?: FlatNode;
  dropPosition?: 'above' | 'below' | 'inside';
  previewElement?: HTMLElement;
}

@Component({
  selector: 'app-mapper-tree',
  standalone: true,
  imports: [
    CommonModule,
    CdkTreeModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatRippleModule,
    DragDropModule,
    MatDividerModule,
    MatBadgeModule,
    MatDialogModule,
    MatChipListbox,
    MatChip,
    MatLabel,
    MatFormField
  ],
  templateUrl: './mapper-tree.component.html',
  styleUrl: './mapper-tree.component.scss'
})
export class MapperTreeComponent implements OnChanges {
  @Input() nodes: MapperTreeNode[] | null = [];
  @Input() selectedNodeId: string | null | undefined = null;

  @Output() nodeSelected = new EventEmitter<string>();
  @Output() nodeDropped = new EventEmitter<any>();
  @Output() nodeDeleted = new EventEmitter<string>();
  @Output() nodeAdded = new EventEmitter<string>();
  @Output() nodeDuplicated = new EventEmitter<string>();
  @Output() nodeToggled = new EventEmitter<{ id: string; active: boolean }>();
  @Output() nodeRenamed = new EventEmitter<{ id: string; name: string }>();

  private transformer = (node: MapperTreeNode, level: number): FlatNode => {
    return {
      expandable: !!node.children && node.children.length > 0,
      name: node.name,
      level: level,
      id: node.id,
      model: node.model,
      rootPath: node.rootPath,
      active: node.active,
      node: node,
      hasErrors: node.hasErrors,
      fieldRuleCount: node.fieldRuleCount,
      parentId: this.getParentId(node)
    };
  };

  treeControl = new FlatTreeControl<FlatNode>(
    node => node.level,
    node => node.expandable
  );

  treeFlattener = new MatTreeFlattener(
    this.transformer,
    node => node.level,
    node => node.expandable,
    node => node.children
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  dragState: DragState = {
    isDragging: false
  };

  searchQuery = '';
  expandedNodes = new Set<string>();
  cutNode: FlatNode | null = null;

  // Visual customization
  nodeIcons: { [key: string]: string } = {
    'auth.User': 'person',
    'employee.Employee': 'badge',
    'order.Order': 'shopping_cart',
    'product.Product': 'inventory_2',
    'default': 'description'
  };

  hasChild = (_: number, node: FlatNode) => node.expandable;

  ngOnChanges(): void {
    if (this.nodes) {
      this.dataSource.data = this.nodes;
      // Restore expanded state
      this.treeControl.dataNodes.forEach(node => {
        if (this.expandedNodes.has(node.id)) {
          this.treeControl.expand(node);
        }
      });
    }
  }

  private getParentId(node: MapperTreeNode): string | undefined {
    // Find parent ID by traversing the tree
    const findParent = (nodes: MapperTreeNode[], targetId: string): string | undefined => {
      for (const n of nodes) {
        if (n.children?.some(c => c.id === targetId)) {
          return n.id;
        }
        if (n.children) {
          const found = findParent(n.children, targetId);
          if (found) return found;
        }
      }
      return undefined;
    };

    return this.nodes ? findParent(this.nodes, node.id) : undefined;
  }

  getNodeIcon(node: FlatNode): string {
    if (node.rootPath) {
      return 'list_alt';
    }
    if (node.expandable) {
      return 'folder';
    }
    return this.nodeIcons[node.model] || this.nodeIcons['default'];
  }

  getNodeStatusIcon(node: FlatNode): string | null {
    if (node.hasErrors) return 'error';
    if (!node.active) return 'pause_circle';
    if (node.fieldRuleCount === 0) return 'warning';
    return null;
  }

  getNodeStatusColor(node: FlatNode): string {
    if (node.hasErrors) return 'warn';
    if (!node.active) return 'accent';
    if (node.fieldRuleCount === 0) return 'warn';
    return '';
  }

  getNodeStatusTooltip(node: FlatNode): string {
    if (node.hasErrors) return 'This target has validation errors';
    if (!node.active) return 'This target is inactive';
    if (node.fieldRuleCount === 0) return 'No field rules defined';
    return '';
  }

  selectNode(node: FlatNode): void {
    this.nodeSelected.emit(node.id);
  }

  addChild(node: FlatNode): void {
    this.nodeAdded.emit(node.id);
  }

  addRootTarget(): void {
    this.nodeAdded.emit('');
  }

  duplicateNode(node: FlatNode): void {
    this.nodeDuplicated.emit(node.id);
  }

  toggleActive(node: FlatNode): void {
    this.nodeToggled.emit({ id: node.id, active: !node.active });
  }

  deleteNode(node: FlatNode): void {
    if (confirm(`Delete "${node.name}" and all its children? This action cannot be undone.`)) {
      this.nodeDeleted.emit(node.id);
    }
  }

  renameNode(node: FlatNode): void {
    const newName = prompt('Enter new name:', node.name);
    if (newName && newName !== node.name) {
      this.nodeRenamed.emit({ id: node.id, name: newName });
    }
  }

  // Enhanced drag and drop
  onDragStart(event: CdkDragStart, node: FlatNode): void {
    this.dragState = {
      isDragging: true,
      draggedNode: node
    };

    // Add visual feedback
    event.source.element.nativeElement.classList.add('dragging');

    // Create custom preview
    this.createDragPreview(node);
  }

  onDragMove(event: CdkDragMove): void {
    if (!this.dragState.isDragging) return;

    // Find potential drop target
    const elements = document.elementsFromPoint(
      event.pointerPosition.x,
      event.pointerPosition.y
    );

    const treeNodeElement = elements.find(el =>
      el.classList.contains('tree-node') &&
      el.getAttribute('data-node-id') !== this.dragState.draggedNode?.id
    );

    if (treeNodeElement) {
      const nodeId = treeNodeElement.getAttribute('data-node-id');
      const flatNode = this.treeControl.dataNodes.find(n => n.id === nodeId);

      if (flatNode && this.canDrop(this.dragState.draggedNode!, flatNode)) {
        const rect = treeNodeElement.getBoundingClientRect();
        const y = event.pointerPosition.y - rect.top;
        const height = rect.height;

        // Determine drop position
        let position: 'above' | 'below' | 'inside';
        if (y < height * 0.25) {
          position = 'above';
        } else if (y > height * 0.75) {
          position = 'below';
        } else {
          position = 'inside';
        }

        // Update drop indicator
        this.updateDropIndicator(treeNodeElement, position);

        this.dragState.dropTarget = flatNode;
        this.dragState.dropPosition = position;
      } else {
        this.clearDropIndicator();
        this.dragState.dropTarget = undefined;
        this.dragState.dropPosition = undefined;
      }
    } else {
      this.clearDropIndicator();
      this.dragState.dropTarget = undefined;
      this.dragState.dropPosition = undefined;
    }
  }

  onDragEnd(event: CdkDragEnd): void {
    // Clean up
    event.source.element.nativeElement.classList.remove('dragging');
    this.clearDropIndicator();
    this.removeDragPreview();

    // Perform drop if valid
    if (this.dragState.dropTarget && this.dragState.draggedNode) {
      this.performDrop();
    }

    // Reset state
    this.dragState = {
      isDragging: false
    };
  }

  private canDrop(source: FlatNode, target: FlatNode): boolean {
    // Can't drop on itself
    if (source.id === target.id) return false;

    // Can't drop parent into its own child
    if (this.isAncestor(source, target)) return false;

    // Can't create circular dependencies
    if (this.wouldCreateCircularDependency(source, target)) return false;

    return true;
  }

  private isAncestor(possibleAncestor: FlatNode, node: FlatNode): boolean {
    let current = node;
    while (current.parentId) {
      if (current.parentId === possibleAncestor.id) return true;
      current = this.treeControl.dataNodes.find(n => n.id === current.parentId)!;
      if (!current) break;
    }
    return false;
  }

  private wouldCreateCircularDependency(source: FlatNode, target: FlatNode): boolean {
    // Check if moving source to target would create a circular dependency
    return this.isAncestor(target, source);
  }

  private performDrop(): void {
    const { draggedNode, dropTarget, dropPosition } = this.dragState;

    if (!draggedNode || !dropTarget) return;

    let newParentId: string | undefined;
    let insertIndex: number | undefined;

    switch (dropPosition) {
      case 'inside':
        newParentId = dropTarget.id;
        break;

      case 'above':
      case 'below':
        newParentId = dropTarget.parentId;
        // Calculate insert index based on position
        if (this.nodes) {
          const siblings = newParentId
            ? this.findNode(this.nodes, newParentId)?.children || []
            : this.nodes;

          const targetIndex = siblings.findIndex(n => n.id === dropTarget.id);
          insertIndex = dropPosition === 'above' ? targetIndex : targetIndex + 1;
        }
        break;
    }

    this.nodeDropped.emit({
      node: draggedNode.node,
      newParentId,
      insertIndex,
      previousParentId: draggedNode.parentId
    });
  }

  private findNode(nodes: MapperTreeNode[], id: string): MapperTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private createDragPreview(node: FlatNode): void {
    const preview = document.createElement('div');
    preview.className = 'drag-preview';
    preview.innerHTML = `
      <mat-icon>${this.getNodeIcon(node)}</mat-icon>
      <span>${node.name}</span>
    `;
    document.body.appendChild(preview);
    this.dragState.previewElement = preview;
  }

  private removeDragPreview(): void {
    if (this.dragState.previewElement) {
      document.body.removeChild(this.dragState.previewElement);
      this.dragState.previewElement = undefined;
    }
  }

  private updateDropIndicator(element: HTMLElement, position: 'above' | 'below' | 'inside'): void {
    this.clearDropIndicator();
    element.classList.add(`drop-${position}`);
  }

  private clearDropIndicator(): void {
    document.querySelectorAll('.drop-above, .drop-below, .drop-inside').forEach(el => {
      el.classList.remove('drop-above', 'drop-below', 'drop-inside');
    });
  }

  // Tree operations
  expandAll(): void {
    this.treeControl.expandAll();
    // Store expanded state
    this.treeControl.dataNodes.forEach(node => {
      this.expandedNodes.add(node.id);
    });
  }

  collapseAll(): void {
    this.treeControl.collapseAll();
    this.expandedNodes.clear();
  }

  toggleNodeExpansion(node: FlatNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
      this.expandedNodes.delete(node.id);
    } else {
      this.treeControl.expand(node);
      this.expandedNodes.add(node.id);
    }
  }

  // Search functionality
  filterNodes(query: string): void {
    this.searchQuery = query.toLowerCase();

    if (!query) {
      // Show all nodes
      this.dataSource.data = this.nodes || [];
      return;
    }

    // Filter and expand matching nodes
    const matchingNodes = this.findMatchingNodes(this.nodes || [], query);
    this.dataSource.data = matchingNodes;

    // Expand all to show results
    setTimeout(() => this.expandAll(), 0);
  }

  private findMatchingNodes(nodes: MapperTreeNode[], query: string): MapperTreeNode[] {
    return nodes.map(node => {
      const matches = node.name.toLowerCase().includes(query) ||
        node.model.toLowerCase().includes(query);

      const matchingChildren = node.children
        ? this.findMatchingNodes(node.children, query)
        : [];

      if (matches || matchingChildren.length > 0) {
        return {
          ...node,
          children: matchingChildren
        };
      }

      return null;
    }).filter(node => node !== null) as MapperTreeNode[];
  }

  // Clipboard operations
  cutNodeToClipboard(node: FlatNode): void {
    this.cutNode = node;
    // Visual feedback
    document.querySelector(`[data-node-id="${node.id}"]`)?.classList.add('cut');
  }

  copyNodeToClipboard(node: FlatNode): void {
    // Store node data for copy
    localStorage.setItem('mapper_clipboard', JSON.stringify({
      type: 'copy',
      node: node.node
    }));
  }

  pasteFromClipboard(targetNode?: FlatNode): void {
    if (this.cutNode) {
      // Move operation
      this.nodeDropped.emit({
        node: this.cutNode.node,
        newParentId: targetNode?.id,
        previousParentId: this.cutNode.parentId
      });

      // Clear cut state
      document.querySelector('.cut')?.classList.remove('cut');
      this.cutNode = null;
    } else {
      // Copy operation
      const clipboardData = localStorage.getItem('mapper_clipboard');
      if (clipboardData) {
        const data = JSON.parse(clipboardData);
        if (data.type === 'copy') {
          // Emit duplicate with new parent
          this.nodeDuplicated.emit(data.node.id);
        }
      }
    }
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.selectedNodeId) return;

    const selectedNode = this.treeControl.dataNodes.find(n => n.id === this.selectedNodeId);
    if (!selectedNode) return;

    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'x':
          event.preventDefault();
          this.cutNodeToClipboard(selectedNode);
          break;
        case 'c':
          event.preventDefault();
          this.copyNodeToClipboard(selectedNode);
          break;
        case 'v':
          event.preventDefault();
          this.pasteFromClipboard(selectedNode);
          break;
        case 'd':
          event.preventDefault();
          this.duplicateNode(selectedNode);
          break;
      }
    } else {
      switch (event.key) {
        case 'Delete':
          event.preventDefault();
          this.deleteNode(selectedNode);
          break;
        case 'F2':
          event.preventDefault();
          this.renameNode(selectedNode);
          break;
        case 'Enter':
          if (selectedNode.expandable) {
            event.preventDefault();
            this.toggleNodeExpansion(selectedNode);
          }
          break;
      }
    }
  }

  // Context menu
  showContextMenu(event: MouseEvent, node: FlatNode): void {
    event.preventDefault();
    event.stopPropagation();
    // Context menu is handled by mat-menu in template
  }

  // Helper methods for template
  getChildCount(node: FlatNode): number {
    return node.node.children?.length || 0;
  }

  hasValidationErrors(node: FlatNode): boolean {
    return node.hasErrors || false;
  }

  getFieldRuleCount(node: FlatNode): number {
    return node.fieldRuleCount || 0;
  }

  isNodeCut(node: FlatNode): boolean {
    return this.cutNode?.id === node.id;
  }
}
