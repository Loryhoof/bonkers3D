export function createBullet(
    quantity 
) {
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
