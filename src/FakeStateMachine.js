'use strict';

const jsonpath = require('jsonpath');
const RunStateResult = require('./RunStateResult').RunStateResult;

const clone = obj => JSON.parse(JSON.stringify(obj));

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
    return this.runPartial(input, startAt, null);
  }

  runPartial(data, current, end) {
    const result = this.runState(current, data);
    if (result.isTerminalState || current === end) return result;
    return this.runPartial(result.data, result.nextStateName, end);
  }

  runState(stateName, _data) {
    const state = this.definition.States[stateName];
    if (state === undefined) throw new Error(`the state ${stateName} does not exists`);

    const stateType = state.Type;
    const data = clone(_data);
    let nextState = state.Next || null;
    const dataInputPath = FakeStateMachine.inputData(state, data);

    switch (stateType) {
      case 'Task': {
        const resourceArn = state.Resource;
        const resource = this.fakeResources[resourceArn];
        jsonpath.value(data, state.ResultPath, clone(resource(dataInputPath)));
        break;
      }
      case 'Pass': {
        const newValue = state.Input || dataInputPath; // TODO: priority?
        jsonpath.value(data, state.ResultPath, clone(newValue));
        break;
      }
      case 'Succeed':
      case 'Fail':
        break;
      case 'Choice': {
        const choice0 = state.Choices[0];
        const input = jsonpath.value(data, choice0.Variable);
        if (
          (choice0.BooleanEquals && input === choice0.BooleanEquals)
          || (choice0.NumericEquals && input === choice0.NumericEquals)) {
          nextState = choice0.Next;
        } else {
          nextState = state.Default;
        }
        break;
      }
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

  static inputData(state, data) {
    if (state.Result !== undefined) return state.Result; // TODO: priority?

    switch (state.InputPath) {
      case undefined: {
        return clone(data);
      }
      case null: {
        return {};
      }
      default: {
        return jsonpath.value(data, state.InputPath);
      }
    }
  }
}
exports.FakeStateMachine = FakeStateMachine;
