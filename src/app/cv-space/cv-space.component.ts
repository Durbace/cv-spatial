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
  private shootingStars: THREE.Mesh[] = [];
  private shootingStarTimer = 0;

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
          planet.texture,
          planet.label
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
    texturePath?: string,
    label?: string
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

    const displayLabel = label || name;

    hitbox.userData = {
      angle,
      distance,
      name,
      description,
      speed,
      targetPlanet: planet,
      label: displayLabel,
    };

    planet.userData = {
      angle,
      distance,
      speed,
      name,
      description,
    };

    this.planetGroup.add(hitbox);
    this.planetGroup.add(planet);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    ctx.fillText(displayLabel, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 0.5, 1);
    sprite.position.set(0, size + 0.7, 0); 

    planet.add(sprite); 
  }

  addStars(): void {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 });
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
    this.shootingStarTimer += 1;
    if (this.shootingStarTimer > 100 && Math.random() < 0.05) {
      this.createShootingStar();
      this.shootingStarTimer = 0;
    }

    this.shootingStars.forEach((star, index) => {
      star.position.add(star.userData['velocity']);

      if (star.position.y < -10) {
        this.scene.remove(star);
        this.shootingStars.splice(index, 1);
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

  createShootingStar(): void {
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(geo, mat);

    const x = (Math.random() - 0.5) * 100;
    const y = Math.random() * 20 + 10;
    const z = (Math.random() - 0.5) * 100;

    star.position.set(x, y, z);

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      -0.2 - Math.random() * 0.3,
      0
    );
    star.userData['velocity'] = velocity;

    const tailLength = 2;
    const tailGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      velocity.clone().normalize().multiplyScalar(-tailLength),
    ]);
    const tailMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const tail = new THREE.Line(tailGeometry, tailMaterial);

    star.add(tail);

    this.shootingStars.push(star);
    this.scene.add(star);
  }
}
