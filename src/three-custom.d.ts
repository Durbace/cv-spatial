import * as THREE from 'three';

declare module 'three' {
  interface WebGLRenderer {
    toneMapping: number;
    outputEncoding: number;
    gammaOutput: boolean;
    gammaFactor: number;
  }
  interface Texture {
    encoding: number;
  }
}
