import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas, type GameController } from '../../game/GameCanvas';
import type { ResultData } from '../../game/result';
import { createGameStore, type GameSnapshot } from '../../game/store';
import { TouchInput } from '../../game/touchInput';
import type { LevelDef } from '../../game/world';
import { useMediaQuery, useTouchMode } from '../../shared/lib/useMediaQuery';
import { RotateNotice } from '../controls/RotateNotice';
import { TouchControls } from '../controls/TouchControls';
import { ClearBanner } from '../hud/ClearBanner';
import { Hud } from '../hud/Hud';
import { useGameStore } from '../hud/useGameStore';
import { WordCard } from '../hud/WordCard';
import { metVerbs } from '../verbBook/metVerbs';
import { PauseMenu } from '../verbBook/PauseMenu';

/** 클리어 배너를 보여 준 뒤 결과 화면으로 넘어가기까지(ms). */
export const RESULT_DELAY_MS = 1500;

const selectResult = (s: GameSnapshot) => s.result;

/** S2 게임. 판마다 새 저장소를 만든다(다시 하기 = 새 컴포넌트). */
export function GameScreen({
  level,
  onFinish,
}: {
  level: LevelDef;
  onFinish: (result: ResultData) => void;
}) {
  const [store] = useState(createGameStore);
  const [touchInput] = useState(() => new TouchInput());
  const touch = useTouchMode();
  // 판정 완화(모바일)는 판을 시작할 때 한 번 정한다. 판 도중 바뀌면 게임이 새로 만들어져 진행이 사라진다(리뷰 4)
  const [mobile] = useState(touch);
  const portrait = useMediaQuery('(orientation: portrait)');
  const blocked = touch && portrait;
  const controllerRef = useRef<GameController | null>(null);
  const togglePause = useCallback(() => controllerRef.current?.togglePause(), []);
  const result = useGameStore(store, selectResult);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => onFinish(result), RESULT_DELAY_MS);
    return () => clearTimeout(t);
  }, [result, onFinish]);

  // 세로로 들면 멈추고, 가로로 돌리면 이어서(사용자 일시정지와 따로 센다)
  useEffect(() => {
    controllerRef.current?.setPortraitBlocked(blocked);
  }, [blocked]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        {/* HUD는 게임 화면 위에 겹친다. 위에 따로 두면 높이 ~390px(휴대폰 가로·낮은 창)에서
            정수 배율이 1배(320×180)로 떨어진다. 겹치면 2배(640×360). */}
        <div className="absolute inset-x-0 top-0 z-10">
          <Hud store={store} onTogglePause={togglePause} />
        </div>
        <GameCanvas
          level={level}
          store={store}
          controllerRef={controllerRef}
          touchInput={touchInput}
          mobile={mobile}
          onReady={() => controllerRef.current?.setPortraitBlocked(blocked)}
          onVerbMet={metVerbs.add}
        />
        <WordCard store={store} />
        <PauseMenu store={store} verbs={level.verbs} touch={touch} onResume={togglePause} />
        <ClearBanner store={store} />
        {touch && <TouchControls input={touchInput} store={store} />}
        {blocked && <RotateNotice />}
      </div>
    </div>
  );
}
