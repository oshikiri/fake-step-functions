import { FakeStateMachine } from '../src/FakeStateMachine';
import { RunStateResult } from '../src/RunStateResult';
import { increment } from './fixtures/resources';

describe('FakeStateMachine#runCondition()', () => {
  const definition = require('./fixtures/definitions/states-with-common-prefix.json');
  const fakeStateMachine = new FakeStateMachine(definition, {
    'arn:aws:lambda:us-east-1:123456789012:function:Increment': increment,
  });
  describe('with start and end', () => {
    test('should run while the condition fulfills', async () => {
      expect(
        await fakeStateMachine.runCondition(
          {},
          { start: 'main.initialize', end: 'main.check' }
        )
      ).toEqual(
        new RunStateResult({ i: 1 }, 'Choice', 'main.increment', false)
      );
    });
  });
  describe('with start and regex', () => {
    test('should run while the condition fulfills', async () => {
      expect(
        await fakeStateMachine.runCondition(
          {},
          { start: 'main.initialize', regex: /main\.\w+/ }
        )
      ).toEqual(new RunStateResult({ i: 3 }, 'Choice', 'hoge', false));
    });
  });
});
