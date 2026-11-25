import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") rotation: number = 0;
  @type("string") color: string = "#3b82f6";
  @type("number") score: number = 0;
  @type("number") kills: number = 0;
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("number") speed: number = 240;
  @type("boolean") isDead: boolean = false;
  @type("number") respawnTimer: number = 0;

  // Server-only properties
  vx: number = 0;
  vy: number = 0;
  isShooting: boolean = false;
  lastShootTime: number = 0;
  lastDamageTime: number = 0;
}
