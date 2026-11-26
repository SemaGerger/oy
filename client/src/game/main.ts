import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { SoloGameScene } from "./scenes/SoloGameScene";
import { Room } from "colyseus.js";

export const createPhaserGame = (parent: HTMLElement, room: Room): Phaser.Game => {
  const gameScene = new GameScene(room);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parent,
    width: "100%",
    height: "100%",
    backgroundColor: "#232d28",
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
    scene: [gameScene],
  };

  return new Phaser.Game(config);
};

export const createSoloPhaserGame = (
  parent: HTMLElement,
  difficulty: "medium" | "hard" = "medium"
): Phaser.Game => {
  const soloScene = new SoloGameScene(difficulty);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parent,
    width: "100%",
    height: "100%",
    backgroundColor: "#232d28",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [soloScene],
  };

  return new Phaser.Game(config);
};
