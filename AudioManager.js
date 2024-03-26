import * as THREE from 'three'

const listener = new THREE.AudioListener();

const pistol_shoot_sound = new THREE.Audio(listener);
const pistol_reload_sound = new THREE.Audio(listener);
const bullet_impact_sound = new THREE.Audio(listener);
const ambience_sound = new THREE.Audio(listener);
const grass_step_sound = new THREE.Audio(listener);
const tree_fall_sound = new THREE.Audio(listener);

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

audioLoader.load( '/audio/tree_fall.mp3', function( buffer ) {
	tree_fall_sound.setBuffer( buffer );
	tree_fall_sound.setLoop( false );
	tree_fall_sound.setVolume( 0.5 );
});

export {
    listener,
    pistol_shoot_sound,
    pistol_reload_sound,
    bullet_impact_sound,
    ambience_sound,
    grass_step_sound,
    tree_fall_sound
};