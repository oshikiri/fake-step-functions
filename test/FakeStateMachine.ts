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
        const definition = {
          States: {
            Done: {
              Type: 'Succeed',
            },
          },
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(fakeStateMachine.run({})).rejects.toThrow(
          'StartAt does not exist'
        );
      });
    });

    test('should pass the input to fakeResource and fill the result to ResultPath', async () => {
      const definition = {
        StartAt: 'Add',
        States: {
          Add: {
            Type: 'Task',
            Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
            InputPath: '$.numbers',
            ResultPath: '$.sum',
            End: true,
          },
        },
      };
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
        const definition = {
          StartAt: 'Done',
          States: {
            Done: {
              Type: 'UnknownType',
            },
          },
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});

        return expect(fakeStateMachine.run({})).rejects.toThrow(
          'Invalid Type: UnknownType'
        );
      });
    });
    describe('when the state machine has two states', () => {
      test('should return the result successfully', async () => {
        const definition = {
          StartAt: 'Add1',
          States: {
            Add1: {
              Type: 'Task',
              Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
              InputPath: '$.numbers',
              ResultPath: '$.sum1',
              Next: 'Add2',
            },
            Add2: {
              Type: 'Task',
              Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
              InputPath: '$.numbers',
              ResultPath: '$.sum2',
              End: true,
            },
          },
        };
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
        const definition = {
          StartAt: 'IncrementOrEnd',
          States: {
            IncrementOrEnd: {
              Type: 'Choice',
              Choices: [
                {
                  Variable: '$.i',
                  NumericEquals: 3,
                  Next: 'Done',
                },
              ],
              Default: 'Increment',
            },
            Increment: {
              Type: 'Task',
              Resource:
                'arn:aws:lambda:us-east-1:123456789012:function:Increment',
              InputPath: '$.i',
              ResultPath: '$.i',
              Next: 'IncrementOrEnd',
            },
            Done: {
              Type: 'Succeed',
            },
          },
        };
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
        const definition = {
          StartAt: 'Start',
          States: {
            Start: {
              Type: 'Pass',
              InputPath: '$.a1',
              ResultPath: '$.a2',
              Next: 'Increment',
            },
            Increment: {
              Type: 'Pass',
              Input: 2,
              ResultPath: '$.a2.b',
              Next: 'Done',
            },
            Done: {
              Type: 'Succeed',
            },
          },
        };
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
    const definition = {
      States: {
        'main.initialize': {
          Type: 'Pass',
          Result: 0,
          ResultPath: '$.i',
          Next: 'main.increment',
        },
        'main.increment': {
          Type: 'Task',
          InputPath: '$.i',
          Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Increment',
          ResultPath: '$.i',
          Next: 'main.check',
        },
        'main.check': {
          Type: 'Choice',
          Choices: [
            {
              Variable: '$.i',
              NumericEquals: 3,
              Next: 'hoge',
            },
          ],
          Default: 'main.increment',
        },
        hoge: {
          Type: 'Pass',
          Input: -1,
          ResultPath: '$.i',
        },
      },
    };
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
    const definition = {
      StartAt: 'Pass0',
      States: {
        Pass0: {
          Input: 'a',
          ResultPath: '$.p0',
          Type: 'Pass',
          Next: 'Pass1',
        },
        Pass1: {
          Input: 'b',
          ResultPath: '$.p1',
          Type: 'Pass',
          Next: 'Pass2',
        },
        Pass2: {
          Input: 'c',
          ResultPath: '$.p2',
          Type: 'Pass',
          Next: 'Pass3',
        },
        Pass3: {
          Input: 'd',
          ResultPath: '$.p3',
          Type: 'Pass',
          Next: 'Done',
        },
        Done: {
          Type: 'Succeed',
        },
      },
    };
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
        const definition = {
          StartAt: 'Start',
          States: {
            Target2: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass',
            },
          },
        };
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
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass',
              End: true,
            },
          },
        };
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
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass',
              Next: 'NextState',
            },
          },
        };
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
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass',
            },
          },
        };
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
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Type: 'Succeed',
            },
          },
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});

        expect(await fakeStateMachine.runState({ sum: 7 }, 'Target')).toEqual(
          new RunStateResult({ sum: 7 }, 'Succeed', null, true)
        );
      });
    });
    describe('when the state has `"Type": "Fail"`', () => {
      test('should not change the state and return it', async () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Type: 'Fail',
            },
          },
        };
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
          const definition = {
            States: {
              Choices: {
                Type: 'Choice',
                Choices: [
                  {
                    Variable: '$.condition1',
                    BooleanEquals: true,
                    Next: 'NextState1',
                  },
                  {
                    Variable: '$.condition2',
                    BooleanEquals: true,
                    Next: 'NextState2',
                  },
                ],
                Default: 'DefaultState',
              },
            },
          };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Input: 'a',
                ResultPath: '$.a2',
                Type: 'Pass',
                Next: 'NextState',
              },
            },
          };
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
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState',
                },
              },
            };
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
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  Result: 'a',
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState',
                },
              },
            };
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
            const definition: any = {
              StartAt: 'Start',
              States: {
                Target: {
                  InputPath: null,
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState',
                },
              },
            };
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
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  InputPath: '$.a1',
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState',
                },
              },
            };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.a.b2.c1',
                ResultPath: '$.a.b3.c2',
                Type: 'Pass',
                Next: 'NextState',
              },
            },
          };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.numbers',
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState',
              },
            },
          };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.numbers',
                Resource:
                  'arn:aws:lambda:us-east-1:123456789012:function:AddAsync',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState',
              },
            },
          };
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
      describe('when the InputPath points a path like $.a.b3.c2', () => {
        test('should pass the specified subset to the Resource', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.a.b3.c2',
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState',
              },
            },
          };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState',
              },
            },
          };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource:
                  'arn:aws:lambda:us-east-1:123456789012:function:Double',
                Input: 3,
                ResultPath: '$.result',
                Type: 'Task',
                Next: 'NextState',
              },
            },
          };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource:
                  'arn:aws:lambda:us-east-1:123456789012:function:Identity',
                Parameters: {
                  a: 1,
                  b: 2,
                },
                Type: 'Task',
                Next: 'NextState',
              },
            },
          };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource:
                  'arn:aws:lambda:us-east-1:123456789012:function:Unknown',
                ResultPath: '$.result',
                Type: 'Task',
                Next: 'NextState',
              },
            },
          };
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
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource:
                  'arn:aws:lambda:us-east-1:123456789012:function:saveInput',
                Parameters: {
                  input: {
                    val1: 3,
                    'val2.$': '$.b.c.val2',
                  },
                },
                ResultPath: '$.result',
                Type: 'Task',
                Next: 'NextState',
              },
            },
          };
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
