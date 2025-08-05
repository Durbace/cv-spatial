import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-cv-space',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
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

  constructor(private http: HttpClient) {}

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

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const textureLoader = new THREE.TextureLoader();

    const sunTexture = textureLoader.load('assets/planets/2k_sun.jpg');

    const sunMat = new THREE.MeshStandardMaterial({
      map: sunTexture,
      emissive: 0xffaa00,
      emissiveMap: sunTexture,
      emissiveIntensity: 1.5,
      metalness: 0.1,
      roughness: 0.4,
    });

    const sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(sun);

    const sunLight = new THREE.PointLight(0xffcc33, 2.5, 150);
    sunLight.decay = 2;
    sunLight.distance = 150;
    sun.add(sunLight);

    const glowGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffcc88,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    sun.add(glowMesh);

    this.http.get<any[]>('assets/planets.json').subscribe((planetData) => {
      planetData.forEach((planet) =>
        this.addPlanet(
          planet.distance,
          new THREE.Color(planet.color || '#ffffff').getHex(), 
          planet.name,
          planet.description,
          planet.size,
          planet.texture
        )
      );
    });

    this.addStars();

    this.scene.add(this.planetGroup);
  }

  addPlanet(
    distance: number,
    color: number,
    name: string,
    description: string,
    size: number = 0.6,
    texturePath?: string
  ): void {
    const geo = new THREE.SphereGeometry(size, 32, 32);

    let mat: THREE.MeshStandardMaterial;
    if (texturePath) {
      const texture = new THREE.TextureLoader().load(texturePath);
      mat = new THREE.MeshStandardMaterial({ map: texture });
    } else {
      mat = new THREE.MeshStandardMaterial({ color });
    }

    const planet = new THREE.Mesh(geo, mat);

    const angle = Math.random() * Math.PI * 2;

    const hitboxGeo = new THREE.SphereGeometry(size * 1.5, 8, 8);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);

    const baseSpeed = 0.001;
    const speed = baseSpeed + size * 0.003;

    hitbox.userData = {
      angle,
      distance,
      name,
      description,
      speed,
      targetPlanet: planet,
    };

    planet.userData = { angle, distance, speed };

    this.planetGroup.add(hitbox);
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
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  animate = (): void => {
    requestAnimationFrame(this.animate);

    this.planetGroup.children.forEach((obj: any) => {
      if (obj.userData?.distance != null && obj.userData?.angle != null) {
        const isHovered = obj.userData['isHovered'];
        const speedFactor = isHovered ? 0.2 : 1;
        obj.userData.angle += obj.userData.speed * speedFactor;

        obj.position.set(
          Math.cos(obj.userData.angle) * obj.userData.distance,
          0,
          Math.sin(obj.userData.angle) * obj.userData.distance
        );

        if (obj.userData['targetPlanet']) {
          obj.userData['targetPlanet'].position.copy(obj.position);
        }
      }
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
      const obj = intersects[0].object;
      const { name, description, targetPlanet } = obj.userData;
      this.selectedPlanet = { name, description };

      if (targetPlanet) this.hoveredPlanet = targetPlanet;
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
      const obj = intersects[0].object as THREE.Mesh;
      const planet = obj.userData['targetPlanet'] ?? obj;

      if (this.hoveredPlanet && this.hoveredPlanet !== planet) {
        (
          this.hoveredPlanet.material as THREE.MeshStandardMaterial
        ).emissive.setHex(0x000000);
        this.hoveredPlanet.userData['isHovered'] = false;
      }

      const mat = planet.material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveIntensity = 0.5;

      this.hoveredPlanet = planet;
      planet.userData['isHovered'] = true;
    } else if (this.hoveredPlanet) {
      (
        this.hoveredPlanet.material as THREE.MeshStandardMaterial
      ).emissive.setHex(0x000000);

      this.hoveredPlanet.userData['isHovered'] = false;
      this.hoveredPlanet = null;
    }
  };
}
