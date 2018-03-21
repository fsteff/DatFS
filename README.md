# DatFS

Dropbox-like system based on Dat
Current status: **Proposal**

## Abstract

Cooperative, distributed and secure applications are hard to develop.
This is a proposal for a framework that aims to solve this problem.
The core part that already takes care of the secure file distribution is [Dat](https://datproject.org).
To maintain privacy and to control who has access to a file/folder the dat archives have to be encrypted.
To allow easy app development the framework exposes a HTTP API, for which a JS library will be provided.
This API needs to include an access permission module to protect from harmful software and destructive bugs.
Possible solutions to these problems will be discussed in the following.<br>
*To make the text easier readable it is written as if it was already implemented.*

## Overview

### [Entity](#entity)

An entity can be a device, app or user and has a unique id.
Every entity has a cryptographic public and a private key, where the public key is visible to anyone and the private key is stored in a safe place.

### [DataObject](#dataobject)

A DataObject can be a file, directory, symbolic link or just a blob of data.
DatFS logically is a tree with DataObjects as nodes. A file or blob is a leaf node and a directory or a symbolic is a node that refers to one many further DataObject(s).
DataObjects are packed into Dat archives induvidially or in groups, depending on multiple factors.

### [Routing](#routing)

DatFS uses [discovery-swarm](https://github.com/mafintosh/discovery-swarm) and/or [libp2p](https://libp2p.io/) for routing.
Per default a swarm of all known and trusted entities is created using libp2p, which should enhance performance and routing capabilities compared to discovery-swarm, which is usually used by Dat.
For public DataObjects/Archives and to enable compatibility to the rest of the dat ecosystem discovery-swarm is used.

## Entity

An entity can be a device, app or user and has a unique id.
Every entity has a cryptographic public and a private key, where the public key is visible to anyone and the private key is stored in a safe place.
To make things easier the entity id is using libp2p's [peer-id](https://github.com/libp2p/js-peer-id) which consists of at least a public key and its SHA-256 hash value(-[multihash](https://github.com/multiformats/multihash)).
If the private key is known it is also stored in the peer-id object.
An entity may also include some additional information:
* Contact (eg. [hCard](https://en.wikipedia.org/wiki/HCard)) or public profile information if the entity is a user
* Owner entity-id, type (pc, mobile, provider,...) if the entity is a device
* Description (developer, version, permissions, ...) if the entity is an app

## DataObject

## Routing

DatFS uses [discovery-swarm](https://github.com/mafintosh/discovery-swarm) and/or [libp2p](https://libp2p.io/) for routing.
**Default usecase (libp2p):**
A set of swarms of all known and trusted entities is created using libp2p.
Such a swarm consists of a small (~ max. 100) number of entities that have something in common. Every entity/node has either a direct or indirect connection to every other node in the swarm.<br>
*(TODO: do some research about to what extent this is implemented in libp2p)*<br>
Multiple protocols may be multiplexed over each connection - eg. Dat ([hypercore-protocol](https://github.com/mafintosh/hypercore-protocol)), some future DatFS internal protocol or an app specific stream.

For the discovery of peers there multiple possibilities:
* mDNS ([libp2p-mdns](https://github.com/libp2p/js-libp2p-mdns))
* Kademlia DHT ([libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht))
* Peer exchange between nodes of a swarm

For indirect routing a peer may "ask" an other peer to forward messages to an other peer. But to prevent attacks this other peer will only do accept this if it trusts the sender.
Therefore a peer stores a multi-dimensional trust value that is based on a range of statistics:<br>
*(TODO: evaluate which statistics are useful for this)*

**Public/Compatibility mode (dat's discovery-swarm):**
For public DataObjects/Archives and to enable compatibility to the rest of the dat ecosystem discovery-swarm is used.

## References / useful links

* [dat-node](https://github.com/datproject/dat-node)
* [hyperdrive](https://github.com/mafintosh/hyperdrive)
* [hypercore](https://github.com/mafintosh/hypercore)
* [hyperdb](https://github.com/mafintosh/hyperdb)
* [discovery-swarm](https://github.com/mafintosh/discovery-swarm)
* [libp2p](https://libp2p.io/)

## What next?

I am planning to implement this (or at least a subset of it) as part of my bachelor's thesis, starting fall 2018.<br>
I would be happy to hear your feedback, just open an issue or contact me directly.