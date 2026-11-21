/**
 * Generates random number in a given range
 * @param min
 * @param max
 * @returns
 */
export const random = (min: number, max: number) =>
    Math.random() * (max - min) + min;
