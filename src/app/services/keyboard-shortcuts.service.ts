// src/app/services/keyboard-shortcuts.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  action: () => void;
  category?: string;
  enabled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService implements OnDestroy {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private destroy$ = new Subject<void>();
  private activeElement: HTMLElement | null = null;

  constructor() {
    this.initializeGlobalListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGlobalListener(): void {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntil(this.destroy$),
        filter(event => !this.isInputElement(event.target as HTMLElement))
      )
      .subscribe(event => {
        this.handleKeyboardEvent(event);
      });
  }

  private isInputElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      element.contentEditable === 'true';
  }

  private handleKeyboardEvent(event: KeyboardEvent): void {
    const shortcutKey = this.buildShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut && shortcut.enabled !== false) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  }

  private buildShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    parts.push(event.key.toLowerCase());

    return parts.join('+');
  }

  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.buildShortcutKeyFromConfig(shortcut);
    this.shortcuts.set(key, { ...shortcut, enabled: shortcut.enabled ?? true });
  }

  private buildShortcutKeyFromConfig(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.modifiers) {
      if (shortcut.modifiers.includes('ctrl')) parts.push('ctrl');
      if (shortcut.modifiers.includes('alt')) parts.push('alt');
      if (shortcut.modifiers.includes('shift')) parts.push('shift');
    }

    parts.push(shortcut.key.toLowerCase());

    return parts.join('+');
  }

  unregisterShortcut(key: string, modifiers?: string[]): void {
    const shortcutKey = this.buildShortcutKeyFromConfig({
      action(): void {
      }, description: '', key, modifiers: modifiers as any });
    this.shortcuts.delete(shortcutKey);
  }

  enableShortcut(key: string, modifiers?: string[]): void {
    const shortcutKey = this.buildShortcutKeyFromConfig({
      action(): void {
      }, description: '', key, modifiers: modifiers as any });
    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      shortcut.enabled = true;
    }
  }

  disableShortcut(key: string, modifiers?: string[]): void {
    const shortcutKey = this.buildShortcutKeyFromConfig({
      action(): void {
      }, description: '', key, modifiers: modifiers as any });
    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      shortcut.enabled = false;
    }
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.category === category);
  }

  getShortcutDescription(key: string, modifiers?: string[]): string | undefined {
    const shortcutKey = this.buildShortcutKeyFromConfig({
      action(): void {
      }, description: '', key, modifiers: modifiers as any });
    return this.shortcuts.get(shortcutKey)?.description;
  }

  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.modifiers) {
      if (shortcut.modifiers.includes('ctrl')) parts.push('Ctrl');
      if (shortcut.modifiers.includes('alt')) parts.push('Alt');
      if (shortcut.modifiers.includes('shift')) parts.push('Shift');
    }

    parts.push(shortcut.key.toUpperCase());

    return parts.join('+');
  }

  // Predefined shortcut categories
  static readonly CATEGORIES = {
    FILE: 'File Operations',
    EDIT: 'Edit Operations',
    VIEW: 'View Operations',
    NAVIGATION: 'Navigation',
    TOOLS: 'Tools',
    HELP: 'Help'
  };
}

// Keyboard shortcuts dialog component
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-keyboard-shortcuts-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTabsModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <div class="keyboard-shortcuts-dialog">
      <h2 mat-dialog-title>
        <mat-icon>keyboard</mat-icon>
        Keyboard Shortcuts
      </h2>

      <mat-dialog-content>
        <mat-tab-group>
          <mat-tab *ngFor="let category of categories" [label]="category.name">
            <div class="shortcuts-list">
              <mat-list>
                <mat-list-item *ngFor="let shortcut of category.shortcuts">
                  <div matListItemTitle class="shortcut-description">
                    {{ shortcut.description }}
                  </div>
                  <div matListItemMeta class="shortcut-keys">
                    <mat-chip-listbox>
                      <mat-chip>{{ formatShortcut(shortcut) }}</mat-chip>
                    </mat-chip-listbox>
                  </div>
                </mat-list-item>
              </mat-list>
            </div>
          </mat-tab>
        </mat-tab-group>

        <mat-divider></mat-divider>

        <div class="shortcuts-tips">
          <h3>Tips</h3>
          <ul>
            <li>Press <kbd>Shift</kbd> + <kbd>?</kbd> anywhere to open this dialog</li>
            <li>Most shortcuts work when focus is not in an input field</li>
            <li>Use <kbd>Esc</kbd> to cancel operations or close dialogs</li>
            <li>Hold <kbd>Ctrl</kbd> for multi-select operations</li>
          </ul>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Close</button>
        <button mat-button (click)="printShortcuts()">
          <mat-icon>print</mat-icon>
          Print
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .keyboard-shortcuts-dialog {
      min-width: 600px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    .shortcuts-list {
      padding: 16px 0;
      max-height: 400px;
      overflow-y: auto;
    }

    mat-list-item {
      height: auto;
      padding: 8px 0;
    }

    .shortcut-description {
      flex: 1;
      font-size: 14px;
    }

    .shortcut-keys mat-chip {
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      font-weight: 500;
      background-color: #f5f5f5;
      color: #333;
    }

    .shortcuts-tips {
      margin-top: 24px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .shortcuts-tips h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #424242;
    }

    .shortcuts-tips ul {
      margin: 0;
      padding-left: 20px;
    }

    .shortcuts-tips li {
      margin-bottom: 8px;
      font-size: 14px;
      color: #666;
    }

    kbd {
      display: inline-block;
      padding: 3px 6px;
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
      color: #333;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 3px;
      box-shadow: 0 1px 0 #ccc;
    }
  `]
})
export class KeyboardShortcutsDialogComponent implements OnInit {
  categories: { name: string; shortcuts: KeyboardShortcut[] }[] = [];

  constructor(
    private dialogRef: MatDialogRef<KeyboardShortcutsDialogComponent>,
    private shortcutsService: KeyboardShortcutsService
  ) {}

  ngOnInit(): void {
    const allShortcuts = this.shortcutsService.getAllShortcuts();
    const categoryMap = new Map<string, KeyboardShortcut[]>();

    // Group shortcuts by category
    allShortcuts.forEach(shortcut => {
      const category = shortcut.category || 'General';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(shortcut);
    });

    // Convert to array for template
    this.categories = Array.from(categoryMap.entries()).map(([name, shortcuts]) => ({
      name,
      shortcuts: shortcuts.sort((a, b) => a.description.localeCompare(b.description))
    }));
  }

  formatShortcut(shortcut: KeyboardShortcut): string {
    return this.shortcutsService.formatShortcut(shortcut);
  }

  close(): void {
    this.dialogRef.close();
  }

  printShortcuts(): void {
    window.print();
  }
}
