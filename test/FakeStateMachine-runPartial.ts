import { FakeStateMachine } from '../src/FakeStateMachine';
import { RunStateResult } from '../src/RunStateResult';

describe('FakeStateMachine#runPartial()', () => {
  const definition = require('./fixtures/definitions/many-states.json');
  const fakeStateMachine = new FakeStateMachine(definition, {});
  test('should execute states between the start state and the end state', async () => {
    expect(
      await fakeStateMachine.runPartial(
        { title: 'run-partial' },
        'Pass1',
        'Pass2'
      )
    ).toEqual(
      new RunStateResult(
        {
          title: 'run-partial',
          p1: 'b',
          p2: 'c',
        },
        'Pass',
        'Pass3',
        false
      )
    );
  });
});
