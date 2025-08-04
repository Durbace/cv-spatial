import { Component } from '@angular/core';
import { CvSpaceComponent } from './cv-space/cv-space.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CvSpaceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'cv-spatial';
}
