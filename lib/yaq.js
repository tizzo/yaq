
var Yaq = function Yak(redisConnection) {
  if (!redisConnection) {
    throw new Error('No redis connection was supplied.');
  }
};
module.exports.yaq = yaq;
