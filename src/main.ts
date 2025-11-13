import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app/app.component';

bootstrapApplication(App, {
  providers: [provideHttpClient()]
}).catch(err => console.error(err));
