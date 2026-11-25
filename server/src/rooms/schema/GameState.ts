import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player";

export class Coin extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") value: number = 10;
}

export class Enemy extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "normal"; // "normal" | "fast" | "tank"
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") rotation: number = 0;
  @type("number") hp: number = 40;
  @type("number") maxHp: number = 40;
  @type("number") speed: number = 110;
  @type("number") radius: number = 20;
  @type("number") damage: number = 15;
}

export class Bullet extends Schema {
  @type("string") id: string = "";
  @type("string") ownerId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") rotation: number = 0;
  @type("string") color: string = "#38bdf8";

  // Server-only velocity and lifetime
  vx: number = 0;
  vy: number = 0;
  damage: number = 20;
  createdAt: number = 0;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
  @type({ map: Coin }) coins = new MapSchema<Coin>();

  @type("number") mapWidth: number = 2200;
  @type("number") mapHeight: number = 2200;
  @type("string") gameMode: string = "coop"; // "coop" (Beraber Düşmanlara Karşı) | "pvp" (Dost Ateşi Açık / Herkes Tek)
  @type("number") wave: number = 1;
  @type("string") roomCode: string = "";
}
