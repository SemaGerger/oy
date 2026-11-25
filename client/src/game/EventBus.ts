import Phaser from "phaser";

// EventBus is used to communicate between Phaser and React
export const EventBus = new Phaser.Events.EventEmitter();
