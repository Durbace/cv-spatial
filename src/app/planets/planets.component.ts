import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('planetCanvas')
  canvasRef!: ElementRef<HTMLCanvasElement>;

  planetsData: any[] = [];
  currentIndex = 0;

  private mesh!: THREE.Mesh;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  constructor(private router: Router, private http: HttpClient) {}

  ngAfterViewInit() {
    this.http.get<any[]>('assets/planets.json').subscribe((data) => {
      this.planetsData = data;
      setTimeout(() => {
        this.initScene();
        this.showPlanet(0);
      }, 0);
    });
  }

  private initScene() {
    const canvas = this.canvasRef.nativeElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(300, 300);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5, 5, 5);
    this.scene.add(key);
  }

  get currentPlanet() {
    return this.planetsData[this.currentIndex];
  }

  showPlanet(index: number) {
    const planet = this.planetsData[index];
    if (!planet) return;
    const texture = new THREE.TextureLoader().load(planet.texture);

    if (this.mesh) {
      this.fadeOut(this.mesh, () => {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.createMesh(texture);
        this.fadeIn();
      });
    } else {
      this.createMesh(texture);
      this.fadeIn();
    }
  }

  private createMesh(texture: THREE.Texture) {
    const radius = 1.2;
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      metalness: 0.1,
      roughness: 0.8,
      emissive: new THREE.Color(0x111111),
      emissiveIntensity: 0.5,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.mesh);
    this.camera.position.set(0, 0, radius * 3);
    this.animate();
  }

  private fadeOut(mesh: THREE.Mesh, done: () => void) {
    let t = 1;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const anim = () => {
      t -= 0.05;
      mat.opacity = t;
      mesh.position.x += 0.02;
      if (t > 0) {
        requestAnimationFrame(anim);
      } else {
        done();
      }
    };
    anim();
  }

  private fadeIn() {
    let t = 0;
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    this.mesh.position.x = -0.4;
    const anim = () => {
      t += 0.05;
      mat.opacity = t;
      this.mesh.position.x += 0.02;
      if (t < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    if (this.mesh) this.mesh.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.planetsData.length;
    this.showPlanet(this.currentIndex);
  }

  prev() {
    this.currentIndex =
      (this.currentIndex - 1 + this.planetsData.length) %
      this.planetsData.length;
    this.showPlanet(this.currentIndex);
  }

  goBack() {
    this.router.navigateByUrl('/');
  }
}
