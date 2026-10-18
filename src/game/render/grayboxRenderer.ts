import { Application, Container, Graphics, Text } from 'pixi.js';
import { mapWidthPx, Tile, type TileMap } from '../level/tilemap';
import { TILE, VIEW_H, VIEW_W } from '../../shared/rules/tuning';
import type { AbilityPose } from '../abilities/types';
import type { World } from '../world';

const COLORS = {
  sky: 0x1f2430,
  solid: 0x6b7280,
  oneWay: 0xa3a9b5,
  cracked: 0x8b7355,
  crack: 0x3b2f22,
  player: 0xe5e7eb,
  eye: 0x1f2430,
  enemy: 0x9ca3af,
  label: 0xfacc15,
} as const;

/** 도트 리소스(F12) 전까지 같은 크기의 회색 상자로 그린다. 능력은 색이 아니라 자세(모양)로 구분한다. */
export class GrayboxRenderer {
  private readonly level = new Container();
  private tiles = new Graphics();
  private readonly enemies = new Container();
  private readonly player = new Graphics();
  private readonly labels = new Map<object, Text>();
  private readonly enemyGraphics = new Map<object, Graphics>();
  private mapVersion = -1;
  private frame = 0;

  private constructor(private readonly app: Application) {
    app.stage.addChild(this.level);
    this.level.addChild(this.tiles, this.enemies, this.player);
  }

  /** PixiJS는 비동기로 초기화된다. 화면은 VIEW_W×VIEW_H 고정, 확대는 CSS 정수 배율로 한다. */
  static async create(): Promise<GrayboxRenderer> {
    const app = new Application();
    await app.init({
      width: VIEW_W,
      height: VIEW_H,
      background: COLORS.sky,
      antialias: false,
      resolution: 1,
      autoStart: false, // 우리 게임 루프(LoopDriver)가 그리기 시점을 정한다
      roundPixels: true,
    });
    app.ticker.stop();
    app.canvas.style.imageRendering = 'pixelated';
    return new GrayboxRenderer(app);
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  /** 정적인 타일은 맵이 바뀔 때만 다시 만든다. 화면 밖 타일 컬링은 F03·F19에서 붙인다. */
  private drawTiles(map: TileMap): void {
    const g = new Graphics();
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const t = map.tiles[r * map.cols + c];
        const x = c * TILE;
        const y = r * TILE;
        if (t === Tile.Solid) g.rect(x, y, TILE, TILE).fill(COLORS.solid);
        else if (t === Tile.OneWay) g.rect(x, y, TILE, 3).fill(COLORS.oneWay);
        else if (t === Tile.Cracked) {
          g.rect(x, y, TILE, TILE).fill(COLORS.cracked);
          g.rect(x + 2, y + 2, 1, 6).fill(COLORS.crack);
          g.rect(x + 3, y + 5, 4, 1).fill(COLORS.crack);
        }
      }
    }
    this.level.removeChild(this.tiles);
    this.tiles.destroy();
    this.tiles = g;
    this.level.addChildAt(g, 0);
  }

  private label(key: object, text: string): Text {
    let t = this.labels.get(key);
    if (!t) {
      t = new Text({
        text,
        style: { fontFamily: 'monospace', fontSize: 8, fill: COLORS.label },
        resolution: 1,
      });
      t.anchor.set(0.5, 1);
      this.enemies.addChild(t);
      this.labels.set(key, t);
    }
    return t;
  }

  private drawPlayer(pose: AbilityPose, w: number, h: number, facing: -1 | 1): void {
    const g = this.player;
    g.clear();
    const f = this.frame;
    switch (pose) {
      case 'sleep': // 꾸벅: 몸을 낮추고 눈을 감는다
        g.rect(0, 4, w, h - 4).fill(COLORS.player);
        g.rect(2, 8, w - 4, 1).fill(COLORS.eye);
        if (Math.floor(f / 20) % 2 === 0) g.rect(w - 2, -4, 3, 3).fill(COLORS.oneWay); // Z
        return;
      case 'dance': // 좌우로 흔들기
        g.rect(Math.floor(f / 8) % 2 === 0 ? -2 : 2, 0, w, h).fill(COLORS.player);
        return;
      case 'climb': // 벽 쪽 팔을 위로
        g.rect(0, 0, w, h).fill(COLORS.player);
        g.rect(facing > 0 ? w - 2 : 0, -4, 2, 4).fill(COLORS.player);
        return;
      case 'float': // 머리 위 우산
        g.rect(0, 0, w, h).fill(COLORS.player);
        g.rect(-3, -6, w + 6, 2).fill(COLORS.label);
        g.rect(w / 2 - 1, -4, 1, 4).fill(COLORS.label);
        return;
      case 'break': // 앞으로 내지른 주먹
        g.rect(0, 0, w, h).fill(COLORS.player);
        g.rect(facing > 0 ? w : -4, 5, 4, 3).fill(COLORS.player);
        return;
      case 'skid': // 뒤로 젖힌 자세와 바닥 불꽃
        g.rect(facing > 0 ? -2 : 2, 1, w, h - 1).fill(COLORS.player);
        g.rect(facing > 0 ? w : -3, h - 2, 3, 2).fill(COLORS.label);
        return;
      case 'none':
        g.rect(0, 0, w, h).fill(COLORS.player);
        g.rect(facing > 0 ? w - 4 : 2, 3, 2, 2).fill(COLORS.eye);
    }
  }

  /** alpha: 직전 스텝과 지금 스텝 사이 보간 비율(고주사율 화면에서 부드럽게). */
  render(world: World, alpha: number, reducedMotion = false): void {
    this.frame++;
    if (world.mapVersion !== this.mapVersion) {
      this.drawTiles(world.map);
      this.mapVersion = world.mapVersion;
    }

    const p = world.player;
    const x = world.prev.x + (p.x - world.prev.x) * alpha;
    const y = world.prev.y + (p.y - world.prev.y) * alpha;
    this.drawPlayer(world.ability?.pose() ?? 'none', p.w, p.h, p.facing);
    this.player.position.set(Math.round(x), Math.round(y));
    // 무적 깜빡임 — 움직임 줄이기 설정이면 깜빡이지 않고 반투명으로
    const blink = world.invincibleMs > 0;
    this.player.alpha = blink
      ? reducedMotion
        ? 0.5
        : Math.floor(this.frame / 4) % 2
          ? 0.3
          : 1
      : 1;

    for (const e of world.enemies) {
      let g = this.enemyGraphics.get(e);
      if (!g) {
        g = new Graphics().rect(0, 0, e.w, e.h).fill(COLORS.enemy);
        g.rect(2, 3, 2, 2)
          .rect(e.w - 4, 3, 2, 2)
          .fill(COLORS.eye);
        this.enemies.addChild(g);
        this.enemyGraphics.set(e, g);
      }
      const label = this.label(e, e.verb);
      g.visible = label.visible = e.alive;
      g.position.set(Math.round(e.x), Math.round(e.y));
      label.position.set(Math.round(e.x + e.w / 2), Math.round(e.y) - 1);
    }

    // 카메라: 캐릭터를 가운데에 두되 맵 밖은 보여 주지 않는다(정교한 카메라는 F03).
    const maxCam = Math.max(0, mapWidthPx(world.map) - VIEW_W);
    const cam = Math.min(maxCam, Math.max(0, x + p.w / 2 - VIEW_W / 2));
    this.level.position.set(-Math.round(cam), 0);

    this.app.render();
  }

  /** 텍스처·그래픽·WebGL 문맥까지 정리한다(화면을 떠날 때 메모리 누수 방지). */
  destroy(): void {
    this.labels.clear();
    this.enemyGraphics.clear();
    this.app.destroy({ removeView: true }, { children: true, texture: true, context: true });
  }
}
