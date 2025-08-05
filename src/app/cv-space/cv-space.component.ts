import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { HttpClientModule, HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-cv-space',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ],
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

    this.http.get<any[]>('assets/planets.json').subscribe((planetData) => {
  planetData.forEach((planet) =>
    this.addPlanet(
      planet.distance,
      new THREE.Color(planet.color).getHex(), // convert hex string to number
      planet.name,
      planet.description,
      planet.size
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
    size: number = 0.6
  ): void {
    const geo = new THREE.SphereGeometry(size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color });
    const planet = new THREE.Mesh(geo, mat);

    const angle = Math.random() * Math.PI * 2;

    const hitboxGeo = new THREE.SphereGeometry(size * 1.5, 8, 8);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);

    // Formula dinamică: planetele mai mari => viteză mai mare
    const baseSpeed = 0.001;
    const speed = baseSpeed + size * 0.003; // ex: 0.4 => 0.0022, 1.0 => 0.004

    hitbox.userData = {
      angle,
      distance,
      name,
      description,
      speed,
      targetPlanet: planet,
    };

    planet.userData = { angle, distance, speed }; // doar pentru animare

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

      // Dacă există planetă legată, seteaz-o ca hovered
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

      // Dezactivează efectul pe planeta anterioară
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
