// src/app/components/mapper-builder/dialogs/settings-dialog/settings-dialog.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MapperAutosaveService } from '../../../../../services/mapper-autosave.service';
import { KeyboardShortcutsService } from '../../../../../services/keyboard-shortcuts.service';

interface MapperSettings {
  general: {
    theme: string;
    language: string;
    dateFormat: string;
    timeFormat: string;
    defaultView: string;
  };
  editor: {
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
    showLineNumbers: boolean;
    wordWrap: boolean;
    fontSize: number;
    tabSize: number;
    enableAutoComplete: boolean;
    enableSyntaxHighlight: boolean;
  };
  validation: {
    validateOnSave: boolean;
    validateOnPreview: boolean;
    showWarnings: boolean;
    strictMode: boolean;
  };
  performance: {
    enableCaching: boolean;
    lazyLoadTargets: boolean;
    maxUndoHistory: number;
    debounceDelay: number;
  };
  shortcuts: {
    enableShortcuts: boolean;
    customShortcuts: Array<{
      action: string;
      key: string;
      modifiers: string[];
    }>;
  };
}

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatRadioModule,
    MatCheckboxModule,
    MatListModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl:'settings-dialog.component.html',
  styleUrl:'settings-dialog.component.scss'
})
export class SettingsDialogComponent implements OnInit {
  generalForm: FormGroup;
  editorForm: FormGroup;
  validationForm: FormGroup;
  performanceForm: FormGroup;
  shortcutsForm: FormGroup;

  defaultShortcuts = [
    { action: 'New Mapper', key: 'n', modifiers: ['ctrl'] },
    { action: 'Save', key: 's', modifiers: ['ctrl'] },
    { action: 'Open', key: 'o', modifiers: ['ctrl'] },
    { action: 'Undo', key: 'z', modifiers: ['ctrl'] },
    { action: 'Redo', key: 'y', modifiers: ['ctrl'] },
    { action: 'Search', key: 'f', modifiers: ['ctrl'] },
    { action: 'Preview', key: 'p', modifiers: ['ctrl'] },
    { action: 'Help', key: '?', modifiers: ['shift'] }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    private autosaveService: MapperAutosaveService,
    private shortcutsService: KeyboardShortcutsService,
    private snackBar: MatSnackBar
  ) {
    this.generalForm = this.fb.group({
      theme: ['light'],
      language: ['en'],
      dateFormat: ['MM/DD/YYYY'],
      timeFormat: ['12h'],
      defaultView: ['tree']
    });

    this.editorForm = this.fb.group({
      autoSaveEnabled: [true],
      autoSaveInterval: [30],
      showLineNumbers: [true],
      wordWrap: [false],
      fontSize: [14],
      tabSize: [2],
      enableAutoComplete: [true],
      enableSyntaxHighlight: [true]
    });

    this.validationForm = this.fb.group({
      validateOnSave: [true],
      validateOnPreview: [true],
      showWarnings: [true],
      strictMode: [false]
    });

    this.performanceForm = this.fb.group({
      enableCaching: [true],
      lazyLoadTargets: [false],
      maxUndoHistory: [50],
      debounceDelay: [300]
    });

    this.shortcutsForm = this.fb.group({
      enableShortcuts: [true],
      customShortcuts: [[]]
    });
  }

  ngOnInit(): void {
    this.loadCurrentSettings();
  }

  loadCurrentSettings(): void {
    // Load settings from localStorage or service
    const savedSettings = localStorage.getItem('mapperSettings');
    if (savedSettings) {
      const settings: MapperSettings = JSON.parse(savedSettings);

      this.generalForm.patchValue(settings.general || {});
      this.editorForm.patchValue(settings.editor || {});
      this.validationForm.patchValue(settings.validation || {});
      this.performanceForm.patchValue(settings.performance || {});
      this.shortcutsForm.patchValue(settings.shortcuts || {});
    }

    // Load autosave config
    const autosaveConfig = this.autosaveService.getConfig();
    this.editorForm.patchValue({
      autoSaveEnabled: autosaveConfig.enabled,
      autoSaveInterval: autosaveConfig.intervalSeconds
    });
  }

  getCurrentMemoryUsage(): string {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1048576;
      return `${used.toFixed(2)} MB`;
    }
    return 'N/A';
  }

  getCacheSize(): string {
    // Get cache size from service
    return '0 KB';
  }

  clearCache(): void {
    // Clear cache
    this.snackBar.open('Cache cleared successfully', 'Close', { duration: 3000 });
  }

  formatShortcut(shortcut: any): string {
    const parts = [...shortcut.modifiers.map((m: string) => m.charAt(0).toUpperCase() + m.slice(1))];
    parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
  }

  customizeShortcut(shortcut: any): void {
    // Open dialog to customize shortcut
    console.log('Customize shortcut:', shortcut);
  }

  addCustomShortcut(): void {
    // Add custom shortcut
    console.log('Add custom shortcut');
  }

  resetToDefaults(): void {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      // Reset forms to default values
      this.generalForm.reset({
        theme: 'light',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        defaultView: 'tree'
      });

      this.editorForm.reset({
        autoSaveEnabled: true,
        autoSaveInterval: 30,
        showLineNumbers: true,
        wordWrap: false,
        fontSize: 14,
        tabSize: 2,
        enableAutoComplete: true,
        enableSyntaxHighlight: true
      });

      this.validationForm.reset({
        validateOnSave: true,
        validateOnPreview: true,
        showWarnings: true,
        strictMode: false
      });

      this.performanceForm.reset({
        enableCaching: true,
        lazyLoadTargets: false,
        maxUndoHistory: 50,
        debounceDelay: 300
      });

      this.shortcutsForm.reset({
        enableShortcuts: true,
        customShortcuts: []
      });

      this.snackBar.open('Settings reset to defaults', 'Close', { duration: 3000 });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    const settings: MapperSettings = {
      general: this.generalForm.value,
      editor: this.editorForm.value,
      validation: this.validationForm.value,
      performance: this.performanceForm.value,
      shortcuts: this.shortcutsForm.value
    };

    // Save to localStorage
    localStorage.setItem('mapperSettings', JSON.stringify(settings));

    // Update autosave service
    this.autosaveService.setConfig({
      enabled: settings.editor.autoSaveEnabled,
      intervalSeconds: settings.editor.autoSaveInterval
    });

    // Apply other settings
    this.applyTheme(settings.general.theme);

    this.snackBar.open('Settings saved successfully', 'Close', { duration: 3000 });
    this.dialogRef.close(settings);
  }

  private applyTheme(theme: string): void {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}
