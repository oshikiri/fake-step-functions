import * as jsonpath from 'jsonpath';
import { RunStateResult } from './RunStateResult';

export interface Definition {
  StartAt?: string;
  States: { [key: string]: State };
}

interface State {
  Type: string;
  Parameters?: Object;
  Input?: Object;
  InputPath?: string | null;
  Result?: Object;
  ResultPath?: string | null;
  Resource?: string;
  Choices?: TopLevelChoiceRule[];
  Default?: string;
  Next?: string;
  End?: boolean;
}

export interface TopLevelChoiceRule extends ChoiceRule {
  Next: string;
}

interface ChoiceRule extends Partial<BasicChoiceRule> {
  And?: ChoiceRule[];
  Or?: ChoiceRule[];
  Not?: ChoiceRule;
}

interface BasicChoiceRule {
  Variable: string;
  StringEquals?: string;
  NumericEquals?: number;
  NumericLessThan?: number;
  NumericGreaterThan?: number;
  NumericGreaterThanEquals?: number;
  NumericLessThanEquals?: number;
  BooleanEquals?: boolean;
  BooleanEqualsPath?: string;
  StringEqualsPath?: string;
  NumericEqualsPath?: string;
  NumericLessThanPath?: string;
  NumericGreaterThanPath?: string;
  NumericLessThanEqualsPath?: string;
  NumericGreaterThanEqualsPath?: string;
  IsPresent?: boolean;
  IsNull?: boolean;
  IsBoolean?: boolean;
  IsNumeric?: boolean;
  IsString?: boolean;
  IsTimestamp?: boolean;
  /* TODO: StringLessThan, StringLessThanPath, StringGreaterThan, StringGreaterThanPath,
    StringLessThanEquals, StringLessThanEqualsPath, StringGreaterThanEquals,
    StringGreaterThanEqualsPath, StringMatches, TimestampEquals, TimestampEqualsPath,
    TimestampLessThan, TimestampLessThanPath, TimestampGreaterThan, TimestampGreaterThanPath,
    TimestampLessThanEquals, TimestampLessThanEqualsPath, TimestampGreaterThanEquals,
    TimestampGreaterThanEqualsPath
  */
}

export type Resource = { [key: string]: (arg: any) => any };

const clone = (obj: object) => JSON.parse(JSON.stringify(obj)); // TODO
const isObject = (x: object) => typeof x === 'object' && x !== null;

export class FakeStateMachine {
  definition: Definition;
  fakeResources: Resource;

  constructor(definition: Definition, fakeResources: Resource) {
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

  async runPartial(
    data: object,
    current: string,
    end: string
  ): Promise<RunStateResult> {
    const result = await this.runState(data, current);
    if (result.isTerminalState || current === end) return result;
    return this.runPartial(result.data, result.nextStateName, end);
  }

  // experimental
  async runCondition(data: object, _condition: any): Promise<RunStateResult> {
    const condition = _condition;
    const result = await this.runState(data, condition.start);
    if (
      result.isTerminalState ||
      condition.start === condition.end ||
      !result.nextStateName.match(condition.regex)
    )
      return result;
    condition.start = result.nextStateName;
    return this.runCondition(result.data, condition);
  }

  async runState(_data: object, stateName: string): Promise<RunStateResult> {
    const data = clone(_data);
    const state = this.definition.States[stateName.toString()];
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
        const newValue = await FakeStateMachine.runStateTask(
          state,
          data,
          resource
        );
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
    const isTermialState =
      state.End === true || stateType === 'Succeed' || stateType === 'Fail';

    return new RunStateResult(data, stateType, nextState, isTermialState);
  }

  static async runStateTask(
    state: State,
    data: object,
    resource: (arg: any) => any
  ): Promise<object> {
    const dataInputPath: any = FakeStateMachine.inputData(state, data);
    const result = await resource(dataInputPath);
    if (result === undefined) return undefined;
    return clone(result);
  }

  static runStatePass(state: State, data: object): object {
    const dataInputPath = FakeStateMachine.inputData(state, data);
    return clone(state.Input || dataInputPath); // TODO: priority?
  }

  static runStateChoice(state: State, data: any): string {
    const matched = state.Choices.find((choice) => {
      return FakeStateMachine.isRightChoice(choice, data);
    });

    if (matched !== undefined) return matched.Next;
    return state.Default;
  }

  static isRightChoice(choice: ChoiceRule, data: any): boolean {
    if (choice.Not) {
      return !FakeStateMachine.isRightChoice(choice.Not, data);
    }

    if (choice.Or) {
      return choice.Or.some((subChoice: any) =>
        FakeStateMachine.isRightChoice(subChoice, data)
      );
    }

    if (choice.And) {
      return choice.And.every((subChoice: any) =>
        FakeStateMachine.isRightChoice(subChoice, data)
      );
    }

    return FakeStateMachine.compareChoice(choice as BasicChoiceRule, data);
  }

  static compareChoice(choice: BasicChoiceRule, data: any) {
    const input = jsonpath.value(data, choice.Variable);

    return (
      (choice.StringEquals && input === choice.StringEquals) ||
      (choice.NumericEquals && input === choice.NumericEquals) ||
      (choice.NumericLessThan && input < choice.NumericLessThan) ||
      (choice.NumericGreaterThan && input > choice.NumericGreaterThan) ||
      (choice.NumericLessThanEquals && input <= choice.NumericLessThanEquals) ||
      (choice.NumericGreaterThanEquals &&
        input >= choice.NumericGreaterThanEquals) ||
      (choice.BooleanEquals && input === choice.BooleanEquals) ||
      (choice.BooleanEqualsPath &&
        input === jsonpath.value(data, choice.BooleanEqualsPath)) ||
      (choice.StringEqualsPath &&
        input === jsonpath.value(data, choice.StringEqualsPath)) ||
      (choice.NumericEqualsPath &&
        input === jsonpath.value(data, choice.NumericEqualsPath)) ||
      (choice.NumericLessThanPath &&
        input < jsonpath.value(data, choice.NumericLessThanPath)) ||
      (choice.NumericGreaterThanPath &&
        input > jsonpath.value(data, choice.NumericGreaterThanPath)) ||
      (choice.NumericLessThanEqualsPath &&
        input <= jsonpath.value(data, choice.NumericLessThanEqualsPath)) ||
      (choice.NumericGreaterThanEqualsPath &&
        input >= jsonpath.value(data, choice.NumericGreaterThanEqualsPath)) ||
      (choice.IsPresent && input !== undefined) ||
      (choice.IsNull && input === null) ||
      (choice.IsBoolean && typeof input === 'boolean') ||
      (choice.IsNumeric && typeof input === 'number') ||
      (choice.IsString && typeof input === 'string') ||
      (choice.IsTimestamp &&
        typeof input === 'string' &&
        FakeStateMachine.isTimestamp(input))
    );
  }

  static isTimestamp(value: string) {
    const date = new Date(value);

    return !isNaN(date.getTime()) && date.toISOString() === value;
  }

  static inputData(state: State, data: object): object {
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
    const resolvedParameters: any = Array.isArray(rawParameters) ? [] : {};

    for (let key of Object.keys(rawParameters)) {
      const rawValue = rawParameters[key];
      if (key.endsWith('.$')) {
        key = key.slice(0, -2);
        resolvedParameters[key] = jsonpath.value(data, rawValue);
      } else if (isObject(rawValue) || Array.isArray(rawValue)) {
        resolvedParameters[key] = this.resolveParameters(rawValue, data);
      } else {
        resolvedParameters[key] = rawValue;
      }
    }
    return resolvedParameters;
  }
}
