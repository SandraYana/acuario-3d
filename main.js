import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Boid } from './js/Boid.js';
const gltfLoader = new GLTFLoader();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xD5CACA);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 80); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 50, 50);
scene.add(directionalLight);

const aquariumSize = new THREE.Vector3(70, 30, 50);

const glassGeometry = new THREE.BoxGeometry(aquariumSize.x, aquariumSize.y, aquariumSize.z);
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x88ccee,
  transparent: true,
  transmission: 0.9,
  opacity: 0.3,
  roughness: 0.1,
  metalness: 0.0,
  thickness: 1.0,
  side: THREE.BackSide
});
const aquarium = new THREE.Mesh(glassGeometry, glassMaterial);
scene.add(aquarium);

gltfLoader.load('/models/coral.glb', (gltf) => {
  const originalCoral = gltf.scene;
  const coralCount = 5;

  for (let i = 0; i < coralCount; i++) {
    const coral = originalCoral.clone(true);

    const scale = Math.random() * 4 + 2;
    coral.scale.set(scale, scale, scale);

    coral.position.set(
      (Math.random() - 0.4) * (aquariumSize.x - 10),
      -aquariumSize.y / 2 + 1.5,
      (Math.random() - 0.5) * (aquariumSize.z - 10)
    );

    coral.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = child.material.clone();
      }
    });

    scene.add(coral);
  }
});

const decorations = [
  {
    file: '/models/alga.glb',
    count: 3,
    scaleRange: [5, 12],
    yOffset: 6, 
  },
  {
    file: '/models/rock.glb',
    count: 5,
    scaleRange: [5, 8],
    yOffset: 1, 
  },
  {
    file: '/models/alga1.glb',
    count: 4,
    scaleRange: [5, 6],
    yOffset: 0, 
  },
  {
    file: '/models/cora.glb',
    count: 9,
    scaleRange: [20, 30],
    yOffset: 2, 
  },
  {
    file: '/models/a1.glb',
    count: 5,
    scaleRange: [0.1, 0.2],
    yOffset: 2, 
  },
  {
    file: '/models/a3.glb',
    count: 2,
    scaleRange: [10, 18],
    yOffset: 2.5, 
  }
];

function loadDecorations() {
  decorations.forEach(({ file, count, scaleRange, yOffset = 0 }) => {
    gltfLoader.load(file,
      (gltf) => {
        const original = gltf.scene;

        for (let i = 0; i < count; i++) {
          const object = original.clone(true);
          const scale = Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0];
          object.scale.set(scale, scale, scale);
          object.position.set(
            (Math.random() - 0.5) * (aquariumSize.x - 12),
            -aquariumSize.y / 2 + 1.2 + yOffset,
            (Math.random() - 0.5) * (aquariumSize.z - 12)
          );
          object.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.material = child.material.clone();
            }
          });

          scene.add(object);
        }
      },
      undefined,
      (error) => console.error(`Error cargando ${file}:`, error)
    );
  });
}

loadDecorations();

const floorGeometry = new THREE.BoxGeometry(aquariumSize.x, 2, aquariumSize.z);
const textureLoader = new THREE.TextureLoader();
const sandTexture = textureLoader.load('/textures/sand.jpg'); 

sandTexture.wrapS = THREE.RepeatWrapping;
sandTexture.wrapT = THREE.RepeatWrapping;
sandTexture.repeat.set(5, 5); 

const floorMaterial = new THREE.MeshStandardMaterial({ map: sandTexture });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.y = -aquariumSize.y / 2 + 1; 
scene.add(floor);

const boids = [];
const turtleBoids = [];

let fishModel = null;
let turtleModel = null;
let modelsLoaded = 0;
const totalModels = 2;

const loader = new GLTFLoader();

const fishConfig = {
  count: 15,
  scale: 0.3,
  maxSpeed: 1.2,
  maxForce: 0.12
};

const turtleConfig = {
  count: 5,
  scale: 2,
  maxSpeed: 0.7,
  maxForce: 0.08
};

function checkModelsLoaded() {
  modelsLoaded++;
  if (modelsLoaded === totalModels) {
    console.log('Ambos modelos cargados, iniciando animación...');
    animate();
  }
}

function createFish() {
  if (!fishModel) return;
  
  console.log('Creando peces...');
  for (let i = 0; i < fishConfig.count; i++) {
    const fishClone = fishModel.clone(true);
    const fish = new Boid(scene, aquariumSize, fishClone, fishConfig.scale);
    fish.maxSpeed = fishConfig.maxSpeed;
    fish.maxForce = fishConfig.maxForce;
    boids.push(fish);
  }
  console.log(`Peces creados: ${boids.length}`);
}

function createTurtles() {
  if (!turtleModel) return;
  
  console.log('Creando tortugas...');
  for (let i = 0; i < turtleConfig.count; i++) { 
    const turtleClone = turtleModel.clone(true);
    const turtle = new Boid(scene, aquariumSize, turtleClone, turtleConfig.scale);
    turtle.maxSpeed = turtleConfig.maxSpeed;
    turtle.maxForce = turtleConfig.maxForce;
    turtleBoids.push(turtle);
  }
  console.log(`Tortugas creadas: ${turtleBoids.length}`);
}

loader.load('/models/fish.glb', 
  (gltf) => {
    console.log('Modelo de pez cargado');
    fishModel = gltf.scene;
    
    if (fishModel.children.length === 0) {
      console.warn('El modelo de pez no tiene children visibles');
    }
    
    createFish();
    checkModelsLoaded();
  },
  (progress) => {
    console.log('Cargando pez...', (progress.loaded / progress.total * 100) + '%');
  },
  (error) => {
    console.error('Error cargando modelo de pez:', error);
    const geometry = new THREE.BoxGeometry(2, 1, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    fishModel = new THREE.Mesh(geometry, material);
    createFish();
    checkModelsLoaded();
  }
);

loader.load('/models/turtle.glb', 
  (gltf) => {
    console.log('Modelo de tortuga cargado');
    turtleModel = gltf.scene;
    
    if (turtleModel.children.length === 0) {
      console.warn('El modelo de tortuga no tiene children visibles');
    }
    
    createTurtles();
    checkModelsLoaded();
  },
  (progress) => {
    console.log('Cargando tortuga...', (progress.loaded / progress.total * 100) + '%');
  },
  (error) => {
    console.error('Error cargando modelo de tortuga:', error);
    const geometry = new THREE.BoxGeometry(3, 1, 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    turtleModel = new THREE.Mesh(geometry, material);
    createTurtles();
    checkModelsLoaded();
  }
);

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  for (let boid of boids) {
    boid.flock(boids);
    boid.update();
  }

  for (let turtle of turtleBoids) {
    turtle.flock(turtleBoids); 
    turtle.update();
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});