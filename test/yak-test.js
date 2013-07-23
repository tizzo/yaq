var should = require('should');
var Yaq = require('../index');
var redis = require('fakeredis');

describe('Yaq', function() {
  var client = null;
  var yaq = null;
  before(function() {
    client = redis.createClient();
  });
  after(function() {
    client = null;
  });
  describe('#constructor', function() {
    it ('should throw an error if no redis client is specified', function(done) {
      try {
        yaq = new Yaq();
        done(new Error('Failed to throw error when no redis client was supplied'));
      }
      catch (error) {
        should.exist(error);
        error.message.should.equal('Exception is not defined');
        done();
      }
    });
    it ('should use the redis client provided', function() {
      yaq = new Yaq(client);
      yaq.redisClient.should.equal(client);
    });
    it ('should accept an options array to override defaults', function() {
      yaq = new Yaq(client);
      yaq.defaultJobTimeout.should.equal(600);
      yaq = new Yaq(client, { defaultJobTimeout: 10 });
      yaq.defaultJobTimeout.should.equal(10);
    });
  });
  describe('#push', function() {
    it ('should store an item in the active queue', function(done) {
      yaq.push('foo', function() {
        client.lindex(yaq.activeQueueKey, 0, function(error, item) {
          item.should.equal('"foo"');
          done(error);
        });
      });
    });
  });
  describe('#pop', function() {
  });
});
