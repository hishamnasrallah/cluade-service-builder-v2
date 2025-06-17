// src/app/components/mapper-builder/components/mapper-toolbar/mapper-toolbar.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { RouterLink } from '@angular/router';

import { CaseMapper } from '../../../../models/mapper.models';

@Component({
  selector: 'app-mapper-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    RouterLink
  ],
  templateUrl:'mapper-toolbar.component.html',
  styleUrl:'mapper-toolbar.component.scss'
})
export class MapperToolbarComponent {
  @Input() isDirty: boolean | null = false;
  @Input() isLoading: boolean | null = false;
  @Input() currentMapper: CaseMapper | null | undefined = null;

  @Output() newMapper = new EventEmitter<void>();
  @Output() loadMapper = new EventEmitter<void>();
  @Output() saveMapper = new EventEmitter<void>();
  @Output() exportMapper = new EventEmitter<void>();
  @Output() importMapper = new EventEmitter<void>();

  duplicateMapper(): void {
    console.log('Duplicate mapper');
    // TODO: Implement duplicate functionality
  }

  viewHistory(): void {
    console.log('View history');
    // TODO: Implement history viewer
  }

  viewDocumentation(): void {
    window.open('/docs/mapper-builder', '_blank');
  }

  viewKeyboardShortcuts(): void {
    console.log('View keyboard shortcuts');
    // TODO: Show keyboard shortcuts dialog
  }
}
