/* eslint-env mocha */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { FakeStateMachine } = require('../src/FakeStateMachine');
const { RunStateResult } = require('../src/RunStateResult');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('FakeStateMachine', () => {
  describe('#run()', () => {
    context('when StartAt field does not exist', () => {
      it('should throw an Error', () => {
        const definition = {
          States: {
            Done: {
              Type: 'Succeed'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(fakeStateMachine.run({}))
          .to.rejectedWith(Error, 'StartAt does not exist');
      });
    });

    it('should pass the input to fakeResource and fill the result to ResultPath', async () => {
      const definition = {
        StartAt: 'Add',
        States: {
          Add: {
            Type: 'Task',
            Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
            InputPath: '$.numbers',
            ResultPath: '$.sum',
            End: true
          }
        }
      };
      const fakeResources = {
        'arn:aws:lambda:us-east-1:123456789012:function:Add': numbers => numbers.val1 + numbers.val2,
      };
      const fakeStateMachine = new FakeStateMachine(definition, fakeResources);

      expect(await fakeStateMachine.run({
        title: 'Numbers to add',
        numbers: { val1: 3, val2: 4 }
      })).to.deep.equal(new RunStateResult({
        title: 'Numbers to add',
        numbers: { val1: 3, val2: 4 },
        sum: 7
      }, 'Task', null, true));
    });

    context('when there is invalid Type String', () => {
      it('should throw an Error', () => {
        const definition = {
          StartAt: 'Done',
          States: {
            Done: {
              Type: 'UnknownType'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});

        return expect(fakeStateMachine.run({}))
          .to.rejectedWith(Error, 'Invalid Type: UnknownType');
      });
    });
    context('when the state machine has two states', () => {
      it('should return the result successfully', async () => {
        const definition = {
          StartAt: 'Add1',
          States: {
            Add1: {
              Type: 'Task',
              Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
              InputPath: '$.numbers',
              ResultPath: '$.sum1',
              Next: 'Add2'
            },
            Add2: {
              Type: 'Task',
              Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
              InputPath: '$.numbers',
              ResultPath: '$.sum2',
              End: true
            }
          }
        };
        const fakeResources = {
          'arn:aws:lambda:us-east-1:123456789012:function:Add': numbers => numbers.val1 + numbers.val2,
        };
        const fakeStateMachine = new FakeStateMachine(definition, fakeResources);

        expect(await fakeStateMachine.run({
          title: 'Numbers to add',
          numbers: { val1: 3, val2: 4 }
        })).to.deep.equal(new RunStateResult({
          title: 'Numbers to add',
          numbers: { val1: 3, val2: 4 },
          sum1: 7,
          sum2: 7,
        }, 'Task', null, true));
      });
    });

    context('when state machine contains a loop with break', () => {
      it('should return the result successfully', async () => {
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
                }
              ],
              Default: 'Increment',
            },
            Increment: {
              Type: 'Task',
              Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Increment',
              InputPath: '$.i',
              ResultPath: '$.i',
              Next: 'IncrementOrEnd'
            },
            Done: {
              Type: 'Succeed',
            }
          }
        };
        const fakeResources = {
          'arn:aws:lambda:us-east-1:123456789012:function:Increment': i => i + 1,
        };
        const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
        expect(await fakeStateMachine.run({
          i: 0
        })).to.deep.equal(new RunStateResult({
          i: 3
        }, 'Succeed', null, true));
      });
    });

    context('when the state updates a copied field', () => {
      it('should not affect the original field', async () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Start: {
              Type: 'Pass',
              InputPath: '$.a1',
              ResultPath: '$.a2',
              Next: 'Increment'
            },
            Increment: {
              Type: 'Pass',
              Input: 2,
              ResultPath: '$.a2.b',
              Next: 'Done'
            },
            Done: {
              Type: 'Succeed'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        expect(await fakeStateMachine.run({
          a1: { b: 1 }
        })).to.deep.equal(new RunStateResult({
          a1: { b: 1 },
          a2: { b: 2 }
        }, 'Succeed', null, true));
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
          Next: 'Pass2'
        },
        Pass2: {
          Input: 'c',
          ResultPath: '$.p2',
          Type: 'Pass',
          Next: 'Pass3'
        },
        Pass3: {
          Input: 'd',
          ResultPath: '$.p3',
          Type: 'Pass',
          Next: 'Done'
        },
        Done: {
          Type: 'Succeed'
        }
      }
    };
    const fakeStateMachine = new FakeStateMachine(definition, {});
    it('should execute states between the start state and the end state', async () => {
      expect(
        await fakeStateMachine.runPartial({ title: 'run-partial' }, 'Pass1', 'Pass2')
      ).to.deep.equal(new RunStateResult({
        title: 'run-partial',
        p1: 'b',
        p2: 'c',
      }, 'Pass', 'Pass3', false));
    });
  });

  describe('#runState()', () => {
    context('when the specified stateName does not exists', () => {
      it('should throw an Error', () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target2: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(fakeStateMachine.runState({
          a1: 123
        }, 'Target')).to.rejectedWith(Error, 'the state Target does not exists');
      });
    });
    context('when the state has `"End": true`', () => {
      it('should be marked as a terminal state', async () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass',
              End: true
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(
          (await fakeStateMachine.runState({
            a1: 123
          }, 'Target')).isTerminalState
        ).to.be.true;
      });
    });

    context('when the state contains "Next" field', () => {
      it('should return the state with results and "Next" destination', async () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass',
              Next: 'NextState'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        expect(
          (await fakeStateMachine.runState({
            a1: 123
          }, 'Target')).nextStateName
        ).to.equal('NextState');
      });
    });

    context('when the state does not contain "Next" field and does not have `"End": true`', () => {
      it('should throw an error', () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        return expect(fakeStateMachine.runState({
          a1: 123
        }, 'Target')).be.rejectedWith(Error, 'nextState must be non-null when the state is non-terminal state');
      });
    });

    context('when the state has `"Type": "Succeed"`', () => {
      it('should not change the state and return it', async () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Type: 'Succeed'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});

        expect(
          await fakeStateMachine.runState({ sum: 7 }, 'Target')
        ).to.deep.equal(new RunStateResult({ sum: 7 }, 'Succeed', null, true));
      });
    });
    context('when the state has `"Type": "Fail"`', () => {
      it('should not change the state and return it', async () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Type: 'Fail'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});

        expect(
          await fakeStateMachine.runState({ sum: 7 }, 'Target')
        ).to.deep.equal(new RunStateResult({ sum: 7 }, 'Fail', null, true));
      });
    });
    context('when the state has `"Type": "Choice"`', () => {
      context('when Choices contains only one element', () => {
        const definitionWithChoices = (comparison) => {
          const choice = Object.assign({
            Variable: '$.condition',
            Next: 'NextState',
          }, comparison);
          return {
            States: {
              Choices: {
                Type: 'Choice',
                Choices: [choice],
                Default: 'DefaultState'
              }
            }
          };
        };
        context('with StringEquals', () => {
          const definition = definitionWithChoices({ StringEquals: 'abc' });
          it('should select the specified state as a next state', async () => {
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState({ condition: 'abc' }, 'Choices')
            ).to.deep.equal(
              new RunStateResult({ condition: 'abc' }, 'Choice', 'NextState', false)
            );
          });
        });
        context('with NumericEquals', () => {
          const definition = definitionWithChoices({ NumericEquals: 10 });
          it('should select the specified state as a next state', async () => {
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState({ condition: 10 }, 'Choices')
            ).to.deep.equal(
              new RunStateResult({ condition: 10 }, 'Choice', 'NextState', false)
            );
          });
        });
        context('with NumericLessThan', () => {
          const definition = definitionWithChoices({ NumericLessThan: 10 });
          it('should select the specified state as a next state', async () => {
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState({ condition: 9 }, 'Choices')
            ).to.deep.equal(
              new RunStateResult({ condition: 9 }, 'Choice', 'NextState', false)
            );
          });
        });
        context('with NumericGreaterThan', () => {
          const definition = definitionWithChoices({ NumericGreaterThan: 10 });
          it('should select the specified state as a next state', async () => {
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState({ condition: 11 }, 'Choices')
            ).to.deep.equal(
              new RunStateResult({ condition: 11 }, 'Choice', 'NextState', false)
            );
          });
        });
        context('with BooleanEquals', () => {
          const definition = definitionWithChoices({ BooleanEquals: true });
          context('when the first condition is not fullfilled', () => {
            it('should select a Default state as a next state', async () => {
              const fakeStateMachine = new FakeStateMachine(definition, {});
              expect(
                await fakeStateMachine.runState({
                  condition: false
                }, 'Choices')
              ).to.deep.equal(new RunStateResult({
                condition: false
              }, 'Choice', 'DefaultState', false));
            });
          });
          context('when the first condition is fullfilled', () => {
            it('should select the specified state as a next state', async () => {
              const fakeStateMachine = new FakeStateMachine(definition, {});
              expect(
                await fakeStateMachine.runState({
                  condition: true
                }, 'Choices')
              ).to.deep.equal(new RunStateResult({
                condition: true
              }, 'Choice', 'NextState', false));
            });
          });
        });
        context('with And', () => {
          it('pending');
        });
        context('with Or', () => {
          it('pending');
        });
        context('with Not', () => {
          it('pending');
        });
      });
      context('when Choices contains more than two element', () => {
        it('should select the expected state as a next state', async () => {
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
                Default: 'DefaultState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, {});
          expect(
            await fakeStateMachine.runState({
              condition1: false,
              condition2: true,
            }, 'Choices')
          ).to.deep.equal(new RunStateResult({
            condition1: false,
            condition2: true,
          }, 'Choice', 'NextState2', false));
        });
      });
    });

    context('when the state has `"Type": "Pass"`', () => {
      context('when there is an Input field', () => {
        it('should fill outputPath using Input field', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Input: 'a',
                ResultPath: '$.a2',
                Type: 'Pass',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, {});
          expect(
            await fakeStateMachine.runState({
              a1: 123
            }, 'Target')
          ).to.deep.equal(new RunStateResult({
            a1: 123,
            a2: 'a'
          }, 'Pass', 'NextState', false));
        });
      });
      context('when the state has an InputPath field', () => {
        context('when the InputPath is undefined', () => {
          it('should fill outputPath using the whole data (i.e. $)', async () => {
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState'
                }
              }
            };
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState({
                a1: 123
              }, 'Target')
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: { a1: 123 }
            }, 'Pass', 'NextState', false));
          });
        });
        context('when the state contains Result', () => {
          it('should fill the content of Result to ResultPath', async () => {
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  Result: 'a',
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState'
                }
              }
            };
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState({
                a1: 123
              }, 'Target')
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: 'a'
            }, 'Pass', 'NextState', false));
          });
        });
        context('when the InputPath is null', () => {
          it('should fill outputPath using {}', async () => {
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  InputPath: null,
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState'
                }
              }
            };
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState({
                a1: 123
              }, 'Target')
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: {}
            }, 'Pass', 'NextState', false));
          });
        });
        context('when the InputPath is non-null', () => {
          it('should fill outputPath using InputPath field', async () => {
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  InputPath: '$.a1',
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState'
                }
              }
            };
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              await fakeStateMachine.runState({
                a1: 123
              }, 'Target')
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: 123
            }, 'Pass', 'NextState', false));
          });
        });
      });
      context('when the InputPath points a path like $.a.b3.c2', () => {
        it('should parse the InputPath correctly', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.a.b2.c1',
                ResultPath: '$.a.b3.c2',
                Type: 'Pass',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, {});
          expect(
            await fakeStateMachine.runState({
              a: {
                b1: 'a-b1',
                b2: { c1: 'a-b2-c1' },
                b3: { c1: 'a-b3-c1' }
              }
            }, 'Target')
          ).to.deep.equal(new RunStateResult({
            a: {
              b1: 'a-b1',
              b2: { c1: 'a-b2-c1' },
              b3: { c1: 'a-b3-c1', c2: 'a-b2-c1' }
            }
          }, 'Pass', 'NextState', false));
        });
      });
    });

    context('when the state has `"Type": "Task"`', () => {
      const fakeResources = {
        'arn:aws:lambda:us-east-1:123456789012:function:Add': numbers => numbers.val1 + numbers.val2,
        'arn:aws:lambda:us-east-1:123456789012:function:AddAsync': async numbers => numbers.val1 + numbers.val2,
        'arn:aws:lambda:us-east-1:123456789012:function:Double': n => 2 * n,
        'arn:aws:lambda:us-east-1:123456789012:function:Identity': x => x,
      };
      context('when there is an InputPath field', () => {
        it('should pass the specified subset to the Resource', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.numbers',
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          expect(
            await fakeStateMachine.runState({
              numbers: { val1: 3, val2: 4 }
            }, 'Target')
          ).to.deep.equal(new RunStateResult({
            numbers: { val1: 3, val2: 4 },
            sum: 7
          }, 'Task', 'NextState', false));
        });
      });
      context('when the fakeResource is an async function', () => {
        it('should pass the specified subset to the Resource', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.numbers',
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:AddAsync',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          expect(
            await fakeStateMachine.runState({
              numbers: { val1: 3, val2: 4 }
            }, 'Target')
          ).to.deep.equal(new RunStateResult({
            numbers: { val1: 3, val2: 4 },
            sum: 7
          }, 'Task', 'NextState', false));
        });
      });
      context('when the InputPath points a path like $.a.b3.c2', () => {
        it('should pass the specified subset to the Resource', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.a.b3.c2',
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          expect(
            await fakeStateMachine.runState({
              a: {
                b3: {
                  c2: { val1: 3, val2: 4 }
                }
              }
            }, 'Target')
          ).to.deep.equal(new RunStateResult({
            a: {
              b3: {
                c2: { val1: 3, val2: 4 }
              }
            },
            sum: 7
          }, 'Task', 'NextState', false));
        });
      });
      context('when the Task state is called without InputPath', () => {
        it('should pass $ to the Resource', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          expect(
            await fakeStateMachine.runState({
              val1: 3,
              val2: 4,
            }, 'Target')
          ).to.deep.equal(new RunStateResult({
            val1: 3,
            val2: 4,
            sum: 7,
          }, 'Task', 'NextState', false));
        });
      });
      context('when the Task state is called with Input', () => {
        it('should pass the Input to the Resource', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Double',
                Input: 3,
                ResultPath: '$.result',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          expect(
            await fakeStateMachine.runState({}, 'Target')
          ).to.deep.equal(new RunStateResult({
            result: 6,
          }, 'Task', 'NextState', false));
        });
      });
      context('when the Task state does not contain ResultPath', () => {
        it('should use the default value ResultPath=`$`', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Identity',
                Parameters: {
                  a: 1,
                  b: 2,
                },
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          expect(
            await fakeStateMachine.runState({}, 'Target')
          ).to.deep.equal(new RunStateResult({
            a: 1,
            b: 2,
          }, 'Task', 'NextState', false));
        });
      });
      context('when the Task state contains an unknown fake resource', () => {
        it('should raise an error', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Unknown',
                ResultPath: '$.result',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          return expect(
            fakeStateMachine.runState({}, 'Target')
          ).to.rejectedWith(
            Error,
            'Unknown resource: arn:aws:lambda:us-east-1:123456789012:function:Unknown'
          );
        });
      });
      context('when the Task state contains a Parameters property', () => {
        it('should pass the specified parameters', async () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:saveInput',
                Parameters: {
                  input: {
                    val1: 3,
                    'val2.$': '$.b.c.val2',
                  }
                },
                ResultPath: '$.result',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          let input;
          const fakeStateMachine = new FakeStateMachine(definition, {
            'arn:aws:lambda:us-east-1:123456789012:function:saveInput': (event) => {
              input = event;
              return event.input.val1 + event.input.val2;
            }
          });
          const actual = await fakeStateMachine.runState({ a: 2, b: { c: { val2: 4 } } }, 'Target');
          expect(input).to.deep.equal({ input: { val1: 3, val2: 4 } });
          expect(actual.data).to.deep.equal({
            a: 2,
            b: {
              c: { val2: 4 }
            },
            result: 7,
          });
        });
      });
    });
    context('when the state has `"Type": "Wait"`', () => {
      it('pending');
    });
    context('when the state has `"Type": "Parallel"`', () => {
      it('pending');
    });
  });
});
