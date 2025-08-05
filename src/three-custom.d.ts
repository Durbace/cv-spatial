// three-custom.d.ts
import * as THREE from 'three';

declare module 'three' {
  interface WebGLRenderer {
    // proprietăți pentru toneMapping + gamma
    toneMapping: number;
    outputEncoding: number;
    gammaOutput: boolean;
    gammaFactor: number;
  }
  interface Texture {
    // proprietate pentru encoding textură
    encoding: number;
  }
}
