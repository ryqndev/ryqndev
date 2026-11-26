import { S } from '../state';

/** Adds camera shake (0..1). */
export function shake(a: number) {
    S.trauma = Math.min(1, S.trauma + a);
}
