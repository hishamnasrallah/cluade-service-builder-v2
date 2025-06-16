// src/app/components/mapper-builder/dialogs/new-mapper-dialog/new-mapper-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-new-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="new-mapper-dialog">
      <h2 mat-dialog-title>
        <mat-icon>add_circle</mat-icon>
        Create New Mapper
      </h2>

      <mat-dialog-content>
        <form [formGroup]="newMapperForm">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Mapper Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter mapper name">
            <mat-error *ngIf="newMapperForm.get('name')?.hasError('required')">
              Name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Case Type</mat-label>
            <mat-select formControlName="caseType">
              <mat-option *ngFor="let type of data.caseTypes" [value]="type">
                {{ type }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="newMapperForm.get('caseType')?.hasError('required')">
              Case type is required
            </mat-error>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          (click)="create()"
          [disabled]="!newMapperForm.valid">
          <mat-icon>add</mat-icon>
          Create
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .new-mapper-dialog {
      min-width: 400px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 16px;
    }

    .full-width {
      width: 100%;
    }
  `]
})
export class NewMapperDialogComponent {
  newMapperForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<NewMapperDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { caseTypes: string[] }
  ) {
    this.newMapperForm = this.fb.group({
      name: ['', Validators.required],
      caseType: ['', Validators.required]
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  create(): void {
    if (this.newMapperForm.valid) {
      this.dialogRef.close(this.newMapperForm.value);
    }
  }
}

// src/app/components/mapper-builder/dialogs/validation-errors-dialog/validation-errors-dialog.component.ts

import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-validation-errors-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <div class="validation-errors-dialog">
      <h2 mat-dialog-title>
        <mat-icon color="warn">warning</mat-icon>
        Validation Errors Found
      </h2>

      <mat-dialog-content>
        <p class="error-summary">
          {{ data.errors.length }} validation error{{ data.errors.length > 1 ? 's' : '' }} found in the mapper configuration:
        </p>

        <mat-list class="error-list">
          <mat-list-item *ngFor="let error of data.errors; let i = index">
            <mat-icon matListItemIcon color="warn">error_outline</mat-icon>
            <div matListItemTitle>Error #{{ i + 1 }}</div>
            <div matListItemLine>{{ error }}</div>
          </mat-list-item>
        </mat-list>

        <mat-divider></mat-divider>

        <p class="warning-message">
          <mat-icon>info</mat-icon>
          You can still save the mapper with errors, but it may not function correctly until the issues are resolved.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">Go Back & Fix</button>
        <button
          mat-raised-button
          color="warn"
          (click)="forceSave()">
          Save Anyway
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .validation-errors-dialog {
      min-width: 500px;
      max-width: 600px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      color: #d32f2f;
    }

    .error-summary {
      margin-bottom: 16px;
      font-weight: 500;
    }

    .error-list {
      max-height: 300px;
      overflow-y: auto;
      background-color: #ffebee;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .error-list mat-list-item {
      height: auto;
      min-height: 48px;
    }

    .warning-message {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background-color: #fff3cd;
      border-radius: 4px;
      color: #856404;
    }

    .warning-message mat-icon {
      color: #ffc107;
    }
  `]
})
export class ValidationErrorsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ValidationErrorsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { errors: string[] }
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  forceSave(): void {
    this.dialogRef.close(true);
  }
}
