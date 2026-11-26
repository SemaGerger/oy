import Phaser from "phaser";
import { EventBus } from "../EventBus";
import { AppTheme, getSavedTheme } from "../../theme/ThemeContext";

interface SoloObstacle {
  type: "rock" | "wall" | "pillar";
  x: number;
  y: number;
  radius: number;
  visual: Phaser.GameObjects.Container;
}

interface SoloEnemy {
  type: "normal" | "fast" | "tank";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  color: number;
  container: Phaser.GameObjects.Container;
  bodyContainer: Phaser.GameObjects.Container;
  hpBarFill: Phaser.GameObjects.Rectangle;
}

interface SoloBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  createdAt: number;
  container: Phaser.GameObjects.Container;
}

interface SoloCoin {
  x: number;
  y: number;
  value: number;
  container: Phaser.GameObjects.Container;
}

export class SoloGameScene extends Phaser.Scene {
  private readonly mapW = 2200;
  private readonly mapH = 2200;

  private currentTheme: AppTheme = getSavedTheme();
  private bgGraphics: Phaser.GameObjects.Graphics | null = null;

  // Player state
  private playerX = 1100;
  private playerY = 1100;
  private playerRot = 0;
  private playerHp = 100;
  private readonly playerMaxHp = 100;
  private readonly playerSpeed = 245;
  private score = 0;
  private kills = 0;
  private isDead = false;
  private respawnTimer = 0;
  private lastShootTime = 0;
  private lastDamageTime = 0;

  // Wave state
  private wave = 1;
  private waveTimer = 0;
  private spawnTimer = 0;

  // Player visuals
  private playerContainer!: Phaser.GameObjects.Container;
  private turretContainer!: Phaser.GameObjects.Container;
  private playerHpFill!: Phaser.GameObjects.Rectangle;
  private playerScoreText!: Phaser.GameObjects.Text;

  // Entities
  private obstacles: SoloObstacle[] = [];
  private enemies: SoloEnemy[] = [];
  private bullets: SoloBullet[] = [];
  private coins: SoloCoin[] = [];

  // Controls (Drag Joystick + WASD)
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private isDragging = false;
  private dragOriginX = 0;
  private dragOriginY = 0;
  private dragDx = 0;
  private dragDy = 0;
  private joyBase: Phaser.GameObjects.Arc | null = null;
  private joyThumb: Phaser.GameObjects.Arc | null = null;

  private lastHudEmit = 0;

  constructor() {
    super("SoloGameScene");
  }

  private handleThemeChanged = (nextTheme: AppTheme) => {
    this.currentTheme = nextTheme;
    this.drawBackground();
    this.rebuildObstacleVisuals();
  };

  create() {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as any;
    }

    this.drawBackground();
    this.generateObstacles();
    this.createPlayerVisual();

    for (let i = 0; i < 22; i++) {
      this.spawnCoin();
    }
    for (let i = 0; i < 6; i++) {
      this.spawnEnemy();
    }

    // Floating virtual joystick
    this.joyBase = this.add
      .circle(0, 0, 44, 0xffffff, 0.14)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.joyThumb = this.add
      .circle(0, 0, 18, 0xf05232, 0.78)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    const maxJoyRadius = 48;
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() || pointer.wasTouch) {
        this.isDragging = true;
        this.dragOriginX = pointer.x;
        this.dragOriginY = pointer.y;
        this.dragDx = 0;
        this.dragDy = 0;

        if (this.joyBase && this.joyThumb) {
          const isOffice = this.currentTheme === "office";
          this.joyBase
            .setPosition(pointer.x, pointer.y)
            .setFillStyle(isOffice ? 0x64748b : 0xffffff, isOffice ? 0.12 : 0.14)
            .setStrokeStyle(2, isOffice ? 0x64748b : 0xffffff, 0.35)
            .setVisible(true);
          this.joyThumb
            .setPosition(pointer.x, pointer.y)
            .setFillStyle(isOffice ? 0x2563eb : 0xf05232, 0.75)
            .setVisible(true);
        }
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const rawDx = pointer.x - this.dragOriginX;
      const rawDy = pointer.y - this.dragOriginY;
      const dist = Math.hypot(rawDx, rawDy);

      if (dist > 6) {
        const clamped = Math.min(dist, maxJoyRadius);
        const nx = rawDx / dist;
        const ny = rawDy / dist;
        this.dragDx = nx * (clamped / maxJoyRadius);
        this.dragDy = ny * (clamped / maxJoyRadius);
        this.joyThumb?.setPosition(
          this.dragOriginX + nx * clamped,
          this.dragOriginY + ny * clamped
        );
      } else {
        this.dragDx = 0;
        this.dragDy = 0;
        this.joyThumb?.setPosition(this.dragOriginX, this.dragOriginY);
      }
    });

    const stopDrag = () => {
      this.isDragging = false;
      this.dragDx = 0;
      this.dragDy = 0;
      this.joyBase?.setVisible(false);
      this.joyThumb?.setVisible(false);
    };

    this.input.on("pointerup", stopDrag);
    this.input.on("pointerupoutside", stopDrag);

    EventBus.on("theme-changed", this.handleThemeChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("theme-changed", this.handleThemeChanged);
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      EventBus.off("theme-changed", this.handleThemeChanged);
    });

    this.emitHudStats();
  }

  private drawBackground() {
    if (this.bgGraphics) {
      this.bgGraphics.destroy();
    }
    const bg = this.add.graphics();
    bg.setDepth(0);
    this.bgGraphics = bg;

    const isOffice = this.currentTheme === "office";

    if (isOffice) {
      this.cameras.main.setBackgroundColor("#f1f5f9");
      bg.fillStyle(0xf8fafc, 1);
      bg.fillRect(0, 0, this.mapW, this.mapH);

      bg.fillStyle(0xf1f5f9, 0.55);
      const tileSize = 192;
      for (let x = 0; x < this.mapW; x += tileSize) {
        for (let y = 0; y < this.mapH; y += tileSize) {
          if (((x / tileSize) + (y / tileSize)) % 2 === 0) {
            bg.fillRect(x, y, tileSize, tileSize);
          }
        }
      }

      bg.lineStyle(1, 0xe2e8f0, 1);
      const gridSize = 48;
      for (let x = 0; x <= this.mapW; x += gridSize) {
        bg.moveTo(x, 0);
        bg.lineTo(x, this.mapH);
      }
      for (let y = 0; y <= this.mapH; y += gridSize) {
        bg.moveTo(0, y);
        bg.lineTo(this.mapW, y);
      }
      bg.strokePath();

      bg.lineStyle(1.5, 0xcbd5e1, 0.9);
      bg.strokeCircle(this.mapW / 2, this.mapH / 2, 240);
      bg.lineStyle(3, 0x94a3b8, 1);
      bg.strokeRect(0, 0, this.mapW, this.mapH);
    } else {
      this.cameras.main.setBackgroundColor("#232d28");
      bg.fillStyle(0x2a3630, 1);
      bg.fillRect(0, 0, this.mapW, this.mapH);

      bg.fillStyle(0x313f38, 0.75);
      const tileSize = 192;
      for (let x = 0; x < this.mapW; x += tileSize) {
        for (let y = 0; y < this.mapH; y += tileSize) {
          if (((x / tileSize) + (y / tileSize)) % 2 === 0) {
            bg.fillRect(x, y, tileSize, tileSize);
          }
        }
      }

      bg.lineStyle(1, 0x3b4a42, 0.55);
      const gridSize = 64;
      for (let x = 0; x <= this.mapW; x += gridSize) {
        bg.moveTo(x, 0);
        bg.lineTo(x, this.mapH);
      }
      for (let y = 0; y <= this.mapH; y += gridSize) {
        bg.moveTo(0, y);
        bg.lineTo(this.mapW, y);
      }
      bg.strokePath();

      bg.fillStyle(0xd6d3d1, 0.05);
      bg.fillCircle(this.mapW / 2, this.mapH / 2, 240);
      bg.lineStyle(3, 0xfbbf24, 0.35);
      bg.strokeCircle(this.mapW / 2, this.mapH / 2, 240);
      bg.lineStyle(1.5, 0xe7e5e4, 0.16);
      bg.strokeCircle(this.mapW / 2, this.mapH / 2, 420);

      bg.lineStyle(12, 0xb91c1c, 0.25);
      bg.strokeRect(6, 6, this.mapW - 12, this.mapH - 12);
      bg.lineStyle(5, 0xf05232, 0.95);
      bg.strokeRect(0, 0, this.mapW, this.mapH);
    }

    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);
  }

  private generateObstacles() {
    const types: Array<"rock" | "wall" | "pillar"> = ["rock", "wall", "pillar"];
    const cx = this.mapW / 2;
    const cy = this.mapH / 2;

    const ringDist = 340;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      const x = Math.round(cx + Math.cos(angle) * ringDist);
      const y = Math.round(cy + Math.sin(angle) * ringDist);
      const visual = this.createObstacleVisual("pillar", x, y, 40);
      this.obstacles.push({ type: "pillar", x, y, radius: 40, visual });
    }

    let attempts = 0;
    let count = 0;
    while (count < 22 && attempts < 200) {
      attempts++;
      const radius = 36 + Math.floor(Math.random() * 26);
      const x = Math.floor(Math.random() * (this.mapW - 260) + 130);
      const y = Math.floor(Math.random() * (this.mapH - 260) + 130);

      if (Math.hypot(x - cx, y - cy) < 260) continue;

      let overlaps = false;
      for (const p of this.obstacles) {
        if (Math.hypot(x - p.x, y - p.y) < radius + p.radius + 95) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      const type = types[count % types.length];
      const visual = this.createObstacleVisual(type, x, y, radius);
      this.obstacles.push({ type, x, y, radius, visual });
      count++;
    }
  }

  private rebuildObstacleVisuals() {
    for (const obs of this.obstacles) {
      obs.visual.destroy();
      obs.visual = this.createObstacleVisual(obs.type, obs.x, obs.y, obs.radius);
    }
  }

  private createObstacleVisual(
    type: "rock" | "wall" | "pillar",
    x: number,
    y: number,
    r: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(12);
    const isOffice = this.currentTheme === "office";

    if (isOffice) {
      const shadow = this.add.circle(3, 4, r + 1, 0x94a3b8, 0.2);
      container.add(shadow);
      if (type === "wall") {
        const size = r * 1.65;
        const box = this.add.rectangle(0, 0, size, size, 0xe2e8f0, 1);
        box.setStrokeStyle(2, 0x94a3b8, 1);
        const inner = this.add.rectangle(0, 0, size * 0.66, size * 0.66, 0xf8fafc, 1);
        inner.setStrokeStyle(1, 0xcbd5e1, 1);
        container.add([box, inner]);
      } else if (type === "pillar") {
        const ring = this.add.circle(0, 0, r, 0xeff6ff, 1);
        ring.setStrokeStyle(2, 0x93c5fd, 1);
        const core = this.add.circle(0, 0, r * 0.4, 0x3b82f6, 0.25);
        container.add([ring, core]);
      } else {
        const node = this.add.circle(0, 0, r, 0xf1f5f9, 1);
        node.setStrokeStyle(2, 0x94a3b8, 1);
        const inner = this.add.circle(0, 0, r * 0.55, 0xe2e8f0, 0.9);
        container.add([node, inner]);
      }
      return container;
    }

    const shadow = this.add.circle(6, 8, r + 3, 0x000000, 0.45);
    container.add(shadow);

    if (type === "pillar") {
      const outerAura = this.add.circle(0, 0, r + 6, 0xf59e0b, 0.14);
      const base = this.add.circle(0, 0, r, 0x44403c, 1);
      base.setStrokeStyle(3, 0x292524, 1);
      const midRing = this.add.circle(0, 0, r * 0.65, 0x57534e, 1);
      midRing.setStrokeStyle(2, 0xd97706, 0.85);
      const core = this.add.circle(0, 0, r * 0.34, 0xf59e0b, 0.95);
      const innerSpark = this.add.circle(0, 0, r * 0.16, 0xfef3c7, 1);
      container.add([outerAura, base, midRing, core, innerSpark]);
    } else if (type === "wall") {
      const size = r * 1.65;
      const plate = this.add.rectangle(0, 0, size, size, 0x57534e, 1);
      plate.setStrokeStyle(3, 0x292524, 1);
      const innerPlate = this.add.rectangle(0, 0, size * 0.68, size * 0.68, 0x78716c, 1);
      innerPlate.setStrokeStyle(2, 0x44403c, 1);
      const centerDot = this.add.rectangle(0, 0, size * 0.22, size * 0.22, 0xd97706, 0.9);
      container.add([plate, innerPlate, centerDot]);
    } else {
      const rockBase = this.add.circle(0, 0, r, 0x6b6660, 1);
      rockBase.setStrokeStyle(3, 0x292524, 1);
      const facet1 = this.add.circle(-r * 0.18, -r * 0.16, r * 0.66, 0x87817a, 0.92);
      const facet2 = this.add.circle(-r * 0.26, -r * 0.24, r * 0.34, 0xa8a29e, 0.7);
      const mossAccent = this.add.circle(r * 0.28, r * 0.24, r * 0.24, 0x3f6212, 0.75);
      container.add([rockBase, facet1, facet2, mossAccent]);
    }
    return container;
  }

  private createPlayerVisual() {
    this.playerContainer = this.add.container(this.playerX, this.playerY);
    this.playerContainer.setDepth(20);

    this.turretContainer = this.add.container(0, 0);
    const gunBarrel = this.add.rectangle(18, 0, 22, 8, 0x94a3b8);
    gunBarrel.setStrokeStyle(1.5, 0x0f172a);
    const gunMuzzle = this.add.rectangle(28, 0, 5, 10, 0x475569);
    this.turretContainer.add([gunBarrel, gunMuzzle]);

    const body = this.add.circle(0, 0, 20, 0x3b82f6);
    body.setStrokeStyle(3, 0xffffff, 1);

    const hpBg = this.add.rectangle(0, -30, 46, 7, 0x0f172a, 0.85);
    this.playerHpFill = this.add.rectangle(-22, -30, 44, 5, 0x22c55e, 1).setOrigin(0, 0.5);

    this.playerScoreText = this.add
      .text(0, 30, "💀 0  ⭐ 0", {
        fontFamily: "sans-serif",
        fontSize: "11px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.playerContainer.add([
      this.turretContainer,
      body,
      hpBg,
      this.playerHpFill,
      this.playerScoreText,
    ]);

    this.cameras.main.startFollow(this.playerContainer, true, 0.12, 0.12);
  }

  private findSafePos(radius: number): { x: number; y: number } {
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * (this.mapW - 220) + 110;
      const y = Math.random() * (this.mapH - 220) + 110;
      let ok = true;
      for (const obs of this.obstacles) {
        if (Math.hypot(x - obs.x, y - obs.y) < obs.radius + radius + 14) {
          ok = false;
          break;
        }
      }
      if (ok) return { x, y };
    }
    return { x: this.mapW / 2, y: this.mapH / 2 };
  }

  private resolveObstacleCollision(pos: { x: number; y: number }, radius: number) {
    for (const obs of this.obstacles) {
      const dx = pos.x - obs.x;
      const dy = pos.y - obs.y;
      const distSq = dx * dx + dy * dy;
      const minDist = obs.radius + radius;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const push = minDist - dist;
        pos.x += (dx / dist) * push;
        pos.y += (dy / dist) * push;
      }
    }
  }

  private spawnCoin(x?: number, y?: number, value = 10) {
    if (this.coins.length > 50) return;
    const pos = typeof x === "number" && typeof y === "number" ? { x, y } : this.findSafePos(12);
    const container = this.add.container(pos.x, pos.y);
    container.setDepth(8);

    const isBig = value >= 25;
    const r = isBig ? 9 : 6.5;
    const color = isBig ? 0x4ade80 : 0xfacc15;
    const glow = this.add.circle(0, 0, r * 1.7, color, 0.25);
    const orb = this.add.circle(0, 0, r, color, 1);
    orb.setStrokeStyle(1.5, 0xffffff, 0.9);
    container.add([glow, orb]);

    this.coins.push({ x: pos.x, y: pos.y, value, container });
  }

  private spawnEnemy() {
    const maxEnemies = Math.min(40, 10 + this.wave * 4);
    if (this.enemies.length >= maxEnemies) return;

    const roll = Math.random();
    let type: "normal" | "fast" | "tank" = "normal";
    let hp = 45 + this.wave * 8;
    let speed = 115 + Math.min(45, this.wave * 3);
    let radius = 20;
    let damage = 15;
    let color = 0xef4444;
    let stroke = 0x7f1d1d;

    if (this.wave >= 2 && roll < 0.16) {
      type = "tank";
      hp = 130 + this.wave * 20;
      speed = 75 + Math.min(35, this.wave * 2);
      radius = 30;
      damage = 25;
      color = 0xa855f7;
      stroke = 0x581c87;
    } else if (roll < 0.45) {
      type = "fast";
      hp = 25 + this.wave * 5;
      speed = 175 + Math.min(50, this.wave * 4);
      radius = 15;
      damage = 10;
      color = 0xf97316;
      stroke = 0x7c2d12;
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = 500 + Math.random() * 240;
    const pos = {
      x: Math.max(40, Math.min(this.mapW - 40, this.playerX + Math.cos(angle) * dist)),
      y: Math.max(40, Math.min(this.mapH - 40, this.playerY + Math.sin(angle) * dist)),
    };
    this.resolveObstacleCollision(pos, radius);

    const container = this.add.container(pos.x, pos.y);
    container.setDepth(15);

    const bodyContainer = this.add.container(0, 0);
    const leftClaw = this.add.triangle(radius - 2, -radius * 0.55, 0, -5, 14, 0, 0, 5, color);
    const rightClaw = this.add.triangle(radius - 2, radius * 0.55, 0, -5, 14, 0, 0, 5, color);
    const body = this.add.circle(0, 0, radius, color);
    body.setStrokeStyle(2.5, stroke);
    const eyeL = this.add.circle(radius * 0.35, -radius * 0.3, 3.5, 0xfef08a);
    const eyeR = this.add.circle(radius * 0.35, radius * 0.3, 3.5, 0xfef08a);
    bodyContainer.add([leftClaw, rightClaw, body, eyeL, eyeR]);

    const barW = radius * 2;
    const hpBg = this.add.rectangle(0, -radius - 10, barW + 2, 6, 0x0f172a, 0.8);
    const hpBarFill = this.add
      .rectangle(-barW / 2, -radius - 10, barW, 4, 0xef4444)
      .setOrigin(0, 0.5);

    container.add([bodyContainer, hpBg, hpBarFill]);

    this.enemies.push({
      type,
      x: pos.x,
      y: pos.y,
      hp,
      maxHp: hp,
      speed,
      radius,
      damage,
      color,
      container,
      bodyContainer,
      hpBarFill,
    });
  }

  private tryShoot(now: number) {
    if (now - this.lastShootTime < 170) return;
    this.lastShootTime = now;

    const muzzle = 28;
    const x = this.playerX + Math.cos(this.playerRot) * muzzle;
    const y = this.playerY + Math.sin(this.playerRot) * muzzle;
    const speed = 760;

    const container = this.add.container(x, y);
    container.setDepth(18);
    const glow = this.add.circle(0, 0, 8, 0x3b82f6, 0.3);
    const core = this.add.circle(0, 0, 4.5, 0xffffff, 1);
    core.setStrokeStyle(2, 0x3b82f6);
    container.add([glow, core]);

    this.bullets.push({
      x,
      y,
      vx: Math.cos(this.playerRot) * speed,
      vy: Math.sin(this.playerRot) * speed,
      damage: 20,
      createdAt: now,
      container,
    });
  }

  private createHitEffect(x: number, y: number, color: number) {
    const c = this.add.circle(x, y, 7, color, 0.8);
    c.setDepth(25);
    this.tweens.add({
      targets: c,
      scale: 2,
      alpha: 0,
      duration: 150,
      onComplete: () => c.destroy(),
    });
  }

  private emitHudStats() {
    EventBus.emit("solo-stats-updated", {
      wave: this.wave,
      enemyCount: this.enemies.length,
      hp: Math.max(0, Math.round(this.playerHp)),
      maxHp: this.playerMaxHp,
      kills: this.kills,
      score: this.score,
      isDead: this.isDead,
      respawnTimer: this.respawnTimer,
    });
  }

  update(time: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    const now = Date.now();

    // 1. Wave & Enemy Spawner
    this.spawnTimer += dt;
    this.waveTimer += dt;
    const spawnInterval = Math.max(0.65, 2.0 - this.wave * 0.14);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }
    if (this.waveTimer >= 30) {
      this.waveTimer = 0;
      this.wave += 1;
      for (let i = 0; i < 4; i++) this.spawnEnemy();
    }

    // 2. Player Movement or Respawn
    if (this.isDead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.isDead = false;
        this.playerHp = this.playerMaxHp;
        this.respawnTimer = 0;
        const pos = this.findSafePos(24);
        this.playerX = pos.x;
        this.playerY = pos.y;
        this.playerContainer.setAlpha(1);
      }
    } else {
      let dx = 0;
      let dy = 0;
      if (this.isDragging) {
        dx = this.dragDx;
        dy = this.dragDy;
      } else if (this.cursors && this.wasdKeys) {
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) dx -= 1;
        if (this.cursors.right.isDown || this.wasdKeys.D.isDown) dx += 1;
        if (this.cursors.up.isDown || this.wasdKeys.W.isDown) dy -= 1;
        if (this.cursors.down.isDown || this.wasdKeys.S.isDown) dy += 1;
        if (dx !== 0 && dy !== 0) {
          dx *= Math.SQRT1_2;
          dy *= Math.SQRT1_2;
        }
      }

      const pos = {
        x: this.playerX + dx * this.playerSpeed * dt,
        y: this.playerY + dy * this.playerSpeed * dt,
      };
      this.resolveObstacleCollision(pos, 20);
      this.playerX = Math.max(25, Math.min(this.mapW - 25, pos.x));
      this.playerY = Math.max(25, Math.min(this.mapH - 25, pos.y));

      // Auto-aim & Auto-shoot nearest enemy within 560px
      let nearest: SoloEnemy | null = null;
      let minDistSq = 560 * 560;
      for (const e of this.enemies) {
        const dSq = (e.x - this.playerX) ** 2 + (e.y - this.playerY) ** 2;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearest = e;
        }
      }

      if (nearest) {
        this.playerRot = Math.atan2(nearest.y - this.playerY, nearest.x - this.playerX);
        this.tryShoot(now);
      } else if (dx !== 0 || dy !== 0) {
        this.playerRot = Math.atan2(dy, dx);
      }

      this.playerContainer.setPosition(this.playerX, this.playerY);
      this.turretContainer.rotation = this.playerRot;

      // Coin pickup
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const c = this.coins[i];
        if ((this.playerX - c.x) ** 2 + (this.playerY - c.y) ** 2 < 32 * 32) {
          this.score += c.value;
          this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 8);
          c.container.destroy();
          this.coins.splice(i, 1);
          if (this.coins.length < 18) this.spawnCoin();
        }
      }
    }

    // Update Player HP Bar & Score
    const hpRatio = Math.max(0, Math.min(1, this.playerHp / this.playerMaxHp));
    this.playerHpFill.width = 44 * hpRatio;
    this.playerHpFill.fillColor = hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xeab308 : 0xef4444;
    this.playerScoreText.setText(`💀 ${this.kills}  ⭐ ${this.score}`);

    // 3. Bullets update & collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.container.setPosition(b.x, b.y);

      let remove =
        now - b.createdAt > 1300 || b.x < 0 || b.x > this.mapW || b.y < 0 || b.y > this.mapH;

      if (!remove) {
        for (const obs of this.obstacles) {
          if ((b.x - obs.x) ** 2 + (b.y - obs.y) ** 2 < (obs.radius + 4) ** 2) {
            remove = true;
            this.createHitEffect(b.x, b.y, 0xfbbf24);
            break;
          }
        }
      }

      if (!remove) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.radius + 6) ** 2) {
            remove = true;
            e.hp -= b.damage;
            this.createHitEffect(b.x, b.y, e.color);
            e.hpBarFill.width = e.radius * 2 * Math.max(0, e.hp / e.maxHp);

            if (e.hp <= 0) {
              const reward = e.type === "tank" ? 50 : e.type === "fast" ? 25 : 15;
              this.score += reward;
              this.kills += 1;
              this.spawnCoin(e.x, e.y, reward);
              e.container.destroy();
              this.enemies.splice(j, 1);
            }
            break;
          }
        }
      }

      if (remove) {
        b.container.destroy();
        this.bullets.splice(i, 1);
      }
    }

    // 4. Enemies chase player & collide with obstacles
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!this.isDead) {
        const angle = Math.atan2(this.playerY - e.y, this.playerX - e.x);
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;
        e.bodyContainer.rotation = angle;
        this.resolveObstacleCollision(e, e.radius);

        const contactDist = e.radius + 20;
        const dSq = (this.playerX - e.x) ** 2 + (this.playerY - e.y) ** 2;
        if (dSq < contactDist * contactDist && now - this.lastDamageTime > 600) {
          this.lastDamageTime = now;
          this.playerHp -= e.damage;
          this.cameras.main.shake(90, 0.003);
          this.createHitEffect(this.playerX, this.playerY, 0xef4444);

          if (this.playerHp <= 0) {
            this.playerHp = 0;
            this.isDead = true;
            this.respawnTimer = 3;
            this.playerContainer.setAlpha(0.25);
          }
        }
      }

      // Soft separation between enemies
      for (let j = i + 1; j < this.enemies.length; j++) {
        const o = this.enemies[j];
        const dx = e.x - o.x;
        const dy = e.y - o.y;
        const dSq = dx * dx + dy * dy;
        const minSep = e.radius + o.radius;
        if (dSq > 0 && dSq < minSep * minSep) {
          const dist = Math.sqrt(dSq);
          const overlap = (minSep - dist) * 0.5;
          e.x += (dx / dist) * overlap;
          e.y += (dy / dist) * overlap;
          o.x -= (dx / dist) * overlap;
          o.y -= (dy / dist) * overlap;
        }
      }

      e.container.setPosition(e.x, e.y);
    }

    if (time - this.lastHudEmit > 120) {
      this.lastHudEmit = time;
      this.emitHudStats();
    }
  }
}
