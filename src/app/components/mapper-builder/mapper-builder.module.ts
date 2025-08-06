// src/app/components/mapper-builder/mapper-builder.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

// Only import the main component since it's standalone
import { MapperBuilderComponent } from './mapper-builder.component';

// Services only - no components since they're standalone
import { MapperApiService } from '../../services/mapper-api.service';
import { MapperStateService } from '../../services/mapper-state.service';
import { MapperValidationService } from '../../services/mapper-validation.service';

// Routes
const routes: Routes = [
  {
    path: '',
    component: MapperBuilderComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild(routes),
    // Import the standalone component here
    MapperBuilderComponent
  ],
  providers: [
    MapperApiService,
    MapperStateService,
    MapperValidationService
  ]
})
export class MapperBuilderModule { }
