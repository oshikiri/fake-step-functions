/* eslint-env mocha */

'use strict';

import * as jsonpath  from 'jsonpath';
import { expect } from 'chai';

describe('jsonpath', () => {
  describe('#value()', () => {
    it('should return the path', () => {
      const data = {
        foo: 123,
        bar: ['a', 'b', 'c'],
        car: {
          cdr: true,
        },
      };
      expect(jsonpath.value(data, '$.foo')).to.deep.equal(123);
      expect(jsonpath.value(data, '$.bar')).to.deep.equal(['a', 'b', 'c']);
      expect(jsonpath.value(data, '$.car.cdr')).to.deep.equal(true);
    });
    it('should assign the value to the specified path)', () => {
      const data = {
        car: {
          cdr: true,
        },
      };
      const result = jsonpath.value(data, '$.car.foo', 123);
      expect(result).to.equal(123);
      expect(data).to.deep.equal({
        car: {
          cdr: true,
          foo: 123,
        },
      });
    });
    it.skip('should query using range $.a[0,1]', () => {
      const data = {
        a: [1, 2, 3, 4]
      };
      const result = jsonpath.value(data, '$.a[0,1]');
      expect(result).to.equal([1, 2]);
    });
  });
});
