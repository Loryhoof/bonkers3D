import * as THREE from 'three'
import RAPIER, { RigidBody } from '@dimforge/rapier3d'

export const createBoxCollider = (x, y, z, world) => {
    let boxColliderDesc = RAPIER.ColliderDesc.cuboid(x, y, z)
    return world.createCollider(boxColliderDesc)
}

export const createDynamicBox = (x, y, z, world) => {
    // rb
    let rbDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 100, 0)
    let rb = world.createRigidBody(rbDesc)
    // col
    let colDesc = RAPIER.ColliderDesc.cuboid(x, y, z)
    let col = world.createCollider(colDesc, rb)

    const geom = new THREE.BoxGeometry(x, y, z)
    const mat = new THREE.MeshStandardMaterial( {color: 0x00ff00 })

    const cube = new THREE.Mesh( geom, mat )
    cube.physicsObject = rb;
    
    cube.update = () => {
        let  {x, y, z} = rb.translation()
        cube.position.set(x, y, z)
    }

    return cube;
}

export const createFixedBox = (scale, pos, world) => {
    // rb
    let rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, scale.y / 2 + pos.y, pos.z)
    let rb = world.createRigidBody(rbDesc)
    // col
    let colDesc = RAPIER.ColliderDesc.cuboid(scale.x, scale.y, scale.z)
    let col = world.createCollider(colDesc, rb)

    const geom = new THREE.BoxGeometry(scale.x, scale.y, scale.z)
    const mat = new THREE.MeshStandardMaterial( {color: 0x00ff00 })

    const cube = new THREE.Mesh( geom, mat )
    cube.visible = false
    cube.physicsObject = rb;
    cube.ignoreRayHit = true

    let  {x, y, z} = rb.translation()
    cube.position.set(x, y, z)
    
    cube.update = () => {
        let  {x, y, z} = rb.translation()
        cube.position.set(x, y, z)
    }

    return cube;
}

export const createPlayerCapsule = (world) => {
    let playerRigidbody = createRigidbody(world)
    let halfHeight = 1.5
    let radius = 0.275
    let capsuleColDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
    let playerCollider = world.createCollider(capsuleColDesc, playerRigidbody)

    return {playerRigidbody, playerCollider}
}

export const createRigidbody = (world) => {
    let rbDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 0).lockRotations()
    let rb = world.createRigidBody(rbDesc)
    return rb
}

export const createCharacterController = (world) => {
    let controller = world.createCharacterController(0.01)
    controller.setUp({ x: 0, y: 0, z: 1})
    controller.setApplyImpulsesToDynamicBodies(true);
    return controller;
}

export const moveCharacter = (character, collider, rb, translation) => {
    character.computeColliderMovement(
        collider,
        translation
    )

    let correctedMovement = character.computedMovement();

    setLinearVelocity(rb, correctedMovement)
}

export const setLinearVelocity = (rb, velocity) => {
    rb.setLinvel(new RAPIER.Vector3(velocity.x, velocity.y, velocity.z), true)
}