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
import {MatTooltip, MatTooltipModule} from '@angular/material/tooltip';
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
    MatChipsModule,
    MatTooltip
  ],
  templateUrl:'load-mapper-dialog.component.html',
  styleUrl:'load-mapper-dialog.component.scss'
})
export class LoadMapperDialogComponent implements OnInit {
  searchControl = new FormControl('');
  displayedColumns = ['name', 'case_type', 'status', 'actions'];

  mappers: CaseMapper[] = [];
  dataSource: CaseMapper[] = []; // Add this
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

    // Subscribe to update dataSource
    this.filteredMappers$.subscribe(mappers => {
      this.dataSource = mappers;
    });
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