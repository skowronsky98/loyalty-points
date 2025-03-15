import crypto from 'crypto';

export const setDefault = <T>(
  value: T,
  defaultValue: Exclude<T, undefined>,
): Exclude<T, undefined> =>
  value === undefined ? defaultValue : (value as Exclude<T, undefined>);

export const hashEvent = (input: { eventName: string, sequence: number }): string => {
  const { eventName, sequence } = input;
  return crypto
    .createHash('sha256')
    .update(`${eventName}-${sequence}`)
    .digest('hex');
};
