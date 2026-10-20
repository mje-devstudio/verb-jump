import { SFX_DEFS, type SfxName } from './sfxDefs';

/**
 * 8비트 효과음(F12, jsfxr). 처음 쓸 때 소리를 한 번만 만들어(AudioBuffer) 두고 매번 새 소스로 재생한다.
 * 브라우저는 사용자 동작 전에는 소리를 막으므로, 시작 버튼에서 unlock()을 부른다.
 */
/** 제안값: 발음을 읽는 동안 효과음 볼륨 배율. */
export const DUCK_LEVEL = 0.25;
/** 제안값: 발음 끝 알림이 안 와도 이 시간 뒤에는 효과음 볼륨을 되돌린다. */
export const DUCK_MAX_MS = 2500;

export class Sfx {
  private ctx: AudioContext | null = null;
  /** 모든 효과음이 지나가는 볼륨. 동사 발음을 읽는 동안 줄인다(duck). */
  private master: GainNode | null = null;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly buffers = new Map<SfxName, AudioBuffer>();
  // F19: 효과음 생성기(jsfxr)는 첫 화면 번들에서 떼고 시작 버튼을 누를 때 받는다
  private synth: typeof import('jsfxr').sfxr | null = null;

  /** 시작 버튼(첫 사용자 동작)에서 부른다. */
  unlock(): void {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    this.ctx ??= new AudioContext();
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
    if (!this.synth) {
      import('jsfxr').then(
        (m) => {
          this.synth = m.sfxr;
        },
        () => {}, // 못 받으면 효과음 없이 계속한다
      );
    }
  }

  /** 탭·앱을 다녀오면 iOS는 소리를 멈춘다(suspended·interrupted). 게임이 다시 돌 때 부른다(리뷰 10). */
  resume(): void {
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
  }

  /**
   * 동사 발음(TTS)을 읽는 동안 효과음을 DUCK_LEVEL로 줄인다. 브라우저 TTS는 볼륨을 1.0보다 키울 수 없어서,
   * 같은 순간에 나는 밟기·동사 효과음에 묻히지 않게 효과음 쪽을 낮춘다.
   * 끝 알림(onend)이 오지 않는 브라우저가 있어 DUCK_MAX_MS 뒤에는 저절로 돌아온다.
   */
  duck(on: boolean): void {
    const g = this.master;
    if (!g || !this.ctx) return;
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = on ? setTimeout(() => this.duck(false), DUCK_MAX_MS) : null;
    g.gain.setTargetAtTime(on ? DUCK_LEVEL : 1, this.ctx.currentTime, 0.03);
  }

  play(name: SfxName): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    let buf = this.buffers.get(name);
    if (!buf) {
      if (!this.synth) return; // 아직 받는 중
      const src = this.synth.toWebAudio(SFX_DEFS[name], this.ctx);
      if (!src?.buffer) return;
      buf = src.buffer;
      this.buffers.set(name, buf);
    }
    const node = this.ctx.createBufferSource();
    node.buffer = buf;
    node.connect(this.master ?? this.ctx.destination);
    node.start();
  }
}

/** 앱 전체에서 하나만 쓴다(AudioContext는 페이지당 하나가 좋다). */
export const sfx = new Sfx();
