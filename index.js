'use strict'

const VALID_STATE_TYPE = [
  'Pass', 'Task', 'Choice', 'Wait',
  'Succeed', 'Fail', 'Parallel'
];

// TODO: Use asl-validator
const validityStateMachineDefinition = (stateMachine) => {
  if (!stateMachine.States) throw new Error('States does not exist')
  const startAt = stateMachine.StartAt;
  if (!startAt) throw new Error('StartAt does not exist');
}

class FakeStepFunction {
  constructor(stateMachine, fakeResources) {
    validityStateMachineDefinition(stateMachine)
    this.stateMachine = stateMachine;
    this.fakeResources = fakeResources;
  };

  run(input) {
    const startAt = this.stateMachine.StartAt;
    if (!startAt) throw new Error(`StartAt does not exist`)
    return this.runState(startAt, input);
  };

  runState(stateName, data) {
    const state = this.stateMachine.States[stateName];
    const stateType = state.Type;

    switch(stateType) {
      case 'Task':
        const resourceArn = state.Resource;
        const resource = this.fakeResources[resourceArn];
        const input = data[state.InputPath.split('.')[1]];
        data[state.ResultPath.split('.')[1]] = resource(input);
        return data;
      case 'Pass':
      case 'Choice':
      case 'Wait':
      case 'Succeed':
      case 'Fail':
      case 'Parallel':
        return data;
      default:
        throw new Error(`Invalid Type: ${state.Type}`);
    }
  }
};
exports.FakeStepFunction = FakeStepFunction;
