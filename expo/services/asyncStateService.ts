export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<TError = string> {
  status: AsyncStatus;
  error?: TError;
}

export const idleState: AsyncState = { status: 'idle' };
export const loadingState: AsyncState = { status: 'loading' };
export const successState: AsyncState = { status: 'success' };

export function errorState(error: string): AsyncState {
  return { status: 'error', error };
}

export function isBusy(state: AsyncState) {
  return state.status === 'loading';
}
