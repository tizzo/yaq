var should = require('should');
var Yaq = require('../index');
var redis = require('fakeredis');

describe('Yaq', function() {
  var client = null;
  var yaq = new Yaq(client);
  before(function() {
    client = redis.createClient();
  });
  after(function() {
    client = null;
  });
  describe('#constructor', function() {
    it ('should throw an error if no redis client is specified.', function() {
      try {
        
      }
      catch (error) {
        should.exist(error);
      }
    });
  });
  describe('#', function() {
    it ('should do some stuff', function(done) {
      done();
    });
  });
});
