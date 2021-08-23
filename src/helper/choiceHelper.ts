import * as jsonpath from 'jsonpath';

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
  BooleanEquals?: boolean;
  BooleanEqualsPath?: string;
  NumericEquals?: number;
  NumericLessThan?: number;
  NumericGreaterThan?: number;
  NumericGreaterThanEquals?: number;
  NumericLessThanEquals?: number;
  NumericEqualsPath?: string;
  NumericLessThanPath?: string;
  NumericGreaterThanPath?: string;
  NumericLessThanEqualsPath?: string;
  NumericGreaterThanEqualsPath?: string;
  StringMatches?: string;
  StringEquals?: string;
  StringLessThan?: string;
  StringGreaterThan?: string;
  StringLessThanEquals?: string;
  StringGreaterThanEquals?: string;
  StringEqualsPath?: string;
  StringLessThanPath?: string;
  StringGreaterThanPath?: string;
  StringLessThanEqualsPath?: string;
  StringGreaterThanEqualsPath?: string;
  TimestampEquals?: string;
  TimestampLessThan?: string;
  TimestampGreaterThan?: string;
  TimestampLessThanEquals?: string;
  TimestampGreaterThanEquals?: string;
  TimestampEqualsPath?: string;
  TimestampLessThanPath?: string;
  TimestampGreaterThanPath?: string;
  TimestampLessThanEqualsPath?: string;
  TimestampGreaterThanEqualsPath?: string;
  IsPresent?: boolean;
  IsNull?: boolean;
  IsBoolean?: boolean;
  IsNumeric?: boolean;
  IsString?: boolean;
  IsTimestamp?: boolean;
}

export const isRightChoice = (choice: ChoiceRule, data: any): boolean => {
  if (choice.Not) {
    return !isRightChoice(choice.Not, data);
  }

  if (choice.Or) {
    return choice.Or.some((subChoice: any) => isRightChoice(subChoice, data));
  }

  if (choice.And) {
    return choice.And.every((subChoice: any) => isRightChoice(subChoice, data));
  }

  return compareChoice(choice as BasicChoiceRule, data);
};

const compareChoice = (choice: BasicChoiceRule, data: any): boolean => {
  const input = jsonpath.value(data, choice.Variable);

  if (choice.BooleanEquals !== undefined) {
    return (
      typeof input === 'boolean' &&
      typeof choice.BooleanEquals === 'boolean' &&
      input === choice.BooleanEquals
    );
  }

  if (choice.BooleanEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.BooleanEqualsPath);

    return (
      typeof input === 'boolean' &&
      typeof compareTo === 'boolean' &&
      input === compareTo
    );
  }

  if (choice.NumericEquals !== undefined) {
    return (
      typeof input === 'number' &&
      typeof choice.NumericEquals === 'number' &&
      input === choice.NumericEquals
    );
  }

  if (choice.NumericLessThan !== undefined) {
    return (
      typeof input === 'number' &&
      typeof choice.NumericLessThan === 'number' &&
      input < choice.NumericLessThan
    );
  }

  if (choice.NumericGreaterThan !== undefined) {
    return (
      typeof input === 'number' &&
      typeof choice.NumericGreaterThan === 'number' &&
      input > choice.NumericGreaterThan
    );
  }

  if (choice.NumericLessThanEquals !== undefined) {
    return (
      typeof input === 'number' &&
      typeof choice.NumericLessThanEquals === 'number' &&
      input <= choice.NumericLessThanEquals
    );
  }

  if (choice.NumericGreaterThanEquals !== undefined) {
    return (
      typeof input === 'number' &&
      typeof choice.NumericGreaterThanEquals === 'number' &&
      input >= choice.NumericGreaterThanEquals
    );
  }

  if (choice.NumericEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.NumericEqualsPath);
    return (
      typeof input === 'number' &&
      typeof compareTo === 'number' &&
      input === compareTo
    );
  }

  if (choice.NumericLessThanPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.NumericLessThanPath);
    return (
      typeof input === 'number' &&
      typeof compareTo === 'number' &&
      input < compareTo
    );
  }

  if (choice.NumericGreaterThanPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.NumericGreaterThanPath);
    return (
      typeof input === 'number' &&
      typeof compareTo === 'number' &&
      input > compareTo
    );
  }

  if (choice.NumericLessThanEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.NumericLessThanEqualsPath);
    return (
      typeof input === 'number' &&
      typeof compareTo === 'number' &&
      input <= compareTo
    );
  }

  if (choice.NumericGreaterThanEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.NumericGreaterThanEqualsPath);
    return (
      typeof input === 'number' &&
      typeof compareTo === 'number' &&
      input >= compareTo
    );
  }

  if (choice.StringMatches !== undefined) {
    return (
      typeof input === 'string' &&
      typeof choice.StringMatches === 'string' &&
      stringMatches(input, choice.StringMatches)
    );
  }

  if (choice.StringEquals !== undefined) {
    return (
      typeof input === 'string' &&
      typeof choice.StringEquals === 'string' &&
      input === choice.StringEquals
    );
  }

  if (choice.StringLessThan !== undefined) {
    return (
      typeof input === 'string' &&
      typeof choice.StringLessThan === 'string' &&
      input < choice.StringLessThan
    );
  }

  if (choice.StringGreaterThan !== undefined) {
    return (
      typeof input === 'string' &&
      typeof choice.StringGreaterThan === 'string' &&
      input > choice.StringGreaterThan
    );
  }

  if (choice.StringLessThanEquals !== undefined) {
    return (
      typeof input === 'string' &&
      typeof choice.StringLessThanEquals === 'string' &&
      input <= choice.StringLessThanEquals
    );
  }

  if (choice.StringGreaterThanEquals !== undefined) {
    return (
      typeof input === 'string' &&
      typeof choice.StringGreaterThanEquals === 'string' &&
      input >= choice.StringGreaterThanEquals
    );
  }

  if (choice.StringEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.StringEqualsPath);
    return (
      typeof input === 'string' &&
      typeof compareTo === 'string' &&
      input === compareTo
    );
  }

  if (choice.StringLessThanPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.StringLessThanPath);
    return (
      typeof input === 'string' &&
      typeof compareTo === 'string' &&
      input < compareTo
    );
  }

  if (choice.StringGreaterThanPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.StringGreaterThanPath);
    return (
      typeof input === 'string' &&
      typeof compareTo === 'string' &&
      input > compareTo
    );
  }

  if (choice.StringLessThanEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.StringLessThanEqualsPath);
    return (
      typeof input === 'string' &&
      typeof compareTo === 'string' &&
      input <= compareTo
    );
  }

  if (choice.StringGreaterThanEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.StringGreaterThanEqualsPath);
    return (
      typeof input === 'string' &&
      typeof compareTo === 'string' &&
      input >= compareTo
    );
  }

  if (choice.TimestampEquals !== undefined) {
    return (
      isTimestamp(input) &&
      isTimestamp(choice.TimestampEquals) &&
      new Date(input).getTime() === new Date(choice.TimestampEquals).getTime()
    );
  }

  if (choice.TimestampLessThan !== undefined) {
    return (
      isTimestamp(input) &&
      isTimestamp(choice.TimestampLessThan) &&
      new Date(input).getTime() < new Date(choice.TimestampLessThan).getTime()
    );
  }

  if (choice.TimestampGreaterThan !== undefined) {
    return (
      isTimestamp(input) &&
      isTimestamp(choice.TimestampGreaterThan) &&
      new Date(input).getTime() >
        new Date(choice.TimestampGreaterThan).getTime()
    );
  }

  if (choice.TimestampLessThanEquals !== undefined) {
    return (
      isTimestamp(input) &&
      isTimestamp(choice.TimestampLessThanEquals) &&
      new Date(input).getTime() <=
        new Date(choice.TimestampLessThanEquals).getTime()
    );
  }

  if (choice.TimestampGreaterThanEquals !== undefined) {
    return (
      isTimestamp(input) &&
      isTimestamp(choice.TimestampGreaterThanEquals) &&
      new Date(input).getTime() >=
        new Date(choice.TimestampGreaterThanEquals).getTime()
    );
  }

  if (choice.TimestampEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.TimestampEqualsPath);
    return (
      isTimestamp(input) &&
      isTimestamp(compareTo) &&
      new Date(input).getTime() === new Date(compareTo).getTime()
    );
  }

  if (choice.TimestampLessThanPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.TimestampLessThanPath);
    return (
      isTimestamp(input) &&
      isTimestamp(compareTo) &&
      new Date(input).getTime() < new Date(compareTo).getTime()
    );
  }

  if (choice.TimestampGreaterThanPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.TimestampGreaterThanPath);
    return (
      isTimestamp(input) &&
      isTimestamp(compareTo) &&
      new Date(input).getTime() > new Date(compareTo).getTime()
    );
  }

  if (choice.TimestampLessThanEqualsPath !== undefined) {
    const compareTo = jsonpath.value(data, choice.TimestampLessThanEqualsPath);
    return (
      isTimestamp(input) &&
      isTimestamp(compareTo) &&
      new Date(input).getTime() <= new Date(compareTo).getTime()
    );
  }

  if (choice.TimestampGreaterThanEqualsPath !== undefined) {
    const compareTo = jsonpath.value(
      data,
      choice.TimestampGreaterThanEqualsPath
    );
    return (
      isTimestamp(input) &&
      isTimestamp(compareTo) &&
      new Date(input).getTime() >= new Date(compareTo).getTime()
    );
  }

  return (
    choice.IsPresent === (input !== undefined) ||
    choice.IsNull === (input === null) ||
    choice.IsBoolean === (typeof input === 'boolean') ||
    choice.IsNumeric === (typeof input === 'number') ||
    choice.IsString === (typeof input === 'string') ||
    choice.IsTimestamp === isTimestamp(input)
  );
};

const stringMatches = (value: string, rule: string): boolean => {
  const escapeRegex = (str: string) =>
    str.replace(/[-/^$*+?.()|[]{}]/g, '\\$&');
  const replaceAsterisk = (str: string) =>
    str
      .split(/(?<!(?:\\))\*/g)
      .map(escapeRegex)
      .join('.*');

  const testMask = rule.split(/\\\\/).map(replaceAsterisk).join('\\\\');

  return new RegExp(`^${testMask}$`).test(value);
};

const isTimestamp = (value: any): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  const date = new Date(value);

  return !isNaN(date.getTime()) && date.toISOString() === value;
};
