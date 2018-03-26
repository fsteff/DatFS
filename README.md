# DatFS

Dropbox-like system based on Dat<br>
Current status: **Proposal (WIP)** <br>
*Warning: I am no cryptography expert, before any of this is implemented it should be reviewed by someone with more expertise*

## Abstract

Cooperative, distributed and secure applications are hard to develop.
This is a proposal for a framework that aims to solve this problem.
The core part that already takes care of the secure file distribution is [Dat](https://datproject.org).<br>
To maintain privacy and to control who has access to a file/folder the dat archives have to be encrypted.<br>
To allow easy app development the framework exposes a JavaScript and/or WebAssembly API.<br>
This API needs to include an access permission module to protect from harmful software and destructive bugs. Also, this should check the integrity of the executeable to improve security<br>
Possible solutions to these problems will be discussed in the following.<br>
*To make the text easier readable it is written as if it was already implemented.*

## Overview

### [Entity](#entity)

An entity can be a device, app or user and has a unique id.
Every entity has a cryptographic public and a private key, where the public key is visible to anyone and the private key is stored in a safe place.

### [DataObject](#dataobject)

A DataObject can be a file, directory, symbolic link or just a blob of data.
DatFS logically is a tree with DataObjects as nodes. A file or blob is a leaf node and a directory or a symbolic is a node that refers to one many further DataObject(s).<br>
DataObjects are packed into Dat [HyperDB](https://github.com/mafintosh/hyperdb) instances induvidially or in groups, depending on multiple factors.

### [Routing](#routing)

DatFS uses [discovery-swarm](https://github.com/mafintosh/discovery-swarm) and/or [libp2p](https://libp2p.io/) for routing.<br>
Per default a swarm of all known and trusted entities is created using libp2p, which should enhance performance and routing capabilities compared to discovery-swarm, which is usually used by Dat.<br>
For public DataObjects/Archives and to enable compatibility to the rest of the dat ecosystem discovery-swarm is used.

### [API](#api)

*TODO*

## Example visualisation

![example.png](https://raw.githubusercontent.com/fsteff/DatFS/master/example.png)

## Entity

An entity can be a device, app or user and has a unique id.<br>
Every entity has a cryptographic public and a private key, where the public key is visible to anyone and the private key is stored in a safe place.<br>
To make things easier the entity id is using libp2p's [peer-id](https://github.com/libp2p/js-peer-id) which consists of at least a public key and its SHA-256 hash value(-[multihash](https://github.com/multiformats/multihash)).
If the private key is known it is also stored in the peer-id object.
An entity may also include some additional information:

* Contact (eg. [hCard](https://en.wikipedia.org/wiki/HCard)) or public profile information if the entity is a user
* Owner entity-id, type (pc, mobile, provider,...) if the entity is a device
* Description (developer, version, permissions, ...) if the entity is an app

<br>
*TODO: do research on [hyperidentity](https://github.com/poga/hyperidentity)*

### Outbox

Each entity has a number of outboxes that are used to communicate with other entities.<br>
Each outbox is identified using the SHA-256 hash of the recipient's public key plus the entity's public key as salt.<br>
Essentially the outbox is a DataObject, but encrypted using the recipient's public key.<br>
As this must be publically available (to allow an entitiy to contact an other entity it has not communicated with before), there is always a little chance someone misuses this to find out who is communicating with whom. But to be able to do this the attacker has to know the public keys of both entities.

## DataObject

A DataObject can be a file, directory, symbolic link or just a blob of data.
DatFS logically is a tree with DataObjects as nodes. A file or blob is a leaf node and a directory or a symbolic is a node that refers to one many further DataObject(s).<br>
DataObjects are packed into Dat [HyperDB](https://github.com/mafintosh/hyperdb) instances induvidially or in groups, depending on multiple factors.<br>
If a DataObject is a subdirectory of a other DataObject, the HyperDb instance is simply "mounted" onto a directory of the parent DataObject.<br>
*TODO: convince the dat team to implement a way to mount a hyperdb instance in an other hyperdb (or implement it)*<br>
HyperDB uses a number of [hypercore](https://github.com/mafintosh/hypercore) append-only feeds, which have to be encrypted if not meant to be publically available.<br>
To make it possible to add and remove entities that are able to read a DataObject, each hypercore feed has to be encrypted induvidially using a number of keys.<br>
If an entity should not be able to read future changes anymore, a new key is generated for every hypercore feed. Every future change, which is nothing other than a new entry in one of the feeds, this uses now a new key and the entity is not able to read it anymore.<br>
*For encrypting the data a modified version of HyperDB built on the top of [hypercore-encrypted](https://github.com/fsteff/hypercore-encrypted) (or something similar as this, for now, is only a proof of concept) could be of use.*<br><br>
To make the management of readers and writers of induvidial DataObjects easier, hyperdb could use some more features: *(TODO: convince the dat team to implement that or implement ourself)*<br>
* Removing writers (currently not possible, but will for sure be added)
* Sharing the feeds containing the writers between multiple hyperdb instances
* Packing multiple entity entries to one (eg. a user may have multiple devices) so this can be managed somewhere else - (dangerous inconsistencies possible)

## Routing

DatFS uses [discovery-swarm](https://github.com/mafintosh/discovery-swarm) and/or [libp2p](https://libp2p.io/) for routing.
**Default usecase (libp2p):**
A set of swarms of all known and trusted entities is created using libp2p.<br>
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
* [hypercore-encrypted](https://github.com/fsteff/hypercore-encrypted)
* [hyperdb](https://github.com/mafintosh/hyperdb)
* [discovery-swarm](https://github.com/mafintosh/discovery-swarm)
* [libp2p](https://libp2p.io/)
* [hyperidentity](https://github.com/poga/hyperidentity)

## What next?

I am planning to implement this (or at least a subset of it) as part of my bachelor's thesis, starting fall 2018.<br><br>
I would be happy to hear your feedback, just open an issue or contact me directly.
