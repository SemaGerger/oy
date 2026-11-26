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
  type: "normal" | "fast" | "tank" | "boss";
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
  private difficulty: "medium" | "hard" = "medium";

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

  // Wave & Boss state
  private wave = 1;
  private waveTimer = 0;
  private spawnTimer = 0;
  private bossSummonTimer = 0;

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
  private activePointerId: number | null = null;
  private dragOriginX = 0;
  private dragOriginY = 0;
  private dragDx = 0;
  private dragDy = 0;
  private joyBase: Phaser.GameObjects.Arc | null = null;
  private joyThumb: Phaser.GameObjects.Arc | null = null;

  // Dash / Dodge state
  private lastDashTime = 0;
  private dashEndTime = 0;
  private dashVx = 0;
  private dashVy = 0;

  private lastHudEmit = 0;

  constructor(difficulty: "medium" | "hard" = "medium") {
    super("SoloGameScene");
    this.difficulty = difficulty === "hard" ? "hard" : "medium";
  }

  private handleThemeChanged = (nextTheme: AppTheme) => {
    this.currentTheme = nextTheme;
    this.drawBackground();
    this.rebuildObstacleVisuals();
  };

  private screenToHud(sx: number, sy: number) {
    const cam = this.cameras.main;
    const zoom = cam.zoom || 1;
    const cx = cam.width * 0.5;
    const cy = cam.height * 0.5;
    return {
      x: cx + (sx - cx) / zoom,
      y: cy + (sy - cy) / zoom,
      invZoom: 1 / zoom,
    };
  }

  private placeIdleJoystickGuide() {
    if (!this.joyBase || !this.joyThumb) return;
    const isTouchLayout = this.scale.width < 900;
    if (!isTouchLayout) {
      this.joyBase.setVisible(false);
      this.joyThumb.setVisible(false);
      return;
    }
    const isOffice = this.currentTheme === "office";
    const hudPos = this.screenToHud(86, this.scale.height - 96);
    this.joyBase
      .setPosition(hudPos.x, hudPos.y)
      .setScale(hudPos.invZoom)
      .setFillStyle(isOffice ? 0x64748b : 0xffffff, 0.08)
      .setStrokeStyle(2, isOffice ? 0x64748b : 0xffffff, 0.25)
      .setVisible(true);
    this.joyThumb
      .setPosition(hudPos.x, hudPos.y)
      .setScale(hudPos.invZoom)
      .setFillStyle(isOffice ? 0x2563eb : 0xf05232, 0.45)
      .setVisible(true);
  }

  private handleTriggerDash = () => {
    if (this.isDead) return;
    const now = Date.now();
    if (now - this.lastDashTime < 2200) return;

    this.lastDashTime = now;
    this.dashEndTime = now + 180;
    this.lastDamageTime = Math.max(this.lastDamageTime, now - 350);

    let dirX = this.dragDx;
    let dirY = this.dragDy;
    const len = Math.hypot(dirX, dirY);
    if (len > 0.1) {
      dirX /= len;
      dirY /= len;
    } else {
      dirX = Math.cos(this.playerRot);
      dirY = Math.sin(this.playerRot);
    }
    this.dashVx = dirX * 640;
    this.dashVy = dirY * 640;

    EventBus.emit("dash-cooldown", { durationMs: 2200 });
    this.createHitEffect(this.playerX, this.playerY, 0x38bdf8);
  };

  create() {
    this.input.addPointer(2);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as any;
      this.input.keyboard.on("keydown-SPACE", this.handleTriggerDash);
      this.input.keyboard.on("keydown-SHIFT", this.handleTriggerDash);
    }

    this.drawBackground();
    this.generateObstacles();
    this.createPlayerVisual();

    for (let i = 0; i < 22; i++) {
      this.spawnCoin();
    }
    const initialEnemies = this.difficulty === "hard" ? 9 : 6;
    for (let i = 0; i < initialEnemies; i++) {
      this.spawnEnemy();
    }

    // Floating virtual joystick (zoom-compensated screen-space)
    this.joyBase = this.add
      .circle(0, 0, 48, 0xffffff, 0.14)
      .setStrokeStyle(2.5, 0xffffff, 0.38)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.joyThumb = this.add
      .circle(0, 0, 20, 0xf05232, 0.85)
      .setStrokeStyle(2.5, 0xffffff, 0.9)
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    this.placeIdleJoystickGuide();

    // Follow-thumb dynamic joystick (Brawl Stars / Survivor.io style)
    const maxJoyRadius = 46;
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.activePointerId !== null) return;
      if (pointer.leftButtonDown() || pointer.wasTouch) {
        this.activePointerId = pointer.id;
        this.isDragging = true;
        this.dragOriginX = pointer.x;
        this.dragOriginY = pointer.y;
        this.dragDx = 0;
        this.dragDy = 0;

        if (this.joyBase && this.joyThumb) {
          const isOffice = this.currentTheme === "office";
          const hudPos = this.screenToHud(pointer.x, pointer.y);
          this.joyBase
            .setPosition(hudPos.x, hudPos.y)
            .setScale(hudPos.invZoom)
            .setFillStyle(isOffice ? 0x64748b : 0xffffff, isOffice ? 0.14 : 0.16)
            .setStrokeStyle(2.5, isOffice ? 0x64748b : 0xffffff, 0.45)
            .setVisible(true);
          this.joyThumb
            .setPosition(hudPos.x, hudPos.y)
            .setScale(hudPos.invZoom)
            .setFillStyle(isOffice ? 0x2563eb : 0xf05232, 0.85)
            .setVisible(true);
        }
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || pointer.id !== this.activePointerId) return;
      const rawDx = pointer.x - this.dragOriginX;
      const rawDy = pointer.y - this.dragOriginY;
      let dist = Math.hypot(rawDx, rawDy);

      if (dist > 4) {
        const nx = rawDx / dist;
        const ny = rawDy / dist;

        // Follow-thumb: slide base smoothly if thumb drags past rim -> instant 180° turnaround!
        if (dist > maxJoyRadius) {
          this.dragOriginX = pointer.x - nx * maxJoyRadius;
          this.dragOriginY = pointer.y - ny * maxJoyRadius;
          dist = maxJoyRadius;
        }

        // Snappy speed curve: reach 100% speed by 55% deflection
        const magnitude = Math.min(1, (dist / maxJoyRadius) * 1.8);
        this.dragDx = nx * magnitude;
        this.dragDy = ny * magnitude;

        if (this.joyBase && this.joyThumb) {
          const baseHud = this.screenToHud(this.dragOriginX, this.dragOriginY);
          const thumbHud = this.screenToHud(
            this.dragOriginX + nx * dist,
            this.dragOriginY + ny * dist
          );
          this.joyBase.setPosition(baseHud.x, baseHud.y).setScale(baseHud.invZoom);
          this.joyThumb.setPosition(thumbHud.x, thumbHud.y).setScale(thumbHud.invZoom);
        }
      } else {
        this.dragDx = 0;
        this.dragDy = 0;
        if (this.joyThumb) {
          const baseHud = this.screenToHud(this.dragOriginX, this.dragOriginY);
          this.joyThumb.setPosition(baseHud.x, baseHud.y).setScale(baseHud.invZoom);
        }
      }
    });

    const stopDrag = (pointer: Phaser.Input.Pointer) => {
      if (this.activePointerId !== null && pointer && pointer.id !== this.activePointerId) {
        return;
      }
      this.activePointerId = null;
      this.isDragging = false;
      this.dragDx = 0;
      this.dragDy = 0;
      this.placeIdleJoystickGuide();
    };

    this.input.on("pointerup", stopDrag);
    this.input.on("pointerupoutside", stopDrag);

    EventBus.on("theme-changed", this.handleThemeChanged);
    EventBus.on("trigger-dash", this.handleTriggerDash);
    const cleanup = () => {
      EventBus.off("theme-changed", this.handleThemeChanged);
      EventBus.off("trigger-dash", this.handleTriggerDash);
      this.input.keyboard?.off("keydown-SPACE", this.handleTriggerDash);
      this.input.keyboard?.off("keydown-SHIFT", this.handleTriggerDash);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

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

  private applyResponsiveZoom() {
    const w = this.scale.width;
    const zoom = w < 640 ? 0.68 : w < 1024 ? 0.82 : 1.0;
    this.cameras.main.setZoom(zoom);
    if (!this.isDragging) {
      this.placeIdleJoystickGuide();
    }
  }

  private createPlayerVisual() {
    this.playerContainer = this.add.container(this.playerX, this.playerY);
    this.playerContainer.setDepth(20);

    // Subtle auto-shoot range ring (270px)
    const rangeRing = this.add.circle(0, 0, 270, 0xffffff, 0.02);
    rangeRing.setStrokeStyle(1.5, 0xfbbf24, 0.22);

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
      rangeRing,
      this.turretContainer,
      body,
      hpBg,
      this.playerHpFill,
      this.playerScoreText,
    ]);

    this.cameras.main.startFollow(this.playerContainer, true, 0.12, 0.12);
    this.applyResponsiveZoom();
    this.scale.on("resize", () => this.applyResponsiveZoom());
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

  private spawnEnemy(
    forcedType?: "normal" | "fast" | "tank" | "boss",
    nearX?: number,
    nearY?: number
  ) {
    const isHard = this.difficulty === "hard";
    const maxEnemies = Math.min(
      isHard ? 54 : 42,
      (isHard ? 14 : 10) + this.wave * (isHard ? 5 : 4)
    );
    if (forcedType !== "boss" && this.enemies.length >= maxEnemies) return;

    const w = Math.max(0, this.wave - 1);
    const hpScale = (isHard ? 1.38 : 1.0) * (1 + w * (isHard ? 0.24 : 0.16));
    const spdScale = (isHard ? 1.15 : 1.0) * (1 + Math.min(0.65, w * (isHard ? 0.065 : 0.045)));
    const dmgScale = (isHard ? 1.35 : 1.0) * (1 + w * 0.1);

    let type: "normal" | "fast" | "tank" | "boss" = forcedType ?? "normal";
    if (!forcedType) {
      const roll = Math.random();
      const tankChance = Math.min(0.32, (isHard ? 0.12 : 0.08) + w * 0.03);
      const fastChance = Math.min(0.45, (isHard ? 0.34 : 0.28) + w * 0.02);
      if (this.wave >= 2 && roll < tankChance) {
        type = "tank";
      } else if (roll < tankChance + fastChance) {
        type = "fast";
      }
    }

    let hp = Math.round(45 * hpScale);
    let speed = Math.min(230, Math.round(112 * spdScale));
    let radius = 20;
    let damage = Math.round(14 * dmgScale);
    let color = 0xef4444;
    let stroke = 0x7f1d1d;

    if (type === "boss") {
      hp = Math.round(520 * hpScale);
      speed = Math.min(145, Math.round(78 * spdScale));
      radius = 46;
      damage = Math.round(32 * dmgScale);
      color = 0xbe123c;
      stroke = 0xfbbf24;
    } else if (type === "tank") {
      hp = Math.round(135 * hpScale);
      speed = Math.min(155, Math.round(74 * spdScale));
      radius = 30;
      damage = Math.round(24 * dmgScale);
      color = 0xa855f7;
      stroke = 0x581c87;
    } else if (type === "fast") {
      hp = Math.round(26 * hpScale);
      speed = Math.min(275, Math.round(170 * spdScale));
      radius = 15;
      damage = Math.round(10 * dmgScale);
      color = 0xf97316;
      stroke = 0x7c2d12;
    }

    let pos: { x: number; y: number };
    if (typeof nearX === "number" && typeof nearY === "number") {
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 60;
      pos = {
        x: Math.max(45, Math.min(this.mapW - 45, nearX + Math.cos(angle) * dist)),
        y: Math.max(45, Math.min(this.mapH - 45, nearY + Math.sin(angle) * dist)),
      };
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = type === "boss" ? 560 : 500 + Math.random() * 240;
      pos = {
        x: Math.max(55, Math.min(this.mapW - 55, this.playerX + Math.cos(angle) * dist)),
        y: Math.max(55, Math.min(this.mapH - 55, this.playerY + Math.sin(angle) * dist)),
      };
    }
    this.resolveObstacleCollision(pos, radius);

    const container = this.add.container(pos.x, pos.y);
    container.setDepth(type === "boss" ? 17 : 15);

    const bodyContainer = this.add.container(0, 0);
    const isBoss = type === "boss";

    if (isBoss) {
      const aura = this.add.circle(0, 0, radius + 12, 0xf43f5e, 0.22);
      aura.setStrokeStyle(2, 0xfbbf24, 0.65);
      bodyContainer.add(aura);
    }

    const clawScale = isBoss ? 1.9 : 1;
    const leftClaw = this.add.triangle(
      radius - 2,
      -radius * 0.55,
      0,
      -5 * clawScale,
      14 * clawScale,
      0,
      0,
      5 * clawScale,
      isBoss ? 0xfbbf24 : color
    );
    const rightClaw = this.add.triangle(
      radius - 2,
      radius * 0.55,
      0,
      -5 * clawScale,
      14 * clawScale,
      0,
      0,
      5 * clawScale,
      isBoss ? 0xfbbf24 : color
    );
    const body = this.add.circle(0, 0, radius, color);
    body.setStrokeStyle(isBoss ? 4.5 : 2.5, stroke);
    const eyeSize = isBoss ? 6.5 : 3.5;
    const eyeL = this.add.circle(radius * 0.35, -radius * 0.3, eyeSize, 0xfef08a);
    const eyeR = this.add.circle(radius * 0.35, radius * 0.3, eyeSize, 0xfef08a);
    bodyContainer.add([leftClaw, rightClaw, body, eyeL, eyeR]);

    const barW = radius * 2;
    const barH = isBoss ? 8 : 4;
    const hpBg = this.add.rectangle(0, -radius - 12, barW + 4, barH + 3, 0x0f172a, 0.9);
    const hpBarFill = this.add
      .rectangle(-barW / 2, -radius - 12, barW, barH, isBoss ? 0xfbbf24 : 0xef4444)
      .setOrigin(0, 0.5);

    container.add([bodyContainer, hpBg, hpBarFill]);

    if (isBoss) {
      const bossLabel = this.add
        .text(0, -radius - 28, "DEV BOSS", {
          fontFamily: "sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#fef08a",
          stroke: "#7f1d1d",
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      container.add(bossLabel);
    }

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

  private createDeathBurst(x: number, y: number, color: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 22 + Math.random() * 24;
      const p = this.add.circle(x, y, 4.5, color, 0.9);
      p.setDepth(24);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        scale: 0.2,
        alpha: 0,
        duration: 240,
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnFloatingText(x: number, y: number, label: string, color = "#fef08a") {
    const t = this.add
      .text(x, y - 10, label, {
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color,
        stroke: "#0f172a",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: t,
      y: y - 42,
      alpha: 0,
      duration: 550,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
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
      difficulty: this.difficulty,
      bossActive: this.enemies.some((e) => e.type === "boss"),
    });
  }

  update(time: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    const now = Date.now();
    const isHard = this.difficulty === "hard";

    // 1. Progressive Wave, Boss & Enemy Spawner
    this.spawnTimer += dt;
    this.waveTimer += dt;
    const spawnInterval = Math.max(
      isHard ? 0.42 : 0.65,
      (isHard ? 1.55 : 1.95) - this.wave * (isHard ? 0.14 : 0.12)
    );
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    if (this.waveTimer >= 25) {
      this.waveTimer = 0;
      this.wave += 1;
      const waveBurst = 4 + Math.min(4, Math.floor(this.wave / 2));
      for (let i = 0; i < waveBurst; i++) {
        this.spawnEnemy();
      }

      const isBossWave = isHard ? this.wave % 2 === 0 : this.wave % 3 === 0;
      const hasBoss = this.enemies.some((e) => e.type === "boss");
      if (isBossWave && !hasBoss) {
        this.spawnEnemy("boss");
        this.cameras.main.shake(220, 0.006);
      }
    }

    // Active Mega Boss summons minions every 4.5s
    const activeBoss = this.enemies.find((e) => e.type === "boss");
    if (activeBoss) {
      this.bossSummonTimer += dt;
      if (this.bossSummonTimer >= 4.5) {
        this.bossSummonTimer = 0;
        const summonCount = isHard ? 2 : 1;
        for (let s = 0; s < summonCount; s++) {
          this.spawnEnemy(Math.random() < 0.55 ? "fast" : "normal", activeBoss.x, activeBoss.y);
        }
      }
    } else {
      this.bossSummonTimer = 0;
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

      const isDashing = now < this.dashEndTime;
      const pos = isDashing
        ? {
            x: this.playerX + this.dashVx * dt,
            y: this.playerY + this.dashVy * dt,
          }
        : {
            x: this.playerX + dx * this.playerSpeed * dt,
            y: this.playerY + dy * this.playerSpeed * dt,
          };

      if (isDashing && Math.random() < 0.6) {
        const ghost = this.add.circle(this.playerX, this.playerY, 16, 0x38bdf8, 0.32);
        ghost.setDepth(16);
        this.tweens.add({
          targets: ghost,
          scale: 0.4,
          alpha: 0,
          duration: 180,
          onComplete: () => ghost.destroy(),
        });
      }

      this.resolveObstacleCollision(pos, 20);
      this.playerX = Math.max(25, Math.min(this.mapW - 25, pos.x));
      this.playerY = Math.max(25, Math.min(this.mapH - 25, pos.y));

      // Auto-aim & Auto-shoot nearest enemy within 270px (visible on screen)
      let nearest: SoloEnemy | null = null;
      let minDistSq = 270 * 270;
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

      // Coin magnet + pickup (105px magnet pull for crisp mobile feel)
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const c = this.coins[i];
        const cdx = this.playerX - c.x;
        const cdy = this.playerY - c.y;
        const cdSq = cdx * cdx + cdy * cdy;
        if (cdSq < 34 * 34) {
          this.score += c.value;
          this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 8);
          c.container.destroy();
          this.coins.splice(i, 1);
          if (this.coins.length < 18) this.spawnCoin();
        } else if (cdSq < 105 * 105 && cdSq > 1) {
          const d = Math.sqrt(cdSq);
          c.x += (cdx / d) * 300 * dt;
          c.y += (cdy / d) * 300 * dt;
          c.container.setPosition(c.x, c.y);
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
        now - b.createdAt > 480 || b.x < 0 || b.x > this.mapW || b.y < 0 || b.y > this.mapH;

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

            // Subtle knockback on hit for punchier combat feel
            const kb = e.type === "boss" ? 2 : e.type === "tank" ? 4 : 9;
            const bLen = Math.hypot(b.vx, b.vy) || 1;
            e.x += (b.vx / bLen) * kb;
            e.y += (b.vy / bLen) * kb;

            if (e.hp <= 0) {
              const baseReward =
                e.type === "boss" ? 250 : e.type === "tank" ? 50 : e.type === "fast" ? 25 : 15;
              const reward = isHard ? Math.round(baseReward * 1.5) : baseReward;
              this.score += reward;
              this.kills += 1;
              this.createDeathBurst(e.x, e.y, e.color, e.type === "boss" ? 14 : 6);
              this.spawnFloatingText(
                e.x,
                e.y,
                e.type === "boss" ? `👑 +${reward}` : `+${reward}`,
                e.type === "boss" ? "#fbbf24" : "#fef08a"
              );

              if (e.type === "boss") {
                this.cameras.main.shake(180, 0.005);
                for (let k = 0; k < 5; k++) {
                  const ox = e.x + (Math.random() - 0.5) * 90;
                  const oy = e.y + (Math.random() - 0.5) * 90;
                  this.spawnCoin(ox, oy, 30);
                }
              } else {
                this.spawnCoin(e.x, e.y, reward);
              }

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
          this.cameras.main.shake(110, 0.004);
          this.cameras.main.flash(140, 220, 38, 38, false);
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
