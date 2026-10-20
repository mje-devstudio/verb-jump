import { useId } from 'react';
import { speak } from '../../shared/lib/tts';
import { settings, useSettings } from './settings';

/**
 * 발음·효과음 볼륨(타이틀·일시정지 메뉴). 브라우저 TTS는 100%가 최대라 더 키울 수 없어서,
 * 발음이 작게 들리면 효과음을 낮추는 쪽이 효과가 크다. "들어 보기"로 바로 확인한다.
 */
export function VolumeControls() {
  const prefs = useSettings();
  return (
    <div className="grid w-full max-w-sm gap-2 text-left text-sm">
      <VolumeSlider
        label="발음 볼륨"
        value={prefs.speechVolume}
        disabled={!prefs.speech}
        onChange={(speechVolume) => settings.set({ speechVolume })}
        action={
          <button
            type="button"
            disabled={!prefs.speech}
            onClick={() => speak('climb', { volume: settings.get().speechVolume })}
            className="min-h-11 rounded border border-muted px-2 disabled:opacity-40"
          >
            들어 보기
          </button>
        }
      />
      <VolumeSlider
        label="효과음 볼륨"
        value={prefs.sfxVolume}
        disabled={!prefs.sfx}
        onChange={(sfxVolume) => settings.set({ sfxVolume })}
      />
      <p className="text-xs text-muted">
        발음은 100%가 브라우저 최대예요. 그래도 작으면 효과음을 낮추거나 기기 볼륨을 키워 주세요.
      </p>
    </div>
  );
}

function VolumeSlider({
  label,
  value,
  disabled,
  onChange,
  action,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
  action?: React.ReactNode;
}) {
  const id = useId();
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-20 shrink-0">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={10}
        value={pct}
        disabled={disabled}
        aria-valuetext={`${pct}%`}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="min-h-11 flex-1 accent-[var(--color-accent)] disabled:opacity-40"
      />
      <span className="w-10 text-right tabular-nums">{pct}%</span>
      {action}
    </div>
  );
}
