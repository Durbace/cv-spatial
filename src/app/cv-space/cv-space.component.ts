import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

@Component({
  selector: 'app-cv-space',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cv-space.component.html',
  styleUrls: ['./cv-space.component.scss'],
})
export class CvSpaceComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private planetGroup = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  selectedPlanet: { name: string; description: string } | null = null;
  private hoveredPlanet: THREE.Mesh | null = null;
  private glowSprite!: THREE.Sprite;
  private glowScaleDirection = 1;

  ngAfterViewInit(): void {
    this.initScene();
    this.animate();
    this.canvasRef.nativeElement.addEventListener('click', this.onClick);
    this.canvasRef.nativeElement.addEventListener(
      'mousemove',
      this.onMouseMove
    );
  }

  initScene(): void {
    const canvas = this.canvasRef.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 15);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffcc33,
      emissiveIntensity: 1.2,
      metalness: 0.2,
      roughness: 0.3,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(sun);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('assets/sun-glow.png', (glowTexture) => {
      const spriteMat = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffdd88,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
      this.glowSprite = new THREE.Sprite(spriteMat);
      this.glowSprite.scale.set(6, 6, 1);
      sun.add(this.glowSprite);
    });

    this.addPlanet(
      4,
      0x3399ff,
      'Experiență',
      'Am lucrat ca developer în mai multe proiecte interesante...'
    );
    this.addPlanet(
      6,
      0x66ff66,
      'Educație',
      'Am absolvit Facultatea de Matematică și Informatică...'
    );

    this.addStars();

    this.scene.add(this.planetGroup);
  }

  addPlanet(
    distance: number,
    color: number,
    name: string,
    description: string
  ): void {
    const geo = new THREE.SphereGeometry(0.6, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color });
    const planet = new THREE.Mesh(geo, mat);

    planet.userData = {
      angle: Math.random() * Math.PI * 2,
      distance,
      name,
      description,
    };

    this.planetGroup.add(planet);
  }

  addStars(): void {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  animate = (): void => {
    requestAnimationFrame(this.animate);

    this.planetGroup.children.forEach((planet: any) => {
      planet.userData.angle += 0.0025;
      planet.position.set(
        Math.cos(planet.userData.angle) * planet.userData.distance,
        0,
        Math.sin(planet.userData.angle) * planet.userData.distance
      );
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  onClick = (event: MouseEvent): void => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.planetGroup.children
    );

    if (intersects.length > 0) {
      const planet = intersects[0].object;
      const { name, description } = planet.userData;
      this.selectedPlanet = { name, description };
    } else {
      this.selectedPlanet = null;
    }
  };

  onMouseMove = (event: MouseEvent): void => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.planetGroup.children
    );

    if (intersects.length > 0) {
      const planet = intersects[0].object as THREE.Mesh;

      if (this.hoveredPlanet && this.hoveredPlanet !== planet) {
        (
          this.hoveredPlanet.material as THREE.MeshStandardMaterial
        ).emissive.setHex(0x000000);
      }

      const mat = planet.material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveIntensity = 0.5;
      this.hoveredPlanet = planet;
    } else if (this.hoveredPlanet) {
      (
        this.hoveredPlanet.material as THREE.MeshStandardMaterial
      ).emissive.setHex(0x000000);
      this.hoveredPlanet = null;
    }
  };
}
