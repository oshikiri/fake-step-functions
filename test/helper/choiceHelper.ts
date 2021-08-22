import * as choiceHelper from '../../src/helper/choiceHelper';

interface ConditionTestCase {
  conditionType: string;
  condition: string | number | boolean | null;
  compareTo?: string | number | boolean | null;
  testCases: Array<[string | number | boolean | null, boolean]>;
}

describe('choiceHelper#isRightChoice()', () => {
  describe('when simple choice rule applied', () => {
    const conditions: ConditionTestCase[] = [
      {
        conditionType: 'BooleanEquals',
        condition: true,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5, false],
          [false, false],
          [true, true],
        ],
      },
      {
        conditionType: 'BooleanEquals',
        condition: false,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5, false],
          [false, true],
          [true, false],
        ],
      },
      {
        conditionType: 'BooleanEquals',
        condition: null,
        testCases: [
          [false, false],
          [true, false],
        ],
      },
      {
        conditionType: 'BooleanEquals',
        condition: 5,
        testCases: [
          [false, false],
          [true, false],
        ],
      },
      {
        conditionType: 'BooleanEquals',
        condition: 'abc',
        testCases: [
          [false, false],
          [true, false],
        ],
      },
      {
        conditionType: 'BooleanEqualsPath',
        condition: '$.compareTo',
        compareTo: true,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5, false],
          [false, false],
          [true, true],
        ],
      },
      {
        conditionType: 'BooleanEqualsPath',
        condition: '$.compareTo',
        compareTo: null,
        testCases: [
          [false, false],
          [true, false],
        ],
      },
      {
        conditionType: 'BooleanEqualsPath',
        condition: '$.compareTo',
        compareTo: 'abc',
        testCases: [
          [false, false],
          [true, false],
        ],
      },
      {
        conditionType: 'BooleanEqualsPath',
        condition: '$.compareTo',
        compareTo: 5,
        testCases: [
          [false, false],
          [true, false],
        ],
      },
      {
        conditionType: 'BooleanEqualsPath',
        condition: '$.compareTo',
        compareTo: false,
        testCases: [
          [false, true],
          [true, false],
        ],
      },
      {
        conditionType: 'NumericEquals',
        condition: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5.0, true],
          [5.1, false],
        ],
      },
      {
        conditionType: 'NumericLessThan',
        condition: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [4.9, true],
          [5.0, false],
          [5.1, false],
        ],
      },
      {
        conditionType: 'NumericLessThanEquals',
        condition: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [4.9, true],
          [5.0, true],
          [5.1, false],
        ],
      },
      {
        conditionType: 'NumericGreaterThan',
        condition: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [4.9, false],
          [5.0, false],
          [5.1, true],
        ],
      },
      {
        conditionType: 'NumericGreaterThanEquals',
        condition: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [4.9, false],
          [5.0, true],
          [5.1, true],
        ],
      },
      {
        conditionType: 'NumericEqualsPath',
        condition: '$.compareTo',
        compareTo: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5.1, false],
          [5.0, true],
          [4.9, false],
        ],
      },
      {
        conditionType: 'NumericLessThanPath',
        condition: '$.compareTo',
        compareTo: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5.1, false],
          [5.0, false],
          [4.9, true],
        ],
      },
      {
        conditionType: 'NumericGreaterThanPath',
        condition: '$.compareTo',
        compareTo: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5.1, true],
          [5.0, false],
          [4.9, false],
        ],
      },
      {
        conditionType: 'NumericLessThanEqualsPath',
        condition: '$.compareTo',
        compareTo: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5.1, false],
          [5.0, true],
          [4.9, true],
        ],
      },
      {
        conditionType: 'NumericGreaterThanEqualsPath',
        condition: '$.compareTo',
        compareTo: 5,
        testCases: [
          [null, false],
          ['abc', false],
          ['5', false],
          [5.1, true],
          [5.0, true],
          [4.9, false],
        ],
      },
      {
        conditionType: 'StringEquals',
        condition: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['ab', false],
          ['abc', true],
        ],
      },
      {
        conditionType: 'StringMatches',
        condition: 'a*c',
        testCases: [
          [null, false],
          [5, false],
          ['ab', false],
          ['bc', false],
          ['abc', true],
          ['ac', true],
          ['abdefc', true],
        ],
      },
      {
        conditionType: 'StringMatches',
        // Escaping backslash in string, so it's actually one backslash
        condition: 'a\\*c',
        testCases: [
          ['ab', false],
          ['bc', false],
          ['a*c', true],
          ['a\\*c', false],
          ['ac', false],
        ],
      },
      {
        conditionType: 'StringMatches',
        // Escaping backslashes in string, so it's actually 2 backslashes
        condition: 'a\\\\*c',
        testCases: [
          ['ab', false],
          ['bc', false],
          ['a*c', false],
          ['a\\*c', true],
          ['a\\c', true],
          ['a\\defc', true],
          ['ac', false],
        ],
      },
      {
        conditionType: 'StringLessThan',
        condition: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['ab', true],
          ['aba', true],
          ['abd', false],
          ['abc', false],
        ],
      },
      {
        conditionType: 'StringLessThanEquals',
        condition: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['aba', true],
          ['abd', false],
          ['abc', true],
        ],
      },
      {
        conditionType: 'StringGreaterThan',
        condition: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['aba', false],
          ['abd', true],
          ['az', true],
          ['abc', false],
        ],
      },
      {
        conditionType: 'StringGreaterThanEquals',
        condition: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['aba', false],
          ['abd', true],
          ['az', true],
          ['abc', true],
        ],
      },
      {
        conditionType: 'StringEqualsPath',
        condition: '$.compareTo',
        compareTo: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['aba', false],
          ['abd', false],
          ['abc', true],
        ],
      },
      {
        conditionType: 'StringLessThanPath',
        condition: '$.compareTo',
        compareTo: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['aba', true],
          ['abd', false],
          ['abc', false],
        ],
      },
      {
        conditionType: 'StringGreaterThanPath',
        condition: '$.compareTo',
        compareTo: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['aba', false],
          ['abd', true],
          ['az', true],
          ['abc', false],
        ],
      },
      {
        conditionType: 'StringLessThanEqualsPath',
        condition: '$.compareTo',
        compareTo: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['aba', true],
          ['abd', false],
          ['abc', true],
        ],
      },
      {
        conditionType: 'StringGreaterThanEqualsPath',
        condition: '$.compareTo',
        compareTo: 'abc',
        testCases: [
          [null, false],
          [5, false],
          ['aba', false],
          ['abd', true],
          ['az', true],
          ['abc', true],
        ],
      },
      {
        conditionType: 'TimestampEquals',
        condition: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', false],
          ['2006-01-02T15:04:05.000Z', true],
          ['2006-02-01T15:04:05.000Z', false],
        ],
      },
      {
        conditionType: 'TimestampLessThan',
        condition: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', true],
          ['2006-01-02T15:04:05.000Z', false],
          ['2006-02-01T15:04:05.000Z', false],
        ],
      },
      {
        conditionType: 'TimestampLessThanEquals',
        condition: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', true],
          ['2006-01-02T15:04:05.000Z', true],
          ['2006-02-01T15:04:05.000Z', false],
        ],
      },
      {
        conditionType: 'TimestampGreaterThan',
        condition: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', false],
          ['2006-01-02T15:04:05.000Z', false],
          ['2006-02-01T15:04:05.000Z', true],
        ],
      },
      {
        conditionType: 'TimestampGreaterThanEquals',
        condition: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', false],
          ['2006-01-02T15:04:05.000Z', true],
          ['2006-02-01T15:04:05.000Z', true],
        ],
      },
      {
        conditionType: 'TimestampEqualsPath',
        condition: '$.compareTo',
        compareTo: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', false],
          ['2006-01-02T15:04:05.000Z', true],
          ['2006-02-01T15:04:05.000Z', false],
        ],
      },
      {
        conditionType: 'TimestampLessThanPath',
        condition: '$.compareTo',
        compareTo: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', true],
          ['2006-01-02T15:04:05.000Z', false],
          ['2006-02-01T15:04:05.000Z', false],
        ],
      },
      {
        conditionType: 'TimestampGreaterThanPath',
        condition: '$.compareTo',
        compareTo: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', false],
          ['2006-01-02T15:04:05.000Z', false],
          ['2006-02-01T15:04:05.000Z', true],
        ],
      },
      {
        conditionType: 'TimestampLessThanEqualsPath',
        condition: '$.compareTo',
        compareTo: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', true],
          ['2006-01-02T15:04:05.000Z', true],
          ['2006-02-01T15:04:05.000Z', false],
        ],
      },
      {
        conditionType: 'TimestampGreaterThanEqualsPath',
        condition: '$.compareTo',
        compareTo: '2006-01-02T15:04:05.000Z',
        testCases: [
          [null, false],
          [true, false],
          [5, false],
          ['ab', false],
          ['2006-01-02', false],
          ['2006-01-02T11:45:05.000Z', false],
          ['2006-01-02T15:04:05.000Z', true],
          ['2006-02-01T15:04:05.000Z', true],
        ],
      },
      {
        conditionType: 'IsPresent',
        condition: true,
        testCases: [
          [undefined, false],
          [null, true],
          [0, true],
          ['abc', true],
        ],
      },
      {
        conditionType: 'IsPresent',
        condition: false,
        testCases: [
          [undefined, true],
          [null, false],
          [0, false],
          ['abc', false],
        ],
      },
      {
        conditionType: 'IsNull',
        condition: true,
        testCases: [
          [5, false],
          [null, true],
        ],
      },
      {
        conditionType: 'IsNull',
        condition: false,
        testCases: [
          [5, true],
          [null, false],
        ],
      },
      {
        conditionType: 'IsBoolean',
        condition: true,
        testCases: [
          [null, false],
          [false, true],
        ],
      },
      {
        conditionType: 'IsBoolean',
        condition: false,
        testCases: [
          [null, true],
          [false, false],
        ],
      },
      {
        conditionType: 'IsNumeric',
        condition: true,
        testCases: [
          ['abc', false],
          [5, true],
          [5.1, true],
        ],
      },
      {
        conditionType: 'IsNumeric',
        condition: false,
        testCases: [
          ['abc', true],
          [5, false],
          [5.1, false],
        ],
      },
      {
        conditionType: 'IsString',
        condition: true,
        testCases: [
          [5.1, false],
          ['abc', true],
        ],
      },
      {
        conditionType: 'IsString',
        condition: false,
        testCases: [
          [5.1, true],
          ['abc', false],
        ],
      },
      {
        conditionType: 'IsTimestamp',
        condition: true,
        testCases: [
          ['abc', false],
          ['2006-01-02T15:04:05.000Z', true],
        ],
      },
      {
        conditionType: 'IsTimestamp',
        condition: false,
        testCases: [
          ['abc', true],
          ['2006-01-02T15:04:05.000Z', false],
        ],
      },
    ];

    conditions.forEach(({ conditionType, condition, compareTo, testCases }) => {
      describe(`with ${conditionType}`, () => {
        testCases.forEach((testCaseRow) => {
          const [inputValue, expectedResult] = testCaseRow;
          const compareToSubstitution =
            compareTo !== undefined ? `(${compareTo})` : '';

          describe(`when condition=${condition}${compareToSubstitution} and input=${inputValue}`, () => {
            const choice = {
              Variable: '$.condition',
              [conditionType]: condition,
              Next: 'NextState',
            };

            test(`the result should be ${expectedResult}`, () => {
              expect(
                choiceHelper.isRightChoice(choice, {
                  condition: inputValue,
                  compareTo,
                })
              ).toEqual(expectedResult);
            });
          });
        });
      });
    });
  });

  describe('when complex choice rule applied', () => {
    describe('with And', () => {
      const choice = {
        And: [
          {
            Variable: '$.condition',
            NumericLessThan: 5,
          },
          {
            Variable: '$.condition',
            NumericGreaterThan: 4,
          },
        ],
        Next: 'NextState',
      };

      test(`the result should be true if all conditions met`, async () => {
        expect(choiceHelper.isRightChoice(choice, { condition: 4.5 })).toEqual(
          true
        );
      });

      test(`the result should be false if only some conditions met`, async () => {
        expect(choiceHelper.isRightChoice(choice, { condition: 5.5 })).toEqual(
          false
        );
      });

      test(`the result should be false if none conditions met`, async () => {
        expect(choiceHelper.isRightChoice(choice, { condition: 0 })).toEqual(
          false
        );
      });
    });

    describe('with Or', () => {
      const choice = {
        Or: [
          {
            Variable: '$.condition',
            NumericLessThan: 6,
          },
          {
            Variable: '$.condition',
            NumericLessThan: 5,
          },
        ],
        Next: 'NextState',
      };

      test(`the result should be true if all conditions met`, async () => {
        expect(choiceHelper.isRightChoice(choice, { condition: 4.5 })).toEqual(
          true
        );
      });

      test(`the result should be true if only some conditions met`, async () => {
        expect(choiceHelper.isRightChoice(choice, { condition: 5.5 })).toEqual(
          true
        );
      });

      test(`the result should be false if none conditions met`, async () => {
        expect(choiceHelper.isRightChoice(choice, { condition: 7 })).toEqual(
          false
        );
      });
    });

    describe('with Not', () => {
      const choice = {
        Not: {
          Variable: '$.condition',
          NumericLessThan: 5,
        },
        Next: 'NextState',
      };

      test(`the result should be true if internal condition isn\'t met`, async () => {
        expect(choiceHelper.isRightChoice(choice, { condition: 5.5 })).toEqual(
          true
        );
      });

      test(`the result should be false if internal condition is met`, async () => {
        expect(choiceHelper.isRightChoice(choice, { condition: 4.5 })).toEqual(
          false
        );
      });
    });
  });
});
