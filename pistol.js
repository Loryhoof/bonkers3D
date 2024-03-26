import * as THREE from "three";
import { pistol_shoot_sound, bullet_impact_sound, pistol_reload_sound } from "./AudioManager";
import { loadGLB } from "./utils";

export async function createPistol(
    ammoCount, 
    raycaster, 
    camera, 
    scene, 
    recoilDirection = new THREE.Vector3(0, 0, 1), 
    recoilAmount = 0.05, 
    verticalRecoilAmount = Math.PI / 72
) {
    const handOffset = new THREE.Vector3(0.3, -0.3, -0.5);
    const adsOffset = new THREE.Vector3(0, -0.215, -0.4);

    let hasAppliedRecoil = false;
    let targetPosition = handOffset;
    let currentPosition = handOffset.clone(); // Start at handOffset

    let owner = null;

    let lerpFactor = 0.5;

    let gunModel = await loadGLB('models/gunReal.glb');
    gunModel = gunModel.scene
    gunModel.slide = gunModel.getObjectByName('Slide')

    scene.add(gunModel)

    return {
        name: "Pistol",
        quantity: 1,
        damage: 50,
        ammo: ammoCount,
        maxAmmo: ammoCount,
        item_type: "firearm",
        isActive: false,
        isAds: false,
        model: gunModel,
        owner: null,
        image: 'items/pistol.jpg',

        shoot() {
            if (this.ammo > 0) {
                raycaster.setFromCamera(new THREE.Vector2(), camera);

                const objectsToIntersect = scene.children.filter(object => object !== gunModel && !object.ignoreRayHit);

                const intersects = raycaster.intersectObjects(objectsToIntersect, true);

                if (intersects.length > 0) {
                    const point = intersects[0].point;

                    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
                    const material = new THREE.MeshStandardMaterial({ color: 0x000000 });
                    const cube = new THREE.Mesh(geometry, material);
                    cube.position.copy(point);

                    cube.ignoreRayHit = true


                    // maybe bad for perf.. dunno
                    setTimeout(() => {
                        scene.remove(cube)
                    }, 10000)
                    ///

                    scene.add(cube);

                    if (intersects[0].object.root && intersects[0].object.root.canTakeDamage) {
                        if (intersects[0].object.root.name == "Head") {
                            intersects[0].object.root.damage(100), this.item_type;
                        } else {
                            intersects[0].object.root.damage(this.damage, this.item_type);
                        }
                    }

                    if (pistol_shoot_sound.isPlaying || bullet_impact_sound.isPlaying) {
                        pistol_shoot_sound.stop();
                        bullet_impact_sound.stop();
                    }

                    pistol_shoot_sound.play();

                    const recoilVector = recoilDirection.clone().multiplyScalar(recoilAmount);
                    gunModel.position.add(recoilVector);

                    const initialSlidePosition = gunModel.slide.position.clone();
                    gunModel.slide.position.add(new THREE.Vector3(1, 0, 0).clone().multiplyScalar(0.1));

                    let initialCameraRotationX = new THREE.Vector3();

                    if (!hasAppliedRecoil) {
                        initialCameraRotationX = camera.rotation.x;
                        hasAppliedRecoil = true;
                        camera.rotateX(verticalRecoilAmount);
                    }

                    setTimeout(() => {
                        gunModel.slide.position.copy(initialSlidePosition);
                        hasAppliedRecoil = false;
                    }, 50);

                    this.ammo -= 1;
                }
            } else {
                //console.log("out of ammo");
            }
        },
        reload(bullets) {
            let dif = this.maxAmmo - this.ammo;

            let ammo = this.maxAmmo

            if(bullets.quantity < dif) {
                ammo = bullets.quantity
                bullets.quantity = 0
            }
            else {
                bullets.quantity = bullets.quantity - dif
            }

            this.ammo = ammo

            if(pistol_reload_sound.isPlaying) {
                pistol_reload_sound.stop()
            }

            pistol_reload_sound.play()

            const recoilVector = new THREE.Vector3(1,0,0).clone().multiplyScalar(0.15);
            const initialSlidePosition = gunModel.slide.position.clone();

            gunModel.slide.position.add(recoilVector)
            
            setTimeout(() => {
                gunModel.slide.position.copy(initialSlidePosition)
            }, 600)
        },
        use() {
            this.shoot();
        },
        setAds(bool) {
            this.ads = bool;
            if (bool) {
                targetPosition = adsOffset;
                lerpFactor = 0.2
            } else {
                targetPosition = handOffset;
                lerpFactor = 0.05
            }
        },
        setActive(bool, owner = null) {
            gunModel.visible = bool
            this.owner = owner
            this.isActive = bool
        },
        update(time, elapsedTime) {
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
                frequency = 1
                amplitude = 0.005;
            }
            if(this.owner.isWalking) {
                frequency = 10
                amplitude = 0.01
            }
            if(this.owner.isSprinting) {
                frequency = 15
                amplitude = 0.025
            }

            if(this.ads && this.owner.isWalking || this.ads && this.owner.isSprinting) {
                frequency = 1
                amplitude = 0.005
            }

            let t = Math.sin(elapsedTime * frequency) * amplitude;
            gunModel.position.y += t;
            gunModel.position.z -= t;
        }
    };
}
