export function createWood(
    quantity 
) {
    return {
        name: "Wood",
        quantity: quantity,
        item_type: "resources",
        image: 'items/wood.jpg',
        passive: true,

        update(time, elapsedTime) {
            
        }
    };
}
