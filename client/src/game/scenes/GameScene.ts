import Phaser from "phaser";
import { Room } from "colyseus.js";
import { EventBus } from "../EventBus";

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  turretContainer: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  targetRotation: number;
  lastHp: number;
}

interface EnemyVisual {
  container: Phaser.GameObjects.Container;
  bodyContainer: Phaser.GameObjects.Container;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  targetX: number;
  targetY: number;
  targetRotation: number;
  maxHp: number;
  radius: number;
  color: number;
}

interface BulletVisual {
  container: Phaser.GameObjects.Container;
  targetX: number;
  targetY: number;
  color: number;
}

export class GameScene extends Phaser.Scene {
  private room: Room | null = null;
  private playerVisuals: Map<string, PlayerVisual> = new Map();
  private enemyVisuals: Map<string, EnemyVisual> = new Map();
  private bulletVisuals: Map<string, BulletVisual> = new Map();
  private coinVisuals: Map<string, Phaser.GameObjects.Container> = new Map();

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };

  private lastInput = {
    left: false,
    right: false,
    up: false,
    down: false,
    rotation: 0,
    shooting: false,
  };

  constructor() {
    super("GameScene");
  }

  init(data: { room: Room }) {
    this.room = data.room;
  }

  create() {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      }) as any;
    }

    // Left click instant shoot
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.room) {
        const localVisual = this.playerVisuals.get(this.room.sessionId);
        if (localVisual) {
          const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          const rot = Phaser.Math.Angle.Between(
            localVisual.container.x,
            localVisual.container.y,
            worldPt.x,
            worldPt.y
          );
          this.room.send("shoot", rot);
        }
      }
    });

    const mapW = this.room?.state.mapWidth || 2200;
    const mapH = this.room?.state.mapHeight || 2200;

    this.drawBackground(mapW, mapH);
    this.setupRoomListeners();

    EventBus.emit("current-scene-ready", this);
  }

  private drawBackground(mapW: number, mapH: number) {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1e293b, 0.85);

    const gridSize = 64;
    for (let x = 0; x <= mapW; x += gridSize) {
      grid.moveTo(x, 0);
      grid.lineTo(x, mapH);
    }
    for (let y = 0; y <= mapH; y += gridSize) {
      grid.moveTo(0, y);
      grid.lineTo(mapW, y);
    }
    grid.strokePath();

    // Arena center circle decoration
    grid.lineStyle(2, 0x1e293b, 0.9);
    grid.strokeCircle(mapW / 2, mapH / 2, 220);

    // Arena boundary
    grid.lineStyle(5, 0xef4444, 0.9);
    grid.strokeRect(0, 0, mapW, mapH);

    this.cameras.main.setBounds(0, 0, mapW, mapH);
  }

  private setupRoomListeners() {
    if (!this.room) return;

    // Room state top-level changes (wave, gameMode, roomCode)
    this.room.state.onChange(() => {
      this.emitGameInfo();
    });

    // 1. Players
    this.room.state.players.onAdd((player: any, sessionId: string) => {
      const isLocal = sessionId === this.room?.sessionId;
      const visual = this.createPlayerVisual(player, isLocal);
      this.playerVisuals.set(sessionId, visual);

      if (isLocal) {
        this.cameras.main.startFollow(visual.container, true, 0.12, 0.12);
      }

      this.emitPlayersUpdate();
      this.emitGameInfo();

      player.onChange(() => {
        visual.targetX = player.x;
        visual.targetY = player.y;
        visual.targetRotation = player.rotation;

        // Flash red if player took damage
        if (player.hp < visual.lastHp && player.hp > 0) {
          this.createHitEffect(visual.container.x, visual.container.y, 0xef4444);
          if (isLocal) {
            this.cameras.main.shake(110, 0.004);
          }
        }
        visual.lastHp = player.hp;

        // Update HP bar
        const hpRatio = Math.max(0, Math.min(1, player.hp / (player.maxHp || 100)));
        visual.hpBarFill.width = 44 * hpRatio;
        visual.hpBarFill.fillColor =
          hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xeab308 : 0xef4444;

        // Dead state visual
        visual.container.setAlpha(player.isDead ? 0.25 : 1);

        visual.scoreText.setText(`💀 ${player.kills || 0}  ⭐ ${player.score || 0}`);
        this.emitPlayersUpdate();
      });
    });

    this.room.state.players.onRemove((_player: any, sessionId: string) => {
      const visual = this.playerVisuals.get(sessionId);
      if (visual) {
        visual.container.destroy();
        this.playerVisuals.delete(sessionId);
      }
      this.emitPlayersUpdate();
    });

    // 2. Enemies
    this.room.state.enemies.onAdd((enemy: any, id: string) => {
      const visual = this.createEnemyVisual(enemy);
      this.enemyVisuals.set(id, visual);
      this.emitGameInfo();

      enemy.onChange(() => {
        visual.targetX = enemy.x;
        visual.targetY = enemy.y;
        visual.targetRotation = enemy.rotation;

        const ratio = Math.max(0, Math.min(1, enemy.hp / (enemy.maxHp || 40)));
        visual.hpBarFill.width = visual.radius * 2 * ratio;
      });
    });

    this.room.state.enemies.onRemove((_enemy: any, id: string) => {
      const visual = this.enemyVisuals.get(id);
      if (visual) {
        this.createExplosionEffect(visual.container.x, visual.container.y, visual.color);
        visual.container.destroy();
        this.enemyVisuals.delete(id);
      }
      this.emitGameInfo();
    });

    // 3. Bullets
    this.room.state.bullets.onAdd((bullet: any, id: string) => {
      const visual = this.createBulletVisual(bullet);
      this.bulletVisuals.set(id, visual);

      bullet.onChange(() => {
        visual.targetX = bullet.x;
        visual.targetY = bullet.y;
      });
    });

    this.room.state.bullets.onRemove((_bullet: any, id: string) => {
      const visual = this.bulletVisuals.get(id);
      if (visual) {
        this.createHitEffect(visual.container.x, visual.container.y, visual.color);
        visual.container.destroy();
        this.bulletVisuals.delete(id);
      }
    });

    // 4. Coins
    this.room.state.coins.onAdd((coin: any, id: string) => {
      const visual = this.createCoinVisual(coin);
      this.coinVisuals.set(id, visual);
    });

    this.room.state.coins.onRemove((_coin: any, id: string) => {
      const visual = this.coinVisuals.get(id);
      if (visual) {
        this.tweens.add({
          targets: visual,
          scale: 1.8,
          alpha: 0,
          duration: 180,
          onComplete: () => visual.destroy(),
        });
        this.coinVisuals.delete(id);
      }
    });
  }

  private createPlayerVisual(player: any, isLocal: boolean): PlayerVisual {
    const container = this.add.container(player.x, player.y);
    container.setDepth(20);

    const colorHex = Phaser.Display.Color.HexStringToColor(player.color || "#38bdf8").color;

    // Turret / Gun barrel container (rotates toward mouse)
    const turretContainer = this.add.container(0, 0);
    const gunBarrel = this.add.rectangle(18, 0, 22, 8, 0x94a3b8);
    gunBarrel.setStrokeStyle(1.5, 0x0f172a);
    const gunMuzzle = this.add.rectangle(28, 0, 5, 10, 0x475569);
    turretContainer.add([gunBarrel, gunMuzzle]);

    // Player body
    const body = this.add.circle(0, 0, 20, colorHex);
    body.setStrokeStyle(isLocal ? 3 : 2, isLocal ? 0xffffff : 0x0f172a, 1);

    // Health bar above player
    const hpBarBg = this.add.rectangle(0, -30, 46, 7, 0x0f172a, 0.85);
    hpBarBg.setStrokeStyle(1, 0x334155);
    const hpBarFill = this.add.rectangle(-22, -30, 44, 5, 0x22c55e, 1).setOrigin(0, 0.5);

    // Player Name
    const nameText = this.add
      .text(0, -44, player.name || "Oyuncu", {
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: isLocal ? "#38bdf8" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Kills & Score
    const scoreText = this.add
      .text(0, 30, `💀 ${player.kills || 0}  ⭐ ${player.score || 0}`, {
        fontFamily: "sans-serif",
        fontSize: "11px",
        color: "#facc15",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    container.add([turretContainer, body, hpBarBg, hpBarFill, nameText, scoreText]);

    return {
      container,
      turretContainer,
      body,
      hpBarBg,
      hpBarFill,
      nameText,
      scoreText,
      targetX: player.x,
      targetY: player.y,
      targetRotation: player.rotation || 0,
      lastHp: player.hp || 100,
    };
  }

  private createEnemyVisual(enemy: any): EnemyVisual {
    const container = this.add.container(enemy.x, enemy.y);
    container.setDepth(15);

    const radius = enemy.radius || 20;
    let color = 0xef4444; // normal red
    let strokeColor = 0x7f1d1d;

    if (enemy.type === "fast") {
      color = 0xf97316; // fast orange
      strokeColor = 0x7c2d12;
    } else if (enemy.type === "tank") {
      color = 0xa855f7; // tank purple boss
      strokeColor = 0x581c87;
    }

    const bodyContainer = this.add.container(0, 0);

    // Claws / Spikes pointing forward
    const leftClaw = this.add.triangle(radius - 2, -radius * 0.55, 0, -5, 14, 0, 0, 5, color);
    const rightClaw = this.add.triangle(radius - 2, radius * 0.55, 0, -5, 14, 0, 0, 5, color);
    leftClaw.setStrokeStyle(1.5, 0x000000);
    rightClaw.setStrokeStyle(1.5, 0x000000);

    const body = this.add.circle(0, 0, radius, color);
    body.setStrokeStyle(2.5, strokeColor);

    // Angry eyes
    const eyeLeft = this.add.circle(radius * 0.35, -radius * 0.3, 3.5, 0xfef08a);
    const eyeRight = this.add.circle(radius * 0.35, radius * 0.3, 3.5, 0xfef08a);

    bodyContainer.add([leftClaw, rightClaw, body, eyeLeft, eyeRight]);

    // Enemy HP Bar
    const barW = radius * 2;
    const hpBarBg = this.add.rectangle(0, -radius - 10, barW + 2, 6, 0x0f172a, 0.8);
    const hpBarFill = this.add
      .rectangle(-barW / 2, -radius - 10, barW, 4, 0xef4444)
      .setOrigin(0, 0.5);

    container.add([bodyContainer, hpBarBg, hpBarFill]);

    return {
      container,
      bodyContainer,
      hpBarBg,
      hpBarFill,
      targetX: enemy.x,
      targetY: enemy.y,
      targetRotation: enemy.rotation || 0,
      maxHp: enemy.maxHp || 40,
      radius,
      color,
    };
  }

  private createBulletVisual(bullet: any): BulletVisual {
    const container = this.add.container(bullet.x, bullet.y);
    container.setDepth(18);

    const colorHex = Phaser.Display.Color.HexStringToColor(bullet.color || "#38bdf8").color;
    const glow = this.add.circle(0, 0, 8, colorHex, 0.35);
    const core = this.add.circle(0, 0, 4.5, 0xffffff, 1);
    core.setStrokeStyle(2, colorHex);

    container.add([glow, core]);

    return {
      container,
      targetX: bullet.x,
      targetY: bullet.y,
      color: colorHex,
    };
  }

  private createCoinVisual(coin: any): Phaser.GameObjects.Container {
    const container = this.add.container(coin.x, coin.y);
    container.setDepth(8);

    const isBig = (coin.value || 10) >= 25;
    const radius = isBig ? 9 : 6.5;
    const color = isBig ? 0x4ade80 : 0xfacc15;

    const glow = this.add.circle(0, 0, radius * 1.8, color, 0.28);
    const orb = this.add.circle(0, 0, radius, color, 1);
    orb.setStrokeStyle(1.5, 0xffffff, 0.9);

    container.add([glow, orb]);

    this.tweens.add({
      targets: glow,
      scale: 1.45,
      alpha: 0.1,
      yoyo: true,
      repeat: -1,
      duration: 700,
    });

    return container;
  }

  private createHitEffect(x: number, y: number, color: number) {
    const circle = this.add.circle(x, y, 8, color, 0.8);
    circle.setDepth(25);
    this.tweens.add({
      targets: circle,
      scale: 2.2,
      alpha: 0,
      duration: 160,
      onComplete: () => circle.destroy(),
    });
  }

  private createExplosionEffect(x: number, y: number, color: number) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
      const dist = 18 + Math.random() * 16;
      const p = this.add.circle(x, y, 5, color, 0.9);
      p.setDepth(25);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        scale: 0.2,
        alpha: 0,
        duration: 260,
        onComplete: () => p.destroy(),
      });
    }
  }

  private emitPlayersUpdate() {
    if (!this.room) return;
    const list: Array<{
      id: string;
      name: string;
      score: number;
      kills: number;
      hp: number;
      maxHp: number;
      isDead: boolean;
      respawnTimer: number;
      color: string;
      isLocal: boolean;
    }> = [];

    this.room.state.players.forEach((p: any, sessionId: string) => {
      list.push({
        id: sessionId,
        name: p.name,
        score: p.score || 0,
        kills: p.kills || 0,
        hp: p.hp ?? 100,
        maxHp: p.maxHp ?? 100,
        isDead: Boolean(p.isDead),
        respawnTimer: p.respawnTimer || 0,
        color: p.color,
        isLocal: sessionId === this.room?.sessionId,
      });
    });

    list.sort((a, b) => b.score - a.score);
    EventBus.emit("players-updated", list);
  }

  private emitGameInfo() {
    if (!this.room) return;
    EventBus.emit("game-info-updated", {
      wave: this.room.state.wave || 1,
      gameMode: this.room.state.gameMode || "coop",
      roomCode: this.room.roomId,
      enemyCount: this.room.state.enemies ? this.room.state.enemies.size : 0,
    });
  }

  update() {
    // 1. Interpolate Players
    this.playerVisuals.forEach((visual) => {
      visual.container.x = Phaser.Math.Linear(visual.container.x, visual.targetX, 0.3);
      visual.container.y = Phaser.Math.Linear(visual.container.y, visual.targetY, 0.3);
      visual.turretContainer.rotation = visual.targetRotation;
    });

    // 2. Interpolate Enemies
    this.enemyVisuals.forEach((visual) => {
      visual.container.x = Phaser.Math.Linear(visual.container.x, visual.targetX, 0.28);
      visual.container.y = Phaser.Math.Linear(visual.container.y, visual.targetY, 0.28);
      visual.bodyContainer.rotation = visual.targetRotation;
    });

    // 3. Interpolate Bullets
    this.bulletVisuals.forEach((visual) => {
      visual.container.x = Phaser.Math.Linear(visual.container.x, visual.targetX, 0.55);
      visual.container.y = Phaser.Math.Linear(visual.container.y, visual.targetY, 0.55);
    });

    // 4. Local Player Input
    if (this.room && this.cursors && this.wasdKeys) {
      const left = this.cursors.left.isDown || this.wasdKeys.A.isDown;
      const right = this.cursors.right.isDown || this.wasdKeys.D.isDown;
      const up = this.cursors.up.isDown || this.wasdKeys.W.isDown;
      const down = this.cursors.down.isDown || this.wasdKeys.S.isDown;

      const pointer = this.input.activePointer;
      const shooting = pointer.leftButtonDown() || this.wasdKeys.SPACE.isDown;

      const localVisual = this.playerVisuals.get(this.room.sessionId);
      let rotation = this.lastInput.rotation;
      if (localVisual) {
        const worldPointer = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        rotation = Phaser.Math.Angle.Between(
          localVisual.container.x,
          localVisual.container.y,
          worldPointer.x,
          worldPointer.y
        );
        localVisual.turretContainer.rotation = rotation;
      }

      if (
        left !== this.lastInput.left ||
        right !== this.lastInput.right ||
        up !== this.lastInput.up ||
        down !== this.lastInput.down ||
        shooting !== this.lastInput.shooting ||
        Math.abs(rotation - this.lastInput.rotation) > 0.04
      ) {
        this.lastInput = { left, right, up, down, rotation, shooting };
        this.room.send("move", this.lastInput);
      }
    }
  }
}
