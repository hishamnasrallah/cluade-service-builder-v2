// src/app/components/mapper-builder/dialogs/load-mapper-dialog/load-mapper-dialog.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { CaseMapper } from '../../../../../models/mapper.models';
import { MapperApiService } from '../../../../../services/mapper-api.service';

@Component({
  selector: 'app-load-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  template: `
    <div class="load-mapper-dialog">
      <h2 mat-dialog-title>
        <mat-icon>folder_open</mat-icon>
        Load Mapper
      </h2>

      <mat-dialog-content>
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search mappers</mat-label>
          <input matInput [formControl]="searchControl" placeholder="Search by name or case type">
          <mat-icon matPrefix>search</mat-icon>
          <button
            mat-icon-button
            matSuffix
            *ngIf="searchControl.value"
            (click)="searchControl.setValue('')">
            <mat-icon>clear</mat-icon>
          </button>
        </mat-form-field>

        <div class="mapper-table-container">
          <div *ngIf="loading$ | async" class="loading-overlay">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <table mat-table [dataSource]="filteredMappers$ | async" matSort class="mapper-table">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
              <td mat-cell *matCellDef="let mapper">
                <div class="mapper-name">
                  <strong>{{ mapper.name }}</strong>
                  <span class="version-badge">v{{ mapper.version }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Case Type Column -->
            <ng-container matColumnDef="case_type">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Case Type</th>
              <td mat-cell *matCellDef="let mapper">
                <mat-chip-listbox class="case-type-chip">
                  <mat-chip>{{ mapper.case_type }}</mat-chip>
                </mat-chip-listbox>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let mapper">
                <mat-icon
                  [class]="mapper.active_ind ? 'status-active' : 'status-inactive'"
                  [matTooltip]="mapper.active_ind ? 'Active' : 'Inactive'">
                  {{ mapper.active_ind ? 'check_circle' : 'pause_circle' }}
                </mat-icon>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let mapper">
                <button
                  mat-raised-button
                  color="primary"
                  (click)="selectMapper(mapper)">
                  <mat-icon>folder_open</mat-icon>
                  Load
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="mapper-row"></tr>

            <!-- No Data Row -->
            <tr class="mat-row no-data-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                <div class="no-data">
                  <mat-icon>search_off</mat-icon>
                  <p>No mappers found</p>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">Cancel</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .load-mapper-dialog {
      min-width: 700px;
      max-width: 900px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    .search-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .mapper-table-container {
      position: relative;
      max-height: 400px;
      overflow: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .mapper-table {
      width: 100%;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .mapper-row:hover {
      background-color: #f5f5f5;
    }

    .mapper-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .version-badge {
      font-size: 11px;
      background-color: #e0e0e0;
      padding: 2px 6px;
      border-radius: 10px;
      color: #666;
    }

    .case-type-chip mat-chip {
      min-height: 24px;
      font-size: 12px;
    }

    .status-active {
      color: #4caf50;
    }

    .status-inactive {
      color: #ff9800;
    }

    .no-data-row {
      height: 200px;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #999;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .no-data p {
      margin: 0;
    }
  `]
})
export class LoadMapperDialogComponent implements OnInit {
  searchControl = new FormControl('');
  displayedColumns = ['name', 'case_type', 'status', 'actions'];

  mappers: CaseMapper[] = [];
  filteredMappers$: Observable<CaseMapper[]>;
  loading$ = new Observable<boolean>();

  constructor(
    public dialogRef: MatDialogRef<LoadMapperDialogComponent>,
    private mapperApiService: MapperApiService
  ) {
    this.filteredMappers$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap(search => this.filterMappers(search || ''))
    );
  }

  ngOnInit(): void {
    this.loadMappers();
  }

  loadMappers(): void {
    this.loading$ = of(true);

    this.mapperApiService.getCaseMappers().subscribe({
      next: (mappers) => {
        this.mappers = mappers;
        this.loading$ = of(false);
        // Trigger initial filter
        this.searchControl.updateValueAndValidity();
      },
      error: (error) => {
        console.error('Failed to load mappers:', error);
        this.loading$ = of(false);
      }
    });
  }

  filterMappers(search: string): Observable<CaseMapper[]> {
    if (!search) {
      return of(this.mappers);
    }

    const searchLower = search.toLowerCase();
    const filtered = this.mappers.filter(mapper =>
      mapper.name.toLowerCase().includes(searchLower) ||
      mapper.case_type.toLowerCase().includes(searchLower)
    );

    return of(filtered);
  }

  selectMapper(mapper: CaseMapper): void {
    this.dialogRef.close(mapper);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
