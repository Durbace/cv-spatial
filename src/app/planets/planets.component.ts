import {
  Component,
  AfterViewInit,
  ElementRef,
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
  @ViewChildren('planetCanvas')
  canvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;

  planetsData: any[] = [];

  constructor(private router: Router, private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.http.get<any[]>('assets/planets.json').subscribe((data) => {
      this.planetsData = data;

      setTimeout(() => {
        this.renderAllPlanets();
      });
    });
  }

  renderAllPlanets() {
    this.canvasRefs.forEach((canvasRef, index) => {
      const canvas = canvasRef.nativeElement;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.z = 2.5;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);

      const texture = new THREE.TextureLoader().load(
        this.planetsData[index].texture
      );
      const geometry = new THREE.SphereGeometry(
        this.planetsData[index].size,
        32,
        32
      );
      const material = new THREE.MeshStandardMaterial({ map: texture });
      const planet = new THREE.Mesh(geometry, material);
      scene.add(planet);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0xffffff, 1.2);
      pointLight.position.set(5, 5, 5);
      scene.add(pointLight);

      const animate = () => {
        requestAnimationFrame(animate);
        planet.rotation.y += 0.01;
        renderer.render(scene, camera);
      };

      animate();
    });
  }

  goBack() {
    this.router.navigateByUrl('/');
  }
}
