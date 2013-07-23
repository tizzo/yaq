var should = require('should');
var Yaq = require('../index');
var redis = require('fakeredis');

describe('Yaq', function() {
  var client = null;
  var yaq = null;
  before(function() {
    client = redis.createClient();
    client.flushdb();
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
      yaq.defaultJobTimeout.should.equal(600000);
      yaq = new Yaq(client, { defaultJobTimeout: 10 });
      yaq.defaultJobTimeout.should.equal(10);
    });
  });
  describe('#push', function() {
    describe ('item storage', function() {
      it ('should store a string in the queue', function(done) {
        yaq.push('foo', function(error, itemId) {
          client.lindex(yaq.activeQueueKey, 0, function(error, id) {
            id.should.equal(itemId);
            client.get(yaq.itemKeyPrefix + itemId, function(error, record) {
              record.should.equal('"foo"');
              done(error);
            });
          });
        });
      });
      it ('should store an object in the queue', function(done) {
        yaq.push({ foo: 'bar' }, function(error, itemId) {
          client.lindex(yaq.activeQueueKey, 0, function(error, id) {
            id.should.equal(itemId);
            client.get(yaq.itemKeyPrefix + itemId, function(error, record) {
              record.should.equal('{"foo":"bar"}');
              done(error);
            });
          });
        });
      });
    });
  });
  describe('#pop', function() {
    it('should get the oldest item from the list', function(done) {
      yaq.pop(function(error, job, timeOut) {
        job.should.equal('foo');
        done(error);
      });
    });
  });
  describe('#bpop', function() {
  });
});
