'use strict';

import * as jsonpath  from 'jsonpath';
import { RunStateResult } from './RunStateResult';

const clone = (obj: object) => JSON.parse(JSON.stringify(obj)); // TODO
const isObject = (x: object) => typeof x === 'object' && x !== null;

export class FakeStateMachine {
  definition: any;
  fakeResources: any;

  constructor(definition: object, fakeResources: object) {
    this.definition = definition;
    this.fakeResources = fakeResources;
  }

  async run(input: object): Promise<RunStateResult> {
    const startAt = this.definition.StartAt;
    if (startAt === undefined) {
      throw new Error('StartAt does not exist');
    }
    return this.runPartial(input, startAt, null);
  }

  async runPartial(data: object, current: string, end: string): Promise<RunStateResult> {
    const result = await this.runState(data, current);
    if (result.isTerminalState || current === end) return result;
    return this.runPartial(result.data, result.nextStateName, end);
  }

  // experimental
  async runCondition(data: object, _condition: any): Promise<RunStateResult> {
    const condition = _condition;
    const result = await this.runState(data, condition.start);
    if (
      result.isTerminalState
      || condition.start === condition.end
      || !result.nextStateName.match(condition.regex)
    ) return result;
    condition.start = result.nextStateName;
    return this.runCondition(result.data, condition);
  }

  async runState(_data: object, stateName: string): Promise<RunStateResult> {
    const data = clone(_data);
    const state = this.definition.States[stateName];
    if (state === undefined) {
      throw new Error(`the state ${stateName} does not exists`);
    }
    const stateType = state.Type;
    let nextState = state.Next || null;

    switch (stateType) {
      case 'Task': {
        if (!(state.Resource in this.fakeResources)) {
          throw new Error(`Unknown resource: ${state.Resource}`);
        }
        const resource = this.fakeResources[state.Resource];
        const newValue = await FakeStateMachine.runStateTask(state, data, resource);
        if (state.ResultPath === undefined) {
          Object.assign(data, newValue);
        } else {
          jsonpath.value(data, state.ResultPath, newValue);
        }
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

  static async runStateTask(state: object, data: object, resource: any): Promise<object> {
    const dataInputPath = FakeStateMachine.inputData(state, data);
    const result = await resource(dataInputPath);
    if (result === undefined) return undefined;
    return clone(result);
  }

  static runStatePass(state: any, data: object): object {
    const dataInputPath = FakeStateMachine.inputData(state, data);
    return clone(state.Input || dataInputPath); // TODO: priority?
  }

  static runStateChoice(state: any, data: object): string {
    const matched = state.Choices.find((choice: any) => {
      const input = jsonpath.value(data, choice.Variable);
      return (
        (choice.StringEquals && input === choice.StringEquals)
        || (choice.NumericEquals && input === choice.NumericEquals)
        || (choice.NumericLessThan && input < choice.NumericLessThan)
        || (choice.NumericGreaterThan && input > choice.NumericGreaterThan)
        || (choice.NumericLessThanEquals && input <= choice.NumericLessThanEquals)
        || (choice.NumericGreaterThanEquals && input >= choice.NumericGreaterThanEquals)
        || (choice.BooleanEquals && input === choice.BooleanEquals)
      );
    });

    if (matched !== undefined) return matched.Next;
    return state.Default;
  }

  static inputData(state: any, data: object): object {
    if (state.Type === 'Pass') {
      if (state.Result !== undefined) return state.Result; // TODO: priority?
    } else if (state.Type === 'Task') {
      if (state.Input !== undefined) return state.Input;
    }

    if (state.Parameters !== undefined) {
      const rawParameters = state.Parameters;
      return FakeStateMachine.resolveParameters(rawParameters, data);
    }

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

  static resolveParameters(rawParameters: any, data: object): object {
    const resolvedParameters: any = {};
    for (let key of Object.keys(rawParameters)) {
      const rawValue = rawParameters[key];
      if (key.endsWith('.$')) {
        key = key.slice(0, -2);
        resolvedParameters[key] = jsonpath.value(data, rawValue);
      } else if (isObject(rawValue)) {
        resolvedParameters[key] = this.resolveParameters(rawValue, data);
      } else {
        resolvedParameters[key] = rawValue;
      }
    }
    return resolvedParameters;
  }
}
