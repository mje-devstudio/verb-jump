// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, settings } from './settings';
import { VolumeControls } from './VolumeControls';

const speak = vi.hoisted(() => vi.fn());
vi.mock('../../shared/lib/tts', () => ({ speak }));

beforeEach(() => {
  window.localStorage.clear();
  settings.reload();
});
afterEach(() => {
  cleanup();
  speak.mockReset();
});

describe('발음·효과음 볼륨', () => {
  it('기본값은 발음 100%, 효과음 60%', () => {
    render(<VolumeControls />);
    expect(DEFAULT_SETTINGS).toMatchObject({ speechVolume: 1, sfxVolume: 0.6 });
    expect((screen.getByLabelText('발음 볼륨') as HTMLInputElement).value).toBe('100');
    expect((screen.getByLabelText('효과음 볼륨') as HTMLInputElement).value).toBe('60');
  });

  it('슬라이더를 옮기면 저장되고, 다시 읽어도 남는다', () => {
    render(<VolumeControls />);
    fireEvent.change(screen.getByLabelText('효과음 볼륨'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('발음 볼륨'), { target: { value: '70' } });
    expect(settings.get()).toMatchObject({ sfxVolume: 0.2, speechVolume: 0.7 });
    settings.reload();
    expect(settings.get()).toMatchObject({ sfxVolume: 0.2, speechVolume: 0.7 });
  });

  it('들어 보기는 지금 발음 볼륨으로 읽는다', () => {
    settings.set({ speechVolume: 0.5 });
    render(<VolumeControls />);
    fireEvent.click(screen.getByRole('button', { name: '들어 보기' }));
    expect(speak).toHaveBeenCalledWith('climb', { volume: 0.5 });
  });

  it('발음을 끄면 발음 볼륨·들어 보기를 쓸 수 없다', () => {
    settings.set({ speech: false });
    render(<VolumeControls />);
    expect((screen.getByLabelText('발음 볼륨') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '들어 보기' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('저장값이 범위를 벗어나거나 깨져 있으면 0~1로 맞추거나 기본값을 쓴다', () => {
    window.localStorage.setItem(
      'verb-jump:settings',
      JSON.stringify({ sfxVolume: 3, speechVolume: 'loud' }),
    );
    settings.reload();
    expect(settings.get()).toMatchObject({ sfxVolume: 1, speechVolume: 1 });
  });
});
