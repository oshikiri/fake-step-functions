const jsonpath = require('jsonpath');
const expect = require('chai').expect;

describe('jsonpath', () => {
  describe('#query()', () => {
    it('should return the path', () => {
      const data = {
        "foo": 123,
        "bar": ["a", "b", "c"],
        "car": {
            "cdr": true
        }
      };
      expect(jsonpath.query(data, '$.foo')).to.deep.equal([ 123 ]);
      expect(jsonpath.query(data, '$.bar')).to.deep.equal([['a', 'b', 'c']]);
      expect(jsonpath.query(data, '$.car.cdr')).to.deep.equal([ true ]);
    });
    it('should query using range (e.g. $.a[0..1])')
  });
});
