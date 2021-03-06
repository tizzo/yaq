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
    it('should throw an error if no redis client is specified', function(done) {
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
    it('should use the redis client provided', function() {
      yaq = new Yaq(client);
      yaq.redisClient.should.equal(client);
    });
    it('should accept an options array to override defaults', function() {
      yaq = new Yaq(client);
      yaq.defaultJobTimeout.should.equal(600000);
      yaq = new Yaq(client, { defaultJobTimeout: 10 });
      yaq.defaultJobTimeout.should.equal(10);
    });
  });
  describe('#push', function() {
    describe ('item storage', function() {
      it('should store a string in the queue', function(done) {
        yaq.push('foo', function(error, itemId) {
          client.lindex(yaq.availableQueueKey, 0, function(error, id) {
            parseInt(id).should.equal(itemId);
            client.get(yaq.itemKeyPrefix + itemId, function(error, record) {
              record.should.equal('"foo"');
              done(error);
            });
          });
        });
      });
      it('should store an object in the queue', function(done) {
        yaq.push({ foo: 'bar' }, function(error, itemId) {
          client.lindex(yaq.availableQueueKey, 0, function(error, id) {
            parseInt(id).should.equal(itemId);
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
      yaq.pop(function(job, jobCompleteCallback, itemId, timeOut) {
        job.should.equal('foo');
        var multi = client.multi();
        multi.zrange(yaq.inProgressTimeoutKey, 0, -1, 'WITHSCORES');
        multi.exec(function(error, results) {
          if (error) return done(error);
          // Ensure that the timeout is properly recorded.
          results[0][1].should.equal(timeOut.toString());
          jobCompleteCallback(function(error) {
            done(error);
          });
        });
      });
    });
    it('should properly unserialize objects', function(done) {
      yaq.pop(function(job, jobCompleteCallback, itemId, timeOut) {
        job.foo.should.equal('bar');
        jobCompleteCallback(function(error) {
          done(error);
        });
      });
    });
  });
  describe('#keepAlive', function() {
    it('should set a new timeout for the item.', function(done) {
      yaq.push( { bar: 'baz' }, function(error, itemId) {
        yaq.pop(function(job, jobCompleteCallback, itemId, timeOut) {
          job.bar.should.equal('baz');
          client.zscore(yaq.inProgressTimeoutKey, itemId, function(error, currentTime) {
            timeOut.should.equal(timeOut);
            var newTime = currentTime + 600;
            yaq.keepAlive(itemId, newTime, function() {
              client.zscore(yaq.inProgressTimeoutKey, itemId, function(error, currentTime) {
                should.not.exist(error);
                currentTime.should.equal(newTime);
                jobCompleteCallback(function(error) {
                  done(error);
                });
              });
            });
          });
        });
      });
    });
  });
  describe('#bpop', function() {
  });
  describe('#emit', function() {
    it('should emit a jobComplete event when a job completes', function(done) {
      var newJobId = null;
      yaq.once('jobComplete', function(job, jobId) {
        job.item.should.equal('text');
        parseInt(jobId).should.equal(newJobId);
        done();
      });
      yaq.push({ item: 'text' }, function(error, id) {
        newJobId = id;
        yaq.pop(function(job, jobCompleteCallback, itemId, timeOut) {
          jobCompleteCallback();
        });
      });
    });
  });
  describe('#deleteJob', function() {
    it('should remove a job from the queue', function(done) {
      yaq.getAvailableQueueLength(function(error, initialLength) {
        yaq.push({some: 'var'}, function(error, id) {
          yaq.deleteJob(id, function(error) {
            yaq.getAvailableQueueLength(function(error, newLength) {
              newLength.should.equal(initialLength);
              yaq.pop(function(item) {
                should.not.exist(item);
                done(error);
              });
            });
          });
        });
      });
    });
  });
  describe('#getAvailableQueueLength', function() {
    it('should report the number of items in the available queue', function(done) {
      yaq.getAvailableQueueLength(function(error, initialLength) {
        yaq.push({  some: 'item'  }, function(error, jobId) {
          yaq.getAvailableQueueLength(function(error, newLength) {
            newLength.should.equal(initialLength + 1);
            done(error);
          });
        });
      });
    });
  });
  describe('#getInProgressQueueLength', function() {
    it('should report the number of items currenty in progress', function(done) {
      yaq.getInProgressQueueLength(function(error, initialLength) {
        yaq.pop(function(job, jobCompleteCallback) {
          yaq.getInProgressQueueLength(function(error, currentlyProcessingLength) {
            currentlyProcessingLength.should.equal(initialLength + 1);
            jobCompleteCallback(function(error) {
              yaq.getInProgressQueueLength(function(error, doneProcessingLength) {
                doneProcessingLength.should.equal(initialLength);
                done();
              });
            });
          });
        });
      });
    });
  });
  describe('#pollForTimeouts', function() {
    it('should find jobs that have timed out', function(done) {
      // A negative job timeout should set the timeout to be in the past
      // making it ripe for pruning.
      yaq.push({ payload: 'pandas', jobTimeOut: -100 }, function(error, newId) {
        yaq.pop(function(error, item) {
          var id = yaq.pollForTimeouts(1, function(job, jobId) {
            parseInt(jobId).should.equal(newId);
            job.payload.should.equal('pandas');
          });
          // Stop polling after 2 miliseconds, should ensure at least
          // one poll but sometimes 2.
          setTimeout(function() {
            clearInterval(id);
            done();
          }, 2);
        });
      });
    });
  });
});
