import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player";

export class Coin extends Schema {
  @type("string") declare id: string;
  @type("number") declare x: number;
  @type("number") declare y: number;
  @type("number") declare value: number;

  constructor() {
    super();
    this.id = "";
    this.x = 0;
    this.y = 0;
    this.value = 10;
  }
}

export class Bomb extends Schema {
  @type("string") declare id: string;
  @type("number") declare x: number;
  @type("number") declare y: number;

  constructor() {
    super();
    this.id = "";
    this.x = 0;
    this.y = 0;
  }
}

export class Obstacle extends Schema {
  @type("string") declare id: string;
  @type("string") declare type: string; // "rock" | "wall" | "pillar"
  @type("number") declare x: number;
  @type("number") declare y: number;
  @type("number") declare radius: number;

  constructor() {
    super();
    this.id = "";
    this.type = "rock";
    this.x = 0;
    this.y = 0;
    this.radius = 45;
  }
}

export class Enemy extends Schema {
  @type("string") declare id: string;
  @type("string") declare type: string;
  @type("number") declare x: number;
  @type("number") declare y: number;
  @type("number") declare rotation: number;
  @type("number") declare hp: number;
  @type("number") declare maxHp: number;
  @type("number") declare speed: number;
  @type("number") declare radius: number;
  @type("number") declare damage: number;

  constructor() {
    super();
    this.id = "";
    this.type = "normal";
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.hp = 40;
    this.maxHp = 40;
    this.speed = 110;
    this.radius = 20;
    this.damage = 15;
  }
}

export class Bullet extends Schema {
  @type("string") declare id: string;
  @type("string") declare ownerId: string;
  @type("number") declare x: number;
  @type("number") declare y: number;
  @type("number") declare rotation: number;
  @type("string") declare color: string;

  // Server-only velocity and lifetime
  vx: number = 0;
  vy: number = 0;
  damage: number = 20;
  createdAt: number = 0;

  constructor() {
    super();
    this.id = "";
    this.ownerId = "";
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.color = "#38bdf8";
  }
}

export class GameState extends Schema {
  @type({ map: Player }) declare players: MapSchema<Player>;
  @type({ map: Enemy }) declare enemies: MapSchema<Enemy>;
  @type({ map: Bullet }) declare bullets: MapSchema<Bullet>;
  @type({ map: Coin }) declare coins: MapSchema<Coin>;
  @type({ map: Obstacle }) declare obstacles: MapSchema<Obstacle>;
  @type({ map: Bomb }) declare bombs: MapSchema<Bomb>;

  @type("number") declare mapWidth: number;
  @type("number") declare mapHeight: number;
  @type("string") declare gameMode: string;
  @type("string") declare difficulty: string; // "medium" | "hard"
  @type("number") declare wave: number;
  @type("boolean") declare bossActive: boolean;
  @type("string") declare roomCode: string;
  @type("string") declare hostId: string;

  constructor() {
    super();
    this.players = new MapSchema<Player>();
    this.enemies = new MapSchema<Enemy>();
    this.bullets = new MapSchema<Bullet>();
    this.coins = new MapSchema<Coin>();
    this.obstacles = new MapSchema<Obstacle>();
    this.bombs = new MapSchema<Bomb>();
    this.mapWidth = 2200;
    this.mapHeight = 2200;
    this.gameMode = "coop";
    this.difficulty = "medium";
    this.wave = 1;
    this.bossActive = false;
    this.roomCode = "";
    this.hostId = "";
  }
}
