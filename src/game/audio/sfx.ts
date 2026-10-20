import { SFX_DEFS, type SfxName } from './sfxDefs';

/**
 * 8비트 효과음(F12, jsfxr). 처음 쓸 때 소리를 한 번만 만들어(AudioBuffer) 두고 매번 새 소스로 재생한다.
 * 브라우저는 사용자 동작 전에는 소리를 막으므로, 시작 버튼에서 unlock()을 부른다.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private readonly buffers = new Map<SfxName, AudioBuffer>();
  // F19: 효과음 생성기(jsfxr)는 첫 화면 번들에서 떼고 시작 버튼을 누를 때 받는다
  private synth: typeof import('jsfxr').sfxr | null = null;
  enabled = true;

  /** 시작 버튼(첫 사용자 동작)에서 부른다. */
  unlock(): void {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    this.ctx ??= new AudioContext();
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

  play(name: SfxName): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
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
    node.connect(this.ctx.destination);
    node.start();
  }
}

/** 앱 전체에서 하나만 쓴다(AudioContext는 페이지당 하나가 좋다). */
export const sfx = new Sfx();
