'use strict';

class RunStateResult {
  data: any;
  stateType: String;
  nextStateName: String;
  isTerminalState: Boolean;

  constructor(data, stateType, nextStateName, isTerminalState) {
    RunStateResult.validateArguments(nextStateName, isTerminalState);

    this.data = data;
    this.stateType = stateType;
    this.nextStateName = nextStateName;
    this.isTerminalState = isTerminalState;
  }

  static validateArguments(nextStateName, isTerminalState) {
    if (!nextStateName && !isTerminalState) {
      throw new Error('nextState must be non-null when the state is non-terminal state');
    }
  }
}
exports.RunStateResult = RunStateResult;
