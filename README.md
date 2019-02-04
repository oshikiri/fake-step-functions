fake-step-functions
=========================

[![Build Status](https://travis-ci.org/oshikiri/fake-step-functions.svg?branch=master)](https://travis-ci.org/oshikiri/fake-step-functions) [![npm version](https://badge.fury.io/js/fake-step-functions.svg)](https://badge.fury.io/js/fake-step-functions)

A lightweight testing toolkit for Amazon States Language.

```js
const { expect } = require('chai');
const { FakeStateMachine } = require('fake-step-functions');

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

  it('should execute the state machine with fakeResource', async () => {
    const runStateResult = await fakeStateMachine.run({
      title: 'Numbers to add',
      numbers: { val1: 3, val2: 4 }
    });

    expect(runStateResult.data).to.deep.equal({
      title: 'Numbers to add',
      numbers: { val1: 3, val2: 4 },
      sum: 7
    });
  });
});
```

## References

- Amazon States Language specification <https://states-language.net/spec.html>
- <https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html>

### Similar projects

- [airware/stepfunctions\-local](https://github.com/airware/stepfunctions-local)
- [wmfs/statebox](https://github.com/wmfs/statebox)
- [mikeparisstuff/stateslang\-js](https://github.com/mikeparisstuff/stateslang-js)
- [coinbase/step](https://github.com/coinbase/step) (Golang)
- validators
  - [airware/asl\-validator](https://github.com/airware/asl-validator)
  - [awslabs/statelint](https://github.com/awslabs/statelint) (Ruby)
