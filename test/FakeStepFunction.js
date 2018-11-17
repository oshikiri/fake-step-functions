const expect = require('chai').expect;
const FakeStepFunction = require('../index').FakeStepFunction;

describe('FakeStepFunction', () => {
  describe('#constructor()', () => {
    context('when the state definition does not contain States', () => {
      it('should throw Error', () => {
        const stateMachine = {
          StartAt: 'Start'
        };
        expect(() => new FakeStepFunction(stateMachine, {}))
          .to.throw(Error, 'States does not exist');
      });
    });
    context('when StartAt field does not exist', () => {
      it('should throw an Error', () => {
        const stateMachine = {
          States: {
            Done: {
              Type: "Succeed"
            }
          }
        };
        expect(() => new FakeStepFunction(stateMachine, {}))
          .to.throw(Error, 'StartAt does not exist');
      });
    });

    context('when the specified StartAt field does not exist', () => {
      it('should throw an Error')
    });

    context('when there is a state which have no "Type" field', () => {
      it('should throw an Error')
    });
  });
  
  describe('#run()', () => {
    it('should pass the input to fakeResource and fill the result to ResultPath', () => {
      const stateMachine = {
        StartAt: "Add",
        States: {	
          Add: {
            Type: "Task",
            Resource: "arn:aws:lambda:us-east-1:123456789012:function:Add",
            InputPath: "$.numbers",
            ResultPath: "$.sum",
            End: true
          }
        }
      };
      const fakeResources = {
        'arn:aws:lambda:us-east-1:123456789012:function:Add': (numbers) => {
          return numbers.val1 + numbers.val2;
        },
      };
      const fakeStepFunction = new FakeStepFunction(stateMachine, fakeResources);

      expect(fakeStepFunction.run({
        title: "Numbers to add",
        numbers: { val1: 3, val2: 4 }
      })).to.deep.equal({
        title: "Numbers to add",
        numbers: { val1: 3, val2: 4 },
        sum: 7
      });
    });

    context('If there is invalid Type String', () => {
      it('throws an Error', () => {
        const stateMachine = {
          StartAt: "Done",
          States: {
            Done: {
              Type: "UnknownType"
            }
          }
        };
        const fakeStepFunction = new FakeStepFunction(stateMachine, {});

        expect(() => fakeStepFunction.run({}))
          .to.throw(Error, 'Invalid Type: UnknownType');
      });
    });
    context('when the state machine calls the same task twice', () => {
      it('should returns the result successfully');
    });

    context('state machine contains a loop with break', () => {
      it('should return the result successfully');
    });
  });

  describe('#runState()', () => {
    context('when the state contains "End = true"', () => {
      it('returns the state with results and "End" flag');
    });

    context('when the state contains "Next" field', () => {
      it('returns the state with results and "Next" destination');
    });

    context('when the state has `"Type": "Succeed"`', () => {
      it('does not change the state and returns it', () => {
        const stateMachine = {
          StartAt: 'Start',
          States: {
            "Target": {
              "Type": "Succeed"
            }
          }
        };
        const fakeStepFunction = new FakeStepFunction(stateMachine, {});
  
        expect(
          fakeStepFunction.runState('Target', { sum: 7 })
        ).to.deep.equal({ sum: 7 });
      });
    });
    context('when the state has `"Type": "Fail"`', () => {
      it('does not change the state and returns it', () => {
        const stateMachine = {
          StartAt: 'Start',
          "States": {
            "Target": {
              "Type": "Fail"
            }
          }
        };
        const fakeStepFunction = new FakeStepFunction(stateMachine, {});
  
        expect(
          fakeStepFunction.runState('Target', { sum: 7 })
        ).to.deep.equal({ sum: 7 });
      });
    });
    context('when the state has `"Type": "Choice"`', () => {
      it('should select expected state as a next state');
    });

    context('when the state has `"Type": "Pass"`', () => {
      context('when there is an Input field', () => {
        it('should fill outputPath using Input field', () => {
          const stateMachine = {
            StartAt: 'Start',
            "States": {
              "Target": {
                Input: 'a',
                ResultPath: '$.a2',
                Type: 'Pass'
              }
            }
          };
          const fakeStepFunction = new FakeStepFunction(stateMachine, {});
          expect(
            fakeStepFunction.runState('Target', {
              a1: 123
            })
          ).to.deep.equal({
            a1: 123,
            a2: 'a'
          });
        });
      });
      context('when there is an InputPath field', () => {
        it('should fill outputPath using InputPath field', () => {
          const stateMachine = {
            StartAt: 'Start',
            "States": {
              "Target": {
                InputPath: '$.a1',
                ResultPath: '$.a2',
                Type: 'Pass'
              }
            }
          };
          const fakeStepFunction = new FakeStepFunction(stateMachine, {});
          expect(
            fakeStepFunction.runState('Target', {
              a1: 123
            })
          ).to.deep.equal({
            a1: 123,
            a2: 123
          });
        });
      });
      context('when the InputPath points a path like $.a.b3.c2', () => {
        it('should parse the InputPath correctly', () => {
          const stateMachine = {
            StartAt: 'Start',
            "States": {
              "Target": {
                InputPath: '$.a.b2.c1',
                ResultPath: '$.a.b3.c2',
                Type: 'Pass'
              }
            }
          };
          const fakeStepFunction = new FakeStepFunction(stateMachine, {});
          expect(
            fakeStepFunction.runState('Target', {
              a: {
                b1: 'a-b1',
                b2: { c1: 'a-b2-c1' },
                b3: { c1: 'a-b3-c1' }
              }
            })
          ).to.deep.equal({
            a: {
              b1: 'a-b1',
              b2: { c1: 'a-b2-c1' },
              b3: { c1: 'a-b3-c1', c2: 'a-b2-c1' }
            }
          });
        });
      });
    });

    context('when the Task state is called without InputPath', () => {
      it('should pass $ to the Resource')
    })

    context('when the state has `"End": true`', () => {
      it('should turn on the end flag');
    });

    context('when the state, that is non-terminal state, does not contain "Next" field', () => {
      it('should throw an error');
    })
  });
});
