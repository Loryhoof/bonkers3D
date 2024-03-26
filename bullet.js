import { loadGLB } from "./utils";

export async function createBullet(
    quantity 
) {
    //let gunModel = await loadGLB('models/bullet.glb');
    //gunModel = gunModel.scene
    //gunModel.slide = gunModel.getObjectByName('Slide')

    //scene.add(gunModel)

    return {
        name: "Bullet",
        quantity: quantity,
        item_type: "ammo",
        image: 'items/bullet.jpg',
        passive: true,

        update(time, elapsedTime) {
            
        }
    };
}
