import { Room, Client } from "@colyseus/core";
import { GameState, Coin, Enemy, Bullet, Obstacle, Bomb } from "./schema/GameState";
import { Player } from "./schema/Player";
import { verifyAuthToken, AuthTokenPayload } from "../auth/authService";

const PLAYER_COLORS = [
  "#38bdf8", "#22c55e", "#eab308", "#f97316",
  "#ec4899", "#a855f7", "#06b6d4", "#10b981"
];

/** Karakter başına hasar / bomba gücü çarpanları (sunucu tarafında sabit tablo). */
const HERO_POWER: Record<string, { damageMult: number; blastMult: number }> = {
  slime_knight: { damageMult: 1.0, blastMult: 1.0 },
  cactus_cowboy: { damageMult: 1.2, blastMult: 1.15 },
  astro_duck: { damageMult: 1.45, blastMult: 1.3 },
  samurai_frog: { damageMult: 1.75, blastMult: 1.5 },
  steampunk_owl: { damageMult: 2.1, blastMult: 1.75 },
  cyber_cat: { damageMult: 2.5, blastMult: 2.0 },
};

function getHeroPower(skin: string): { damageMult: number; blastMult: number } {
  return HERO_POWER[skin] ?? HERO_POWER.slime_knight;
}

function isValidFiniteNumber(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val);
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function sanitizeText(raw: unknown, maxLength: number): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\x00-\x1F\x7F<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export class GameRoom extends Room<GameState> {
  maxClients = 20;
  private enemySpawnTimer = 0;
  private waveTimer = 0;
  private bossSummonTimer = 0;
  private bombSpawnTimer = 0;
  private nextBombId = 1;
  private nextBulletId = 1;
  private nextEnemyId = 1;

  /**
   * Anti-flood / DoS guard: max 140 packets/sec per client.
   * Kicks clients exceeding 280 packets/sec.
   */
  private isPacketAllowed(client: Client, player: Player): boolean {
    const now = Date.now();
    if (now - player.packetWindowStart >= 1000) {
      player.packetWindowStart = now;
      player.packetCount = 0;
    }
    player.packetCount += 1;

    if (player.packetCount > 280) {
      console.warn(`Kick abusive flood client: ${client.sessionId}`);
      client.leave(4001, "Rate limit exceeded");
      return false;
    }
    return player.packetCount <= 140;
  }

  onAuth(_client: Client, options: any): AuthTokenPayload {
    const payload = verifyAuthToken(options?.token);
    if (!payload) {
      throw new Error("Oyuna katılmak için geçerli bir hesapla giriş yapmalısınız.");
    }
    return payload;
  }

  onCreate(options: any) {
    this.setState(new GameState());
    this.state.roomCode = this.roomId;

    if (options && typeof options === "object") {
      if (options.gameMode === "pvp" || options.gameMode === "coop") {
        this.state.gameMode = options.gameMode;
      }
      if (options.difficulty === "hard" || options.difficulty === "medium") {
        this.state.difficulty = options.difficulty;
      }
    }

    // Generate tactical arena obstacles
    this.generateObstacles();

    for (let i = 0; i < 25; i++) {
      this.spawnCoin();
    }

    for (let i = 0; i < 3; i++) {
      this.spawnBomb();
    }

    const initialEnemies = this.state.difficulty === "hard" ? 9 : 6;
    for (let i = 0; i < initialEnemies; i++) {
      this.spawnEnemy();
    }

    // 1. Movement (WASD / Arrows OR Analog Drag dx/dy — strictly validated)
    this.onMessage("move", (client: Client, data: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !this.isPacketAllowed(client, player) || player.isDead) return;
      if (!data || typeof data !== "object") return;

      const payload = data as Record<string, unknown>;
      let dx = 0;
      let dy = 0;

      if (isValidFiniteNumber(payload.dx) && isValidFiniteNumber(payload.dy)) {
        dx = payload.dx;
        dy = payload.dy;
        const mag = Math.hypot(dx, dy);
        if (mag > 1) {
          dx /= mag;
          dy /= mag;
        }
      } else {
        if (Boolean(payload.left)) dx -= 1;
        if (Boolean(payload.right)) dx += 1;
        if (Boolean(payload.up)) dy -= 1;
        if (Boolean(payload.down)) dy += 1;

        if (dx !== 0 && dy !== 0) {
          const factor = 1 / Math.SQRT2;
          dx *= factor;
          dy *= factor;
        }
      }

      player.vx = dx * player.speed;
      player.vy = dy * player.speed;
    });

    // 2. Single click shoot message (Strict finite angle check)
    this.onMessage("shoot", (client: Client, rotation: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !this.isPacketAllowed(client, player) || player.isDead) return;

      if (isValidFiniteNumber(rotation)) {
        player.rotation = normalizeAngle(rotation);
      }
      this.tryShoot(player);
    });

    // 3. Switch game mode (Host authorization + Cooldown)
    this.onMessage("toggle_mode", (client: Client, mode: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !this.isPacketAllowed(client, player)) return;

      if (client.sessionId !== this.state.hostId) {
        client.send("system_notice", {
          text: "⚠️ Sadece Oda Sahibi (👑) oyun modunu değiştirebilir.",
        });
        return;
      }

      const now = Date.now();
      if (now - player.lastModeToggleTime < 2000) {
        return;
      }
      player.lastModeToggleTime = now;

      const newMode =
        mode === "pvp" || mode === "coop"
          ? mode
          : this.state.gameMode === "coop"
            ? "pvp"
            : "coop";

      this.state.gameMode = newMode;

      const modeTitle =
        newMode === "pvp"
          ? "⚔️ KAOS / PvP MODU: Arkadaşlar birbirini vurabilir!"
          : "🛡️ İŞBİRLİĞİ (CO-OP) MODU: Dost ateşi kapalı, birlikte düşmanları avlayın!";

      this.broadcast("system_notice", {
        text: `👑 ${player.name} oyun modunu değiştirdi: ${modeTitle}`,
        mode: newMode,
      });
    });

    // 4. Chat message listener (Sanitized + Rate-limited)
    this.onMessage("chat", (client: Client, message: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !this.isPacketAllowed(client, player)) return;

      const now = Date.now();
      if (now - player.lastChatTime < 750) {
        return;
      }

      const cleanText = sanitizeText(message, 80);
      if (!cleanText) return;

      player.lastChatTime = now;

      this.broadcast("chat", {
        id: client.sessionId,
        name: player.name,
        color: player.color,
        text: cleanText,
        time: now,
      });
    });

    // 5. Server-authoritative Dash / Dodge skill (2.2s cooldown)
    this.onMessage("dash", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead || !this.isPacketAllowed(client, player)) return;

      const now = Date.now();
      if (now - player.lastDashTime < 2200) return;

      player.lastDashTime = now;
      player.dashEndTime = now + 180;
      player.lastDamageTime = Math.max(player.lastDamageTime, now - 350); // brief dash grace

      let dirX = player.vx;
      let dirY = player.vy;
      const len = Math.hypot(dirX, dirY);
      if (len > 10) {
        dirX /= len;
        dirY /= len;
      } else {
        dirX = Math.cos(player.rotation);
        dirY = Math.sin(player.rotation);
      }
      player.dashVx = dirX * 640;
      player.dashVy = dirY * 640;
    });

    // 50 FPS simulation loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 50);
  }

  onJoin(client: Client, options?: any, auth?: AuthTokenPayload) {
    const username = auth?.username || `Avcı_${client.sessionId.slice(0, 4)}`;
    console.log(`Authenticated player joined room ${this.roomId}: ${username}`);
    const ALLOWED_SKINS = new Set([
      "cyber_cat",
      "cactus_cowboy",
      "astro_duck",
      "samurai_frog",
      "steampunk_owl",
      "slime_knight",
    ]);
    const requestedSkin =
      options && typeof options === "object" && typeof options.skin === "string"
        ? options.skin
        : "cyber_cat";

    const player = new Player();
    player.id = client.sessionId;
    player.name = username; // Verified from HMAC token
    const spawnPos = this.findSafePosition(26, true);
    player.x = spawnPos.x;
    player.y = spawnPos.y;
    player.color = PLAYER_COLORS[this.state.players.size % PLAYER_COLORS.length];
    player.skin = ALLOWED_SKINS.has(requestedSkin) ? requestedSkin : "cyber_cat";
    player.hp = 100;
    player.maxHp = 100;
    player.speed = 240;

    if (!this.state.hostId || this.state.players.size === 0) {
      this.state.hostId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);

    this.broadcast("system_notice", {
      text: `👋 ${player.name} savaşa katıldı!`,
    });
  }

  onLeave(client: Client, _consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.broadcast("system_notice", {
        text: `${player.name} oyundan ayrıldı.`,
      });
    }
    this.state.players.delete(client.sessionId);

    if (this.state.hostId === client.sessionId) {
      const remainingIds = Array.from(this.state.players.keys());
      this.state.hostId = remainingIds.length > 0 ? remainingIds[0] : "";
      if (this.state.hostId) {
        const newHost = this.state.players.get(this.state.hostId);
        if (newHost) {
          this.broadcast("system_notice", {
            text: `👑 Yeni oda sahibi: ${newHost.name}`,
          });
        }
      }
    }
  }

  private generateObstacles() {
    const types = ["rock", "wall", "pillar"];
    const centerX = this.state.mapWidth / 2;
    const centerY = this.state.mapHeight / 2;
    const placed: Array<{ x: number; y: number; radius: number }> = [];

    // 4 symmetrical tactical energy pillars around the center arena ring
    const ringDist = 340;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      const obs = new Obstacle();
      obs.id = `obs_center_${i}`;
      obs.type = "pillar";
      obs.radius = 40;
      obs.x = Math.round(centerX + Math.cos(angle) * ringDist);
      obs.y = Math.round(centerY + Math.sin(angle) * ringDist);
      this.state.obstacles.set(obs.id, obs);
      placed.push({ x: obs.x, y: obs.y, radius: obs.radius });
    }

    // 22 additional cover obstacles (rocks, walls, pillars) scattered across the map
    let attempts = 0;
    let count = 0;
    while (count < 22 && attempts < 200) {
      attempts++;
      const radius = 36 + Math.floor(Math.random() * 26); // 36 - 62px
      const x = Math.floor(Math.random() * (this.state.mapWidth - 260) + 130);
      const y = Math.floor(Math.random() * (this.state.mapHeight - 260) + 130);

      // Keep center spawn area clear
      const distCenter = Math.hypot(x - centerX, y - centerY);
      if (distCenter < 260) continue;

      // Keep enough spacing between obstacles so players can maneuver
      let overlaps = false;
      for (const p of placed) {
        if (Math.hypot(x - p.x, y - p.y) < radius + p.radius + 95) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      const obs = new Obstacle();
      obs.id = `obs_${count}`;
      obs.type = types[count % types.length];
      obs.x = x;
      obs.y = y;
      obs.radius = radius;

      this.state.obstacles.set(obs.id, obs);
      placed.push({ x, y, radius });
      count++;
    }
  }

  private findSafePosition(entityRadius: number, nearCenter = false): { x: number; y: number } {
    const centerX = this.state.mapWidth / 2;
    const centerY = this.state.mapHeight / 2;

    for (let attempt = 0; attempt < 30; attempt++) {
      const x = nearCenter
        ? centerX + (Math.random() * 240 - 120)
        : Math.random() * (this.state.mapWidth - 200) + 100;
      const y = nearCenter
        ? centerY + (Math.random() * 240 - 120)
        : Math.random() * (this.state.mapHeight - 200) + 100;

      let blocked = false;
      this.state.obstacles.forEach((obs) => {
        const minDist = obs.radius + entityRadius + 12;
        if (Math.hypot(x - obs.x, y - obs.y) < minDist) {
          blocked = true;
        }
      });

      if (!blocked) return { x, y };
    }
    return { x: centerX, y: centerY };
  }

  private resolveObstacleCollision(entity: { x: number; y: number }, entityRadius: number) {
    this.state.obstacles.forEach((obs) => {
      const dx = entity.x - obs.x;
      const dy = entity.y - obs.y;
      const distSq = dx * dx + dy * dy;
      const minDist = obs.radius + entityRadius;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const push = minDist - dist;
        entity.x += (dx / dist) * push;
        entity.y += (dy / dist) * push;
      }
    });
  }

  private autoAimAndShoot(player: Player) {
    const maxRangeSq = 270 * 270;
    let nearestX = 0;
    let nearestY = 0;
    let minDistSq = maxRangeSq;
    let foundTarget = false;

    // 1. Check all enemies
    this.state.enemies.forEach((enemy) => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearestX = enemy.x;
        nearestY = enemy.y;
        foundTarget = true;
      }
    });

    // 2. In PvP mode, also check other living players
    if (this.state.gameMode === "pvp") {
      this.state.players.forEach((other, otherId) => {
        if (otherId === player.id || other.isDead) return;
        const dx = other.x - player.x;
        const dy = other.y - player.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearestX = other.x;
          nearestY = other.y;
          foundTarget = true;
        }
      });
    }

    if (foundTarget) {
      player.rotation = Math.atan2(nearestY - player.y, nearestX - player.x);
      this.tryShoot(player);
    } else if (player.vx !== 0 || player.vy !== 0) {
      player.rotation = Math.atan2(player.vy, player.vx);
    }
  }

  private tryShoot(player: Player) {
    const now = Date.now();
    if (now - player.lastShootTime < 245) return;
    player.lastShootTime = now;

    const rot = isValidFiniteNumber(player.rotation) ? player.rotation : 0;

    const bullet = new Bullet();
    bullet.id = `b_${this.nextBulletId++}`;
    bullet.ownerId = player.id;
    bullet.rotation = rot;
    bullet.color = player.color;

    const muzzleDist = 28;
    bullet.x = player.x + Math.cos(rot) * muzzleDist;
    bullet.y = player.y + Math.sin(rot) * muzzleDist;

    const bulletSpeed = 760;
    bullet.vx = Math.cos(rot) * bulletSpeed;
    bullet.vy = Math.sin(rot) * bulletSpeed;
    bullet.damage = Math.round(20 * getHeroPower(player.skin).damageMult);
    bullet.createdAt = now;

    this.state.bullets.set(bullet.id, bullet);
  }

  private spawnCoin(x?: number, y?: number, value: number = 10) {
    if (this.state.coins.size > 60) return;
    const coin = new Coin();
    coin.id = `c_${Math.random().toString(36).substring(2, 9)}`;
    if (typeof x === "number" && typeof y === "number") {
      coin.x = x;
      coin.y = y;
    } else {
      const pos = this.findSafePosition(14, false);
      coin.x = Math.floor(pos.x);
      coin.y = Math.floor(pos.y);
    }
    coin.value = value;
    this.state.coins.set(coin.id, coin);
  }

  private spawnEnemy(
    forcedType?: "normal" | "fast" | "tank" | "boss",
    nearX?: number,
    nearY?: number
  ) {
    const isHard = this.state.difficulty === "hard";
    const maxEnemies = Math.min(
      55,
      (isHard ? 15 : 10) + this.state.wave * (isHard ? 5 : 4) + this.state.players.size * 3
    );
    if (forcedType !== "boss" && this.state.enemies.size >= maxEnemies) return;

    const enemy = new Enemy();
    enemy.id = `e_${this.nextEnemyId++}`;

    // Progressive scaling per wave & difficulty
    const w = this.state.wave;
    const hpScale = (1 + (w - 1) * (isHard ? 0.24 : 0.17)) * (isHard ? 1.35 : 1.0);
    const spdScale = (1 + Math.min(0.6, (w - 1) * (isHard ? 0.075 : 0.05))) * (isHard ? 1.15 : 1.0);
    const dmgScale = (1 + (w - 1) * (isHard ? 0.14 : 0.09)) * (isHard ? 1.3 : 1.0);

    let chosenType: "normal" | "fast" | "tank" | "boss" = forcedType || "normal";
    if (!forcedType) {
      const roll = Math.random();
      const tankChance = w >= 2 ? Math.min(0.28, (isHard ? 0.16 : 0.1) + w * 0.025) : 0;
      const fastChance = Math.min(0.45, (isHard ? 0.34 : 0.24) + w * 0.03);
      if (roll < tankChance) {
        chosenType = "tank";
      } else if (roll < tankChance + fastChance) {
        chosenType = "fast";
      } else {
        chosenType = "normal";
      }
    }

    enemy.type = chosenType;
    if (chosenType === "boss") {
      enemy.hp = Math.round((560 + w * 180) * (isHard ? 1.4 : 1.0));
      enemy.maxHp = enemy.hp;
      enemy.speed = Math.round((96 + Math.min(48, w * 4)) * (isHard ? 1.14 : 1.0));
      enemy.radius = 46;
      enemy.damage = Math.round(36 * dmgScale);
      this.state.bossActive = true;
    } else if (chosenType === "tank") {
      enemy.hp = Math.round(185 * hpScale);
      enemy.maxHp = enemy.hp;
      enemy.speed = Math.round(92 * spdScale);
      enemy.radius = 30;
      enemy.damage = Math.round(26 * dmgScale);
    } else if (chosenType === "fast") {
      enemy.hp = Math.round(38 * hpScale);
      enemy.maxHp = enemy.hp;
      enemy.speed = Math.round(202 * spdScale);
      enemy.radius = 15;
      enemy.damage = Math.round(13 * dmgScale);
    } else {
      enemy.hp = Math.round(68 * hpScale);
      enemy.maxHp = enemy.hp;
      enemy.speed = Math.round(140 * spdScale);
      enemy.radius = 20;
      enemy.damage = Math.round(17 * dmgScale);
    }

    if (typeof nearX === "number" && typeof nearY === "number") {
      const a = Math.random() * Math.PI * 2;
      enemy.x = Math.max(40, Math.min(this.state.mapWidth - 40, nearX + Math.cos(a) * 65));
      enemy.y = Math.max(40, Math.min(this.state.mapHeight - 40, nearY + Math.sin(a) * 65));
    } else {
      const livingPlayers: Player[] = [];
      this.state.players.forEach((p) => {
        if (!p.isDead) livingPlayers.push(p);
      });

      if (livingPlayers.length > 0) {
        const target = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = chosenType === "boss" ? 480 : 440 + Math.random() * 220;
        enemy.x = Math.max(50, Math.min(this.state.mapWidth - 50, target.x + Math.cos(angle) * dist));
        enemy.y = Math.max(50, Math.min(this.state.mapHeight - 50, target.y + Math.sin(angle) * dist));
      } else {
        const pos = this.findSafePosition(enemy.radius, false);
        enemy.x = pos.x;
        enemy.y = pos.y;
      }
    }

    this.resolveObstacleCollision(enemy, enemy.radius);
    this.state.enemies.set(enemy.id, enemy);
  }

  private handleEnemyDeath(enemy: Enemy, enemyId: string, shooter: Player | undefined) {
    const scoreMult = this.state.difficulty === "hard" ? 1.5 : 1.0;
    const baseReward =
      enemy.type === "boss"
        ? 250
        : enemy.type === "tank"
          ? 55
          : enemy.type === "fast"
            ? 25
            : 15;
    const reward = Math.round(baseReward * scoreMult);
    if (shooter) {
      shooter.score += reward;
      shooter.kills += 1;
    }

    if (enemy.type === "boss") {
      // Jackpot drop of 5 healing/score orbs!
      for (let k = 0; k < 5; k++) {
        const a = (Math.PI * 2 * k) / 5;
        this.spawnCoin(
          enemy.x + Math.cos(a) * 34,
          enemy.y + Math.sin(a) * 34,
          Math.round(35 * scoreMult)
        );
      }
      this.broadcast("system_notice", {
        text: `🏆 ${shooter ? shooter.name : "Takım"} DEV BOSS'U YOK ETTİ! (+${reward} puan)`,
      });
    } else {
      this.spawnCoin(enemy.x, enemy.y, reward);
    }

    this.state.enemies.delete(enemyId);

    if (enemy.type === "boss") {
      let stillHasBoss = false;
      this.state.enemies.forEach((rem) => {
        if (rem.type === "boss") stillHasBoss = true;
      });
      this.state.bossActive = stillHasBoss;
    }
  }

  private spawnBomb() {
    if (this.state.bombs.size >= 5) return;
    const bomb = new Bomb();
    bomb.id = `bm_${this.nextBombId++}`;
    const pos = this.findSafePosition(20, false);
    bomb.x = Math.floor(pos.x);
    bomb.y = Math.floor(pos.y);
    this.state.bombs.set(bomb.id, bomb);
  }

  /** Bomb blast: damage + radius scale with the detonating player's hero. */
  private detonateBomb(x: number, y: number, owner: Player) {
    const power = getHeroPower(owner.skin);
    const radius = Math.round(190 * power.blastMult);
    const damage = Math.round(140 * power.blastMult);

    const victims: Array<[string, Enemy]> = [];
    this.state.enemies.forEach((enemy, enemyId) => {
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (d <= radius + enemy.radius) victims.push([enemyId, enemy]);
    });
    for (const [enemyId, enemy] of victims) {
      enemy.hp -= damage;
      if (enemy.hp <= 0) this.handleEnemyDeath(enemy, enemyId, owner);
    }

    this.broadcast("bomb_blast", { x, y, radius });
  }

  private killPlayer(victim: Player, killerName: string) {
    victim.hp = 0;
    victim.isDead = true;
    victim.vx = 0;
    victim.vy = 0;
    victim.isShooting = false;
    victim.respawnTimer = 3.0;

    this.broadcast("kill_feed", {
      victimName: victim.name,
      killerName: killerName,
      time: Date.now(),
    });
  }

  private update(deltaTime: number) {
    const dt = deltaTime / 1000;
    const now = Date.now();
    const isHard = this.state.difficulty === "hard";

    if (this.state.players.size > 0) {
      this.enemySpawnTimer += dt;
      this.waveTimer += dt;
      this.bombSpawnTimer += dt;
      if (this.bombSpawnTimer >= 9) {
        this.bombSpawnTimer = 0;
        this.spawnBomb();
      }

      const baseInterval = isHard ? 1.55 : 2.0;
      const minInterval = isHard ? 0.38 : 0.52;
      const spawnInterval = Math.max(
        minInterval,
        baseInterval - (this.state.wave - 1) * (isHard ? 0.16 : 0.13) - this.state.players.size * 0.15
      );
      if (this.enemySpawnTimer >= spawnInterval) {
        this.enemySpawnTimer = 0;
        this.spawnEnemy();
      }

      // Mega Boss minion summon mechanic (every 4.5s while boss is alive)
      if (this.state.bossActive) {
        this.bossSummonTimer += dt;
        if (this.bossSummonTimer >= 4.5) {
          this.bossSummonTimer = 0;
          this.state.enemies.forEach((e) => {
            if (e.type === "boss") {
              this.spawnEnemy("fast", e.x, e.y);
              if (isHard) {
                this.spawnEnemy("fast", e.x, e.y);
              }
            }
          });
        }
      }

      // Advance wave every 40 seconds (slower escalation)
      if (this.waveTimer >= 40) {
        this.waveTimer = 0;
        this.state.wave += 1;

        const isBossWave = isHard
          ? this.state.wave % 2 === 0
          : this.state.wave % 3 === 0;

        if (isBossWave) {
          this.spawnEnemy("boss");
          this.spawnEnemy("fast");
          this.spawnEnemy("fast");
          this.broadcast("system_notice", {
            text: `👑 DALGA ${this.state.wave} — DEV BOSS GELDİ! Dikkatli olun!`,
          });
        } else {
          this.broadcast("system_notice", {
            text: `🔥 DALGA ${this.state.wave} BAŞLADI! Düşmanlar daha hızlı ve güçlü!`,
          });
        }

        const burstCount = (isHard ? 4 : 3) + this.state.players.size;
        for (let i = 0; i < burstCount; i++) {
          this.spawnEnemy();
        }
      }
    }

    const livingPlayers: Player[] = [];
    this.state.players.forEach((player) => {
      if (player.isDead) {
        player.respawnTimer -= dt;
        if (player.respawnTimer <= 0) {
          player.isDead = false;
          player.hp = player.maxHp;
          player.respawnTimer = 0;
          const pos = this.findSafePosition(24, false);
          player.x = pos.x;
          player.y = pos.y;
        }
        return;
      }

      livingPlayers.push(player);

      if (now < player.dashEndTime) {
        player.x += player.dashVx * dt;
        player.y += player.dashVy * dt;
      } else {
        player.x += player.vx * dt;
        player.y += player.vy * dt;
      }

      // Resolve collisions with arena obstacles
      this.resolveObstacleCollision(player, 20);

      player.x = Math.max(25, Math.min(this.state.mapWidth - 25, player.x));
      player.y = Math.max(25, Math.min(this.state.mapHeight - 25, player.y));

      // Auto-aim at nearest enemy (or nearest rival player in PvP) and auto-shoot
      this.autoAimAndShoot(player);

      this.state.coins.forEach((coin, coinId) => {
        const dx = player.x - coin.x;
        const dy = player.y - coin.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < 34 * 34) {
          player.score += coin.value;
          player.hp = Math.min(player.maxHp, player.hp + 8);
          this.state.coins.delete(coinId);
          if (this.state.coins.size < 20) {
            this.spawnCoin();
          }
        } else if (dSq < 105 * 105 && dSq > 1) {
          // Smooth coin magnet pull for better mobile feel
          const d = Math.sqrt(dSq);
          coin.x += (dx / d) * 280 * dt;
          coin.y += (dy / d) * 280 * dt;
        }
      });

      // Bombs: touching one detonates it (server-authoritative blast)
      const touchedBombs: string[] = [];
      this.state.bombs.forEach((bomb, bombId) => {
        const bx = player.x - bomb.x;
        const by = player.y - bomb.y;
        if (bx * bx + by * by < 36 * 36) touchedBombs.push(bombId);
      });
      for (const bombId of touchedBombs) {
        const bomb = this.state.bombs.get(bombId);
        if (!bomb) continue;
        this.state.bombs.delete(bombId);
        this.detonateBomb(bomb.x, bomb.y, player);
      }
    });

    const bulletsToRemove: string[] = [];
    this.state.bullets.forEach((bullet, bulletId) => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (
        now - bullet.createdAt > 480 ||
        bullet.x < 0 ||
        bullet.x > this.state.mapWidth ||
        bullet.y < 0 ||
        bullet.y > this.state.mapHeight
      ) {
        bulletsToRemove.push(bulletId);
        return;
      }

      let hit = false;

      // Check bullet vs obstacles (cover blocks shots!)
      this.state.obstacles.forEach((obs) => {
        if (hit) return;
        const dx = bullet.x - obs.x;
        const dy = bullet.y - obs.y;
        const hitR = obs.radius + 4;
        if (dx * dx + dy * dy < hitR * hitR) {
          hit = true;
        }
      });

      if (!hit) {
        this.state.enemies.forEach((enemy, enemyId) => {
          if (hit) return;
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          const hitRadius = enemy.radius + 6;
          if (dx * dx + dy * dy < hitRadius * hitRadius) {
            hit = true;
            enemy.hp -= bullet.damage;

            if (enemy.hp <= 0) {
              this.handleEnemyDeath(enemy, enemyId, this.state.players.get(bullet.ownerId));
            }
          }
        });
      }

      if (!hit && this.state.gameMode === "pvp") {
        this.state.players.forEach((targetPlayer, targetId) => {
          if (hit || targetId === bullet.ownerId || targetPlayer.isDead) return;
          const dx = bullet.x - targetPlayer.x;
          const dy = bullet.y - targetPlayer.y;
          if (dx * dx + dy * dy < 26 * 26) {
            hit = true;
            targetPlayer.hp -= bullet.damage;
            if (targetPlayer.hp <= 0) {
              const shooter = this.state.players.get(bullet.ownerId);
              if (shooter) {
                shooter.kills += 1;
                shooter.score += 75;
              }
              this.killPlayer(targetPlayer, shooter ? `⚔️ ${shooter.name}` : "Bir Oyuncu");
            }
          }
        });
      }

      if (hit) {
        bulletsToRemove.push(bulletId);
      }
    });

    for (const bId of bulletsToRemove) {
      this.state.bullets.delete(bId);
    }

    const enemyList: Enemy[] = [];
    this.state.enemies.forEach((e) => enemyList.push(e));

    for (let i = 0; i < enemyList.length; i++) {
      const enemy = enemyList[i];

      let nearestPlayer: Player | null = null;
      let minDistSq = Infinity;

      for (const p of livingPlayers) {
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearestPlayer = p;
        }
      }

      if (nearestPlayer) {
        const angle = Math.atan2(nearestPlayer.y - enemy.y, nearestPlayer.x - enemy.x);
        enemy.rotation = angle;
        enemy.x += Math.cos(angle) * enemy.speed * dt;
        enemy.y += Math.sin(angle) * enemy.speed * dt;

        // Obstacles push enemies around them
        this.resolveObstacleCollision(enemy, enemy.radius);

        const contactDist = enemy.radius + 22;
        if (minDistSq < contactDist * contactDist) {
          if (now - nearestPlayer.lastDamageTime > 600) {
            nearestPlayer.lastDamageTime = now;
            nearestPlayer.hp -= enemy.damage;

            if (nearestPlayer.hp <= 0) {
              const enemyLabel =
                enemy.type === "boss"
                  ? "👑 DEV BOSS"
                  : enemy.type === "tank"
                    ? "👾 Ağır Tank"
                    : enemy.type === "fast"
                      ? "⚡ Hızlı Düşman"
                      : "🧟 Zombi Düşman";
              this.killPlayer(nearestPlayer, enemyLabel);
            }
          }
        }
      }

      for (let j = i + 1; j < enemyList.length; j++) {
        const other = enemyList[j];
        const dx = enemy.x - other.x;
        const dy = enemy.y - other.y;
        const distSq = dx * dx + dy * dy;
        const minSep = enemy.radius + other.radius;
        if (distSq > 0 && distSq < minSep * minSep) {
          const dist = Math.sqrt(distSq);
          const overlap = (minSep - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          enemy.x += nx * overlap;
          enemy.y += ny * overlap;
          other.x -= nx * overlap;
          other.y -= ny * overlap;
        }
      }
    }
  }
}
