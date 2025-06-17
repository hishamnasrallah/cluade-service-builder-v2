// src/app/services/undo-redo.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UndoableAction } from '../models/mapper.models';

interface StateSnapshot {
  timestamp: Date;
  description: string;
  state: any;
}

@Injectable({
  providedIn: 'root'
})
export class UndoRedoService {
  private maxHistorySize = 50;
  private undoStack: StateSnapshot[] = [];
  private redoStack: StateSnapshot[] = [];

  private canUndo$ = new BehaviorSubject<boolean>(false);
  private canRedo$ = new BehaviorSubject<boolean>(false);

  private currentState$ = new BehaviorSubject<any>(null);

  constructor() {}

  // Save a state snapshot
  saveState(state: any, description: string): void {
    const snapshot: StateSnapshot = {
      timestamp: new Date(),
      description,
      state: this.deepClone(state)
    };

    this.undoStack.push(snapshot);

    // Clear redo stack when new action is performed
    this.redoStack = [];

    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    this.updateCanStates();
  }

  // Undo last action
  undo(): StateSnapshot | null {
    if (this.undoStack.length < 2) {
      return null;
    }

    // Current state goes to redo stack
    const currentState = this.undoStack.pop()!;
    this.redoStack.push(currentState);

    // Get previous state
    const previousState = this.undoStack[this.undoStack.length - 1];
    this.currentState$.next(this.deepClone(previousState.state));

    this.updateCanStates();
    return previousState;
  }

  // Redo last undone action
  redo(): StateSnapshot | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    const redoState = this.redoStack.pop()!;
    this.undoStack.push(redoState);

    this.currentState$.next(this.deepClone(redoState.state));

    this.updateCanStates();
    return redoState;
  }

  // Clear all history
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.updateCanStates();
  }

  // Get undo/redo availability
  canUndo(): Observable<boolean> {
    return this.canUndo$.asObservable();
  }

  canRedo(): Observable<boolean> {
    return this.canRedo$.asObservable();
  }

  // Get current state
  getCurrentState(): Observable<any> {
    return this.currentState$.asObservable();
  }

  // Get history info
  getUndoHistory(): string[] {
    return this.undoStack.slice(-10).map(s => s.description);
  }

  getRedoHistory(): string[] {
    return this.redoStack.slice(0, 10).map(s => s.description);
  }

  // Get history size
  getHistorySize(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length
    };
  }

  // Set max history size
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;

    // Trim existing history if needed
    if (this.undoStack.length > size) {
      this.undoStack = this.undoStack.slice(-size);
    }
  }

  private updateCanStates(): void {
    this.canUndo$.next(this.undoStack.length > 1);
    this.canRedo$.next(this.redoStack.length > 0);
  }

  private deepClone(obj: any): any {
    // Simple deep clone - consider using a library for complex objects
    return JSON.parse(JSON.stringify(obj));
  }
}

// Extension for mapper state integration
@Injectable({
  providedIn: 'root'
})
export class MapperUndoRedoService {
  constructor(
    private undoRedoService: UndoRedoService
  ) {}

  saveMapperState(state: any, action: string): void {
    const description = this.generateDescription(action, state);
    this.undoRedoService.saveState(state, description);
  }

  private generateDescription(action: string, state?: any): string {
    const timestamp = new Date().toLocaleTimeString();

    switch (action) {
      case 'ADD_TARGET':
        return `Added target at ${timestamp}`;
      case 'UPDATE_TARGET':
        return `Updated target at ${timestamp}`;
      case 'DELETE_TARGET':
        return `Deleted target at ${timestamp}`;
      case 'ADD_FIELD_RULE':
        return `Added field rule at ${timestamp}`;
      case 'UPDATE_FIELD_RULE':
        return `Updated field rule at ${timestamp}`;
      case 'DELETE_FIELD_RULE':
        return `Deleted field rule at ${timestamp}`;
      case 'MOVE_TARGET':
        return `Moved target at ${timestamp}`;
      case 'BULK_UPDATE':
        return `Bulk update at ${timestamp}`;
      default:
        return `${action} at ${timestamp}`;
    }
  }

  createUndoableAction(
    type: string,
    undoFn: () => void,
    redoFn: () => void
  ): UndoableAction {
    return {
      type,
      timestamp: new Date(),
      description: this.generateDescription(type),
      undo: undoFn,
      redo: redoFn
    };
  }
}
