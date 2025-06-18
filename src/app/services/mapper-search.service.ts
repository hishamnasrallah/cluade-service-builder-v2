// src/app/services/mapper-search.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MapperTarget, MapperFieldRule } from '../models/mapper.models';

export interface SearchResult {
  type: 'target' | 'field' | 'transform' | 'condition';
  id: string;
  parentId?: string;
  name: string;
  path: string;
  match: string;
  context?: string;
  score: number;
}

export interface SearchOptions {
  searchTargets: boolean;
  searchFields: boolean;
  searchTransforms: boolean;
  searchConditions: boolean;
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWord: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MapperSearchService {
  private resultsSubject$ = new BehaviorSubject<SearchResult[]>([]);
  private searchingSubject$ = new BehaviorSubject<boolean>(false);

  results$ = this.resultsSubject$.asObservable();
  searching$ = this.searchingSubject$.asObservable();

  private lastQuery = '';
  private lastOptions: SearchOptions = this.getDefaultOptions();

  search(
    query: string,
    targets: MapperTarget[],
    options: SearchOptions = this.getDefaultOptions()
  ): void {
    this.lastQuery = query;
    this.lastOptions = options;

    if (!query.trim()) {
      this.resultsSubject$.next([]);
      return;
    }

    this.searchingSubject$.next(true);
    const results: SearchResult[] = [];

    try {
      const searchPattern = this.buildSearchPattern(query, options);

      // Search through targets
      if (options.searchTargets) {
        results.push(...this.searchTargets(targets, searchPattern));
      }

      // Search through field rules
      if (options.searchFields) {
        results.push(...this.searchFieldRules(targets, searchPattern));
      }

      // Search through transforms
      if (options.searchTransforms) {
        results.push(...this.searchTransforms(targets, searchPattern));
      }

      // Search through conditions
      if (options.searchConditions) {
        results.push(...this.searchConditions(targets, searchPattern));
      }

      // Sort by relevance score
      results.sort((a, b) => b.score - a.score);

      this.resultsSubject$.next(results);
    } catch (error) {
      console.error('Search error:', error);
      this.resultsSubject$.next([]);
    } finally {
      this.searchingSubject$.next(false);
    }
  }

  private buildSearchPattern(query: string, options: SearchOptions): RegExp {
    let pattern = query;

    // Escape special regex characters if not using regex
    if (!options.useRegex) {
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Add word boundaries if whole word search
    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    const flags = options.caseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  }

  private searchTargets(targets: MapperTarget[], pattern: RegExp): SearchResult[] {
    const results: SearchResult[] = [];

    const searchTarget = (target: MapperTarget, path: string = '') => {
      const currentPath = path ? `${path} > ${target.name}` : target.name;

      // Search in target name
      const nameMatches = target.name.match(pattern);
      if (nameMatches) {
        results.push({
          type: 'target',
          id: target.id!,
          name: target.name,
          path: currentPath,
          match: nameMatches[0],
          context: this.getContext(target.name, nameMatches.index!),
          score: this.calculateScore(nameMatches[0], target.name)
        });
      }

      // Search in model name
      const modelMatches = target.model.match(pattern);
      if (modelMatches) {
        results.push({
          type: 'target',
          id: target.id!,
          name: target.name,
          path: currentPath,
          match: modelMatches[0],
          context: `Model: ${this.getContext(target.model, modelMatches.index!)}`,
          score: this.calculateScore(modelMatches[0], target.model) * 0.8
        });
      }

      // Search child targets
      if (target.children) {
        target.children.forEach(child => searchTarget(child, currentPath));
      }
    };

    targets.forEach(target => searchTarget(target));
    return results;
  }

  private searchFieldRules(targets: MapperTarget[], pattern: RegExp): SearchResult[] {
    const results: SearchResult[] = [];

    const searchTarget = (target: MapperTarget, path: string = '') => {
      const currentPath = path ? `${path} > ${target.name}` : target.name;

      if (target.field_rules) {
        target.field_rules.forEach(rule => {
          // Search in JSON path
          const pathMatches = rule.json_path.match(pattern);
          if (pathMatches) {
            results.push({
              type: 'field',
              id: `${target.id}_rule_${rule.id}`,
              parentId: target.id,
              name: `${rule.target_field} ← ${rule.json_path}`,
              path: currentPath,
              match: pathMatches[0],
              context: this.getContext(rule.json_path, pathMatches.index!),
              score: this.calculateScore(pathMatches[0], rule.json_path)
            });
          }

          // Search in target field
          const fieldMatches = rule.target_field.match(pattern);
          if (fieldMatches) {
            results.push({
              type: 'field',
              id: `${target.id}_rule_${rule.id}`,
              parentId: target.id,
              name: `${rule.target_field} ← ${rule.json_path}`,
              path: currentPath,
              match: fieldMatches[0],
              context: this.getContext(rule.target_field, fieldMatches.index!),
              score: this.calculateScore(fieldMatches[0], rule.target_field)
            });
          }

          // Search in default value
          if (rule.default_value) {
            const defaultMatches = rule.default_value.match(pattern);
            if (defaultMatches) {
              results.push({
                type: 'field',
                id: `${target.id}_rule_${rule.id}`,
                parentId: target.id,
                name: `${rule.target_field} ← ${rule.json_path}`,
                path: currentPath,
                match: defaultMatches[0],
                context: `Default: ${this.getContext(rule.default_value, defaultMatches.index!)}`,
                score: this.calculateScore(defaultMatches[0], rule.default_value) * 0.7
              });
            }
          }
        });
      }

      // Search child targets
      if (target.children) {
        target.children.forEach(child => searchTarget(child, currentPath));
      }
    };

    targets.forEach(target => searchTarget(target));
    return results;
  }

  private searchTransforms(targets: MapperTarget[], pattern: RegExp): SearchResult[] {
    const results: SearchResult[] = [];

    const searchTarget = (target: MapperTarget, path: string = '') => {
      const currentPath = path ? `${path} > ${target.name}` : target.name;

      if (target.field_rules) {
        target.field_rules.forEach(rule => {
          if (rule.transform_function_path) {
            const matches = rule.transform_function_path.match(pattern);
            if (matches) {
              results.push({
                type: 'transform',
                id: `${target.id}_rule_${rule.id}`,
                parentId: target.id,
                name: `${rule.target_field} ← ${rule.json_path}`,
                path: currentPath,
                match: matches[0],
                context: `Transform: ${this.getContext(rule.transform_function_path, matches.index!)}`,
                score: this.calculateScore(matches[0], rule.transform_function_path) * 0.8
              });
            }
          }
        });
      }

      // Search child targets
      if (target.children) {
        target.children.forEach(child => searchTarget(child, currentPath));
      }
    };

    targets.forEach(target => searchTarget(target));
    return results;
  }

  private searchConditions(targets: MapperTarget[], pattern: RegExp): SearchResult[] {
    const results: SearchResult[] = [];

    const searchTarget = (target: MapperTarget, path: string = '') => {
      const currentPath = path ? `${path} > ${target.name}` : target.name;

      if (target.field_rules) {
        target.field_rules.forEach(rule => {
          if (rule.condition_expression) {
            const matches = rule.condition_expression.match(pattern);
            if (matches) {
              results.push({
                type: 'condition',
                id: `${target.id}_rule_${rule.id}`,
                parentId: target.id,
                name: `${rule.target_field} ← ${rule.json_path}`,
                path: currentPath,
                match: matches[0],
                context: `Condition: ${this.getContext(rule.condition_expression, matches.index!)}`,
                score: this.calculateScore(matches[0], rule.condition_expression) * 0.7
              });
            }
          }
        });
      }

      // Search child targets
      if (target.children) {
        target.children.forEach(child => searchTarget(child, currentPath));
      }
    };

    targets.forEach(target => searchTarget(target));
    return results;
  }

  private getContext(text: string, matchIndex: number, contextLength: number = 40): string {
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(text.length, matchIndex + contextLength);

    let context = text.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  private calculateScore(match: string, fullText: string): number {
    // Higher score for exact matches
    if (match === fullText) return 100;

    // Higher score for matches at the beginning
    if (fullText.startsWith(match)) return 90;

    // Higher score for complete word matches
    if (fullText.split(/\W+/).includes(match)) return 80;

    // Base score based on match length relative to full text
    return Math.round((match.length / fullText.length) * 70);
  }

  getDefaultOptions(): SearchOptions {
    return {
      searchTargets: true,
      searchFields: true,
      searchTransforms: true,
      searchConditions: true,
      caseSensitive: false,
      useRegex: false,
      wholeWord: false
    };
  }

  clearResults(): void {
    this.resultsSubject$.next([]);
  }

  getLastQuery(): string {
    return this.lastQuery;
  }

  getLastOptions(): SearchOptions {
    return this.lastOptions;
  }
}

// Search Dialog Component
import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-mapper-search-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatListModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatExpansionModule,
    MatBadgeModule
  ],
  template: `
    <div class="mapper-search-dialog">
      <h2 mat-dialog-title>
        <mat-icon>search</mat-icon>
        Search in Mapper
      </h2>

      <mat-dialog-content>
        <div class="search-section">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search for...</mat-label>
            <input
              #searchInput
              matInput
              [formControl]="searchControl"
              placeholder="Enter search term..."
              (keydown.escape)="close()"
              autocomplete="off">
            <mat-icon matPrefix>search</mat-icon>
            <button
              mat-icon-button
              matSuffix
              *ngIf="searchControl.value"
              (click)="searchControl.setValue('')">
              <mat-icon>clear</mat-icon>
            </button>
          </mat-form-field>

          <div class="search-options">
            <mat-checkbox [(ngModel)]="options.searchTargets">
              <mat-icon>account_tree</mat-icon>
              Targets
            </mat-checkbox>
            <mat-checkbox [(ngModel)]="options.searchFields">
              <mat-icon>rule</mat-icon>
              Field Rules
            </mat-checkbox>
            <mat-checkbox [(ngModel)]="options.searchTransforms">
              <mat-icon>transform</mat-icon>
              Transforms
            </mat-checkbox>
            <mat-checkbox [(ngModel)]="options.searchConditions">
              <mat-icon>code</mat-icon>
              Conditions
            </mat-checkbox>
          </div>

          <mat-expansion-panel class="advanced-options">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>tune</mat-icon>
                Advanced Options
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="advanced-options-content">
              <mat-checkbox [(ngModel)]="options.caseSensitive">
                Case Sensitive
              </mat-checkbox>
              <mat-checkbox [(ngModel)]="options.wholeWord">
                Whole Word Only
              </mat-checkbox>
              <mat-checkbox [(ngModel)]="options.useRegex">
                Use Regular Expression
              </mat-checkbox>
            </div>
          </mat-expansion-panel>
        </div>

        <mat-progress-bar
          *ngIf="searching$ | async"
          mode="indeterminate"
          class="search-progress">
        </mat-progress-bar>

        <div class="results-section">
          <div class="results-header" *ngIf="(results$ | async) as results">
            <h3>Results</h3>
            <mat-chip-listbox>
              <mat-chip>{{ results.length }} found</mat-chip>
            </mat-chip-listbox>
          </div>

          <mat-list class="results-list" *ngIf="(results$ | async) as results">
            <mat-list-item
              *ngFor="let result of results"
              (click)="selectResult(result)"
              class="result-item"
              [class.selected]="selectedResult === result">

              <mat-icon matListItemIcon [class]="'result-icon-' + result.type">
                {{ getResultIcon(result.type) }}
              </mat-icon>

              <div matListItemTitle class="result-title">
                <span [innerHTML]="highlightMatch(result.name, result.match)"></span>
                <mat-chip class="result-type">{{ result.type }}</mat-chip>
              </div>

              <div matListItemLine class="result-path">
                <mat-icon>folder_open</mat-icon>
                {{ result.path }}
              </div>

              <div matListItemLine class="result-context" *ngIf="result.context">
                <span [innerHTML]="highlightMatch(result.context, result.match)"></span>
              </div>

              <div matListItemMeta class="result-score">
                <mat-icon
                  [style.color]="getScoreColor(result.score)"
                  matTooltip="Relevance: {{ result.score }}%">
                  {{ getScoreIcon(result.score) }}
                </mat-icon>
              </div>
            </mat-list-item>

            <div class="no-results" *ngIf="results.length === 0 && searchControl.value">
              <mat-icon>search_off</mat-icon>
              <p>No results found for "{{ searchControl.value }}"</p>
              <p class="suggestions">Try different keywords or adjust search options</p>
            </div>
          </mat-list>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Close</button>
        <button
          mat-raised-button
          color="primary"
          [disabled]="!selectedResult"
          (click)="navigateToResult()">
          <mat-icon>open_in_new</mat-icon>
          Go to Selection
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .mapper-search-dialog {
      min-width: 600px;
      max-width: 800px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    .search-section {
      margin-bottom: 24px;
    }

    .search-field {
      width: 100%;
    }

    .search-options {
      display: flex;
      gap: 16px;
      margin: 16px 0;
      flex-wrap: wrap;
    }

    .search-options mat-checkbox {
      display: flex;
      align-items: center;
    }

    .search-options mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 4px;
      color: #666;
    }

    .advanced-options {
      margin-top: 16px;
    }

    .advanced-options-content {
      display: flex;
      gap: 16px;
      padding: 16px 0;
    }

    .search-progress {
      margin: 16px 0;
    }

    .results-section {
      min-height: 300px;
      max-height: 500px;
      display: flex;
      flex-direction: column;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .results-header h3 {
      margin: 0;
      font-size: 16px;
      color: #424242;
    }

    .results-list {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .result-item {
      cursor: pointer;
      transition: background-color 0.2s ease;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
    }

    .result-item:hover {
      background-color: #f5f5f5;
    }

    .result-item.selected {
      background-color: #e3f2fd;
    }

    .result-icon-target {
      color: #1976d2;
    }

    .result-icon-field {
      color: #388e3c;
    }

    .result-icon-transform {
      color: #f57c00;
    }

    .result-icon-condition {
      color: #7b1fa2;
    }

    .result-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
    }

    .result-type {
      font-size: 11px;
      min-height: 20px;
      padding: 2px 8px;
      text-transform: uppercase;
    }

    .result-path {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #666;
      margin: 4px 0;
    }

    .result-path mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .result-context {
      font-size: 13px;
      color: #666;
      font-family: 'Roboto Mono', monospace;
      background-color: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      margin-top: 4px;
    }

    .result-score mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      color: #999;
    }

    .no-results mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    .no-results p {
      margin: 0 0 8px 0;
    }

    .suggestions {
      font-size: 14px;
      color: #666;
    }

    ::ng-deep .search-highlight {
      background-color: #ffeb3b;
      font-weight: 500;
      padding: 2px 4px;
      border-radius: 2px;
    }
  `]
})
export class MapperSearchDialogComponent implements OnInit {
  @ViewChild('searchInput', { static: true }) searchInputRef!: ElementRef<HTMLInputElement>;

  searchControl = new FormControl('');
  options: SearchOptions;
  selectedResult: SearchResult | null = null;

  results$ = this.searchService.results$;
  searching$ = this.searchService.searching$;

  private resultIcons: { [key: string]: string } = {
    'target': 'account_tree',
    'field': 'rule',
    'transform': 'transform',
    'condition': 'code'
  };

  constructor(
    private dialogRef: MatDialogRef<MapperSearchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { targets: MapperTarget[] },
    private searchService: MapperSearchService
  ) {
    this.options = this.searchService.getDefaultOptions();
  }

  ngOnInit(): void {
    // Focus search input
    setTimeout(() => {
      this.searchInputRef.nativeElement.focus();
    }, 100);

    // Setup search
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        if (query) {
          this.searchService.search(query, this.data.targets, this.options);
        } else {
          this.searchService.clearResults();
        }
      });

    // Restore last search if any
    const lastQuery = this.searchService.getLastQuery();
    if (lastQuery) {
      this.searchControl.setValue(lastQuery);
      this.options = this.searchService.getLastOptions();
    }
  }

  getResultIcon(type: string): string {
    return this.resultIcons[type] || 'help';
  }

  getScoreIcon(score: number): string {
    if (score >= 90) return 'star';
    if (score >= 70) return 'star_half';
    return 'star_border';
  }

  getScoreColor(score: number): string {
    if (score >= 90) return '#ffc107';
    if (score >= 70) return '#ff9800';
    return '#9e9e9e';
  }

  highlightMatch(text: string, match: string): string {
    if (!match) return text;

    const regex = new RegExp(`(${this.escapeRegExp(match)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  private escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  selectResult(result: SearchResult): void {
    this.selectedResult = result;
  }

  navigateToResult(): void {
    if (this.selectedResult) {
      this.dialogRef.close({
        action: 'navigate',
        result: this.selectedResult
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
