import { Application, Container, Graphics } from 'pixi.js';
import { mapWidthPx, Tile, type TileMap } from '../level/tilemap';
import { TILE, VIEW_H, VIEW_W } from '../../shared/rules/tuning';
import type { World } from '../world';

const COLORS = {
  sky: 0x1f2430,
  solid: 0x6b7280,
  oneWay: 0xa3a9b5,
  player: 0xe5e7eb,
  eye: 0x1f2430,
} as const;

/** 도트 리소스(F12) 전까지 같은 크기의 회색 상자로 그린다. */
export class GrayboxRenderer {
  private readonly level = new Container();
  private readonly player = new Graphics();

  private constructor(private readonly app: Application) {
    app.stage.addChild(this.level);
    this.level.addChild(this.player);
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

  /** 정적인 타일은 한 번만 만든다. 화면 밖 타일 컬링은 F03·F19에서 붙인다. */
  setMap(map: TileMap): void {
    const g = new Graphics();
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const t = map.tiles[r * map.cols + c];
        if (t === Tile.Solid) g.rect(c * TILE, r * TILE, TILE, TILE).fill(COLORS.solid);
        else if (t === Tile.OneWay) g.rect(c * TILE, r * TILE, TILE, 3).fill(COLORS.oneWay);
      }
    }
    this.level.addChildAt(g, 0);
  }

  /** alpha: 직전 스텝과 지금 스텝 사이 보간 비율(고주사율 화면에서 부드럽게). */
  render(world: World, alpha: number): void {
    const p = world.player;
    const x = world.prev.x + (p.x - world.prev.x) * alpha;
    const y = world.prev.y + (p.y - world.prev.y) * alpha;

    this.player.clear();
    this.player.rect(0, 0, p.w, p.h).fill(COLORS.player);
    this.player.rect(p.facing > 0 ? p.w - 4 : 2, 3, 2, 2).fill(COLORS.eye);
    this.player.position.set(Math.round(x), Math.round(y));

    // 카메라: 캐릭터를 가운데에 두되 맵 밖은 보여 주지 않는다(정교한 카메라는 F03).
    const maxCam = Math.max(0, mapWidthPx(world.map) - VIEW_W);
    const cam = Math.min(maxCam, Math.max(0, x + p.w / 2 - VIEW_W / 2));
    this.level.position.set(-Math.round(cam), 0);

    this.app.render();
  }

  /** 텍스처·그래픽·WebGL 문맥까지 정리한다(화면을 떠날 때 메모리 누수 방지). */
  destroy(): void {
    this.app.destroy({ removeView: true }, { children: true, texture: true, context: true });
  }
}
