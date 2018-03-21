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

## Overview

### [Entity](#entity)

An entity can be a device, app or user and has a unique id.
Every entity has a cryptographic public and a private key, where the public key is visible to anyone and the private key is stored in a safe place.

### [DataObject](#dataobject)

A DataObject can be a file, directory, symbolic link or just a blob of data.
DatFS logically is a tree with DataObjects as nodes. A file or blob is a leave and a directory or a symbolic refers to one many further DataObjects.
DataObjects are packed into Dat archives induvidially or in groups, depending on multiple factors.

### [Routing](#routing)

DatFS uses [discovery-swarm](https://github.com/mafintosh/discovery-swarm) and/or [libp2p](https://libp2p.io/) for routing.
Per default a swarm of all known and trusted entities is created using libp2p, which should enhance performance and routing capabilities compared to discovery-swarm, which is usually used by Dat.
For public DataObjects/Archives and to enable compatibility to the rest of the dat ecosystem discovery-swarm is used.

## Entity

## DataObject

## Routing

## References / useful links

* [dat-node](https://github.com/datproject/dat-node)
* [hyperdrive](https://github.com/mafintosh/hyperdrive)
* [hypercore](https://github.com/mafintosh/hypercore)
* [hyperdb](https://github.com/mafintosh/hyperdb)
