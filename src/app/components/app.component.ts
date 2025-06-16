// src/app/components/app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterOutlet, Router, RouterLink} from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../services/auth.service';
import {MatDivider} from '@angular/material/divider';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    MatDivider
  ],
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" class="app-toolbar">
        <span>Workflow Builder</span>
        <span class="spacer"></span>

        <!-- Main Navigation -->
        <button mat-button routerLink="/workflow">
          <mat-icon>account_tree</mat-icon>
          Workflow
        </button>

        <button mat-button routerLink="/approval-flow">
          <mat-icon>rule</mat-icon>
          Approval Flows
        </button>

        <button mat-button routerLink="/mapper-builder">
          <mat-icon>settings_input_component</mat-icon>
          Mapper Builder
        </button>

        <!-- More Menu -->
        <button mat-icon-button [matMenuTriggerFor]="appMenu">
          <mat-icon>more_vert</mat-icon>
        </button>

        <mat-menu #appMenu="matMenu">
          <button mat-menu-item routerLink="/config">
            <mat-icon>settings</mat-icon>
            <span>Configuration</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item *ngIf="authService.isAuthenticated()" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-toolbar {
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1000;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .app-content {
      flex: 1;
      overflow: hidden;
      background-color: #f5f5f5;
    }

    /* Button styling */
    mat-toolbar button {
      margin: 0 4px;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      mat-toolbar button span {
        display: none;
      }

      mat-toolbar button mat-icon {
        margin-right: 0;
      }
    }
  `]
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
