var async = require('async');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');
    
/**
 * Constructor function for the Yaq queue object.
 *
 * redisClient - A redis client as you would receive from the node-redis module's `redis.createClient()`.
 * options - A hash of options.
 */
function Yaq(redisClient, options) {
  if (!redisClient) {
    throw new Exception('No redis connection was supplied.');
  }
  this.redisClient = redisClient;

  this.itemKeyPrefix = 'yaq:item:';
  // A list. Items awaiting processing.
  this.availableQueueKey = 'yaq:available-queue';
  // A list. Items currently being processed processing.
  this.inProgressQueueKey = 'yaq:in-progress-queue';
  // A sorted set. Items currently being processed processed scored by their timeout.
  this.inProgressTimeoutKey = 'yaq:in-progress:timeout';
  // An incremented field that generates unique ids for tasks.
  this.idIncrementingKey = 'yaq:id-highwater';

  // The number of miliseconds to allow a job to run by default before it is declared failed.
  this.defaultJobTimeout = 600000;

  // Set the options on this object.
  if (options) {
    for (i in options) {
      if (this[i]) {
        this[i] = options[i];
      }
    }
  }

  _.bindAll(this, ['getKey']);
};
util.inherits(Yaq, EventEmitter);
Yaq.prototype.getKey = function(item, done) {
  var self = this;
  self.redisClient.incr(self.idIncrementingKey, function(error, id) {
    done(error, id);
  });
};

/**
 * Add an item to the queue.
 *
 * item - the item to add. Can be anything that can be passed to JSON.stringify().
 * done - optional callback to be called once the item has been added.
 *        Receives an error and the generated key.
 */
Yaq.prototype.push = function(item, done) {
  var self = this;
  self.getKey(item, function(error, key) {
    var multi = self.redisClient.multi();
    multi.set(self.itemKeyPrefix + key, JSON.stringify(item));
    multi.lpush(self.availableQueueKey, key);
    multi.exec(function(error, results) {
      if (done) {
        done(error, key);
      }
    });
  });
};

/**
 * Get one item from the queue, if no items are available this method will not block.
 *
 * done - Callback function to call when the job is finished. Takes parameters error, record, callback, itemId, timeOut.
 */
Yaq.prototype.pop = function(done) {
  var self = this;
  self.redisClient.rpoplpush(self.availableQueueKey, self.inProgressQueueKey, function(error, itemId) {
    if (error || !itemId) return done(error, itemId);
    // TODO: make this a LUA script in a provider plugin.
    self.redisClient.get(self.itemKeyPrefix + itemId, function(error, record) {
      if (error) return done(error);
      record = JSON.parse(record);
      var timeOut = new Date().getTime()
      if (record !== null && record.jobTimeOut) {
         timeOut = timeOut + record.jobTimeOut;
      }
      else {
        timeOut = timeOut + self.defaultJobTimeout;
      }
      self.redisClient.zadd(self.inProgressTimeoutKey, timeOut, itemId, function(error) {
        var context = {
          timeOut: timeOut,
          itemId: itemId,
          job: record,
          self: self
        };
        done(record, self.completeJob.bind(context), itemId, timeOut);
      });
    });
  });
};

// TODO: We should accept an error as the first argument.
Yaq.prototype.completeJob = function(done) {
  // When this function is called it is bound to the context of the job that started it.
  var self = this.self;
  var jobId = this.itemId;
  var job = this.job;
  self.emit('jobComplete', job, jobId);
  // TODO: maybe we shouldn't delete the job here? Maybe we should instead have a completed jobs list?
  self.deleteJob.apply(self, [jobId, done]);
  // TODO: This part should probably be in a standalone deleteJob method.
};
/**
 * Delete a job, never to be heard from again.
 *
 * The job may be in progress.
 */
Yaq.prototype.deleteJob = function(jobId, done) {
  var self = this;
  var multi = self.redisClient.multi();
  multi.zrem(self.inProgressTimeoutKey, jobId);
  multi.lrem(self.availableQueueKey, jobId);
  multi.lrem(self.inProgressQueueKey, jobId);
  multi.del(self.itemKeyPrefix + jobId);
  multi.exec(function(error, results) {
    console.log(arguments);
    if (error) return done(error);
    self.emit('jobDeleted', jobId);
    if (done) {
      done(error);
    }
  });
};


/**
 * Extend the timeout for a given job.
 */
Yaq.prototype.keepAlive = function(itemId, newTimeout, done) {
  var self = this;
  self.redisClient.zadd(self.inProgressTimeoutKey, newTimeout, itemId, function(error) {
    done(error);
  });
};

/**
 * Get one item from the queue, if no items are available
 * wait for one using Redis's blpop method.
 */
Yaq.prototype.bpop = function(done) {
  self.redisClient.brpoplpush(self.availableQueueKey, self.inProgressQueueKey, 0, function() {
  });
};

/**
 * Accepts a worker function, continuously processes as many.
 *
 * worker - a callback function that receives 2 arguments, the first is the
 *          job information, the second is a callback for when the job is done.
 * conucrrency - The number of job items that can be processed in parallel. Optional, defaults to 1.
 */
Yaq.prototype.startWorker = function(worker, concurrency) {
  if (!concurrency) {
    concurrency = 1;
  }
};

/**
 * Default handler for pollForTimeouts.
 * 
 * item - The queue item.
 */
Yaq.prototype.readdTimeoutToQueue = function(item) {
};

/**
 * Poll for timeouts
 *
 * interval - The frequency (in miliseconds) to poll for timed out jobs.
 * handler - The handler to use . Defaults to Yaq::readdTimeoutToQueue.
 */
Yaq.prototype.pollForTimeouts = function(interval, handler) {
  if (!handler) {
    handler = this.readdTimeoutToQueue;
  }
}
module.exports = Yaq;
