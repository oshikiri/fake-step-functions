fake-step-functions
=========================

[![Build Status](https://travis-ci.org/oshikiri/fake-step-functions.svg?branch=master)](https://travis-ci.org/oshikiri/fake-step-functions) [![npm version](https://badge.fury.io/js/fake-step-functions.svg)](https://badge.fury.io/js/fake-step-functions)

A lightweight testing toolkit for Amazon States Language.

```js
// https://states-language.net/spec.html#data
const definition = {
  StartAt: 'Add',
  States: {
    Add: {
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
const input = {
  title: 'Numbers to add',
  numbers: { val1: 3, val2: 4 }
};

fakeStateMachine.run(input)
  .then(r => console.log(r.data))
// { title: 'Numbers to add',
//   numbers: { val1: 3, val2: 4 },
//   sum: 7 }
```

## References

- Amazon States Language specification <https://states-language.net/spec.html>
- <https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html>

### Similar projects

- [airware/asl\-validator](https://github.com/airware/asl-validator)
- [airware/stepfunctions\-local](https://github.com/airware/stepfunctions-local)
- [coinbase/step](https://github.com/coinbase/step) (in Golang)
- [mikeparisstuff/stateslang\-js](https://github.com/mikeparisstuff/stateslang-js)
