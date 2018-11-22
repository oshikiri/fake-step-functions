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
    const data = clone(_data);
    const state = this.definition.States[stateName];
    if (state === undefined) {
      throw new Error(`the state ${stateName} does not exists`);
    }
    const stateType = state.Type;
    let nextState = state.Next || null;

    switch (stateType) {
      case 'Task': {
        const resource = this.fakeResources[state.Resource];
        const newValue = FakeStateMachine.runStateTask(state, data, resource);
        jsonpath.value(data, state.ResultPath, newValue);
        break;
      }
      case 'Pass': {
        const newValue = FakeStateMachine.runStatePass(state, data);
        jsonpath.value(data, state.ResultPath, newValue);
        break;
      }
      case 'Succeed':
      case 'Fail':
        break;
      case 'Choice': {
        nextState = FakeStateMachine.runStateChoice(state, data);
        break;
      }
      case 'Wait':
      case 'Parallel':
        break;
      default:
        throw new Error(`Invalid Type: ${stateType}`);
    }
    const isTermialState = state.End === true || stateType === 'Succeed' || stateType === 'Fail';

    return new RunStateResult(data, stateType, nextState, isTermialState);
  }

  static runStateTask(state, data, resource) {
    const dataInputPath = FakeStateMachine.inputData(state, data);
    return clone(resource(dataInputPath));
  }

  static runStatePass(state, data) {
    const dataInputPath = FakeStateMachine.inputData(state, data);
    return clone(state.Input || dataInputPath); // TODO: priority?
  }

  static runStateChoice(state, data) {
    const matched = state.Choices.find((choice) => {
      const input = jsonpath.value(data, choice.Variable);
      return (choice.BooleanEquals && input === choice.BooleanEquals)
        || (choice.NumericEquals && input === choice.NumericEquals);
    });

    if (matched !== undefined) return matched.Next;
    return state.Default;
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
