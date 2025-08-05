import { Routes } from '@angular/router';
import { PlanetsComponent } from './planets/planets.component';
import { CvSpaceComponent } from './cv-space/cv-space.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: CvSpaceComponent, 
  },
  {
    path: 'planets',
    component: PlanetsComponent,
  },
];
