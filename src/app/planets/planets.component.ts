import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  HostListener,
  ViewEncapsulation,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as THREE from 'three';

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
  @ViewChild('wrap', { static: false }) wrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('track', { static: false }) trackRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('planetCanvas') planetCanvasList!: QueryList<ElementRef>;

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
        this.planetsData = (data || []).map((p) => ({
          ...p,
          thumb: p.thumb ?? p.texture,
        }));
        this.cdr.detectChanges();
        setTimeout(() => this.center(this.activeIndex), 0);
      },
      error: (err) => {
        console.error('[planets] json load fail', err);
        this.planetsData = [
          {
            distance: 4,
            texture: 'assets/planets/2k_mars.jpg',
            name: 'Fallback',
            label: 'Mars (fallback)',
            description: 'JSON-ul nu s-a încărcat.',
            size: 0.8,
            thumb: 'assets/planets/2k_mars.jpg',
          },
        ];
        this.cdr.detectChanges();
        setTimeout(() => this.center(this.activeIndex), 0);
      },
    });
  }

  private center(i: number, retries = 5) {
    const track = this.trackRef?.nativeElement;
    const wrap = this.wrapRef?.nativeElement;
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

  const container = this.planetCanvasList.toArray()[i]?.nativeElement;
  if (container) {
    setTimeout(() => {
      this.initPlanet(this.planetsData[i].texture, container);
    }, 600); 
  }
}


  go(step: number) {
    this.activate(this.activeIndex + step);
  }

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

  onDetails(planet: Planet) {
    console.log('Details for:', planet);
  }
  goBack() {
    this.router.navigateByUrl('/');
  }

  initPlanet(textureUrl: string, container: HTMLElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight || 1,
    0.1,
    1000
  );
  camera.position.z = 3;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });

  const dpr = Math.min(2, window.devicePixelRatio || 1); 
  renderer.setPixelRatio(dpr);
  renderer.setSize(container.clientWidth, container.clientHeight, false);

  container.innerHTML = ''; 
  container.appendChild(renderer.domElement);

  const geometry = new THREE.SphereGeometry(1, 96, 96);

  const loader = new THREE.TextureLoader();
  const texture = loader.load(textureUrl, () => {
    renderer.render(scene, camera);
  });

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const material = new THREE.MeshStandardMaterial({ map: texture });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 3, 5);
  scene.add(light);

  const animate = () => {
    requestAnimationFrame(animate);
    sphere.rotation.y += 0.002;
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    const { clientWidth, clientHeight } = container;
    camera.aspect = (clientWidth || 1) / (clientHeight || 1);
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  };
  window.addEventListener('resize', onResize);
}
}
