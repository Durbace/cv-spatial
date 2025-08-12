import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  private labelSprites: THREE.Sprite[] = [];
  selectedPlanet: { name: string; description: string; label?: string } | null =
    null;
  private hoveredPlanet: THREE.Mesh | null = null;
  private shootingStars: THREE.Mesh[] = [];
  private shootingStarTimer = 0;
  private sun!: THREE.Mesh;
  private selectedPlanetMesh: THREE.Mesh | null = null;

  constructor(private http: HttpClient, private router: Router) {}

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

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    (this.renderer as any).outputColorSpace = THREE.SRGBColorSpace;

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.controls.minDistance = 5;
    this.controls.maxDistance = 35;

    const PLANET_LAYER = 1;
    const planetFill = new THREE.HemisphereLight(0xffffff, 0x101018, 0.35);
    planetFill.layers.set(PLANET_LAYER);
    this.scene.add(planetFill);

    this.camera.layers.enable(PLANET_LAYER);

    this.renderer.toneMappingExposure = 1.05;

    const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const textureLoader = new THREE.TextureLoader();

    const sunTexture = textureLoader.load('assets/planets/2k_sun.jpg');

    const sunMat = new THREE.MeshStandardMaterial({
      map: sunTexture,
      color: new THREE.Color('#FFFFFF'),
      emissive: new THREE.Color(0xffffff),
      emissiveMap: sunTexture,
      emissiveIntensity: 0.65,
      metalness: 0.05,
      roughness: 0.55,
    });

    const sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(sun);
    sun.userData = { name: 'Sun', label: 'Menu' };
    this.sun = sun;

    this.sun.name = 'sun';
    this.sun.frustumCulled = false;
    (this.sun.material as THREE.Material).depthWrite = true;
    (this.sun.material as THREE.Material).transparent = true;

    const hemi = new THREE.HemisphereLight(0x404060, 0x0a0a12, 0.18);
    this.scene.add(hemi);

    const sunLight = new THREE.PointLight(0xffcc33, 1.5, 150);
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

    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const ctx = labelCanvas.getContext('2d')!;
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = 'orange';
    ctx.textAlign = 'center';
    ctx.fillText('Menu', labelCanvas.width / 2, labelCanvas.height / 2);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);

    const labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
    });
    const labelSprite = new THREE.Sprite(labelMaterial);
    labelSprite.scale.set(2.5, 0.7, 1);
    labelSprite.position.set(0, 2.5, 0);

    sun.add(labelSprite);

    this.labelSprites.push(labelSprite);

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
    let baseEmissiveIntensity: number;

    if (texturePath) {
      const texture = new THREE.TextureLoader().load(texturePath);
      (texture as any).colorSpace = THREE.SRGBColorSpace;

      mat = new THREE.MeshStandardMaterial({
        map: texture,
        emissive: 0x555555,
        emissiveMap: texture,
        emissiveIntensity: 1.2,
        metalness: 0.12,
        roughness: 0.45,
      });

      baseEmissiveIntensity = 1.2;
    } else {
      mat = new THREE.MeshStandardMaterial({
        color,
        emissive: 0x555555,
        emissiveIntensity: 1.35,
        metalness: 0.12,
        roughness: 0.45,
      });

      baseEmissiveIntensity = 1.35;
    }

    const planet = new THREE.Mesh(geo, mat);
    const PLANET_LAYER = 1;
    planet.layers.enable(PLANET_LAYER);
    planet.userData['baseEmissiveColor'] = (
      mat.emissive as THREE.Color
    ).getHex();
    planet.userData['baseEmissiveIntensity'] = baseEmissiveIntensity;

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

    Object.assign(planet.userData, {
      angle,
      distance,
      speed,
      name,
      description,
      label,
    });

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

    this.labelSprites.push(sprite);
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

    const labelHit = this.raycaster.intersectObjects(this.labelSprites, false);
    if (labelHit.length > 0) return;

    const sunIntersects = this.raycaster.intersectObject(this.sun);
    if (sunIntersects.length > 0) {
      this.router.navigate(['/planets']);
      return;
    }

    const intersects = this.raycaster.intersectObjects(
      this.planetGroup.children
    );
    if (intersects.length > 0) {
      const obj = intersects[0].object as THREE.Mesh;
      const planet = (obj.userData['targetPlanet'] as THREE.Mesh) ?? obj;

      if (this.selectedPlanetMesh && this.selectedPlanetMesh !== planet) {
        this.selectedPlanetMesh.userData['isSelected'] = false;
        this.restoreBaseGlow(this.selectedPlanetMesh);
      }

      this.selectedPlanetMesh = planet;
      this.setSelectedGlow(planet);

      const { name, description, label } = obj.userData || planet.userData;
      this.selectedPlanet = { name, description, label };
    }
  };

  onMouseMove = (event: MouseEvent): void => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const labelHit = this.raycaster.intersectObjects(this.labelSprites, false);
    if (labelHit.length > 0) {
      if (this.hoveredPlanet) {
        if (this.hoveredPlanet.userData['isSelected']) {
          this.setSelectedGlow(this.hoveredPlanet);
        } else {
          this.restoreBaseGlow(this.hoveredPlanet);
        }
        this.hoveredPlanet.userData['isHovered'] = false;
        this.hoveredPlanet = null;
      }
      document.body.style.cursor = 'pointer';
      return;
    }

    const sunIntersects = this.raycaster.intersectObject(this.sun);
    if (sunIntersects.length > 0) {
      if (this.hoveredPlanet) {
        if (this.hoveredPlanet.userData['isSelected']) {
          this.setSelectedGlow(this.hoveredPlanet);
        } else {
          this.restoreBaseGlow(this.hoveredPlanet);
        }
        this.hoveredPlanet.userData['isHovered'] = false;
        this.hoveredPlanet = null;
      }
      document.body.style.cursor = 'pointer';
      return;
    }

    const intersects = this.raycaster.intersectObjects(
      this.planetGroup.children
    );
    if (intersects.length > 0) {
      const obj = intersects[0].object as THREE.Mesh;
      const planet = (obj.userData['targetPlanet'] as THREE.Mesh) ?? obj;

      if (this.hoveredPlanet && this.hoveredPlanet !== planet) {
        if (this.hoveredPlanet.userData['isSelected']) {
          this.setSelectedGlow(this.hoveredPlanet);
        } else {
          this.restoreBaseGlow(this.hoveredPlanet);
        }
        this.hoveredPlanet.userData['isHovered'] = false;
      }

      if (!planet.userData['isSelected']) {
        this.setHoverGlow(planet);
      } else {
        this.setSelectedGlow(planet);
      }

      this.hoveredPlanet = planet;
      planet.userData['isHovered'] = true;
      document.body.style.cursor = 'pointer';
    } else {
      if (this.hoveredPlanet) {
        if (this.hoveredPlanet.userData['isSelected']) {
          this.setSelectedGlow(this.hoveredPlanet);
        } else {
          this.restoreBaseGlow(this.hoveredPlanet);
        }
        this.hoveredPlanet.userData['isHovered'] = false;
        this.hoveredPlanet = null;
      }
      document.body.style.cursor = 'default';
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

  private setHoverGlow(planet: THREE.Mesh) {
    const mat = planet.material as THREE.MeshStandardMaterial;
    const baseI = planet.userData['baseEmissiveIntensity'] ?? 0.6;
    mat.emissiveIntensity = Math.min(baseI * 1.8, baseI + 0.9);
  }

  private setSelectedGlow(planet: THREE.Mesh) {
    const mat = planet.material as THREE.MeshStandardMaterial;
    const baseI = planet.userData['baseEmissiveIntensity'] ?? 0.6;
    mat.emissiveIntensity = Math.min(baseI * 2.2, baseI + 1.2);
    planet.userData['isSelected'] = true;
  }

  private restoreBaseGlow(planet: THREE.Mesh) {
    const mat = planet.material as THREE.MeshStandardMaterial;
    const baseI = planet.userData['baseEmissiveIntensity'] ?? 0.5;
    const baseC = planet.userData['baseEmissiveColor'] ?? 0x111111;
    (mat.emissive as THREE.Color).set(baseC);
    mat.emissiveIntensity = baseI;
  }
}
