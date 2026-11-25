import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { Room } from "colyseus.js";

export const createPhaserGame = (parent: HTMLElement, room: Room): Phaser.Game => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parent,
    width: "100%",
    height: "100%",
    backgroundColor: "#0b0f19",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [GameScene],
  };

  const game = new Phaser.Game(config);
  game.scene.start("GameScene", { room });
  return game;
};
