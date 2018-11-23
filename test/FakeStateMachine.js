/* eslint-env mocha */

'use strict';

const expect = require('chai').expect;
const FakeStateMachine = require('../src/FakeStateMachine').FakeStateMachine;
const RunStateResult = require('../src/RunStateResult').RunStateResult;

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
        expect(() => fakeStateMachine.run({}))
          .to.throw(Error, 'StartAt does not exist');
      });
    });

    it('should pass the input to fakeResource and fill the result to ResultPath', () => {
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

      expect(fakeStateMachine.run({
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

        expect(() => fakeStateMachine.run({}))
          .to.throw(Error, 'Invalid Type: UnknownType');
      });
    });
    context('when the state machine has two states', () => {
      it('should return the result successfully', () => {
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

        expect(fakeStateMachine.run({
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
      it('should return the result successfully', () => {
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
        expect(fakeStateMachine.run({
          i: 0
        })).to.deep.equal(new RunStateResult({
          i: 3
        }, 'Succeed', null, true));
      });
    });

    context('when the state updates a copied field', () => {
      it('should not affect the original field', () => {
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
        expect(fakeStateMachine.run({
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
    it('should execute states between the start state and the end state', () => {
      expect(
        fakeStateMachine.runPartial({ title: 'run-partial' }, 'Pass1', 'Pass2')
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
        expect(() => fakeStateMachine.runState('Target', {
          a1: 123
        })).to.throw(Error, 'the state Target does not exists');
      });
    });
    context('when the state has `"End": true`', () => {
      it('should be marked as a terminal state', () => {
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
        expect(
          fakeStateMachine.runState('Target', {
            a1: 123
          }).isTerminalState
        ).to.be.true;
      });
    });

    context('when the state contains "Next" field', () => {
      it('should return the state with results and "Next" destination', () => {
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
          fakeStateMachine.runState('Target', {
            a1: 123
          }).nextStateName
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
        expect(() => fakeStateMachine.runState('Target', {
          a1: 123
        })).to.throw(Error, 'nextState must be non-null when the state is non-terminal state');
      });
    });

    context('when the state has `"Type": "Succeed"`', () => {
      it('should not change the state and return it', () => {
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
          fakeStateMachine.runState('Target', { sum: 7 })
        ).to.deep.equal(new RunStateResult({ sum: 7 }, 'Succeed', null, true));
      });
    });
    context('when the state has `"Type": "Fail"`', () => {
      it('should not change the state and return it', () => {
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
          fakeStateMachine.runState('Target', { sum: 7 })
        ).to.deep.equal(new RunStateResult({ sum: 7 }, 'Fail', null, true));
      });
    });
    context('when the state has `"Type": "Choice"`', () => {
      context('when Choices contains only one element', () => {
        context('when Choices contain BooleanEquals conditions', () => {
          const definition = {
            States: {
              Choices: {
                Type: 'Choice',
                Choices: [
                  {
                    Variable: '$.condition',
                    BooleanEquals: true,
                    Next: 'NextState',
                  }
                ],
                Default: 'DefaultState'
              }
            }
          };
          context('when the first condition is not fullfilled', () => {
            it('should select a Default state as a next state', () => {
              const fakeStateMachine = new FakeStateMachine(definition, {});
              expect(
                fakeStateMachine.runState('Choices', {
                  condition: false
                })
              ).to.deep.equal(new RunStateResult({
                condition: false
              }, 'Choice', 'DefaultState', false));
            });
          });
          context('when the first condition is fullfilled', () => {
            it('should select the specified state as a next state', () => {
              const fakeStateMachine = new FakeStateMachine(definition, {});
              expect(
                fakeStateMachine.runState('Choices', {
                  condition: true
                })
              ).to.deep.equal(new RunStateResult({
                condition: true
              }, 'Choice', 'NextState', false));
            });
          });
        });
        context('when Choices contain StringEquals conditions', () => {
          const definition = {
            States: {
              Choices: {
                Type: 'Choice',
                Choices: [
                  {
                    Variable: '$.condition',
                    StringEquals: 'abc',
                    Next: 'NextState',
                  }
                ],
                Default: 'DefaultState'
              }
            }
          };
          it('should select the specified state as a next state', () => {
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              fakeStateMachine.runState('Choices', {
                condition: 'abc'
              })
            ).to.deep.equal(new RunStateResult({
              condition: 'abc'
            }, 'Choice', 'NextState', false));
          });
        });
      });
      context('when Choices contains more than two element', () => {
        it('should select the expected state as a next state', () => {
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
            fakeStateMachine.runState('Choices', {
              condition1: false,
              condition2: true,
            })
          ).to.deep.equal(new RunStateResult({
            condition1: false,
            condition2: true,
          }, 'Choice', 'NextState2', false));
        });
      });
    });

    context('when the state has `"Type": "Pass"`', () => {
      context('when there is an Input field', () => {
        it('should fill outputPath using Input field', () => {
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
            fakeStateMachine.runState('Target', {
              a1: 123
            })
          ).to.deep.equal(new RunStateResult({
            a1: 123,
            a2: 'a'
          }, 'Pass', 'NextState', false));
        });
      });
      context('when the state has an InputPath field', () => {
        context('when the InputPath is undefined', () => {
          it('should fill outputPath using the whole data (i.e. $)', () => {
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
              fakeStateMachine.runState('Target', {
                a1: 123
              })
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: { a1: 123 }
            }, 'Pass', 'NextState', false));
          });
        });
        context('when the state contains Result', () => {
          it('should fill the content of Result to ResultPath', () => {
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
              fakeStateMachine.runState('Target', {
                a1: 123
              })
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: 'a'
            }, 'Pass', 'NextState', false));
          });
        });
        context('when the InputPath is null', () => {
          it('should fill outputPath using {}', () => {
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
              fakeStateMachine.runState('Target', {
                a1: 123
              })
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: {}
            }, 'Pass', 'NextState', false));
          });
        });
        context('when the InputPath is non-null', () => {
          it('should fill outputPath using InputPath field', () => {
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
              fakeStateMachine.runState('Target', {
                a1: 123
              })
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: 123
            }, 'Pass', 'NextState', false));
          });
        });
      });
      context('when the InputPath points a path like $.a.b3.c2', () => {
        it('should parse the InputPath correctly', () => {
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
            fakeStateMachine.runState('Target', {
              a: {
                b1: 'a-b1',
                b2: { c1: 'a-b2-c1' },
                b3: { c1: 'a-b3-c1' }
              }
            })
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
        'arn:aws:lambda:us-east-1:123456789012:function:Double': n => 2 * n,
      };
      context('when there is an InputPath field', () => {
        it('should pass the specified subset to the Resource', () => {
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
            fakeStateMachine.runState('Target', {
              numbers: { val1: 3, val2: 4 }
            })
          ).to.deep.equal(new RunStateResult({
            numbers: { val1: 3, val2: 4 },
            sum: 7
          }, 'Task', 'NextState', false));
        });
      });
      context('when the InputPath points a path like $.a.b3.c2', () => {
        it('should pass the specified subset to the Resource', () => {
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
            fakeStateMachine.runState('Target', {
              a: {
                b3: {
                  c2: { val1: 3, val2: 4 }
                }
              }
            })
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
        it('should pass $ to the Resource', () => {
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
            fakeStateMachine.runState('Target', {
              val1: 3,
              val2: 4,
            })
          ).to.deep.equal(new RunStateResult({
            val1: 3,
            val2: 4,
            sum: 7,
          }, 'Task', 'NextState', false));
        });
      });
      context('when the Task state is called with Input', () => {
        it('should pass the Input to the Resource', () => {
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
            fakeStateMachine.runState('Target', {})
          ).to.deep.equal(new RunStateResult({
            result: 6,
          }, 'Task', 'NextState', false));
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
