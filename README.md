# YAQ

[![Build Status](https://travis-ci.org/tizzo/yaq.png?branch=master)](https://travis-ci.org/tizzo/yaq)

Yet Another (Redis Based) Queue. Another very simple queuing system backed by redis with a focus on simplicity, reliability, and on the ability to mock the queue without a real redis instance.

## Redis Schema

  - yaq-active-queue - A redis set. Items awaiting processing.
  - yaq-in-progress - A sorted set. Items currently being processed processing.
