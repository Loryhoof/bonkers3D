import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { randomBetween } from './utils';

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true; // Enable shadow mapping
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Set shadow map type for smoother shadows
renderer.setSize( window.innerWidth, window.innerHeight )
document.body.appendChild (renderer.domElement)

const loader = new GLTFLoader();

const raycaster = new THREE.Raycaster();
const listener = new THREE.AudioListener();
camera.add(listener);


//sounds

const pistol_shoot_sound = new THREE.Audio(listener);
const pistol_reload_sound = new THREE.Audio(listener);
const bullet_impact_sound = new THREE.Audio(listener);
const ambience_sound = new THREE.Audio(listener);
const grass_step_sound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();

audioLoader.load( '/audio/pistol_shot_2.mp3', function( buffer ) {
	pistol_shoot_sound.setBuffer( buffer );
	pistol_shoot_sound.setLoop( false );
	pistol_shoot_sound.setVolume( 0.3 );
});

audioLoader.load( '/audio/ambience.mp3', function( buffer ) {
	ambience_sound.setBuffer( buffer );
	ambience_sound.setLoop( true );
	ambience_sound.setVolume( 0.225 );
    ambience_sound.play()
});

audioLoader.load( '/audio/reload.mp3', function( buffer ) {
	pistol_reload_sound.setBuffer( buffer );
	pistol_reload_sound.setLoop( false );
	pistol_reload_sound.setVolume( 0.75 );
});

audioLoader.load( '/audio/impact2.mp3', function( buffer ) {
	bullet_impact_sound.setBuffer( buffer );
	bullet_impact_sound.setLoop( false );
	bullet_impact_sound.setVolume( 0.4 );
});

audioLoader.load( '/audio/grass_step2.mp3', function( buffer ) {
	grass_step_sound.setBuffer( buffer );
	grass_step_sound.setLoop( false );
	grass_step_sound.setVolume( 0.2 );
});



//////////////////////



const players = []

// UI

const infoText = document.getElementById("infoText");

// constants
const playerHeight = 1.6
const groundLevel = playerHeight + 0.5
const sprintFactor = 1.6
const movementSpeed = 0.055;
const handOffset = new THREE.Vector3(0.3, -0.3, -0.5)
const adsOffset = new THREE.Vector3(0, -0.215, -0.4)

const jumpVelocity = 15; // Initial upward velocity when jumping
const maxJumpHeight = 2; // Maximum height the player can jump

let isJumping = false; // Flag to track if the player is currently jumping
let jumpHeight = 0; // Variable to track how high the player has jumped


const gravity = 6.8; // Acceleration due to gravity (in m/s^2)
const terminalVelocity = 20; // Maximum falling speed to prevent unrealistic acceleration

// FPS

let prevTime = performance.now();
let frames = 0;
let fps = 0

let gun = null;

/// AIM

let isADS = false
let isShooting = false

let leftMouse = false
let rightMouse = false



///////////////////////////





//box
const geometry = new THREE.BoxGeometry( 2, 2, 2 );
const material = new THREE.MeshStandardMaterial( { color: 0xff0000 } );
const cube = new THREE.Mesh( geometry, material );
cube.castShadow = true
cube.position.y = cube.scale.y + 0.5
cube.position.x = 5

scene.add(cube)


const texture = new THREE.TextureLoader().load( "grass.jpg" );
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 200, 200 );

//plane - ground
const planeGeo = new THREE.PlaneGeometry(500, 500);
const planeMat = new THREE.MeshStandardMaterial({ map: texture });
const plane = new THREE.Mesh(planeGeo, planeMat);
plane.rotation.x -= Math.PI/2;
plane.receiveShadow = true
plane.position.y = 0.5
scene.add(plane); // Added plane to the scene

// for (let i = 0; i < 100; i++) {
//     let s = cube.clone()
//     s.position.x = i + i +2 
//     scene.add(s)
// } 


// Define your shader code
const skyVertexShader = `
    varying vec3 vWorldPosition;
    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const skyFragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
`;

// Create the shader material
const skyUniforms = {
    topColor: { value: new THREE.Color(0xBDDBFF) },
    bottomColor: { value: new THREE.Color(0xffffff) },
    offset: { value: 33 },
    exponent: { value: 0.6 }
};

const skyMaterial = new THREE.ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    uniforms: skyUniforms,
    side: THREE.BackSide // Render the material on the back side of the mesh
});

// Create a sphere geometry to represent the sky
const skyGeometry = new THREE.SphereGeometry(1000, 0, 0);

// Create the sky mesh using the sphere geometry and the shader material
const sky = new THREE.Mesh(skyGeometry, skyMaterial);

// Add the sky to the scene
scene.add(sky);

//light
var light = new THREE.DirectionalLight(0xffffff);
light.position.set(0, 2, 2);
light.target.position.set(0, 0, 0);
var d = 5;
light.castShadow = true;
light.shadow.camera.left = - d;
light.shadow.camera.right = d;
light.shadow.camera.top = d;
light.shadow.camera.bottom = - d;

light.shadow.camera.near = 1;
light.shadow.camera.far = 20;





scene.add(light);



const ambient = new THREE.AmbientLight(0x404040, 3)
scene.add(ambient)






//temp
const temp = new THREE.Vector3()


// PLAYER BODY







let controls = new PointerLockControls( camera, document.body );
//scene.add( controls.getObject() );


const clock = new THREE.Clock();


const dragFactor = 0.99;

//const player = cube;

const playerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 32);
const playerMaterial = new THREE.MeshStandardMaterial({color: 0x00ff00});

// Player mesh
const playerObj = new THREE.Mesh(playerGeometry, playerMaterial);
playerObj.castShadow = true

// Position the player (e.g., at ground level)
playerObj.position.set(0, groundLevel, 0); // Half the height of the cylinder to start at ground level

// Add the player to the scene
scene.add(playerObj);

const player = playerObj
player.health = 100;
player.hunger = 100;

//player.add(gun)
//console.log(gun)





let playerVelocity = new THREE.Vector3();


loader.load(
    'models/gun3.glb',
    function ( gltf ) {
        let model = gltf.scene
        scene.add( model );

        gun = model
        gun.ammo = 12

        gun.slide = gun.getObjectByName('Slide')
        console.log(gun.slide)
    },
    // Optional progress callback
    function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    },
    // Optional error callback
    function ( error ) {
        console.error( 'Error loading GLB model', error );
    }
);



//scene.add( cube );

//camera.position.z = 5;

const isMoving = () => {
    return keyW || keyA || keyS || keyD
}

let keyW = false;
let keyA = false;
let keyS = false;
let keyD = false;
let keySpace = false;
let keyShift = false;

const handleDebug = () => {
    const currentTime = performance.now();
    const deltaTime = currentTime - prevTime;

    frames++;

    // Calculate FPS if one second (1000 milliseconds) has passed
    if (deltaTime >= 100) {
        fps = Math.round((frames * 1000) / deltaTime);
        // Use fps value as needed, e.g., update UI

        // Reset variables for the next interval
        prevTime = currentTime;
        frames = 0;
    }
}

const isGrounded = () => {
    return player.position.y <= groundLevel
  }

let lastStepPlayed = performance.now();

const handleMovement = (deltaTime) => {

    let current = performance.now()

    let footstepDelay = keyShift ? 300 : 500;

    if (current - lastStepPlayed > footstepDelay && isGrounded() && isMoving()) {
        if (grass_step_sound.isPlaying) {
            grass_step_sound.stop();
        }
        grass_step_sound.setDetune(randomBetween(-200, -500))
        grass_step_sound.play();
        lastStepPlayed = current; 
    }


    camera.position.copy(player.position)

    //camera.position.copy(player.position)
    const cameraDirection = new THREE.Vector3();
    controls.getObject().getWorldDirection(cameraDirection);
    cameraDirection.normalize();

    const cameraForward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();

    // Reset player velocity
    playerVelocity.set(0, 0, 0);

    let speed = movementSpeed;

    if(keyShift) {
        speed = movementSpeed * sprintFactor;
    }

    if (keyW) {
        playerVelocity.add(cameraForward.clone().multiplyScalar(speed * 60));
    }
    if (keyA) {
        const left = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x);
        playerVelocity.add(left.multiplyScalar(-speed * 60));
    }
    if (keyS) {
        playerVelocity.add(cameraForward.clone().multiplyScalar(-speed * 60));
    }
    if (keyD) {
        const right = new THREE.Vector3(cameraDirection.z, 0, -cameraDirection.x);
        playerVelocity.add(right.multiplyScalar(-speed * 60));
    }

    if(isJumping) {
        const jumpDisplacement = jumpVelocity * deltaTime;

        // Update player's vertical position
        player.position.y += jumpDisplacement;

        // Increment jump height
        jumpHeight += jumpDisplacement;

        // Check if the player has reached the maximum jump height
        if (jumpHeight >= maxJumpHeight) {
            isJumping = false; // Stop jumping
        }
    }
    

    
};

const handleUI = () => {
    infoText.innerHTML = `
    FPS: ${fps}<br>
    Position: ${Math.floor(player.position.x)}, ${Math.floor(player.position.y)}, ${Math.floor(player.position.z)}<br>
    Health: ${player.health}<br>
    Ammo: ${gun ? gun.ammo : 0} / 12 (R to reload)`;


}



const handlePhysics = (deltaTime) => {

    let displacement = playerVelocity.clone().multiplyScalar(deltaTime)

    player.position.add(displacement)

    playerVelocity.multiplyScalar(dragFactor);

    //fake gravity
    if(player.position.y > groundLevel) {
        const gravityForce = gravity * deltaTime;
        player.position.y -= gravityForce;
    }

}


const updateCamera = () => {
    
 
};

const recoilAmount = 0.05; // Adjust the recoil amount as needed
const recoilDirection = new THREE.Vector3(0, 0, 1); // Adjust the recoil direction as needed

const doShoot = () => {
    if (gun && gun.ammo <= 0) {
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(), camera);

    const objectsToIntersect = scene.children.filter(object => object !== gun);

    const intersects = raycaster.intersectObjects(objectsToIntersect, true);

    if (intersects.length > 0) {
        const point = intersects[0].point;

        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.copy(point);

        scene.add(cube);

        if (pistol_shoot_sound.isPlaying || bullet_impact_sound.isPlaying) {
            pistol_shoot_sound.stop();
            bullet_impact_sound.stop();
        }

        pistol_shoot_sound.play();
        

        // Apply recoil to the gun's position
        const recoilVector = recoilDirection.clone().multiplyScalar(recoilAmount);
        gun.position.add(recoilVector);

        const initialSlidePosition = gun.slide.position.clone();
        gun.slide.position.add(recoilVector)
        
        setTimeout(() => {
            gun.slide.position.copy(initialSlidePosition)
        }, 50)

        gun.ammo -= 1;
    }
};


const doReload = () => {
    if(gun) {
        gun.ammo = 12
        console.log("reloading")

        if(pistol_reload_sound.isPlaying) {
            pistol_reload_sound.stop()
        }

        pistol_reload_sound.play()

        const recoilVector = recoilDirection.clone().multiplyScalar(0.06);
        const initialSlidePosition = gun.slide.position.clone();

        //gun.slide.position.add(new THREE.Vector3(0,0,-1));
        gun.slide.position.add(recoilVector)
        
        setTimeout(() => {
            gun.slide.position.copy(initialSlidePosition)
        }, 600)
    }
}

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    handleMovement(deltaTime);

    handlePhysics(deltaTime);
    handleUI();

    updateCamera();

    handleDebug();

    if (gun) {
        let target = new THREE.Vector3().copy(handOffset);

        if (rightMouse) {
            target = new THREE.Vector3().copy(adsOffset);
        }

        target.applyQuaternion(camera.quaternion);
        gun.position.copy(camera.position).add(target);

        if (leftMouse && gun.ammo > 0) {
            const recoilVector = recoilDirection.clone().applyQuaternion(gun.quaternion).multiplyScalar(recoilAmount);
            gun.position.add(recoilVector);
        }

        gun.rotation.copy(camera.rotation);
    }

    renderer.render(scene, camera);
}


animate();

window.addEventListener( 'resize', onWindowResize, false );

//pointer lock
let isPointerLocked = false;

// Request pointer lock
const requestPointerLock = () => {
    const element = document.body;
    element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
    element.requestPointerLock();
};

// Exit pointer lock
const exitPointerLock = () => {
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
    document.exitPointerLock();
};

// Check if pointer is locked
const isPointerLockEnabled = () => {
    return document.pointerLockElement === document.body || document.mozPointerLockElement === document.body || document.webkitPointerLockElement === document.body;
};

// Event listener for pointer lock change
document.addEventListener('pointerlockchange', () => {
    isPointerLocked = isPointerLockEnabled();
});


// Event listener for pointer lock error
document.addEventListener('pointerlockerror', () => {
    console.error('Pointer lock failed.');
});

// Event listener for mouse movement
document.addEventListener('mousemove', (event) => {
    if (isPointerLocked) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        // Adjust camera orientation based on mouse movement
        const sensitivity = 0.002;
        //camera.rotation.y -= movementX * sensitivity;
        //camera.rotation.x -= movementY * sensitivity;

        // Limit vertical rotation
        //camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
});

// Event listener for mouse click to enable pointer lock
window.addEventListener('click', (e) => {
    if (!isPointerLocked) {
        requestPointerLock();
    }

    if(e.button === 0) {
        doShoot()
    }
});

window.addEventListener('mousedown', function(event) {
    if (event.button === 0) {
        // Left mouse button pressed
        leftMouse = true;
    } else if (event.button === 2) {
        // Right mouse button pressed
        rightMouse = true;
    }
});

// Event listener for mouse button release
window.addEventListener('mouseup', function(event) {
    if (event.button === 0) {
        // Left mouse button released
        leftMouse = false;
    } else if (event.button === 2) {
        // Right mouse button released
        rightMouse = false;
    }
});


// window.onbeforeunload = function (e) {
//     // Cancel the event
//     e.preventDefault();

//     // Chrome requires returnValue to be set
//     e.returnValue = 'Really want to quit the game?';
// };

window.addEventListener("keydown", function(event) {
    // Check if Ctrl, Shift, or Alt key is pressed
    if (event.ctrlKey || event.shiftKey || event.altKey) {
        // Prevent the default behavior
        event.preventDefault();
        // Optionally, you can inform the user that the key functionality is disabled
    }
});

window.addEventListener("keydown", function(event) {
    // Check if both Ctrl and W keys are pressed simultaneously
    if (event.ctrlKey && event.key === 'w') {
        // Prevent the default behavior
        event.preventDefault();
        // Optionally, you can inform the user that the key combination is disabled
    }
});

// key input stuff
window.addEventListener("keydown", (event) => {
    const keyPressed = event.key.toLowerCase();
     
    if (keyPressed === "w" ) {
        keyW = true;
    }
    if (keyPressed === "a") {
        keyA = true;
    }
    if (keyPressed === "s") {
        keyS = true;
    }
    if (keyPressed === "d") {
        keyD = true;
    }
    if (keyPressed === " " && !isJumping && isGrounded()) {
        //keySpace = true;
        isJumping = true
        jumpHeight = 0
    }
    if (keyPressed === "shift") {
        keyShift = true;
    }
  });

window.addEventListener("keyup", (event) => {
    const keyPressed = event.key.toLowerCase();

    if (keyPressed === "w") {
        keyW = false;
    }
    if (keyPressed === "a") {
        keyA = false;
    }
    if (keyPressed === "s") {
        keyS = false;
    }
    if (keyPressed === "d") {
        keyD = false;
    }
    if (keyPressed === "r") {
        doReload()
    }
    if (keyPressed === " ") {
        //keySpace = false;
    }
    if (keyPressed === "shift") {
        keyShift = false;
    }
  });
  

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}