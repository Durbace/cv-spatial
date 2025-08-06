import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
} from '@angular/core';
import * as THREE from 'three';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-planets',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './planets.component.html',
  styleUrls: ['./planets.component.scss'],
})
export class PlanetsComponent implements AfterViewInit {
  @ViewChild('scrollContainer', { static: false })
  scrollRef!: ElementRef<HTMLDivElement>;

  @ViewChildren('canvasRefs')
  canvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;

  planetsData: any[] = [];
  private meshes: THREE.Mesh[] = [];
  private observersSet = false;

  constructor(private router: Router, private http: HttpClient) {}

  ngAfterViewInit() {
    this.http.get<any[]>('assets/planets.json').subscribe((data) => {
      this.planetsData = data;
      setTimeout(() => {
        this.initAllScenes();
        this.setupObserver();
      }, 0);
    });
  }

  private initAllScenes() {
    this.canvasRefs.forEach((cRef, idx) => {
      const planet = this.planetsData[idx];
      const canvas = cRef.nativeElement;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(0, 0, 1.2 * 3);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(300, 300);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(5, 5, 5);
      scene.add(key);

      const texture = new THREE.TextureLoader().load(planet.texture);
      const geo = new THREE.SphereGeometry(1.2, 64, 64);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        metalness: 0.1,
        roughness: 0.8,
        emissive: new THREE.Color(0x111111),
        emissiveIntensity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.x = 50;
      scene.add(mesh);

      this.meshes.push(mesh);

      const animate = () => {
        requestAnimationFrame(animate);
        mesh.rotation.y += 0.01;
        renderer.render(scene, camera);
      };
      animate();
    });
  }

  private setupObserver() {
    if (this.observersSet) return;
    this.observersSet = true;

    const options = {
      root: this.scrollRef.nativeElement,
      threshold: 0.5,
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sec = entry.target as HTMLElement;
        const sections = Array.from(
          this.scrollRef.nativeElement.querySelectorAll('.planet-section')
        );
        const idx = sections.indexOf(sec);
        if (entry.isIntersecting && idx >= 0) {
          sec.classList.add('visible');
          this.fadeInMesh(this.meshes[idx]);
        } else if (idx >= 0) {
          sec.classList.remove('visible');
          this.fadeOutMesh(this.meshes[idx]);
        }
      });
    }, options);

    const sections =
      this.scrollRef.nativeElement.querySelectorAll('.planet-section');
    sections.forEach((sec) => observer.observe(sec));
  }

  private fadeInMesh(mesh: THREE.Mesh) {
    let t = 0;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mesh.position.x = -0.4;
    const anim = () => {
      t += 0.05;
      mat.opacity = t;
      mesh.position.x += 0.02;
      if (t < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  private fadeOutMesh(mesh: THREE.Mesh) {
    let t = (mesh.material as THREE.MeshStandardMaterial).opacity;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const anim = () => {
      t -= 0.05;
      mat.opacity = t;
      mesh.position.x += 0.02;
      if (t > 0) requestAnimationFrame(anim);
    };
    anim();
  }

  goBack() {
    this.router.navigateByUrl('/');
  }
}
