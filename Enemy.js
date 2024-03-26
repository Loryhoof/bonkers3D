import * as THREE from "three"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadGLB } from "./utils";

const loader = new GLTFLoader();

const createEnemyPrefab = async (scene, world) => {
    let enemyPrefab = await loadGLB('models/person.glb');

    enemyPrefab.traverse((child) => {
        child.root = enemyPrefab
    })

    enemyPrefab.head = enemyPrefab.getObjectByName('Head');
    enemyPrefab.health = 100;
    enemyPrefab.canTakeDamage = true;
    enemyPrefab.target = new THREE.Object3D

    enemyPrefab.update = () => {
        if(enemyPrefab.health <= 0) {
            enemyPrefab.doDie();
        }
        enemyPrefab.lookAt(enemyPrefab.target.position.clone().setY(0));
        
        let dir = enemyPrefab.target.position.clone().sub(enemyPrefab.position).normalize();
        dir.y = 0;
        enemyPrefab.position.add(dir.multiplyScalar(0.01));
    };

    enemyPrefab.setTarget = (target) => {
        enemyPrefab.target = target;
    };

    enemyPrefab.setPosition = (x, y, z) => {
        enemyPrefab.position.set(x, y, z);
    }

    enemyPrefab.damage = (dmg) => {
        if(enemyPrefab.health > 0) {
            enemyPrefab.health -= dmg;
            console.log(enemyPrefab.health);
        }
        else {
            enemyPrefab.doDie();
        }
    };

    enemyPrefab.doDie = () => {
        world.splice(world.indexOf(enemyPrefab), 1)
        scene.remove(enemyPrefab)
    }

    return enemyPrefab;
};

export default createEnemyPrefab;
