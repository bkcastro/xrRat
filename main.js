
import * as THREE from 'three';

import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';
import { XRButton } from 'three/addons/webxr/XRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, clock;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let interval; // stores the id of the set interval which spawns the balls 

// Physics
let world, RAPIER;

let rigidBodies = [];
let objects = [];

let room, spheres, physics;
const velocity = new THREE.Vector3();

let count = 0;

// Rat stuff 

let wheel, rim_1, rim_2, rim_3; 

// functions don't need to return anything just keep stuff within scope of operations. 

let cameraPositions = [
  [2, 1, 2, 0],
  [3, 5, 3, 0],
  [1.1, 1, 1.1, 1],
  [0, 5, 0, 0], 
  [10, 8, 10, 0],   
]

let cameraPosition = cameraPositions[Math.floor(Math.random() * cameraPositions.length)]

function animateRatWheel(elapsedTime) {
  if (wheel) {
    wheel.rotation.x += 0.021;
    rim_1.rotation.x += 0.021;
    rim_2.rotation.x -= 0.021;
    rim_3.rotation.x += 0.01;

    if (!cameraPosition[3]) {
      camera.position.x = Math.sin(elapsedTime / 10) * cameraPosition[0]
      camera.position.y = cameraPosition[1]
      camera.position.z = Math.cos(elapsedTime / 10) * cameraPosition[2]
    } else {
      camera.position.x = cameraPosition[0]
      camera.position.y = cameraPosition[1]
      camera.position.z = cameraPosition[2]
    }
    
  
    camera.lookAt(wheel.position)
  
  }
}

function addRatWheel() {
  const loader = new GLTFLoader();

  loader.load('./ratWheel.glb', (gltf) => {
    const ratWheel = gltf.scene;

    // Traverse the scene to get names and possibly apply custom methods
    ratWheel.traverse((object) => {
      if (object.isMesh) { // Check if the object is a mesh
        //console.log('Mesh Name:', object.name); // Log the name of the mesh

        // Example of applying a custom method
        if (object.name === 'wheel') {
          // Apply custom method or manipulation
          object.material.opacity = 0.5;
          object.material.transparent = true;
          object.material.wireframe = true;

          wheel = object;
        }

        if (object.name == 'Sphere_1') {
          rim_1 = object; 
        }

        if (object.name == 'Sphere_2') {
          rim_2 = object; 
        }

        if (object.name == 'Sphere_3') {
          rim_3 = object; 
        }
        
      }
    });

    scene.add(ratWheel);
  }, undefined, function (error) {
    console.error('An error happened during the loading process:', error);
  });
}

function rat() {
  const loader = new GLTFLoader();

  loader.load('./rat.glb', (gltf) => {
    const rat = gltf.scene;
    rat.scale.multiplyScalar(2);
    rat.rotateY(Math.PI / 2)
    rat.position.set(0, 1.2, 0);
    scene.add(rat);

    addRatWheel();

    // Check if there are animations
    if (gltf.animations && gltf.animations.length) {
      // Create an AnimationMixer to play the animations
      const mixer = new THREE.AnimationMixer(rat);

      // Play all animations
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });

      // Update the mixer on each frame
      const clock = new THREE.Clock();
      function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta(); // Clock is needed to find the delta time
        mixer.update(delta); // Update the animation frames

        renderer.render(scene, camera); // Re-render the scene
      }

      animate(); // Start the animation loop
    }
  }, undefined, function (error) {
    console.error('An error happened during the loading process:', error);
  });
}
function spawnBall() {

  if (objects.length > 300) clearInterval(interval) 

  const ballGeometry = new THREE.SphereGeometry(.5, 32, 32);
  const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
  const x = Math.random() * 10 - 5;
  const z = Math.random() * 10 - 5;
  const y = 50;

  ballMesh.position.set(x, y, z);
  scene.add(ballMesh);

  // Add physics
  const ballBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z));
  world.createCollider(RAPIER.ColliderDesc.ball(1), ballBody);

  rigidBodies.push(ballBody);
  objects.push(ballMesh);
}

function makeBoardRandom() {
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.visible = false; 
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(0, 0, 0);
  scene.add(groundMesh);

  // Add physics for the ground
  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
  .setTranslation(0, -1/2, 0)
  const groundBody = world.createRigidBody(groundBodyDesc);
  world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.01, 10), groundBody)

  // Positions and colors for walls
  const positions = [];
  for (let i = 0; i < 50; i++) {
    const angle = 2*Math.random() * Math.PI

    positions.push({ 
      x: (4*Math.random()+5)*Math.cos(angle), 
      y: 15 * (Math.random() - 0.5), 
      z: (4*Math.random()+5)*Math.sin(angle) });
  }

  const colors = [0xff0000]; // Red, Green, Blue

  positions.forEach((pos, index) => {
    // Randomly adjust angles
    const angleY = (Math.random()) * Math.PI; // Random angle between 0 and π
    const angleX = (Math.random()) * Math.PI; // Random angle between 0 and π
    const angleZ =  (Math.random() - 1/2) * Math.PI / 4 + Math.PI / 2 // Random angle between 0 and π

    // Wall dimensions
    const wallThickness = 0.2;
    const wallHeight = 2;
    const wallLength = 17 * (Math.random()+0.5) + 2 * wallThickness;

    // Create wall geometry and material
    const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: colors[index % colors.length], transparent: true, opacity: Math.random() + 0.5 });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

    // Set wall position and rotation
    wallMesh.position.set(pos.x, pos.y, pos.z);
    wallMesh.rotation.set(angleX, angleY, angleZ);

    // Add to scene
    scene.add(wallMesh);

    // Create a THREE.Quaternion for the wall rotation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(angleX, angleY, angleZ, 'XYZ'));

    // Add physics for walls
    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w });
    const wallBody = world.createRigidBody(wallBodyDesc);
    world.createCollider(RAPIER.ColliderDesc.cuboid(wallLength / 2, wallHeight / 2, wallThickness / 2), wallBody);
  });
}

import('@dimforge/rapier3d').then(rapeirModel => {

  init();

  rat();
  // Use the RAPIER module here.
  let gravity = { x: 0.0, y: -2, z: 0.0 };
  RAPIER = rapeirModel;
  world = new RAPIER.World(gravity);
  const integrationParameters = new RAPIER.IntegrationParameters();

  makeBoardRandom();
  // Spawn a ball every second
  interval = setInterval(spawnBall, 1000); 

})


function init() {

  clock = new THREE.Clock(); 
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000);
  scene.add(new THREE.AxesHelper(1))

  camera = new THREE.PerspectiveCamera(130, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 10);

  room = new THREE.LineSegments(
    new BoxLineGeometry(6, 6, 6, 10, 10, 10),
    new THREE.LineBasicMaterial({ color: 0x808080 })
  );
  room.geometry.translate(0, 3, 0);
  scene.add(room);

  scene.add(new THREE.HemisphereLight(0xbbbbbb, 0x888888, 3));

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  //

  const controls = new OrbitControls(camera, renderer.domElement);

  controls.target.y = 1.6;
  controls.update();

  // controllers

  function onSelectStart() {

    this.userData.isSelecting = true;

  }

  function onSelectEnd() {

    this.userData.isSelecting = false;

  }

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);
  controller1.addEventListener('connected', function (event) {

    this.add(buildController(event.data));

  });
  controller1.addEventListener('disconnected', function () {

    this.remove(this.children[0]);

  });
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener('selectstart', onSelectStart);
  controller2.addEventListener('selectend', onSelectEnd);
  controller2.addEventListener('connected', function (event) {

    this.add(buildController(event.data));

  });
  controller2.addEventListener('disconnected', function () {

    this.remove(this.children[0]);

  });
  scene.add(controller2);

  // The XRControllerModelFactory will automatically fetch controller models
  // that match what the user is holding as closely as possible. The models
  // should be attached to the object returned from getControllerGrip in
  // order to match the orientation of the held device.

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip2);

  //

  window.addEventListener('resize', onWindowResize);

  setInterval(() => {
    cameraPosition = cameraPositions[Math.floor(Math.random() * cameraPositions.length)]
  }, 5000)
  clock.start();
}

function buildController(data) {

  let geometry, material;

  switch (data.targetRayMode) {

    case 'tracked-pointer':

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 1], 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

      material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });

      return new THREE.Line(geometry, material);

    case 'gaze':

      geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, - 1);
      material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
      return new THREE.Mesh(geometry, material);

  }

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function handleController(controller) {

  if (controller.userData.isSelecting) {

    physics.setMeshPosition(spheres, controller.position, count);

    velocity.x = (Math.random() - 0.5) * 2;
    velocity.y = (Math.random() - 0.5) * 2;
    velocity.z = (Math.random() - 9);
    velocity.applyQuaternion(controller.quaternion);

    physics.setMeshVelocity(spheres, velocity, count);

    if (++count === spheres.count) count = 0;

  }

}

function animate() {

  const elapsedTime = clock.getElapsedTime();

  handleController(controller1);
  handleController(controller2);

  updatePhysics(elapsedTime);
  animateRatWheel(elapsedTime);

  renderer.render(scene, camera);

}

function updatePhysics() {
  if (world) {
    world.step()

    for (let i = 0; i < rigidBodies.length; i++) {

      const rigidBody = rigidBodies[i];
      const mesh = objects[i];

      if (rigidBody.bodyType() == 0) {

        let position = rigidBody.translation();

        mesh.position.copy(position);

      }
    }
  }
}