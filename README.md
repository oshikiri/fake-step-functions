fake-step-functions
=====

A lightweight unit testing toolkit for Amazon States Language.

[![GitHub Workflows Status](https://github.com/oshikiri/fake-step-functions/workflows/test/badge.svg)](https://github.com/oshikiri/fake-step-functions/actions)
[![npm version](https://badge.fury.io/js/fake-step-functions.svg)](https://badge.fury.io/js/fake-step-functions)

```js
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
        End: true,
      },
    },
  };
  const fakeResources = {
    'arn:aws:lambda:us-east-1:123456789012:function:Add': numbers => numbers.val1 + numbers.val2,
  };
  const fakeStateMachine = new FakeStateMachine(definition, fakeResources);

  test('should execute the state machine with fakeResource', async () => {
    const runStateResult = await fakeStateMachine.run({
      title: 'Numbers to add',
      numbers: { val1: 3, val2: 4 },
    });

    expect(runStateResult.data).toEqual({
      title: 'Numbers to add',
      numbers: { val1: 3, val2: 4 },
      sum: 7,
    });
  });
});
```


## Release

In order to release new version to npm, create a commit using `npm version patch -m "Release %s"` and push it.
See the npm-publish-action step in `.github/workflows/publish.yml`.


## References

### Specifications

- Amazon States Language specification <https://states-language.net/spec.html>
- Amazon States Language - AWS Step Functions <https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html>


### Similar projects

At 2022, **AWS Step Functions Local** is a primary choice to test ASL locally.
See ["Testing Step Functions State Machines Locally"](https://docs.aws.amazon.com/step-functions/latest/dg/sfn-local.html).

- [airware/stepfunctions\-local](https://github.com/airware/stepfunctions-local)
- [wmfs/statebox](https://github.com/wmfs/statebox)
- [mikeparisstuff/stateslang\-js](https://github.com/mikeparisstuff/stateslang-js)
- [coinbase/step](https://github.com/coinbase/step) (Golang)
- validators
  - [airware/asl\-validator](https://github.com/airware/asl-validator)
  - [awslabs/statelint](https://github.com/awslabs/statelint) (Ruby)
