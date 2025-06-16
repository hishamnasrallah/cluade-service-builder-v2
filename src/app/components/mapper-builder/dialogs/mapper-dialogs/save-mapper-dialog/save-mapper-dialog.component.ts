// src/app/components/mapper-builder/dialogs/save-mapper-dialog/save-mapper-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { CaseMapper } from '../../../../../models/mapper.models';

@Component({
  selector: 'app-save-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <div class="save-mapper-dialog">
      <h2 mat-dialog-title>
        <mat-icon>save</mat-icon>
        Save Mapper Configuration
      </h2>

      <mat-dialog-content>
        <form [formGroup]="saveForm">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Mapper Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter mapper name">
            <mat-error *ngIf="saveForm.get('name')?.hasError('required')">
              Name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea
              matInput
              formControlName="description"
              rows="3"
              placeholder="Enter description (optional)">
            </textarea>
          </mat-form-field>

          <div class="metadata-section">
            <h3>Metadata</h3>
            <div class="metadata-chips">
              <mat-chip-listbox>
                <mat-chip disabled>
                  <mat-icon>label</mat-icon>
                  Case Type: {{ data.mapper.case_type }}
                </mat-chip>
                <mat-chip disabled>
                  <mat-icon>history</mat-icon>
                  Version: {{ data.mapper.version }}
                </mat-chip>
                <mat-chip disabled>
                  <mat-icon>account_tree</mat-icon>
                  Targets: {{ data.targetCount }}
                </mat-chip>
                <mat-chip disabled>
                  <mat-icon>rule</mat-icon>
                  Rules: {{ data.ruleCount }}
                </mat-chip>
              </mat-chip-listbox>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="options-section">
            <h3>Save Options</h3>

            <mat-slide-toggle formControlName="activate">
              Activate mapper after saving
            </mat-slide-toggle>

            <mat-slide-toggle formControlName="createVersion">
              Create new version (keep current as backup)
            </mat-slide-toggle>

            <mat-slide-toggle formControlName="validateBeforeSave">
              Validate configuration before saving
            </mat-slide-toggle>
          </div>

          <div class="info-message" *ngIf="saveForm.get('createVersion')?.value">
            <mat-icon>info</mat-icon>
            <p>A new version will be created. The current version will be preserved and marked as inactive.</p>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          (click)="save()"
          [disabled]="!saveForm.valid">
          <mat-icon>save</mat-icon>
          Save Mapper
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .save-mapper-dialog {
      min-width: 500px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    .full-width {
      width: 100%;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .metadata-section,
    .options-section {
      margin: 16px 0;
    }

    .metadata-section h3,
    .options-section h3 {
      margin: 0 0 12px 0;
      color: #666;
      font-size: 16px;
    }

    .metadata-chips mat-chip {
      font-size: 12px;
    }

    .metadata-chips mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    mat-slide-toggle {
      display: block;
      margin-bottom: 12px;
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: #e3f2fd;
      border-radius: 4px;
      margin-top: 16px;
    }

    .info-message mat-icon {
      color: #1976d2;
    }

    .info-message p {
      margin: 0;
      font-size: 13px;
      color: #333;
    }
  `]
})
export class SaveMapperDialogComponent {
  saveForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SaveMapperDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      mapper: CaseMapper;
      targetCount: number;
      ruleCount: number;
    }
  ) {
    this.saveForm = this.fb.group({
      name: [data.mapper.name, Validators.required],
      description: [''],
      activate: [true],
      createVersion: [false],
      validateBeforeSave: [true]
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.saveForm.valid) {
      this.dialogRef.close(this.saveForm.value);
    }
  }
}
