/** jsfxr(Unlicense)에는 타입이 없어 여기서 쓰는 부분만 적는다. */
declare module 'jsfxr' {
  /** sfxr.me의 "serialize" JSON과 같은 소리 정의. */
  export type SfxrDef = Record<string, number | boolean>;
  export const sfxr: {
    generate(preset: string): SfxrDef;
    toWebAudio(def: SfxrDef, ctx: BaseAudioContext): AudioBufferSourceNode | undefined;
  };
}
