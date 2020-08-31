'use strict';

// TODO: replace with bcoin
const Base58Check = require('base58check');

// Dependencies
const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Dependencies
const bcoin = require('bcoin');

// Fabric Types
const Entity = require('./entity');

class Key extends Entity {
  constructor (init = {}) {
    super(init);

    this.config = Object.assign({
      network: 'main',
      prefix: '00',
      private: null
    }, init);

    if (this.config.seed) {
      // Seed provided, compute keys
      let mnemonic = new bcoin.Mnemonic(this.config.seed);
      let master = bcoin.hd.fromMnemonic(mnemonic);
      let ring = new bcoin.KeyRing(master, this.config.network);

      // Assign keys
      this.keypair = ec.keyFromPrivate(ring.getPrivateKey('hex'));
    } else if (init.pubkey) {
      // Key is only public
      this.keypair = ec.keyFromPublic(init.pubkey, 'hex');
    } else if (this.config.private) {
      // Key is private
      this.keypair = ec.keyFromPrivate(this.config.private, 16);
    } else {
      // Generate new keys
      this.keypair = ec.genKeyPair();
    }

    this.private = this.keypair.getPrivate();
    this.public = this.keypair.getPublic(true);

    this.pubkey = this.public.encodeCompressed('hex');
    this.pubkeyhash = crypto.createHash('sha256').update(this.pubkey).digest('hex');

    let input = `${this.config.prefix}${this.pubkeyhash}`;
    let hash = crypto.createHash('sha256').update(input).digest('hex');
    let safe = crypto.createHash('sha256').update(hash).digest('hex');
    let checksum = safe.substring(0, 8);
    let address = `${input}${checksum}`;

    this.ripe = crypto.createHash('ripemd160').update(input).digest('hex');
    this.address = Base58Check.encode(this.ripe);

    this['@data'] = {
      'type': 'Key',
      'public': this.pubkey,
      'address': this.address
    };

    Object.defineProperty(this, 'keypair', {
      enumerable: false
    });

    Object.defineProperty(this, 'private', {
      enumerable: false
    });

    return this;
  }

  get id () {
    return this.pubkeyhash;
  }

  _sign (msg) {
    // console.log(`[KEY] signing: ${msg}...`);
    if (typeof msg !== 'string') msg = JSON.stringify(msg);
    let hmac = crypto.createHash('sha256').update(msg).digest('hex');
    let signature = this.keypair.sign(hmac);
    // console.log(`[KEY] signature:`, signature);
    return signature.toDER();
  }

  _verify (msg, sig) {
    let hmac = crypto.createHash('sha256').update(msg).digest('hex');
    let valid = this.keypair.verify(hmac, sig);
    return valid;
  }
}

module.exports = Key;
