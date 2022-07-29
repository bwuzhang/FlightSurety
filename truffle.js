var HDWalletProvider = require("@truffle/hdwallet-provider");

const fs = require('fs');
let secrets;

if (fs.existsSync('secrets.json')) {
 secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
}

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(secrets.mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      gas: 4500000
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};