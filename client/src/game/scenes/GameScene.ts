import Phaser from "phaser";
import { Room } from "colyseus.js";
import { EventBus } from "../EventBus";
import { AppTheme, getSavedTheme } from "../../theme/ThemeContext";
import { HERO_SKINS, getHeroById } from "../heroes";

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  turretContainer: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  heroSprite?: Phaser.GameObjects.Image;
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
  private obstacleVisuals: Map<string, Phaser.GameObjects.Container> = new Map();
  private obstacleData: Map<string, { type: string; x: number; y: number; radius: number }> = new Map();

  private bgGraphics: Phaser.GameObjects.Graphics | null = null;
  private currentTheme: AppTheme = getSavedTheme();
  private mapW = 2200;
  private mapH = 2200;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };

  private lastInput = {
    dx: 0,
    dy: 0,
  };

  private isDragging = false;
  private activePointerId: number | null = null;
  private dragOriginX = 0;
  private dragOriginY = 0;
  private dragDx = 0;
  private dragDy = 0;
  private joyBase: Phaser.GameObjects.Arc | null = null;
  private joyThumb: Phaser.GameObjects.Arc | null = null;
  private lastDashTrigger = 0;

  constructor(room?: Room) {
    super("GameScene");
    if (room) {
      this.room = room;
    }
  }

  init(data?: { room?: Room }) {
    if (data && data.room) {
      this.room = data.room;
    }
  }

  preload() {
    for (const hero of HERO_SKINS) {
      if (!this.textures.exists(hero.spriteKey)) {
        this.load.image(hero.spriteKey, hero.spritePath);
      }
    }
  }

  private handleThemeChanged = (nextTheme: AppTheme) => {
    this.currentTheme = nextTheme;
    this.drawBackground(this.mapW, this.mapH);
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
    if (!this.room) return;
    const now = Date.now();
    if (now - this.lastDashTrigger < 2200) return;
    this.lastDashTrigger = now;
    this.room.send("dash");
    EventBus.emit("dash-cooldown", { durationMs: 2200 });
    const localVis = this.playerVisuals.get(this.room.sessionId);
    if (localVis) {
      this.createHitEffect(localVis.container.x, localVis.container.y, 0x38bdf8);
    }
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
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      }) as any;
      this.input.keyboard.on("keydown-SPACE", this.handleTriggerDash);
      this.input.keyboard.on("keydown-SHIFT", this.handleTriggerDash);
    }

    // Floating virtual joystick visual (zoom-compensated screen-space)
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
      let rawDx = pointer.x - this.dragOriginX;
      let rawDy = pointer.y - this.dragOriginY;
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

        // Snappy response curve: reach 100% speed by 55% deflection
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

    this.mapW = this.room?.state?.mapWidth || 2200;
    this.mapH = this.room?.state?.mapHeight || 2200;

    this.drawBackground(this.mapW, this.mapH);
    this.cameras.main.centerOn(this.mapW / 2, this.mapH / 2);

    const applyResponsiveZoom = () => {
      const w = this.scale.width;
      const zoom = w < 640 ? 0.68 : w < 1024 ? 0.82 : 1.0;
      this.cameras.main.setZoom(zoom);
      if (!this.isDragging) {
        this.placeIdleJoystickGuide();
      }
    };
    applyResponsiveZoom();
    this.scale.on("resize", applyResponsiveZoom);

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

    this.setupRoomListeners();

    EventBus.emit("current-scene-ready", this);
  }

  private rebuildObstacleVisuals() {
    this.obstacleVisuals.forEach((v) => v.destroy());
    this.obstacleVisuals.clear();
    this.obstacleData.forEach((obs, id) => {
      const visual = this.createObstacleVisual(obs);
      this.obstacleVisuals.set(id, visual);
    });
  }

  private drawBackground(mapW: number, mapH: number) {
    if (this.bgGraphics) {
      this.bgGraphics.destroy();
    }
    const bg = this.add.graphics();
    bg.setDepth(0);
    this.bgGraphics = bg;

    const isOffice = this.currentTheme === "office";

    if (isOffice) {
      // Light Stealth Office Mode (Clean Excel / Technical CAD Worksheet Grid)
      this.cameras.main.setBackgroundColor("#f1f5f9");
      bg.fillStyle(0xf8fafc, 1);
      bg.fillRect(0, 0, mapW, mapH);

      // Subtle spreadsheet column/row tint
      bg.fillStyle(0xf1f5f9, 0.55);
      const tileSize = 192;
      for (let x = 0; x < mapW; x += tileSize) {
        for (let y = 0; y < mapH; y += tileSize) {
          if (((x / tileSize) + (y / tileSize)) % 2 === 0) {
            bg.fillRect(x, y, tileSize, tileSize);
          }
        }
      }

      // Crisp spreadsheet grid lines
      bg.lineStyle(1, 0xe2e8f0, 1);
      const gridSize = 48;
      for (let x = 0; x <= mapW; x += gridSize) {
        bg.moveTo(x, 0);
        bg.lineTo(x, mapH);
      }
      for (let y = 0; y <= mapH; y += gridSize) {
        bg.moveTo(0, y);
        bg.lineTo(mapW, y);
      }
      bg.strokePath();

      // Subtle diagram center ring
      const cx = mapW / 2;
      const cy = mapH / 2;
      bg.lineStyle(1.5, 0xcbd5e1, 0.9);
      bg.strokeCircle(cx, cy, 240);

      // Clean corporate frame border
      bg.lineStyle(3, 0x94a3b8, 1);
      bg.strokeRect(0, 0, mapW, mapH);
    } else {
      // Dark Fun Mode (Warm handcrafted forest-stone courtyard)
      this.cameras.main.setBackgroundColor("#232d28");
      bg.fillStyle(0x2a3630, 1);
      bg.fillRect(0, 0, mapW, mapH);

      bg.fillStyle(0x313f38, 0.75);
      const tileSize = 192;
      for (let x = 0; x < mapW; x += tileSize) {
        for (let y = 0; y < mapH; y += tileSize) {
          if (((x / tileSize) + (y / tileSize)) % 2 === 0) {
            bg.fillRect(x, y, tileSize, tileSize);
          }
        }
      }

      bg.lineStyle(1, 0x3b4a42, 0.55);
      const gridSize = 64;
      for (let x = 0; x <= mapW; x += gridSize) {
        bg.moveTo(x, 0);
        bg.lineTo(x, mapH);
      }
      for (let y = 0; y <= mapH; y += gridSize) {
        bg.moveTo(0, y);
        bg.lineTo(mapW, y);
      }
      bg.strokePath();

      const cx = mapW / 2;
      const cy = mapH / 2;
      bg.fillStyle(0xd6d3d1, 0.05);
      bg.fillCircle(cx, cy, 240);
      bg.lineStyle(3, 0xfbbf24, 0.35);
      bg.strokeCircle(cx, cy, 240);
      bg.lineStyle(1.5, 0xe7e5e4, 0.16);
      bg.strokeCircle(cx, cy, 420);

      bg.lineStyle(12, 0xb91c1c, 0.25);
      bg.strokeRect(6, 6, mapW - 12, mapH - 12);
      bg.lineStyle(5, 0xf05232, 0.95);
      bg.strokeRect(0, 0, mapW, mapH);
    }

    this.cameras.main.setBounds(0, 0, mapW, mapH);
  }

  private setupRoomListeners() {
    if (!this.room) return;

    if (this.room.state && this.room.state.players && typeof this.room.state.players.onAdd === "function") {
      this.bindSchemaListeners();
    } else {
      this.room.onStateChange.once(() => {
        this.bindSchemaListeners();
      });
    }
  }

  private bindSchemaListeners() {
    if (!this.room || !this.room.state) return;

    // Room state top-level changes (wave, gameMode, roomCode)
    this.room.state.onChange(() => {
      this.emitGameInfo();
    });

    // 1. Players
    this.room.state.players.onAdd((player: any, sessionId: string) => {
      if (this.playerVisuals.has(sessionId)) return;
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

    // 5. Obstacles (Rocks, Armored Bunker Walls, Energy Pillars)
    if (this.room.state.obstacles && typeof this.room.state.obstacles.onAdd === "function") {
      this.room.state.obstacles.onAdd((obs: any, id: string) => {
        if (this.obstacleVisuals.has(id)) return;
        const data = {
          type: String(obs.type || "rock"),
          x: Number(obs.x || 0),
          y: Number(obs.y || 0),
          radius: Number(obs.radius || 42),
        };
        this.obstacleData.set(id, data);
        const visual = this.createObstacleVisual(data);
        this.obstacleVisuals.set(id, visual);
      });

      this.room.state.obstacles.onRemove((_obs: any, id: string) => {
        this.obstacleData.delete(id);
        const visual = this.obstacleVisuals.get(id);
        if (visual) {
          visual.destroy();
          this.obstacleVisuals.delete(id);
        }
      });
    }
  }

  private createObstacleVisual(obs: {
    type: string;
    x: number;
    y: number;
    radius: number;
  }): Phaser.GameObjects.Container {
    const container = this.add.container(obs.x, obs.y);
    container.setDepth(12);

    const r = obs.radius || 42;
    const isOffice = this.currentTheme === "office";

    if (isOffice) {
      // Stealth Light Office Mode: Clean CAD / Flowchart Diagram Nodes
      const shadow = this.add.circle(3, 4, r + 1, 0x94a3b8, 0.2);
      container.add(shadow);

      if (obs.type === "wall") {
        const size = r * 1.65;
        const box = this.add.rectangle(0, 0, size, size, 0xe2e8f0, 1);
        box.setStrokeStyle(2, 0x94a3b8, 1);
        const inner = this.add.rectangle(0, 0, size * 0.66, size * 0.66, 0xf8fafc, 1);
        inner.setStrokeStyle(1, 0xcbd5e1, 1);
        container.add([box, inner]);
      } else if (obs.type === "pillar") {
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

    // Dark Fun Mode: Ground drop shadow for 3D depth
    const shadow = this.add.circle(6, 8, r + 3, 0x000000, 0.45);
    container.add(shadow);

    if (obs.type === "pillar") {
      // Warm Stone Lantern / Brazier Pillar
      const outerAura = this.add.circle(0, 0, r + 6, 0xf59e0b, 0.14);
      const base = this.add.circle(0, 0, r, 0x44403c, 1);
      base.setStrokeStyle(3, 0x292524, 1);

      const midRing = this.add.circle(0, 0, r * 0.65, 0x57534e, 1);
      midRing.setStrokeStyle(2, 0xd97706, 0.85);

      const core = this.add.circle(0, 0, r * 0.34, 0xf59e0b, 0.95);
      const innerSpark = this.add.circle(0, 0, r * 0.16, 0xfef3c7, 1);

      container.add([outerAura, base, midRing, core, innerSpark]);

      this.tweens.add({
        targets: [outerAura, core],
        scale: 1.1,
        alpha: 0.72,
        yoyo: true,
        repeat: -1,
        duration: 1200,
        ease: "Sine.easeInOut",
      });
    } else if (obs.type === "wall") {
      // Concrete & Steel Bunker Cover Block
      const size = r * 1.65;
      const plate = this.add.rectangle(0, 0, size, size, 0x57534e, 1);
      plate.setStrokeStyle(3, 0x292524, 1);

      const innerPlate = this.add.rectangle(0, 0, size * 0.68, size * 0.68, 0x78716c, 1);
      innerPlate.setStrokeStyle(2, 0x44403c, 1);

      const centerDot = this.add.rectangle(0, 0, size * 0.22, size * 0.22, 0xd97706, 0.9);

      const offset = size * 0.38;
      const r1 = this.add.circle(-offset, -offset, 3, 0xd6d3d1);
      const r2 = this.add.circle(offset, -offset, 3, 0xd6d3d1);
      const r3 = this.add.circle(-offset, offset, 3, 0xd6d3d1);
      const r4 = this.add.circle(offset, offset, 3, 0xd6d3d1);

      container.add([plate, innerPlate, centerDot, r1, r2, r3, r4]);
    } else {
      // Warm Earthy Boulder / Rock with Moss
      const rockBase = this.add.circle(0, 0, r, 0x6b6660, 1);
      rockBase.setStrokeStyle(3, 0x292524, 1);

      const facet1 = this.add.circle(-r * 0.18, -r * 0.16, r * 0.66, 0x87817a, 0.92);
      const facet2 = this.add.circle(-r * 0.26, -r * 0.24, r * 0.34, 0xa8a29e, 0.7);
      const mossAccent = this.add.circle(r * 0.28, r * 0.24, r * 0.24, 0x3f6212, 0.75);

      container.add([rockBase, facet1, facet2, mossAccent]);
    }

    return container;
  }

  private createPlayerVisual(player: any, isLocal: boolean): PlayerVisual {
    const container = this.add.container(player.x, player.y);
    container.setDepth(20);

    if (isLocal) {
      const rangeRing = this.add.circle(0, 0, 270, 0xffffff, 0.02);
      rangeRing.setStrokeStyle(1.5, 0xfbbf24, 0.22);
      container.add(rangeRing);
    }

    const colorHex = Phaser.Display.Color.HexStringToColor(player.color || "#38bdf8").color;

    // Ground shadow + subtle team color ring underneath
    const shadow = this.add.ellipse(0, 22, 42, 16, 0x000000, 0.35);
    const body = this.add.circle(0, 14, 18, colorHex, 0.22);
    body.setStrokeStyle(isLocal ? 2.5 : 2, isLocal ? 0xffffff : colorHex, 0.85);

    // Subtle directional aim chevron (rotates toward target)
    const turretContainer = this.add.container(0, 0);
    const aimArrow = this.add.triangle(32, 0, 0, -5, 10, 0, 0, 5, 0xfbbf24, 0.85);
    aimArrow.setStrokeStyle(1.5, 0x0f172a, 0.8);
    turretContainer.add([aimArrow]);

    const hero = getHeroById(player.skin);
    let heroSprite: Phaser.GameObjects.Image | undefined;
    if (this.textures.exists(hero.spriteKey)) {
      heroSprite = this.add.image(0, -2, hero.spriteKey).setDisplaySize(60, 60);
    } else {
      body.setPosition(0, 0).setRadius(20).setFillStyle(colorHex, 1);
    }

    // Health bar above player
    const hpBarBg = this.add.rectangle(0, -38, 46, 7, 0x0f172a, 0.85);
    hpBarBg.setStrokeStyle(1, 0x334155);
    const hpBarFill = this.add.rectangle(-22, -38, 44, 5, 0x22c55e, 1).setOrigin(0, 0.5);

    // Player Name
    const nameText = this.add
      .text(0, -52, player.name || "Oyuncu", {
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
      .text(0, 36, `💀 ${player.kills || 0}  ⭐ ${player.score || 0}`, {
        fontFamily: "sans-serif",
        fontSize: "11px",
        color: "#facc15",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    const items: Phaser.GameObjects.GameObject[] = [shadow, body, turretContainer];
    if (heroSprite) items.push(heroSprite);
    items.push(hpBarBg, hpBarFill, nameText, scoreText);
    container.add(items);

    return {
      container,
      turretContainer,
      body,
      heroSprite,
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
    const isBoss = enemy.type === "boss";
    container.setDepth(isBoss ? 17 : 15);

    const radius = enemy.radius || 20;
    let color = 0xef4444; // normal red
    let strokeColor = 0x7f1d1d;

    if (isBoss) {
      color = 0x991b1b; // deep crimson mega boss
      strokeColor = 0xfbbf24; // gold armored rim
    } else if (enemy.type === "fast") {
      color = 0xf97316; // fast orange
      strokeColor = 0x7c2d12;
    } else if (enemy.type === "tank") {
      color = 0xa855f7; // tank purple
      strokeColor = 0x581c87;
    }

    const bodyContainer = this.add.container(0, 0);

    if (isBoss) {
      const aura = this.add.circle(0, 0, radius + 12, 0xdc2626, 0.22);
      bodyContainer.add(aura);
      this.tweens.add({
        targets: aura,
        scale: 1.16,
        alpha: 0.08,
        yoyo: true,
        repeat: -1,
        duration: 850,
      });
    }

    // Claws / Spikes pointing forward
    const clawLen = isBoss ? 24 : 14;
    const clawHalf = isBoss ? 9 : 5;
    const leftClaw = this.add.triangle(radius - 2, -radius * 0.55, 0, -clawHalf, clawLen, 0, 0, clawHalf, isBoss ? 0xfbbf24 : color);
    const rightClaw = this.add.triangle(radius - 2, radius * 0.55, 0, -clawHalf, clawLen, 0, 0, clawHalf, isBoss ? 0xfbbf24 : color);
    leftClaw.setStrokeStyle(1.5, 0x000000);
    rightClaw.setStrokeStyle(1.5, 0x000000);

    const body = this.add.circle(0, 0, radius, color);
    body.setStrokeStyle(isBoss ? 4.5 : 2.5, strokeColor);

    if (isBoss) {
      const innerArmor = this.add.circle(0, 0, radius * 0.58, 0x7f1d1d, 1);
      innerArmor.setStrokeStyle(2, 0xf59e0b, 0.8);
      bodyContainer.add(innerArmor);
    }

    // Angry eyes
    const eyeSize = isBoss ? 6 : 3.5;
    const eyeLeft = this.add.circle(radius * 0.35, -radius * 0.3, eyeSize, 0xfef08a);
    const eyeRight = this.add.circle(radius * 0.35, radius * 0.3, eyeSize, 0xfef08a);

    bodyContainer.add([leftClaw, rightClaw, body, eyeLeft, eyeRight]);

    // Enemy HP Bar
    const barW = radius * 2;
    const barH = isBoss ? 9 : 6;
    const hpBarBg = this.add.rectangle(0, -radius - 12, barW + 4, barH, 0x0f172a, 0.88);
    const hpBarFill = this.add
      .rectangle(-barW / 2, -radius - 12, barW, barH - 2, isBoss ? 0xf59e0b : 0xef4444)
      .setOrigin(0, 0.5);

    container.add([bodyContainer, hpBarBg, hpBarFill]);

    if (isBoss) {
      const bossLabel = this.add
        .text(0, -radius - 26, "DEV BOSS", {
          fontFamily: "sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#fbbf24",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      container.add(bossLabel);
    }

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
      difficulty: this.room.state.difficulty || "medium",
      bossActive: Boolean(this.room.state.bossActive),
      roomCode: this.room.roomId,
      hostId: this.room.state.hostId || "",
      enemyCount: this.room.state.enemies ? this.room.state.enemies.size : 0,
    });
  }

  update() {
    // 1. Interpolate Players
    this.playerVisuals.forEach((visual) => {
      const prevX = visual.container.x;
      const prevY = visual.container.y;
      visual.container.x = Phaser.Math.Linear(visual.container.x, visual.targetX, 0.3);
      visual.container.y = Phaser.Math.Linear(visual.container.y, visual.targetY, 0.3);
      visual.turretContainer.rotation = visual.targetRotation;
      if (visual.heroSprite) {
        visual.heroSprite.setFlipX(Math.cos(visual.targetRotation) < 0);
        const moving = Math.hypot(visual.container.x - prevX, visual.container.y - prevY) > 0.3;
        visual.heroSprite.y = moving ? -2 + Math.sin(this.time.now * 0.018) * 3 : -2;
      }
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

    // 4. Local Player Input (Drag-to-move OR WASD / Arrows — auto-aim & auto-shoot handled by server)
    if (this.room) {
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
          const inv = 1 / Math.SQRT2;
          dx *= inv;
          dy *= inv;
        }
      }

      if (
        Math.abs(dx - this.lastInput.dx) > 0.03 ||
        Math.abs(dy - this.lastInput.dy) > 0.03 ||
        (dx === 0 && dy === 0 && (this.lastInput.dx !== 0 || this.lastInput.dy !== 0))
      ) {
        this.lastInput = { dx, dy };
        this.room.send("move", this.lastInput);
      }
    }
  }
}
