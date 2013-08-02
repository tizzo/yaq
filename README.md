# YAQ

[![Build Status](https://travis-ci.org/tizzo/yaq.png?branch=master)](https://travis-ci.org/tizzo/yaq)

Yet Another ([Redis Based](http://redis.io)) Queue system for [Node.js](http://nodejs.org/). This simple job queue focuses on simplicity, reliability, and on the ability to mock the queue without a real redis instance so that a real redis instance is not a requirement for testing projects leveraging Yaq.

## Features

  - Mockable
  - Reliable
  - Horizontally scalable

## Installation



## Usage

Creating a new queue for creating or processing jobs:

```javascript
var Yaq = require('Yaq');
var client = require('redis').createClient();
var queue = new Yaq(client);
```

Posting a new job
```javascript
queue.push({ some: 'data', more: 'data' });
````
Processing a posted job
```javascript
yaq.pop(function(job, jobCompleteCallback, itemId, timeOut) {
  // Do something...
  jobCompleteCallback();
});
```

Responding to job completion
```javascript
yaq.on('jobComplete', function(job, jobId) {
  // Do something...
});

```

## Redis Schema

  - yaq:available-queue - A redis list. Names of items awaiting processing.
  - yaq:in-progress-queue - A sorted set. Items currently being processed processing.
  - yaq:in-progress - A sorted list. Names of items currently being processed.
  - yaq:in-progress:timeout - A sorted set. Items currently being processed processed scored by their timeout.
  - yaq:id-highwater - An incremented field that generates unique ids for tasks.
