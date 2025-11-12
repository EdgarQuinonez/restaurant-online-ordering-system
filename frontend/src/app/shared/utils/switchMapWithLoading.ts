import {
  switchMap,
  map,
  catchError,
  startWith,
  scan,
  Observable,
  OperatorFunction,
  of,
} from 'rxjs';

export interface LoadingState<T = unknown> {
  loading: boolean;
  error?: any | null; // Changed from Error to any to accommodate different error formats
  data?: T;
}

export function switchMapWithLoading<T>(
  observableFunction: (value: any) => Observable<T>,
): OperatorFunction<any, LoadingState<T>> {
  return (source: Observable<any>) =>
    source.pipe(
      switchMap((value) =>
        observableFunction(value).pipe(
          map((data) => ({ data, loading: false, error: null })),
          catchError((error) => {
            // Handle different error formats
            const normalizedError =
              error?.error || error || 'Unknown error occurred';
            return of({
              error: normalizedError,
              loading: false,
              data: undefined,
            });
          }),
          startWith({ error: null, loading: true, data: undefined }),
        ),
      ),
      scan((state: LoadingState<T>, change: LoadingState<T>) => ({
        ...state,
        ...change,
      })),
    );
}
