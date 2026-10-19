import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
  /** 다시 시작할 때마다 바꿔 아래 화면을 처음부터 새로 만든다. */
  generation: number;
}

/**
 * 렌더 오류가 나면 다시 시작 화면을 띄운다(F13). 게임 루프(rAF) 안의 오류는 GameCanvas가 렌더 중에 다시 던져
 * 여기까지 올라오게 한다. 오류 모니터링(Sentry, F22)이 붙으면 componentDidCatch에서 보낸다.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null, generation: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('렌더 오류', error, info.componentStack);
  }

  private readonly restart = () => {
    this.setState((s) => ({ error: null, generation: s.generation + 1 }));
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <section
          role="alert"
          className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
        >
          <h1 className="text-2xl font-bold">문제가 생겨 게임을 멈췄어요</h1>
          <p className="text-muted">
            처음 화면부터 다시 시작할 수 있어요. 같은 문제가 계속되면 새로고침해 주세요.
          </p>
          <button
            type="button"
            onClick={this.restart}
            className="min-h-12 rounded-md bg-accent px-8 font-bold text-bg"
          >
            처음부터 다시
          </button>
        </section>
      );
    }
    return (
      <div key={this.state.generation} className="contents">
        {this.props.children}
      </div>
    );
  }
}
