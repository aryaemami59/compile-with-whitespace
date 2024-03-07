import matchers from 'jest-extended';

expect.extend(matchers)

import type CustomMatchers from 'jest-extended';
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining<T = unknown>
    extends CustomMatchers<T> {}
}
