/* eslint-env mocha */

const { expect } = require('chai');
const { FakeStateMachine } = require('../src/FakeStateMachine');

describe('FakeStateMachine.run', () => {
  const definition = {
    Comment: 'https://states-language.net/spec.html#data',
    StartAt: 'AddNumbers',
    States: {
      AddNumbers: {
        Type: 'Task',
        Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
        InputPath: '$.numbers',
        ResultPath: '$.sum',
        End: true
      }
    }
  };
  const fakeResources = {
    'arn:aws:lambda:us-east-1:123456789012:function:Add': numbers => numbers.val1 + numbers.val2
  };
  const fakeStateMachine = new FakeStateMachine(definition, fakeResources);

  it('should execute fakeResource', async () => {
    const actual = (await fakeStateMachine.run({
      title: 'Numbers to add',
      numbers: { val1: 3, val2: 4 }
    })).data;

    expect(actual).to.deep.equal({
      title: 'Numbers to add',
      numbers: { val1: 3, val2: 4 },
      sum: 7,
    });
  });
});
