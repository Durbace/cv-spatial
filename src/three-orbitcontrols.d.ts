declare module 'three/examples/jsm/controls/OrbitControls' {
  import { Camera } from 'three';
  import { EventDispatcher } from 'three';
  import { MOUSE } from 'three';
  import { Object3D } from 'three';
  import { Vector3 } from 'three';

  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement: HTMLElement);
    object: Camera;
    target: Vector3;

    enableZoom: boolean;
    enablePan: boolean;
    enableRotate: boolean;
    enableDamping: boolean;

    update(): void;
    dispose(): void;
  }
}
