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
  error?: Error | null;
  data?: T;
}

export function switchMapWithLoading<T>(
  observableFunction: (value: any) => Observable<T>,
): OperatorFunction<any, LoadingState<T>> {
  return (source: Observable<any>) =>
    source.pipe(
      switchMap((value) =>
        observableFunction(value).pipe(
          map((data) => ({ data, loading: false })),
          catchError((error) => of({ error, loading: false })),
          startWith({ error: null, loading: true }),
        ),
      ),
      scan((state: LoadingState<T>, change: LoadingState<T>) => ({
        ...state,
        ...change,
      })),
    );
}
