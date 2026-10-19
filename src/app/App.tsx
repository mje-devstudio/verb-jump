import { useCallback, useReducer } from 'react';
import type { ResultData } from '../game/result';
import type { LevelDef } from '../game/world';
import type { StageData } from '../shared/stages/types';
import { unlockSpeech } from '../shared/lib/tts';
import { sfx } from '../game/audio/sfx';
import { DevPanel } from '../features/devtools/DevPanel';
import { devToolsEnabled } from '../features/devtools/devSettings';
import { GameScreen } from '../features/game/GameScreen';
import { saveIfBest } from '../features/result/bestRecord';
import { ResultScreen } from '../features/result/ResultScreen';
import { TitleScreen } from '../features/title/TitleScreen';

const STAGE_ID = 'commute';

/** UI 상태(useReducer): 지금 화면. 게임 상태는 게임 루프 안, 서버 상태는 TanStack Query에 둔다. */
type Screen =
  | { name: 'title' }
  | { name: 'game'; stage: StageData; level: LevelDef; run: number }
  | {
      name: 'result';
      stage: StageData;
      level: LevelDef;
      run: number;
      result: ResultData;
      newBest: boolean;
    };

type Action =
  | { type: 'start'; stage: StageData; level: LevelDef }
  | { type: 'finish'; result: ResultData; newBest: boolean }
  | { type: 'retry' }
  | { type: 'title' };

function reducer(s: Screen, a: Action): Screen {
  switch (a.type) {
    case 'start':
      return { name: 'game', stage: a.stage, level: a.level, run: 1 };
    case 'finish':
      return s.name === 'game' ? { ...s, name: 'result', result: a.result, newBest: a.newBest } : s;
    case 'retry':
      // 같은 스테이지로: 레벨은 그대로 쓰고 run을 바꿔 게임 화면을 새로 만든다
      return s.name === 'result'
        ? { name: 'game', stage: s.stage, level: s.level, run: s.run + 1 }
        : s;
    case 'title':
      return { name: 'title' };
  }
}

export function App() {
  const [screen, dispatch] = useReducer(reducer, { name: 'title' });

  const start = useCallback((stage: StageData, level: LevelDef) => {
    // 시작 버튼이 오디오를 허용하는 첫 사용자 동작
    unlockSpeech();
    sfx.unlock();
    dispatch({ type: 'start', stage, level });
  }, []);

  const stageId = screen.name === 'title' ? STAGE_ID : screen.stage.id;
  const finish = useCallback(
    (result: ResultData) => {
      const newBest = saveIfBest(stageId, {
        score: result.score.total,
        arrival: result.arrival,
        clearMs: result.clearMs,
      });
      dispatch({ type: 'finish', result, newBest });
    },
    [stageId],
  );

  return (
    <main className="h-full">
      {screen.name === 'title' && <TitleScreen stageId={STAGE_ID} onStart={start} />}
      {screen.name === 'game' && (
        <GameScreen key={screen.run} level={screen.level} onFinish={finish} />
      )}
      {screen.name === 'result' && (
        <ResultScreen
          result={screen.result}
          newBest={screen.newBest}
          onRetry={() => dispatch({ type: 'retry' })}
          onTitle={() => dispatch({ type: 'title' })}
        />
      )}
      {devToolsEnabled() && <DevPanel />}
    </main>
  );
}
