import { Room, Client } from "colyseus";
import { GameState, Coin, Enemy, Bullet } from "./schema/GameState";
import { Player } from "./schema/Player";

const PLAYER_COLORS = [
  "#38bdf8", "#22c55e", "#eab308", "#f97316",
  "#ec4899", "#a855f7", "#06b6d4", "#10b981"
];

interface MoveInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  rotation?: number;
  shooting?: boolean;
}

export class GameRoom extends Room<GameState> {
  maxClients = 20;
  private enemySpawnTimer = 0;
  private waveTimer = 0;
  private nextBulletId = 1;
  private nextEnemyId = 1;

  onCreate(options: any) {
    this.setState(new GameState());

    // Set room ID as shareable code for friends
    this.state.roomCode = this.roomId;

    if (options?.gameMode === "pvp" || options?.gameMode === "coop") {
      this.state.gameMode = options.gameMode;
    }

    // Populate initial coins
    for (let i = 0; i < 25; i++) {
      this.spawnCoin();
    }

    // Spawn initial wave of enemies
    for (let i = 0; i < 6; i++) {
      this.spawnEnemy();
    }

    // Movement & continuous shooting state
    this.onMessage("move", (client: Client, data: MoveInput) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;

      let dx = 0;
      let dy = 0;
      if (data.left) dx -= 1;
      if (data.right) dx += 1;
      if (data.up) dy -= 1;
      if (data.down) dy += 1;

      if (dx !== 0 && dy !== 0) {
        const factor = 1 / Math.SQRT2;
        dx *= factor;
        dy *= factor;
      }

      player.vx = dx * player.speed;
      player.vy = dy * player.speed;

      if (typeof data.rotation === "number") {
        player.rotation = data.rotation;
      }
      if (typeof data.shooting === "boolean") {
        player.isShooting = data.shooting;
      }
    });

    // Single click shoot message
    this.onMessage("shoot", (client: Client, rotation?: number) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (typeof rotation === "number") {
        player.rotation = rotation;
      }
      this.tryShoot(player);
    });

    // Switch game mode (Co-op <-> PvP Friendly Fire)
    this.onMessage("toggle_mode", (client: Client, mode?: string) => {
      const player = this.state.players.get(client.sessionId);
      const newMode = mode === "pvp" || mode === "coop"
        ? mode
        : this.state.gameMode === "coop" ? "pvp" : "coop";

      this.state.gameMode = newMode;

      const modeTitle = newMode === "pvp"
        ? "⚔️ KAOS / PvP MODU: Arkadaşlar birbirini vurabilir!"
        : "🛡️ İŞBİRLİĞİ (CO-OP) MODU: Dost ateşi kapalı, birlikte düşmanları avlayın!";

      this.broadcast("system_notice", {
        text: `${player ? player.name : "Bir oyuncu"} oyun modunu değiştirdi: ${modeTitle}`,
        mode: newMode
      });
    });

    // Chat message listener
    this.onMessage("chat", (client: Client, message: string) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.broadcast("chat", {
        id: client.sessionId,
        name: player.name,
        color: player.color,
        text: String(message).slice(0, 100),
        time: Date.now()
      });
    });

    // 50 FPS simulation loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 50);
  }

  onJoin(client: Client, options: any) {
    console.log(`Player joined room ${this.roomId}: ${client.sessionId}`);
    const player = new Player();
    player.id = client.sessionId;
    player.name = options?.name ? String(options.name).slice(0, 15) : `Oyuncu_${client.sessionId.slice(0, 4)}`;
    player.x = this.state.mapWidth / 2 + (Math.random() * 300 - 150);
    player.y = this.state.mapHeight / 2 + (Math.random() * 300 - 150);
    player.color = PLAYER_COLORS[this.state.players.size % PLAYER_COLORS.length];
    player.hp = 100;
    player.maxHp = 100;
    player.speed = 240;

    this.state.players.set(client.sessionId, player);

    this.broadcast("system_notice", {
      text: `👋 ${player.name} savaşa katıldı!`,
    });
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.broadcast("system_notice", {
        text: `${player.name} oyundan ayrıldı.`,
      });
    }
    this.state.players.delete(client.sessionId);
  }

  private tryShoot(player: Player) {
    const now = Date.now();
    if (now - player.lastShootTime < 170) return; // Fire rate cooldown (170ms)
    player.lastShootTime = now;

    const bullet = new Bullet();
    bullet.id = `b_${this.nextBulletId++}`;
    bullet.ownerId = player.id;
    bullet.rotation = player.rotation;
    bullet.color = player.color;

    // Spawn slightly in front of the player barrel
    const muzzleDist = 28;
    bullet.x = player.x + Math.cos(player.rotation) * muzzleDist;
    bullet.y = player.y + Math.sin(player.rotation) * muzzleDist;

    const bulletSpeed = 760;
    bullet.vx = Math.cos(player.rotation) * bulletSpeed;
    bullet.vy = Math.sin(player.rotation) * bulletSpeed;
    bullet.damage = 20;
    bullet.createdAt = now;

    this.state.bullets.set(bullet.id, bullet);
  }

  private spawnCoin(x?: number, y?: number, value: number = 10) {
    if (this.state.coins.size > 60) return;
    const coin = new Coin();
    coin.id = `c_${Math.random().toString(36).substring(2, 9)}`;
    coin.x = x ?? Math.floor(Math.random() * (this.state.mapWidth - 120) + 60);
    coin.y = y ?? Math.floor(Math.random() * (this.state.mapHeight - 120) + 60);
    coin.value = value;
    this.state.coins.set(coin.id, coin);
  }

  private spawnEnemy() {
    const maxEnemies = Math.min(45, 10 + this.state.wave * 4 + this.state.players.size * 3);
    if (this.state.enemies.size >= maxEnemies) return;

    const enemy = new Enemy();
    enemy.id = `e_${this.nextEnemyId++}`;

    // Pick enemy type based on wave and randomness
    const roll = Math.random();
    if (this.state.wave >= 2 && roll < 0.16) {
      enemy.type = "tank";
      enemy.hp = 130 + this.state.wave * 20;
      enemy.maxHp = enemy.hp;
      enemy.speed = 75 + Math.min(35, this.state.wave * 2);
      enemy.radius = 30;
      enemy.damage = 25;
    } else if (roll < 0.45) {
      enemy.type = "fast";
      enemy.hp = 25 + this.state.wave * 5;
      enemy.maxHp = enemy.hp;
      enemy.speed = 175 + Math.min(50, this.state.wave * 4);
      enemy.radius = 15;
      enemy.damage = 10;
    } else {
      enemy.type = "normal";
      enemy.hp = 45 + this.state.wave * 8;
      enemy.maxHp = enemy.hp;
      enemy.speed = 115 + Math.min(45, this.state.wave * 3);
      enemy.radius = 20;
      enemy.damage = 15;
    }

    // Spawn around a random living player at safe distance (550 - 800px away), or map edges
    const livingPlayers: Player[] = [];
    this.state.players.forEach((p) => {
      if (!p.isDead) livingPlayers.push(p);
    });

    if (livingPlayers.length > 0) {
      const target = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 550 + Math.random() * 250;
      enemy.x = Math.max(40, Math.min(this.state.mapWidth - 40, target.x + Math.cos(angle) * dist));
      enemy.y = Math.max(40, Math.min(this.state.mapHeight - 40, target.y + Math.sin(angle) * dist));
    } else {
      enemy.x = Math.random() * (this.state.mapWidth - 100) + 50;
      enemy.y = Math.random() * (this.state.mapHeight - 100) + 50;
    }

    this.state.enemies.set(enemy.id, enemy);
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
      time: Date.now()
    });
  }

  private update(deltaTime: number) {
    const dt = deltaTime / 1000;
    const now = Date.now();

    // 1. Wave & Enemy Spawn Timers
    if (this.state.players.size > 0) {
      this.enemySpawnTimer += dt;
      this.waveTimer += dt;

      const spawnInterval = Math.max(0.6, 2.2 - this.state.wave * 0.15 - this.state.players.size * 0.2);
      if (this.enemySpawnTimer >= spawnInterval) {
        this.enemySpawnTimer = 0;
        this.spawnEnemy();
      }

      // Advance wave every 30 seconds
      if (this.waveTimer >= 30) {
        this.waveTimer = 0;
        this.state.wave += 1;
        this.broadcast("system_notice", {
          text: `🔥 DALGA ${this.state.wave} BAŞLADI! Düşmanlar güçleniyor!`,
        });
        // Burst spawn for the new wave
        for (let i = 0; i < 3 + this.state.players.size; i++) {
          this.spawnEnemy();
        }
      }
    }

    // 2. Update Players
    const livingPlayers: Player[] = [];
    this.state.players.forEach((player) => {
      if (player.isDead) {
        player.respawnTimer -= dt;
        if (player.respawnTimer <= 0) {
          player.isDead = false;
          player.hp = player.maxHp;
          player.respawnTimer = 0;
          player.x = Math.random() * (this.state.mapWidth - 400) + 200;
          player.y = Math.random() * (this.state.mapHeight - 400) + 200;
        }
        return;
      }

      livingPlayers.push(player);

      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Map bounds
      player.x = Math.max(25, Math.min(this.state.mapWidth - 25, player.x));
      player.y = Math.max(25, Math.min(this.state.mapHeight - 25, player.y));

      // Continuous shooting
      if (player.isShooting) {
        this.tryShoot(player);
      }

      // Coin collection (restores HP + adds score)
      this.state.coins.forEach((coin, coinId) => {
        const dx = player.x - coin.x;
        const dy = player.y - coin.y;
        if (dx * dx + dy * dy < 32 * 32) {
          player.score += coin.value;
          player.hp = Math.min(player.maxHp, player.hp + 8);
          this.state.coins.delete(coinId);
          if (this.state.coins.size < 20) {
            this.spawnCoin();
          }
        }
      });
    });

    // 3. Update Bullets & Check Collisions
    const bulletsToRemove: string[] = [];
    this.state.bullets.forEach((bullet, bulletId) => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      // Remove out-of-bounds or expired bullets (1.3s lifetime)
      if (
        now - bullet.createdAt > 1300 ||
        bullet.x < 0 ||
        bullet.x > this.state.mapWidth ||
        bullet.y < 0 ||
        bullet.y > this.state.mapHeight
      ) {
        bulletsToRemove.push(bulletId);
        return;
      }

      let hit = false;

      // 3a. Bullet vs Enemies
      this.state.enemies.forEach((enemy, enemyId) => {
        if (hit) return;
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const hitRadius = enemy.radius + 6;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          hit = true;
          enemy.hp -= bullet.damage;

          if (enemy.hp <= 0) {
            // Enemy killed!
            const reward = enemy.type === "tank" ? 50 : enemy.type === "fast" ? 25 : 15;
            const shooter = this.state.players.get(bullet.ownerId);
            if (shooter) {
              shooter.score += reward;
              shooter.kills += 1;
            }
            // Drop coin orb where enemy died
            this.spawnCoin(enemy.x, enemy.y, reward);
            this.state.enemies.delete(enemyId);
          }
        }
      });

      // 3b. Bullet vs Other Players (ONLY IN PvP MODE!)
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

    // 4. Update Enemies (Chase nearest living player + attack on contact)
    const enemyList: Enemy[] = [];
    this.state.enemies.forEach((e) => enemyList.push(e));

    for (let i = 0; i < enemyList.length; i++) {
      const enemy = enemyList[i];

      // Find nearest living player
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

        // Check melee damage on contact
        const contactDist = enemy.radius + 22;
        if (minDistSq < contactDist * contactDist) {
          if (now - nearestPlayer.lastDamageTime > 600) {
            nearestPlayer.lastDamageTime = now;
            nearestPlayer.hp -= enemy.damage;

            if (nearestPlayer.hp <= 0) {
              const enemyLabel =
                enemy.type === "tank" ? "👾 Boss Düşman" : enemy.type === "fast" ? "⚡ Hızlı Düşman" : "🧟 Zombi Düşman";
              this.killPlayer(nearestPlayer, enemyLabel);
            }
          }
        }
      }

      // Soft separation between enemies so they don't overlap into a single dot
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
