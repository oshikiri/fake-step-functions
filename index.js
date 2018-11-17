'use strict';

const jsonpath = require('jsonpath');


class FakeStateMachine {
  constructor(definition, fakeResources) {
    this.definition = definition;
    this.fakeResources = fakeResources;
  }

  run(input) {
    const startAt = this.definition.StartAt
    if (startAt === undefined) {
      throw new Error('StartAt does not exist');
    }
    return this.runState(startAt, input);
  }

  runState(stateName, data) {
    const state = this.definition.States[stateName];
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
exports.FakeStateMachine = FakeStateMachine;
