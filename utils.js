import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export const randomBetween = (min, max) => {
    return Math.random() * (max - min) + min;
}

export const loadGLB = async (modelPath) => {
    return new Promise((resolve, reject) => {
        loader.load(
            modelPath,
            function (gltf) {
                resolve(gltf.scene.clone());
            },
            // Optional progress callback
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // Optional error callback
            function (error) {
                reject(error);
                console.error('Error loading GLB model', error);
            }
        );
    });
};