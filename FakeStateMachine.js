'use strict';

const jsonpath = require('jsonpath');
const RunStateResult = require('./RunStateResult').RunStateResult;

class FakeStateMachine {
  constructor(definition, fakeResources) {
    this.definition = definition;
    this.fakeResources = fakeResources;
  }

  run(input) {
    const startAt = this.definition.StartAt;
    if (startAt === undefined) {
      throw new Error('StartAt does not exist');
    }
    return this.runState(startAt, input);
  }

  runState(stateName, _data) {
    const state = this.definition.States[stateName];
    if (state === undefined) throw new Error(`the state ${stateName} does not exists`);

    const stateType = state.Type;
    const data = Object.assign({}, _data);
    const nextState = state.Next || null;

    switch (stateType) {
      case 'Task': {
        const resourceArn = state.Resource;
        const resource = this.fakeResources[resourceArn];
        const input = jsonpath.value(data, state.InputPath);
        jsonpath.value(data, state.ResultPath, resource(input));
        break;
      }
      case 'Pass': {
        let dataInputPath;
        switch (state.InputPath) {
          case undefined: {
            dataInputPath = null;
            break;
          }
          case null: {
            dataInputPath = {};
            break;
          }
          default: {
            dataInputPath = jsonpath.value(data, state.InputPath);
          }
        }
        const newValue = state.Input || dataInputPath; // TODO: priority?
        jsonpath.value(data, state.ResultPath, newValue);
        break;
      }
      case 'Succeed':
      case 'Fail':
        break;
      case 'Choice':
      case 'Wait':
      case 'Parallel':
        break;
      default:
        throw new Error(`Invalid Type: ${stateType}`);
    }
    const isTermialState = state.End === true || stateType === 'Succeed' || stateType === 'Fail';
    const runStateResult = new RunStateResult(data, stateType, nextState, isTermialState);
    return runStateResult;
  }
}
exports.FakeStateMachine = FakeStateMachine;
