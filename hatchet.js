import * as THREE from "three";
import { pistol_shoot_sound, bullet_impact_sound, pistol_reload_sound, axeSounds } from "./AudioManager";
import { loadGLB, randomFrom } from "./utils";

export async function createHatchet(
    raycaster, 
    camera, 
    scene,
) {
    const handOffset = new THREE.Vector3(0.2, -0.3, -0.5);
    const adsOffset = new THREE.Vector3(0, -0.215, -0.4);

    let hasAppliedRecoil = false;
    let targetPosition = handOffset;
    let currentPosition = handOffset.clone(); // Start at handOffset

    let owner = null;

    let lerpFactor = 0.5;

    let gunModel = await loadGLB('models/hatchet.glb');
    const clips = gunModel.animations;
    gunModel = gunModel.scene;

    scene.add(gunModel);

    const mixer = new THREE.AnimationMixer( gunModel );

    const hitClip = THREE.AnimationClip.findByName( clips, 'hit' );
    const hitAnim = mixer.clipAction( hitClip );

    hitAnim.setLoop(THREE.LoopOnce);
    hitAnim.clampWhenFinished = true;

    let swinging = false;
    
    return {
        name: "Hatchet",
        quantity: 1,
        damage: 10,
        item_type: "tool",
        isActive: false,
        isAds: false,
        model: gunModel,
        owner: null,
        holding: false,
        image: 'items/hatchet.jpg',

        use() {
            if(swinging || hitAnim.isRunning()) {
                return
            }

            hitAnim.play();

            setTimeout(() => {
                raycaster.setFromCamera(new THREE.Vector2(), camera);

                const objectsToIntersect = scene.children.filter(object => object !== gunModel && !object.ignoreRayHit);

                const intersects = raycaster.intersectObjects(objectsToIntersect, true);

                if(intersects[0] && intersects[0].distance < 1.5) {
                    let obj = intersects[0].object.root;
                    
                    obj.damage(this.damage, this.item_type)

                    const point = intersects[0].point;

                    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
                    const material = new THREE.MeshStandardMaterial({ color: 0x000000 });
                    const cube = new THREE.Mesh(geometry, material);
                    cube.position.copy(point);
                    cube.ignoreRayHit = true
                    scene.add(cube)

                    setTimeout(() => {
                        scene.remove(cube)
                    }, 5000)

                    let audio = randomFrom(axeSounds)

                    if(audio.isPlaying) {
                        audio.stop()
                    }

                    audio.play()
                }
                
            }, hitClip.duration * 500)

            swinging = true;

            setTimeout(() => {
                hitAnim.stop();
                swinging = false
            }, hitClip.duration * 1000)
        },
        setHold(bool) {
            this.holding = bool
        },
        setActive(bool, owner = null) {
            gunModel.visible = bool;
            this.owner = owner;
            this.isActive = bool;
        },
        update(delta, elapsedTime) {
            if (!this.isActive || !this.owner) {
                return;
            }
        
            currentPosition.lerp(targetPosition, lerpFactor);
        
            let target = currentPosition.clone();
            target.applyQuaternion(camera.quaternion);
        
            gunModel.position.copy(camera.position).add(target);
            gunModel.rotation.copy(camera.rotation);
        
            let frequency = 2; // faster
            let amplitude = 0.015; // more movement
        
            if (this.ads) {
                frequency = 1;
                amplitude = 0.005;
            }
            if (this.owner.isWalking) {
                frequency = 10;
                amplitude = 0.01;
            }
            if (this.owner.isSprinting) {
                frequency = 15;
                amplitude = 0.025;
            }
        
            if (this.ads && (this.owner.isWalking || this.owner.isSprinting)) {
                frequency = 1;
                amplitude = 0.005;
            }
        
            let t = Math.sin(elapsedTime * frequency) * amplitude;
            gunModel.position.y += t;
            gunModel.position.z -= t;
        
            if(this.holding) {
                this.use()
            }

            mixer.update(delta)
        }
        
    };
}
