// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
// import { appConfig } from './app/app.config';
// import { AppComponent } from './app/app.component';
import {appConfig} from './app.config';
import {AppComponent} from './app.component';


bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
