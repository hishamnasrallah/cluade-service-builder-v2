// src/app/components/mapper-builder/target-tree/target-tree.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { FormsModule } from '@angular/forms';

import { MapperTarget, MapperTreeNode } from '../../../models/mapper.models';

@Component({
  selector: 'app-target-tree',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatCheckboxModule,
    DragDropModule
  ],
  templateUrl:'target-tree.component.html',
  styleUrl:'target-tree.component.scss'
})

export class TargetTreeComponent implements OnInit, OnChanges {
  @Input() targets: MapperTarget[] = [];
  @Input() selectedTargetId?: string;

  @Output() targetSelected = new EventEmitter<string>();
  @Output() targetAdded = new EventEmitter<Partial<MapperTarget>>();
  @Output() targetDeleted = new EventEmitter<string>();
  @Output() targetMoved = new EventEmitter<{ targetId: string; newParentId?: string }>();

  treeControl = new NestedTreeControl<MapperTreeNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<MapperTreeNode>();
  treeNodes: MapperTreeNode[] = [];

  searchTerm = '';
  isSearching = false;
  hasSearchResults = true;

  hasChild = (_: number, node: MapperTreeNode) => !!node.children && node.children.length > 0;

  ngOnInit(): void {
    this.buildTree();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['targets']) {
      this.buildTree();
    }
  }

  private buildTree(): void {
    const nodeMap = new Map<string, MapperTreeNode>();
    const rootNodes: MapperTreeNode[] = [];

    // First pass: create all nodes
    this.targets.forEach(target => {
      if (target.id) {
        nodeMap.set(target.id, {
          id: target.id,
          name: target.name,
          model: target.model,
          rootPath: target.root_path,
          children: [],
          expanded: true,
          active: target.active_ind,
          level: 0,
          data: target,
          hasErrors: false, // Would be calculated based on validation
          fieldRuleCount: target.field_rules?.length || 0
        });
      }
    });

    // Second pass: build hierarchy
    this.targets.forEach(target => {
      if (target.id) {
        const node = nodeMap.get(target.id)!;
        if (target.parent_target) {
          const parent = nodeMap.get(target.parent_target);
          if (parent) {
            parent.children.push(node);
            node.level = parent.level + 1;
          } else {
            rootNodes.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      }
    });

    this.treeNodes = this.sortNodes(rootNodes);
    this.dataSource.data = this.treeNodes;

    // Expand nodes with selected children
    if (this.selectedTargetId) {
      this.expandToSelected();
    }
  }

  private sortNodes(nodes: MapperTreeNode[]): MapperTreeNode[] {
    return nodes.sort((a, b) => a.name.localeCompare(b.name)).map(node => ({
      ...node,
      children: this.sortNodes(node.children)
    }));
  }

  private expandToSelected(): void {
    const findAndExpand = (nodes: MapperTreeNode[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return true;
        }
        if (node.children && findAndExpand(node.children, targetId)) {
          this.treeControl.expand(node);
          return true;
        }
      }
      return false;
    };

    findAndExpand(this.treeNodes, this.selectedTargetId!);
  }

  // Tree actions
  expandAll(): void {
    this.treeControl.expandAll();
  }

  collapseAll(): void {
    this.treeControl.collapseAll();
  }

  selectTarget(node: MapperTreeNode): void {
    this.targetSelected.emit(node.id);
  }

  addRootTarget(): void {
    this.targetAdded.emit({
      name: 'New Target',
      model: '',
      active_ind: true
    });
  }

  addChildTarget(parent: MapperTreeNode): void {
    this.targetAdded.emit({
      name: 'New Child Target',
      model: '',
      parent_target: parent.id,
      active_ind: true
    });
  }

  duplicateTarget(node: MapperTreeNode): void {
    const duplicate = {
      ...node.data,
      id: undefined,
      name: `${node.name} (Copy)`,
      field_rules: [...(node.data.field_rules || [])]
    };
    this.targetAdded.emit(duplicate);
  }

  editTarget(node: MapperTreeNode): void {
    this.selectTarget(node);
  }

  toggleActive(node: MapperTreeNode): void {
    this.targetMoved.emit({
      targetId: node.id,
      newParentId: node.data.parent_target
    });
  }

  deleteTarget(node: MapperTreeNode): void {
    if (confirm(`Delete target "${node.name}" and all its children?`)) {
      this.targetDeleted.emit(node.id);
    }
  }

  // Movement
  canMoveUp(node: MapperTreeNode): boolean {
    const siblings = this.getSiblings(node);
    const index = siblings.indexOf(node);
    return index > 0;
  }

  canMoveDown(node: MapperTreeNode): boolean {
    const siblings = this.getSiblings(node);
    const index = siblings.indexOf(node);
    return index >= 0 && index < siblings.length - 1;
  }

  moveUp(node: MapperTreeNode): void {
    // Implement move up logic
    console.log('Move up:', node);
  }

  moveDown(node: MapperTreeNode): void {
    // Implement move down logic
    console.log('Move down:', node);
  }

  private getSiblings(node: MapperTreeNode): MapperTreeNode[] {
    if (!node.data.parent_target) {
      return this.treeNodes;
    }

    const parent = this.findNode(this.treeNodes, node.data.parent_target);
    return parent ? parent.children : [];
  }

  private findNode(nodes: MapperTreeNode[], id: string): MapperTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = this.findNode(node.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  // Drag and drop
  drop(event: CdkDragDrop<MapperTreeNode[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Emit move event
    const movedNode = event.container.data[event.currentIndex];
    this.targetMoved.emit({
      targetId: movedNode.id,
      newParentId: this.getParentIdFromContainer(event.container.data)
    });
  }

  private getParentIdFromContainer(containerData: MapperTreeNode[]): string | undefined {
    // Implement logic to determine parent from container
    return undefined;
  }

  // Search
  filterTree(): void {
    this.isSearching = this.searchTerm.length > 0;
    this.hasSearchResults = this.isSearching ? this.checkSearchResults() : true;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.isSearching = false;
    this.hasSearchResults = true;
  }

  nodeMatchesSearch(node: MapperTreeNode): boolean {
    if (!this.searchTerm) return true;

    const term = this.searchTerm.toLowerCase();
    return node.name.toLowerCase().includes(term) ||
      node.model.toLowerCase().includes(term);
  }

  private checkSearchResults(): boolean {
    const checkNode = (node: MapperTreeNode): boolean => {
      if (this.nodeMatchesSearch(node)) {
        return true;
      }
      if (node.children) {
        return node.children.some(child => checkNode(child));
      }
      return false;
    };

    return this.treeNodes.some(node => checkNode(node));
  }

  // Helpers
  getTargetIcon(node: MapperTreeNode): string {
    if (!node.data.parent_target) {
      return 'account_tree';
    }
    if (node.children && node.children.length > 0) {
      return 'folder';
    }
    return 'description';
  }

  getActiveCount(): number {
    const countActive = (nodes: MapperTreeNode[]): number => {
      return nodes.reduce((sum, node) => {
        const nodeCount = node.active ? 1 : 0;
        const childCount = node.children ? countActive(node.children) : 0;
        return sum + nodeCount + childCount;
      }, 0);
    };

    return countActive(this.treeNodes);
  }

  getInactiveCount(): number {
    return this.targets.length - this.getActiveCount();
  }
}
