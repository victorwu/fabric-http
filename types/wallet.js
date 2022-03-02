'use strict';

const Fabric = require('@fabric/core');
const bcoin = require('bcoin/lib/bcoin-browser').set('regtest'); // bcoin
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');

const WalletDB = bcoin.WalletDB; // TODO: bcoin
// const WalletKey = bcoin.wallet.WalletKey; // TODO: bcoin
// const KeyRing = bcoin.KeyRing; // TODO: bcoin
// const Mnemonic = bcoin.hd.Mnemonic; // bcoin
// const HD = bcoin.hd; // TODO: bcoin

/**
 * Manage keys and track their balances.
 * @type {Object}
 */
class Wallet extends Fabric.Service {
  /**
   * Create an instance of a {@link Wallet}.
   * @param  {Object} [settings={}] Configure the wallet.
   * @return {Wallet}               Instance of the wallet.
   */
  constructor (settings = {}) {
    super(settings);

    this.settings = Object.assign({
      name: 'default',
      network: 'regtest'
    }, settings);


    // Add wallet database into memory
    this.database = new WalletDB({ // TODO: bcoin
      db: 'memory',
      network: 'regtest'
    });

    this.account = null;
    this.manager = null;
    this.wallet = null;
    this.master = null;
    this.seed = null;

    this.words = bip39.wordlists.english; // get wordlist
    this.mnemonic = bip39.generateMnemonic(); // generate a new wallet seed phrase

    this.status = 'closed';

    return this;
  }

  _handleWalletTransaction (tx) {
    console.log('[BRIDGE:WALLET]', 'incoming transaction:', tx);
  }

  _getDepositAddress () {
    return this.address;
  }

  _getSeed () {
    return this.seed;
  }

  _getAccountByIndex (index = 0) {
    return {
      address: this.account.deriveReceive(index).getAddress('string')
    };
  }

  async _handleWalletBalance (balance) {
    console.log('wallet balance:', balance);
    await this._PUT(`/balance`, balance);

    let depositor = new Fabric.State({ name: 'eric' });
    await this._PUT(`/depositors/${depositor.id}/balance`, balance);
    this.emit('balance', balance);
  }

  async _registerAccount (obj) {
    this.status = 'creating';

    if (!this.database.db.loaded) { // TODO: bcoin
      await this.database.open(); // TODO: bcoin
    }

    try {
      this.wallet = await this.database.create(); // TODO: bcoin
    } catch (E) {
      console.error('Could not create wallet:', E);
    }

    if (this.manager) {
      this.manager.on('tx', this._handleWalletTransaction.bind(this));
      this.manager.on('balance', this._handleWalletBalance.bind(this));
    }

    return this.account;
  }

  async _unload () {
    return this.database.close(); // TODO: bcoin
  }

  async _load (settings = {}) {
    let self = this;

    this.status = 'loading';

    await this.database.open(); // TODO: bcoin

    this.wallet = await this.database.create(); // TODO: bcoin
    this.account = await this.wallet.getAccount('default'); // TODO: bcoin
    this.address = await this.account.receiveAddress();
    this.seed = this.wallet.master.mnemonic.phrase; // TODO: bcoin

    this.status = 'loaded';

    this.emit('ready');

    console.log('[FABRIC:WALLET]', 'Wallet opened:', this.wallet); // TODO: bcoin

    return this.wallet; // TODO: bcoin
  }

  async start () {
    return this._load();
  }
}

module.exports = Wallet;
