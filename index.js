'use strict';

const jsonpath = require('jsonpath');


// TODO: Use asl-validator
const validityStateMachineDefinition = (stateMachine) => {
  if (!stateMachine.States) throw new Error('States does not exist');
  const startAt = stateMachine.StartAt;
  if (!startAt) throw new Error('StartAt does not exist');
};

class FakeStepFunction {
  constructor(stateMachine, fakeResources) {
    validityStateMachineDefinition(stateMachine);
    this.stateMachine = stateMachine;
    this.fakeResources = fakeResources;
  }

  run(input) {
    const startAt = this.stateMachine.StartAt;
    if (!startAt) throw new Error('StartAt does not exist');
    return this.runState(startAt, input);
  }

  runState(stateName, data) {
    const state = this.stateMachine.States[stateName];
    const stateType = state.Type;
    const newData = data;

    switch (stateType) {
      case 'Task': {
        const resourceArn = state.Resource;
        const resource = this.fakeResources[resourceArn];
        const input = data[state.InputPath.split('.')[1]];
        newData[state.ResultPath.split('.')[1]] = resource(input);
        return newData;
      }
      case 'Pass': {
        const dataInputPath = state.InputPath ? jsonpath.value(data, state.InputPath) : null;
        const newValue = state.Input || dataInputPath; // TODO: priority?
        jsonpath.value(data, state.ResultPath, newValue);
        return data;
      }
      case 'Choice':
      case 'Wait':
      case 'Succeed':
      case 'Fail':
      case 'Parallel':
        return data;
      default:
        throw new Error(`Invalid Type: ${stateType}`);
    }
  }
}
exports.FakeStepFunction = FakeStepFunction;
