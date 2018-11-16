const expect = require('chai').expect;
const FakeStepFunction = require('../index').FakeStepFunction;

describe('FakeStepFunction', () => {
  describe('#run()', () => {
    context('StartAt does not exist', () => {
      it('should throw an Error', () => {
        const stateMachine = {
          States: {
            Done: {
              Type: "Succeed"
            }
          }
        };
        
        const fakeStepFunction = new FakeStepFunction(stateMachine, {});
        expect(() => fakeStepFunction.run({}))
          .to.throw(Error, 'StartAt does not exist');
      });
    });

    context('a minimal example with Type: Fail', () => {
      it('should throw an Error');
    });

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
      const input = {
        title: "Numbers to add",
        numbers: { val1: 3, val2: 4 }
      };
      const fakeResources = {
        'arn:aws:lambda:us-east-1:123456789012:function:Add': (numbers) => {
          return numbers.val1 + numbers.val2;
        },
      };

      const fakeStepFunction = new FakeStepFunction(stateMachine, fakeResources);
      const result = fakeStepFunction.run(input);

      expect(result).to.deep.equal({
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

  describe('#runStep', () => {
    context('when the step contains "End = true"', () => {
      it('returns the state with results and "End" flag');
    });
    context('when the step contains "Next" field', () => {
      it('returns the state with results and "Next" destination');
    });
    context('when the step has `"Type": "Succeed"`', () => {
      it('does not change the state and returns it', () => {
        const stateMachine = {
          "States": {
            "Done": {
              "Type": "Succeed"
            }
          }
        };
        const fakeStepFunction = new FakeStepFunction(stateMachine, {});
        const result = fakeStepFunction.runStep('Done', { sum: 7 });
  
        expect(result).to.deep.equal({ sum: 7 });
      });
    });
    context('when the InputPath points a path like $.a.b', () => {
      it('should parse the InputPath correctly');
    });
  });
});
