'use strict'
const jsonpath = require('jsonpath');
const expect = require('chai').expect;

describe('jsonpath', () => {
  describe('#value()', () => {
    it('should return the path', () => {
      const data = {
        "foo": 123,
        "bar": ["a", "b", "c"],
        "car": {
            "cdr": true
        }
      };
      expect(jsonpath.value(data, '$.foo')).to.deep.equal(123);
      expect(jsonpath.value(data, '$.bar')).to.deep.equal(['a', 'b', 'c']);
      expect(jsonpath.value(data, '$.car.cdr')).to.deep.equal(true);
    });
    it('should assign the value to the specified path)', () => {
      const data = {
        car: {
          cdr: true
        }
      };
      const result = jsonpath.value(data, '$.car.foo', 123);
      expect(result).to.equal(123);
      expect(data).to.deep.equal({
        car: {
          cdr: true,
          foo: 123
        }
      })
    });
    it('should query using range (e.g. $.a[0..1])');
  });
});
