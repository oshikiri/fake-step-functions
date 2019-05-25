export class RunStateResult {
  data: object;
  stateType: string;
  nextStateName: string;
  isTerminalState: boolean;

  constructor(
    data: object,
    stateType: string,
    nextStateName: string,
    isTerminalState: boolean
  ) {
    RunStateResult.validateArguments(nextStateName, isTerminalState);

    this.data = data;
    this.stateType = stateType;
    this.nextStateName = nextStateName;
    this.isTerminalState = isTerminalState;
  }

  static validateArguments(nextStateName: string, isTerminalState: boolean) {
    if (!nextStateName && !isTerminalState) {
      throw new Error(
        'nextState must be non-null when the state is non-terminal state'
      );
    }
  }
}
