import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  HostListener,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type Planet = {
  distance: number;
  texture: string;
  name: string;
  label: string;
  description: string;
  size: number;
  thumb?: string;
};

@Component({
  selector: 'app-planets',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './planets.component.html',
  styleUrls: ['./planets.component.scss'],
  encapsulation: ViewEncapsulation.None, 
})
export class PlanetsComponent implements OnInit, OnDestroy {
  @ViewChild('wrap',  { static: false }) wrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('track', { static: false }) trackRef!: ElementRef<HTMLDivElement>;

  planetsData: Planet[] = [];
  activeIndex = 0;

  private touchStartX = 0;
  private touchStartY = 0;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.http.get<Planet[]>('assets/planets.json').subscribe({
      next: (data) => {
        this.planetsData = (data || []).map(p => ({ ...p, thumb: p.thumb ?? p.texture }));
        this.cdr.detectChanges(); 
        setTimeout(() => this.center(this.activeIndex), 0); 
      },
      error: (err) => {
        console.error('[planets] json load fail', err);
        this.planetsData = [{
          distance: 4,
          texture: 'assets/planets/2k_mars.jpg',
          name: 'Fallback',
          label: 'Mars (fallback)',
          description: 'JSON-ul nu s-a încărcat.',
          size: 0.8,
          thumb: 'assets/planets/2k_mars.jpg'
        }];
        this.cdr.detectChanges();
        setTimeout(() => this.center(this.activeIndex), 0);
      }
    });
  }

  private center(i: number, retries = 5) {
    const track = this.trackRef?.nativeElement;
    const wrap  = this.wrapRef?.nativeElement;
    if (!track || !wrap) {
      if (retries > 0) setTimeout(() => this.center(i, retries - 1), 50);
      return;
    }

    const cards = Array.from(track.children) as HTMLElement[];
    const card = cards[i];
    if (!card) {
      if (retries > 0) setTimeout(() => this.center(i, retries - 1), 50);
      return;
    }

    const isMobile = matchMedia('(max-width:767px)').matches;
    const axis = isMobile ? 'top' : 'left';
    const size = isMobile ? 'clientHeight' : 'clientWidth';
    const start = isMobile ? card.offsetTop : card.offsetLeft;

    wrap.scrollTo({
      [axis]: start - (wrap[size] / 2 - card[size] / 2),
      behavior: 'smooth',
    } as ScrollToOptions);
  }

  activate(i: number) {
    if (i === this.activeIndex) return;
    this.activeIndex = Math.max(0, Math.min(i, this.planetsData.length - 1));
    this.center(this.activeIndex);
  }
  go(step: number) { this.activate(this.activeIndex + step); }

  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }
  onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    const isMobile = matchMedia('(max-width:767px)').matches;
    if (isMobile ? Math.abs(dy) > 60 : Math.abs(dx) > 60) {
      this.go((isMobile ? dy : dx) > 0 ? -1 : 1);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) this.go(1);
    if (['ArrowLeft', 'ArrowUp'].includes(e.key)) this.go(-1);
  }

  ngOnDestroy() {}

  onDetails(planet: Planet) { console.log('Details for:', planet); }
  goBack() { this.router.navigateByUrl('/'); }
}
