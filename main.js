import * as THREE from 'three';
import CSM from 'three-csm';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { randomBetween } from './utils';
import { sky } from './sky';
import { listener, pistol_shoot_sound, pistol_reload_sound, bullet_impact_sound, grass_step_sound, tree_fall_sound } from './AudioManager';
import createEnemyPrefab from './Enemy';
import { groundMaterial } from './ground';
import { degToRad } from 'three/src/math/MathUtils';
import { createPistol } from './pistol';

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true; // Enable shadow mapping
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Set shadow map type for smoother shadows
renderer.setSize( window.innerWidth, window.innerHeight )
document.body.appendChild (renderer.domElement)

const loader = new GLTFLoader();

const raycaster = new THREE.Raycaster();

camera.add(listener);

let world = []

// UI
const infoText = document.getElementById("infoText");

// constants
const dragFactor = 0.99;
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



//box
const geometry = new THREE.BoxGeometry( 2, 2, 2 );
const material = new THREE.MeshStandardMaterial( { color: 0xff0000 } );
const cube = new THREE.Mesh( geometry, material );
cube.castShadow = false
cube.position.y = cube.scale.y + 0.5
cube.position.x = 5

scene.add(cube)

//plane - ground
const texture = new THREE.TextureLoader().load( "grass.jpg" );
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 200, 200 );

const planeGeo = new THREE.PlaneGeometry(500, 500);
let planeMat = new THREE.MeshStandardMaterial({ map: texture });
planeMat = groundMaterial
//csm.setupMaterial(planeMat);
const plane = new THREE.Mesh(planeGeo, planeMat);
plane.rotation.x -= Math.PI/2;
plane.receiveShadow = false
plane.position.y = 0.5
scene.add(plane);

scene.add(sky);
//light
var light = new THREE.DirectionalLight(0xffffff);
light.position.set(0, 2, 2);
light.target.position.set(0, 0, 0);
var d = 50;
light.castShadow = true;
light.shadow.camera.left = - d;
light.shadow.camera.right = d;
light.shadow.camera.top = d;
light.shadow.camera.bottom = - d;

light.shadow.camera.near = 1;
light.shadow.camera.far = 20;





scene.add(light);



const ambient = new THREE.AmbientLight(0x404040, 10)
scene.add(ambient)






//temp
const temp = new THREE.Vector3()


// PLAYER BODY







let controls = new PointerLockControls( camera, document.body );
//scene.add( controls.getObject() );


const clock = new THREE.Clock();


const playerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 32);
const playerMaterial = new THREE.MeshStandardMaterial({color: 0x00ff00});

// Player mesh
const playerObj = new THREE.Mesh(playerGeometry, playerMaterial);
playerObj.castShadow = false

// Position the player (e.g., at ground level)
playerObj.position.set(0, groundLevel, 0); // Half the height of the cylinder to start at ground level

// Add the player to the scene
scene.add(playerObj);

const player = playerObj
player.health = 100;
player.hunger = 100;
player.isWalking = false;
player.isSprinting = false;

let pistol = await createPistol(15, raycaster, camera, scene)
world.push(pistol)

player.inventory = {
    "Bullet": { quantity: 500 },
    "Pistol": pistol
}

let hotBar = Array(9).fill(null);
hotBar[0] = player.inventory["Pistol"]
let selectedSlot = -1;
let selectedItem = null;
let prevSelectedItem = null


console.log(hotBar, "hotbar");

for (let i = 0; i < 0; i++) {
    let temp = await createEnemyPrefab(scene, world)

    temp.setTarget(player)
    temp.setPosition(randomBetween(-50,50), 0.5, randomBetween(-50,50))

    scene.add(temp)
    world.push(temp)
}

let playerVelocity = new THREE.Vector3();



loader.load(
    'models/stone.glb',
    function ( gltf ) {
        for(let i = 0; i < 50; i++) {
            let model = gltf.scene.clone()
            scene.add( model );

            model.position.set(randomBetween(-100, 100), 0.5, randomBetween(-100, 100))
        }
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

//scene.fog = new THREE.Fog( 0xcccccc, 10, 15 );

// Trees
loader.load(
    'models/tree.glb',
    function ( gltf ) {
        for(let i = 0; i < 500; i++) {
            let model = gltf.scene.clone()
            
            model.traverse((child) => {
                child.root = model
            })

            scene.add( model );
            
            model.scale.set(1, randomBetween(0.4, 1.3), 1)
            model.position.set(randomBetween(-50, 50), 0.5, randomBetween(-50, 50))
            model.health = 100
            model.canTakeDamage = true
            model.dying = false
            
            let elapsedTime = 0

            model.update = (delta) => {
                if(model.health <= 0 && !model.dying) {
                    model.doDie()
                }

                if (model.dying) {
                    const targetRotation = { x: Math.PI / 2, y: model.rotation.y, z: model.rotation.z };
                    const animationDuration = 10.0;
                
                    // Calculate the normalized time 't' based on elapsed time and animation duration
                    let t = Math.min(1, elapsedTime / animationDuration);
                
                    // Apply ease-out easing function to 't'
                    t = 1 - Math.pow(1 - t, 2); // Square the normalized time to apply ease-out
                
                    // Interpolate the rotations with eased 't'
                    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, targetRotation.x, t);
                    model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, targetRotation.y, t);
                    model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, targetRotation.z, t);
                
                    // Increment elapsed time by the fixed delta time
                    elapsedTime += delta;

                    if(t >= 1) {
                        world.splice(world.indexOf(model), 1)
                        scene.remove(model)
                    }
                }
            }

            model.damage = (dmg) => {
                model.health -= dmg
            }

            model.doDie = () => {
                if(tree_fall_sound.isPlaying) {
                    tree_fall_sound.stop()
                }

                tree_fall_sound.setDetune(randomBetween(200, -200))
                tree_fall_sound.play()
                model.dying = true

                if(player.inventory["Wood"]) {
                    player.inventory["Wood"].quantity = player.inventory["Wood"].quantity + 200
                }
                else {
                    player.inventory["Wood"] = { quantity: 200 }
                }
            };
            

            world.push(model)
        }
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

loader.load(
    'models/bush.glb',
    function ( gltf ) {
        for(let i = 0; i < 250; i++) {
            let model = gltf.scene.clone()
            
            model.traverse((child) => {
                child.root = model
            })

            scene.add( model );
            
            let factor = randomBetween(0.4, 1.3)
            model.scale.set(factor, factor, factor)
            model.position.set(randomBetween(-100, 100), 0.5, randomBetween(-100, 100))
            //model.health = 100
            //model.canTakeDamage = true

            //model.rotateX(Math.PI / 2)
        }
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

const canSprint = () => {
    return !rightMouse && keyShift
}

const isGrounded = () => {
    return player.position.y <= groundLevel
  }

let lastStepPlayed = performance.now();

const handleMovement = (deltaTime, elapsedTime) => {

    let current = performance.now()

    let footstepDelay = canSprint() ? 300 : 500;

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

    if(canSprint()) {
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

    player.isWalking = isMoving()
    player.isSprinting = isMoving() && keyShift
};

const handleUI = () => {
    let inventoryInfo = "Inventory: <br>";

    for (const itemName in player.inventory) {
        const quantity = player.inventory[itemName].quantity;
        inventoryInfo += `${itemName}: ${quantity}<br>`;
    }

    infoText.innerHTML = `
    FPS: ${fps}<br>
    Position: ${Math.floor(player.position.x)}, ${Math.floor(player.position.y)}, ${Math.floor(player.position.z)}<br>
    Health: ${player.health}<br>
    Ammo: ${gun ? gun.ammo : 0} / 15 (R to reload)<br>
    Entities: ${world.length}<br>
    ${inventoryInfo}
    Selected: ${selectedItem ? selectedItem.name : "Nothing"}`;
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

const switchSlot = (slot) => {
    if(!hotBar[slot]) {
        if(selectedItem) {
            selectedItem.setActive(false)
            selectedItem = null
        }
        return
    }

    selectedSlot = slot
    selectedItem = hotBar[selectedSlot]
    console.log(player)
    selectedItem.setActive(true, player)
}


const doReload = () => {
    if(selectedItem && selectedItem.item_type === "firearm" && player.inventory["Bullet"].quantity > 0) {
        selectedItem.reload(player.inventory["Bullet"])
    }
}

const handleWorld = (delta, elapsedTime) => {
    for (let i = 0; i < world.length; i++) {
        world[i].update(delta, elapsedTime)
        //console.log(world[i])
    }
}


function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime()

    

    handlePhysics(deltaTime);
    handleUI();

    //csm.update(camera.matrix);

    handleDebug();

    handleMovement(deltaTime, elapsedTime); // should be before handleWorld of else camera lag

    handleWorld(deltaTime, elapsedTime)

    // if (gun) {
    //     let target = new THREE.Vector3().copy(handOffset);

    //     if (rightMouse) {
    //         target = new THREE.Vector3().copy(adsOffset);
    //     }

    //     target.applyQuaternion(camera.quaternion);
    //     gun.position.copy(camera.position).add(target);

    //     if (leftMouse && gun.ammo > 0) {
    //         const recoilVector = recoilDirection.clone().applyQuaternion(gun.quaternion).multiplyScalar(recoilAmount);
    //         gun.position.add(recoilVector);
    //     }

    //     gun.rotation.copy(camera.rotation);
    // }

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
        //doShoot()
        if(selectedItem) {
            selectedItem.use()
        }
    }
});

window.addEventListener('mousedown', function(event) {
    if (event.button === 0) {
        // Left mouse button pressed
        leftMouse = true;
    } else if (event.button === 2) {
        // Right mouse button pressed
        rightMouse = true;

        if(selectedItem) {
            if(selectedItem.item_type === "firearm") {
                selectedItem.setAds(true)
            }
        }
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

        if(selectedItem) {
            if(selectedItem.item_type === "firearm") {
                selectedItem.setAds(false)
            }
        }
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


    if(event.key >= 1 && event.key <= 9) {
        switchSlot(event.key - 1)
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