import * as jsonpath from 'jsonpath';

describe('jsonpath', () => {
  describe('#value()', () => {
    test('should return the path', () => {
      const data = {
        foo: 123,
        bar: ['a', 'b', 'c'],
        car: {
          cdr: true,
        },
      };
      expect(jsonpath.value(data, '$.foo')).toEqual(123);
      expect(jsonpath.value(data, '$.bar')).toEqual(['a', 'b', 'c']);
      expect(jsonpath.value(data, '$.car.cdr')).toEqual(true);
    });
    test('should assign the value to the specified path)', () => {
      const data = {
        car: {
          cdr: true,
        },
      };
      const result = jsonpath.value(data, '$.car.foo', 123);
      expect(result).toBe(123);
      expect(data).toEqual({
        car: {
          cdr: true,
          foo: 123,
        },
      });
    });
    test.skip('should query using range $.a[0,1]', () => {
      const data = {
        a: [1, 2, 3, 4],
      };
      const result = jsonpath.value(data, '$.a[0,1]');
      expect(result).toBe([1, 2]);
    });
  });
});
