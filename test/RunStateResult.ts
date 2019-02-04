/* eslint-env mocha */

'use strict';

import { expect } from 'chai';
import { RunStateResult } from '../src/RunStateResult';

describe('RunStateResult', () => {
  it('should be able to compare', () => {
    const r1 = new RunStateResult({}, 'Task', 'NextState', false);
    const r2 = new RunStateResult({}, 'Task', 'NextState', false);
    expect(r1).to.deep.equal(r2);
  });

  context('when the nextState is null and isTerminalState = false', () => {
    it('should throw error', () => {
      expect(
        () => new RunStateResult({}, 'Task', null, false)
      ).to.throw(Error, 'nextState must be non-null when the state is non-terminal state');
    });
  });
});
