# DatFS

Proposal for a Dropbox-like system based on Dat

## Abstract

Cooperative, distributed and secure applications are hard to develop.
This is a proposal for a framework that aims to solve this problem.
The core part that already takes care of the secure file distribution is [Dat](https://datproject.org).
To maintain privacy and to control who has access to a file/folder the dat archives have to be encrypted.
To allow easy app development the framework exposes a HTTP API, for which a JS library will be provided.
This API needs to include an access permission module to protect from harmful software and destructive bugs.
Possible solutions to these problems will be discussed in the following.

## Idea

TODO...

## References / useful links

* [dat-node](https://github.com/datproject/dat-node)
* [hyperdrive](https://github.com/mafintosh/hyperdrive)
* [hypercore](https://github.com/mafintosh/hypercore)
* [hyperdb](https://github.com/mafintosh/hyperdb)
