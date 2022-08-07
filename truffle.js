var HDWalletProvider = require("@truffle/hdwallet-provider");

const fs = require("fs");
let secrets;

if (fs.existsSync("secrets.json")) {
  secrets = JSON.parse(fs.readFileSync("secrets.json", "utf8"));
}

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      // from: '0x3ec7a486e12BFBb97646904aB569B20d0709BC41'
    },
  },
  compilers: {
    solc: {
      version: "^0.4.24",
    },
  },
};
