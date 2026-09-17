export const MAX_D1_SAMPLE_KEY = 0x7fffffff;

/** Random cursor for indexed wrap-around sampling; never sorts the candidate set. */
export function randomD1SampleKey() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] & MAX_D1_SAMPLE_KEY;
}

export function mergeD1SamplePages<T>(afterCursor:T[],beforeCursor:T[],limit:number) {
  return [...afterCursor,...beforeCursor].slice(0,Math.max(0,limit));
}
