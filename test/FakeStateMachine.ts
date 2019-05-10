'use strict';

import { FakeStateMachine } from '../src/FakeStateMachine';
import { RunStateResult } from '../src/RunStateResult';

const addNumbers = (numbers: { val1: number; val2: number }) =>
  numbers.val1 + numbers.val2;
const increment = (i: number) => i + 1;

describe('FakeStateMachine', () => {
  describe('#run()', () => {
    describe('when StartAt field does not exist', () => {
      test('should throw an Error', () => {
        const definition = require('./fixtures/startat-field-does-not-exist.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(fakeStateMachine.run({})).rejects.toThrow(
          'StartAt does not exist'
        );
      });
    });

    test('should pass the input to fakeResource and fill the result to ResultPath', async () => {
      const definition = require('./fixtures/add.json');
      const fakeResources = {
        'arn:aws:lambda:us-east-1:123456789012:function:Add': addNumbers,
      };
      const fakeStateMachine = new FakeStateMachine(definition, fakeResources);

      expect(
        await fakeStateMachine.run({
          title: 'Numbers to add',
          numbers: { val1: 3, val2: 4 },
        })
      ).toEqual(
        new RunStateResult(
          {
            title: 'Numbers to add',
            numbers: { val1: 3, val2: 4 },
            sum: 7,
          },
          'Task',
          null,
          true
        )
      );
    });

    describe('when there is invalid Type String', () => {
      test('should throw an Error', () => {
        const definition = require('./fixtures/unknown-type.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});

        return expect(fakeStateMachine.run({})).rejects.toThrow(
          'Invalid Type: UnknownType'
        );
      });
    });
    describe('when the state machine has two states', () => {
      test('should return the result successfully', async () => {
        const definition = require('./fixtures/two-states.json');
        const fakeResources = {
          'arn:aws:lambda:us-east-1:123456789012:function:Add': addNumbers,
        };
        const fakeStateMachine = new FakeStateMachine(
          definition,
          fakeResources
        );

        expect(
          await fakeStateMachine.run({
            title: 'Numbers to add',
            numbers: { val1: 3, val2: 4 },
          })
        ).toEqual(
          new RunStateResult(
            {
              title: 'Numbers to add',
              numbers: { val1: 3, val2: 4 },
              sum1: 7,
              sum2: 7,
            },
            'Task',
            null,
            true
          )
        );
      });
    });

    describe('when state machine contains a loop with break', () => {
      test('should return the result successfully', async () => {
        const definition = require('./fixtures/loop.json');
        const fakeResources = {
          'arn:aws:lambda:us-east-1:123456789012:function:Increment': increment,
        };
        const fakeStateMachine = new FakeStateMachine(
          definition,
          fakeResources
        );
        expect(
          await fakeStateMachine.run({
            i: 0,
          })
        ).toEqual(
          new RunStateResult(
            {
              i: 3,
            },
            'Succeed',
            null,
            true
          )
        );
      });
    });

    describe('when the state updates a copied field', () => {
      test('should not affect the original field', async () => {
        const definition = require('./fixtures/copy-object.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});
        expect(
          await fakeStateMachine.run({
            a1: { b: 1 },
          })
        ).toEqual(
          new RunStateResult(
            {
              a1: { b: 1 },
              a2: { b: 2 },
            },
            'Succeed',
            null,
            true
          )
        );
      });
    });
  });

  describe('#runCondition()', () => {
    const definition = require('./fixtures/states-with-common-prefix.json');
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

  describe('#runPartial()', () => {
    const definition = require('./fixtures/many-states.json');
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

  describe('#runState()', () => {
    describe('when the specified stateName does not exists', () => {
      test('should throw an Error', () => {
        const definition = require('./fixtures/startat-does-not-exist.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(
          fakeStateMachine.runState(
            {
              a1: 123,
            },
            'Target'
          )
        ).rejects.toThrow('the state Target does not exists');
      });
    });
    describe('when the state has `"End": true`', () => {
      test('should be marked as a terminal state', async () => {
        const definition = require('./fixtures/state-with-end-is-true.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(
          (await fakeStateMachine.runState(
            {
              a1: 123,
            },
            'Target'
          )).isTerminalState
        ).toBe(true);
      });
    });

    describe('when the state contains "Next" field', () => {
      test('should return the state with results and "Next" destination', async () => {
        const definition = require('./fixtures/state-with-next-property.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});
        expect(
          (await fakeStateMachine.runState(
            {
              a1: 123,
            },
            'Target'
          )).nextStateName
        ).toBe('NextState');
      });
    });

    describe('when the state does not contain "Next" field and does not have `"End": true`', () => {
      test('should throw an error', () => {
        const definition = require('./fixtures/state-without-next-and-end.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(
          fakeStateMachine.runState(
            {
              a1: 123,
            },
            'Target'
          )
        ).rejects.toThrow(
          'nextState must be non-null when the state is non-terminal state'
        );
      });
    });

    describe('when the state has `"Type": "Succeed"`', () => {
      test('should not change the state and return it', async () => {
        const definition = require('./fixtures/succeed.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});

        expect(await fakeStateMachine.runState({ sum: 7 }, 'Target')).toEqual(
          new RunStateResult({ sum: 7 }, 'Succeed', null, true)
        );
      });
    });
    describe('when the state has `"Type": "Fail"`', () => {
      test('should not change the state and return it', async () => {
        const definition = require('./fixtures/fail.json');
        const fakeStateMachine = new FakeStateMachine(definition, {});

        expect(await fakeStateMachine.runState({ sum: 7 }, 'Target')).toEqual(
          new RunStateResult({ sum: 7 }, 'Fail', null, true)
        );
      });
    });
    describe('when the state has `"Type": "Choice"`', () => {
      describe('when Choices contains only one element', () => {
        const conditions = [
          {
            conditionType: 'StringEquals',
            condition: 'abc',
            testCases: [['ab', 'DefaultState'], ['abc', 'NextState']],
          },
          {
            conditionType: 'NumericEquals',
            condition: 5,
            testCases: [[5.0, 'NextState'], [5.1, 'DefaultState']],
          },
          {
            conditionType: 'NumericLessThan',
            condition: 5,
            testCases: [
              [4.9, 'NextState'],
              [5.0, 'DefaultState'],
              [5.1, 'DefaultState'],
            ],
          },
          {
            conditionType: 'NumericLessThanEquals',
            condition: 5,
            testCases: [
              [4.9, 'NextState'],
              [5.0, 'NextState'],
              [5.1, 'DefaultState'],
            ],
          },
          {
            conditionType: 'NumericGreaterThan',
            condition: 5,
            testCases: [
              [4.9, 'DefaultState'],
              [5.0, 'DefaultState'],
              [5.1, 'NextState'],
            ],
          },
          {
            conditionType: 'BooleanEquals',
            condition: true,
            testCases: [[false, 'DefaultState'], [true, 'NextState']],
          },
        ];

        conditions.forEach(({ conditionType, condition, testCases }) => {
          describe(`with ${conditionType}`, () => {
            testCases.forEach(testCaseRow => {
              const [inputValue, expectedNextStateName] = testCaseRow;
              describe(`when condition=${condition} and input=${inputValue}`, () => {
                const choice: any = {
                  Variable: '$.condition',
                  Next: 'NextState',
                };
                choice[conditionType] = condition;
                const definition = {
                  States: {
                    Choices: {
                      Type: 'Choice',
                      Choices: [choice],
                      Default: 'DefaultState',
                    },
                  },
                };

                test(`the next state should be ${expectedNextStateName}`, async () => {
                  const fakeStateMachine = new FakeStateMachine(definition, {});
                  expect(
                    await fakeStateMachine.runState(
                      { condition: inputValue },
                      'Choices'
                    )
                  ).toEqual(
                    new RunStateResult(
                      { condition: inputValue },
                      'Choice',
                      expectedNextStateName,
                      false
                    )
                  );
                });
              });
            });
          });
        });
        describe('with And', () => {
          test.todo('pending');
        });
        describe('with Or', () => {
          test.todo('pending');
        });
        describe('with Not', () => {
          test.todo('pending');
        });
      });
      describe('when Choices contains more than two element', () => {
        test('should select the expected state as a next state', async () => {
          const definition = require('./fixtures/choice-more-than-two-choices.json');
          const fakeStateMachine = new FakeStateMachine(definition, {});
          expect(
            await fakeStateMachine.runState(
              {
                condition1: false,
                condition2: true,
              },
              'Choices'
            )
          ).toEqual(
            new RunStateResult(
              {
                condition1: false,
                condition2: true,
              },
              'Choice',
              'NextState2',
              false
            )
          );
        });
      });
    });

    describe('when the state has `"Type": "Pass"`', () => {
      describe('when there is an Input field', () => {
        test('should fill outputPath using Input field', async () => {
          const definition = require('./fixtures/pass-input-to-resultpath.json');
          const fakeStateMachine = new FakeStateMachine(definition, {});
          expect(
            await fakeStateMachine.runState(
              {
                a1: 123,
              },
              'Target'
            )
          ).toEqual(
            new RunStateResult(
              {
                a1: 123,
                a2: 'a',
              },
              'Pass',
              'NextState',
              false
            )
          );
        });
      });
      describe('when the state has an InputPath field', () => {
        describe('when the InputPath is undefined', () => {
          test('should fill outputPath using the whole data (i.e. $)', async () => {
            const definition = require('./fixtures/pass-inputpath-is-undefined.json');
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState(
                {
                  a1: 123,
                },
                'Target'
              )
            ).toEqual(
              new RunStateResult(
                {
                  a1: 123,
                  a2: { a1: 123 },
                },
                'Pass',
                'NextState',
                false
              )
            );
          });
        });
        describe('when the state contains Result', () => {
          test('should fill the content of Result to ResultPath', async () => {
            const definition = require('./fixtures/pass-result-to-resultpath.json');
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState(
                {
                  a1: 123,
                },
                'Target'
              )
            ).toEqual(
              new RunStateResult(
                {
                  a1: 123,
                  a2: 'a',
                },
                'Pass',
                'NextState',
                false
              )
            );
          });
        });
        describe('when the InputPath is null', () => {
          test('should fill outputPath using {}', async () => {
            const definition: any = require('./fixtures/task-inputpath-is-null.json');
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState(
                {
                  a1: 123,
                },
                'Target'
              )
            ).toEqual(
              new RunStateResult(
                {
                  a1: 123,
                  a2: {},
                },
                'Pass',
                'NextState',
                false
              )
            );
          });
        });
        describe('when the InputPath is non-null', () => {
          test('should fill outputPath using InputPath field', async () => {
            const definition = require('./fixtures/task-inputpath-to-outputpath.json');
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState(
                {
                  a1: 123,
                },
                'Target'
              )
            ).toEqual(
              new RunStateResult(
                {
                  a1: 123,
                  a2: 123,
                },
                'Pass',
                'NextState',
                false
              )
            );
          });
        });
      });
      describe('when the InputPath points a path like $.a.b3.c2', () => {
        test('should parse the InputPath correctly', async () => {
          const definition = require('./fixtures/task-complex-inputpath-and-outputpath.json');
          const fakeStateMachine = new FakeStateMachine(definition, {});
          expect(
            await fakeStateMachine.runState(
              {
                a: {
                  b1: 'a-b1',
                  b2: { c1: 'a-b2-c1' },
                  b3: { c1: 'a-b3-c1' },
                },
              },
              'Target'
            )
          ).toEqual(
            new RunStateResult(
              {
                a: {
                  b1: 'a-b1',
                  b2: { c1: 'a-b2-c1' },
                  b3: { c1: 'a-b3-c1', c2: 'a-b2-c1' },
                },
              },
              'Pass',
              'NextState',
              false
            )
          );
        });
      });
    });

    describe('when the state has `"Type": "Task"`', () => {
      const fakeResources = {
        'arn:aws:lambda:us-east-1:123456789012:function:Add': addNumbers,
        'arn:aws:lambda:us-east-1:123456789012:function:AddAsync': async (numbers: {
          val1: number;
          val2: number;
        }) => numbers.val1 + numbers.val2,
        'arn:aws:lambda:us-east-1:123456789012:function:Double': (n: number) =>
          2 * n,
        'arn:aws:lambda:us-east-1:123456789012:function:Identity': (x: any) =>
          x,
      };
      describe('when there is an InputPath field', () => {
        test('should pass the specified subset to the Resource', async () => {
          const definition = require('./fixtures/task-inputpath.json');
          const fakeStateMachine = new FakeStateMachine(
            definition,
            fakeResources
          );
          expect(
            await fakeStateMachine.runState(
              {
                numbers: { val1: 3, val2: 4 },
              },
              'Target'
            )
          ).toEqual(
            new RunStateResult(
              {
                numbers: { val1: 3, val2: 4 },
                sum: 7,
              },
              'Task',
              'NextState',
              false
            )
          );
        });
      });
      describe('when the fakeResource is an async function', () => {
        test('should pass the specified subset to the Resource', async () => {
          const definition = require('./fixtures/task-addasync.json');
          const fakeStateMachine = new FakeStateMachine(
            definition,
            fakeResources
          );
          expect(
            await fakeStateMachine.runState(
              {
                numbers: { val1: 3, val2: 4 },
              },
              'Add'
            )
          ).toEqual(
            new RunStateResult(
              {
                numbers: { val1: 3, val2: 4 },
                sum: 7,
              },
              'Task',
              null,
              true
            )
          );
        });
      });
      describe('when the InputPath points a path like $.a.b3.c2', () => {
        test('should pass the specified subset to the Resource', async () => {
          const definition = require('./fixtures/task-complex-inputpath.json');
          const fakeStateMachine = new FakeStateMachine(
            definition,
            fakeResources
          );
          expect(
            await fakeStateMachine.runState(
              {
                a: {
                  b3: {
                    c2: { val1: 3, val2: 4 },
                  },
                },
              },
              'Target'
            )
          ).toEqual(
            new RunStateResult(
              {
                a: {
                  b3: {
                    c2: { val1: 3, val2: 4 },
                  },
                },
                sum: 7,
              },
              'Task',
              'NextState',
              false
            )
          );
        });
      });
      describe('when the Task state is called without InputPath', () => {
        test('should pass $ to the Resource', async () => {
          const definition = require('./fixtures/task-without-input.json');
          const fakeStateMachine = new FakeStateMachine(
            definition,
            fakeResources
          );
          expect(
            await fakeStateMachine.runState(
              {
                val1: 3,
                val2: 4,
              },
              'Target'
            )
          ).toEqual(
            new RunStateResult(
              {
                val1: 3,
                val2: 4,
                sum: 7,
              },
              'Task',
              'NextState',
              false
            )
          );
        });
      });
      describe('when the Task state is called with Input', () => {
        test('should pass the Input to the Resource', async () => {
          const definition = require('./fixtures/task-input-to-resource.json');
          const fakeStateMachine = new FakeStateMachine(
            definition,
            fakeResources
          );
          expect(await fakeStateMachine.runState({}, 'Target')).toEqual(
            new RunStateResult(
              {
                result: 6,
              },
              'Task',
              'NextState',
              false
            )
          );
        });
      });
      describe('when the Task state does not contain ResultPath', () => {
        test('should use the default value ResultPath=`$`', async () => {
          const definition = require('./fixtures/task-resultpath-is-undefined.json');
          const fakeStateMachine = new FakeStateMachine(
            definition,
            fakeResources
          );
          expect(await fakeStateMachine.runState({}, 'Target')).toEqual(
            new RunStateResult(
              {
                a: 1,
                b: 2,
              },
              'Task',
              'NextState',
              false
            )
          );
        });
      });
      describe('when the Task state contains an unknown fake resource', () => {
        test('should raise an error', async () => {
          const definition = require('./fixtures/task-unknown-resource.json');
          const fakeStateMachine = new FakeStateMachine(
            definition,
            fakeResources
          );
          return expect(
            fakeStateMachine.runState({}, 'Target')
          ).rejects.toThrow(
            'Unknown resource: arn:aws:lambda:us-east-1:123456789012:function:Unknown'
          );
        });
      });
      describe('when the Task state contains a Parameters property', () => {
        test('should pass the specified parameters', async () => {
          const definition = require('./fixtures/parameter-property.json');
          let input: any;
          const fakeStateMachine = new FakeStateMachine(definition, {
            'arn:aws:lambda:us-east-1:123456789012:function:saveInput': (
              event: any
            ) => {
              input = event;
              return event.input.val1 + event.input.val2;
            },
          });
          const actual = await fakeStateMachine.runState(
            { a: 2, b: { c: { val2: 4 } } },
            'Target'
          );
          expect(input).toEqual({ input: { val1: 3, val2: 4 } });
          expect(actual.data).toEqual({
            a: 2,
            b: {
              c: { val2: 4 },
            },
            result: 7,
          });
        });
      });
    });
    describe('when the state has `"Type": "Wait"`', () => {
      test.todo('pending');
    });
    describe('when the state has `"Type": "Parallel"`', () => {
      test.todo('pending');
    });
  });
});
