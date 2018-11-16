'use strict'

const VALID_TYPE = ['Succeed', 'Failed']

class FakeStepFunction {
  constructor(stateMachine, fakeResources) {
    this.stateMachine = stateMachine;
    this.fakeResources = fakeResources;
  };

  run(input) {
    const startAt = this.stateMachine.StartAt;
    if (!startAt) throw new Error(`StartAt does not exist`)
    return this.runStep(startAt, input);
  };

  runStep(stepName, state) {
    const step = this.stateMachine.States[stepName];
    const stepType = step.Type;

    // console.log(step)

    switch(stepType) {
      case 'Succeed':
        return state;
      case 'Task':
        const resourceArn = step.Resource;
        const resource = this.fakeResources[resourceArn];
        const input = state[step.InputPath.split('.')[1]];
        state[step.ResultPath.split('.')[1]] = resource(input);
        return state;
      default:
        throw new Error(`Invalid Type: ${step.Type}`);
    }
  }
};

exports.FakeStepFunction = FakeStepFunction;
