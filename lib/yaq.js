
/**
 * Constructor function for the Yaq queue object.
 *
 * redisClient - A redis client as you would receive from the node-redis module's `redis.createClient()`.
 * options - A hash of options.
 */
var Yaq = function Yak(redisClient, options) {
  if (!redisClient) {
    throw new Error('No redis connection was supplied.');
  }
  this.redisClient = redisClient;
  // A redis set. Items awaiting processing.
  this.activeQueueKey = 'yaq-active-queue';
  // A sorted set. Items currently being processed processing.
  this.inProgress = 'yaq-active-queue';
  // The number of seconds to allow a job to run by default before it is declared failed.
  this.defaultJobTimeout = 600;
  // Set the options on this object.
  if (options) {
    for (i in options) {
      if (this[i]) {
        this[i] = options[i];
      }
    }
  }
};
Yaq.prototype.push = function(item) {
  var self = this;
  self.redisClient.rpush(self.activeQueueKey, JSON.stringify(item));
};
module.exports = Yaq;
