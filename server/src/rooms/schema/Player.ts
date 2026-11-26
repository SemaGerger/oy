import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") declare id: string;
  @type("string") declare name: string;
  @type("number") declare x: number;
  @type("number") declare y: number;
  @type("number") declare rotation: number;
  @type("string") declare color: string;
  @type("number") declare score: number;
  @type("number") declare kills: number;
  @type("number") declare hp: number;
  @type("number") declare maxHp: number;
  @type("number") declare speed: number;
  @type("boolean") declare isDead: boolean;
  @type("number") declare respawnTimer: number;

  // Server-only properties (never exposed or writable by client)
  vx: number = 0;
  vy: number = 0;
  isShooting: boolean = false;
  lastShootTime: number = 0;
  lastDamageTime: number = 0;
  lastDashTime: number = 0;
  dashEndTime: number = 0;
  dashVx: number = 0;
  dashVy: number = 0;
  lastChatTime: number = 0;
  lastModeToggleTime: number = 0;
  packetCount: number = 0;
  packetWindowStart: number = 0;

  constructor() {
    super();
    this.id = "";
    this.name = "";
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.color = "#3b82f6";
    this.score = 0;
    this.kills = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 240;
    this.isDead = false;
    this.respawnTimer = 0;
  }
}
