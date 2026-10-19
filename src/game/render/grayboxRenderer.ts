import { Application, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { mapWidthPx, Tile, type TileMap } from '../level/tilemap';
import { TILE, VIEW_H, VIEW_W } from '../../shared/rules/tuning';
import type { AbilityPose } from '../abilities/types';
import { coinBox, type World } from '../world';
import { cameraX, CHUNK_COLS, visibleChunks } from './camera';
import { SPILL_MAX } from '../../shared/rules/game';
import { frameIndex, heroAnimation, loadSprites, type SpriteSet } from './sprites';

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
  door: 0x4ade80,
  flag: 0x60a5fa,
} as const;

/**
 * 게임 화면 렌더러. 도트 리소스(F12, public/sprites)가 있으면 스프라이트로, 없으면 같은 크기의 회색 상자로 그린다.
 * 능력은 색이 아니라 자세(모양)로 구분한다.
 */
export class GrayboxRenderer {
  private readonly level = new Container();
  /** 타일 묶음(32칸씩). 카메라에 걸치는 묶음만 보인다(F03 화면 밖 타일 생략). */
  private readonly tiles = new Container();
  private chunks: Graphics[] = [];
  private readonly enemies = new Container();
  private readonly player = new Graphics();
  private readonly labels = new Map<object, Text>();
  private readonly enemyGraphics = new Map<object, Graphics>();
  /** 맵 코인·철자 코인. 주우면 숨긴다. */
  private coinSprites: Container[] = [];
  private letterSprites: Container[] = [];
  /** 흘린 코인은 동시에 최대 SPILL_MAX개라 미리 만들어 재사용한다(매 피격마다 생성하지 않음). */
  private readonly spillPool: Container[] = [];
  /** 도트 리소스가 있을 때만 쓰는 스프라이트. */
  private readonly heroSprite: Sprite | null;
  private readonly enemySprites = new Map<object, Sprite>();
  private mapVersion = -1;
  private propsDrawn = false;
  private frame = 0;

  private constructor(
    private readonly app: Application,
    private readonly sprites: SpriteSet | null,
  ) {
    app.stage.addChild(this.level);
    this.level.addChild(this.tiles, this.enemies, this.player);
    this.heroSprite = sprites ? new Sprite() : null;
    if (this.heroSprite) {
      this.heroSprite.anchor.set(0.5, 1); // 발 가운데 기준(16×16 그림, 충돌 상자 10×14)
      this.level.addChild(this.heroSprite);
      this.player.visible = false;
    }
  }

  /** 도트 리소스를 쓰는 중인가(없으면 회색 상자). */
  get usingSprites(): boolean {
    return this.sprites !== null;
  }

  /** 애니메이션 태그의 지금 프레임 텍스처. */
  private frameOf(set: Record<string, Texture[]>, tag: string): Texture | undefined {
    const frames = set[tag] ?? [];
    return frames[frameIndex(this.frame, frames.length)];
  }

  private coinView(): Container {
    if (this.sprites) {
      const s = new Sprite();
      s.anchor.set(0.5);
      return s;
    }
    return new Graphics()
      .rect(-3, -3, 6, 6)
      .fill(COLORS.label)
      .rect(-1, -2, 1, 4)
      .fill(COLORS.cracked);
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
    return new GrayboxRenderer(app, await loadSprites());
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  /** 정적인 타일은 맵이 바뀔 때만 다시 만든다. 화면 밖 타일 컬링은 F03·F19에서 붙인다. */
  private drawTiles(map: TileMap): void {
    for (const g of this.chunks) g.destroy();
    this.tiles.removeChildren();
    this.chunks = [];
    for (let c0 = 0; c0 < map.cols; c0 += CHUNK_COLS) {
      const g = this.drawChunk(map, c0, Math.min(map.cols, c0 + CHUNK_COLS));
      this.tiles.addChild(g);
      this.chunks.push(g);
    }
  }

  private drawChunk(map: TileMap, c0: number, c1: number): Graphics {
    const g = new Graphics();
    for (let r = 0; r < map.rows; r++) {
      for (let c = c0; c < c1; c++) {
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
    return g;
  }

  /** 지금 그리고 있는 타일 묶음 수(성능 기록·테스트용). */
  get visibleChunkCount(): number {
    return this.chunks.filter((g) => g.visible).length;
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

  /** 문·체크포인트·철자 코인. 철자 코인 줍기(F27)가 들어오면 코인은 따로 갱신한다. */
  private drawProps(world: World): void {
    const g = new Graphics();
    const { door, letters = [], checkpoints } = world.level;
    if (door) {
      g.rect(door.x, door.y, door.w, door.h).fill(COLORS.door);
      g.rect(door.x + door.w - 5, door.y + door.h / 2, 2, 2).fill(COLORS.eye);
    }
    for (const c of checkpoints.slice(1)) {
      g.rect(c.x + 2, c.y - 6, 1, 16).fill(COLORS.oneWay);
      g.rect(c.x + 3, c.y - 6, 5, 4).fill(COLORS.flag);
    }
    this.level.addChildAt(g, 1);
    this.coinSprites = (world.level.coins ?? []).map((c) => {
      const b = coinBox(c);
      const s = this.coinView();
      s.position.set(b.x + b.w / 2, b.y + b.h / 2);
      this.level.addChildAt(s, 2);
      return s;
    });
    this.letterSprites = letters.map((l) => {
      const box = new Container();
      box.addChild(new Graphics().circle(l.x + 5, l.y + 5, 5).fill(COLORS.label));
      const t = new Text({
        text: l.char,
        style: { fontFamily: 'monospace', fontSize: 8, fontWeight: 'bold', fill: COLORS.eye },
        resolution: 1,
      });
      t.anchor.set(0.5);
      t.position.set(l.x + 5, l.y + 5);
      box.addChild(t);
      this.level.addChildAt(box, 2);
      return box;
    });
    for (let i = 0; i < SPILL_MAX; i++) {
      const s = this.coinView();
      s.visible = false;
      this.level.addChild(s);
      this.spillPool.push(s);
    }
  }

  /** alpha: 직전 스텝과 지금 스텝 사이 보간 비율(고주사율 화면에서 부드럽게). */
  render(world: World, alpha: number, reducedMotion = false): void {
    this.frame++;
    if (world.mapVersion !== this.mapVersion) {
      this.drawTiles(world.map);
      this.mapVersion = world.mapVersion;
    }
    if (!this.propsDrawn) {
      this.drawProps(world);
      this.propsDrawn = true;
    }
    const coinTex = this.sprites ? this.frameOf(this.sprites.coin, 'spin') : undefined;
    this.coinSprites.forEach((s, i) => {
      s.visible = !world.coinTaken[i];
      if (coinTex && s instanceof Sprite) s.texture = coinTex;
    });
    this.letterSprites.forEach((s, i) => (s.visible = !world.letterTaken[i]));
    this.spillPool.forEach((s, i) => {
      const c = world.spilled[i];
      s.visible = c !== undefined && (Math.floor(this.frame / 3) % 2 === 0 || c.ageMs < 1500);
      if (c) s.position.set(Math.round(c.x + c.w / 2), Math.round(c.y + c.h / 2));
      if (coinTex && s instanceof Sprite) s.texture = coinTex;
    });

    const p = world.player;
    const x = world.prev.x + (p.x - world.prev.x) * alpha;
    const y = world.prev.y + (p.y - world.prev.y) * alpha;
    const pose = world.ability?.pose() ?? 'none';
    if (this.heroSprite && this.sprites) {
      const anim = heroAnimation({
        pose,
        onGround: p.onGround,
        vx: p.vx,
        vy: p.vy,
        hurt: world.hurtStunMs > 0,
      });
      const tex = this.frameOf(this.sprites.hero, anim);
      if (tex) this.heroSprite.texture = tex;
      this.heroSprite.position.set(Math.round(x + p.w / 2), Math.round(y + p.h));
      this.heroSprite.scale.x = p.facing;
    } else {
      this.drawPlayer(pose, p.w, p.h, p.facing);
      this.player.position.set(Math.round(x), Math.round(y));
    }
    // 무적 깜빡임 — 움직임 줄이기 설정이면 깜빡이지 않고 반투명으로
    const blink = world.invincibleMs > 0;
    const heroView = this.heroSprite ?? this.player;
    heroView.alpha = blink ? (reducedMotion ? 0.5 : Math.floor(this.frame / 4) % 2 ? 0.3 : 1) : 1;

    const enemyTex = this.sprites ? this.frameOf(this.sprites.enemy, 'walk') : undefined;
    for (const e of world.enemies) {
      const label = this.label(e, e.verb);
      const blinking = e.graceMs > 0 && !reducedMotion && Math.floor(this.frame / 4) % 2 === 1;
      label.visible = e.alive && !blinking;
      label.position.set(Math.round(e.x + e.w / 2), Math.round(e.y) - 1);
      if (enemyTex) {
        let s = this.enemySprites.get(e);
        if (!s) {
          s = new Sprite();
          s.anchor.set(0.5, 1);
          this.enemies.addChildAt(s, 0);
          this.enemySprites.set(e, s);
        }
        s.texture = enemyTex;
        s.visible = label.visible;
        s.alpha = e.graceMs > 0 && reducedMotion ? 0.5 : 1;
        s.scale.x = e.dir;
        s.position.set(Math.round(e.x + e.w / 2), Math.round(e.y + e.h));
        continue;
      }
      let g = this.enemyGraphics.get(e);
      if (!g) {
        g = new Graphics().rect(0, 0, e.w, e.h).fill(COLORS.enemy);
        g.rect(2, 3, 2, 2)
          .rect(e.w - 4, 3, 2, 2)
          .fill(COLORS.eye);
        this.enemies.addChild(g);
        this.enemyGraphics.set(e, g);
      }
      g.visible = label.visible;
      g.alpha = e.graceMs > 0 && reducedMotion ? 0.5 : 1;
      g.position.set(Math.round(e.x), Math.round(e.y));
    }

    // 카메라와 화면 밖 타일 생략(F03)
    const cam = cameraX(x + p.w / 2, mapWidthPx(world.map));
    this.level.position.set(-cam, 0);
    const [first, last] = visibleChunks(cam, CHUNK_COLS * TILE, this.chunks.length);
    this.chunks.forEach((g, i) => (g.visible = i >= first && i <= last));

    this.app.render();
  }

  /** 텍스처·그래픽·WebGL 문맥까지 정리한다(화면을 떠날 때 메모리 누수 방지). */
  destroy(): void {
    this.labels.clear();
    this.enemyGraphics.clear();
    this.enemySprites.clear();
    // 스프라이트시트 텍스처는 Assets 캐시가 다음 판(다시 하기)에도 쓰므로 지우지 않는다.
    // 그래픽·글자와 WebGL 문맥은 지운다.
    this.app.destroy({ removeView: true }, { children: true, texture: false, context: true });
  }
}
