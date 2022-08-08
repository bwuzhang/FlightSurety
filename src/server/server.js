import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);
let flightSuretyData = new web3.eth.Contract(
  FlightSuretyData.abi,
  config.dataAddress
);
let index_to_oracles = {};
function initOracles() {
  return new Promise((resolve, reject) => {
    web3.eth
      .getAccounts()
      .then((accounts) => {
        accounts.forEach((account) =>
          flightSuretyApp.methods
            .registerOracle()
            .send({
              from: account,
              value: web3.utils.toWei("1", "ether"),
              gas: 4700000,
              gasPrice: 200000000,
            })
            .then(() => {
              flightSuretyApp.methods
                .getMyIndexes()
                .call({ from: account })
                .then(
                  (result) =>
                    // console.log(`${result[0]}, ${result[1]}, ${result[2]}`)
                    result.forEach(
                      (index) => addDict(index_to_oracles, index, account)
                      // console.log(index)
                    )
                  // if (!index_to_oracles[result[0]])
                  // {index_to_oracles[result[0]] = [account]};
                )
                .catch((err) => {
                  reject(err);
                });
            })
            .catch((err) => {
              reject(err);
            })
        );
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function initAccounts() {
  return new Promise((resolve, reject) => {
    web3.eth
      .getAccounts()
      .then((accounts) => {
        flightSuretyData.methods.fund().send({
          from: accounts[0],
          value: web3.utils.toWei("10", "ether"),
          gas: 4700000,
          gasPrice: 200000000,
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function addDict(dict, index, item) {
  // console.log(dict, index, item);
  if (!(index in dict)) {
    dict[index] = [item];
  } else {
    dict[index].push(item);
  }
  // console.log(dict);
}

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) {
      console.log(error);
    } else {
      console.log(event);
      index_to_oracles[event.returnValues.index].forEach((account) =>
        // for (var account in index_to_oracles[event.returnValues.index]) {
        // console.log(
        //   event.returnValues.index,
        //   // event.returnValues.airline,
        //   // event.returnValues.flight,
        //   // event.returnValues.timestamp,
        //   index_to_oracles[event.returnValues.index]
        // );
        flightSuretyApp.methods
          .submitOracleResponse(
            event.returnValues.index,
            event.returnValues.airline,
            event.returnValues.flight,
            event.returnValues.timestamp,
            40 // As a dummy server, always return STATUS_CODE_LATE_AIRLINE on all flights
          )
          .send({ from: account, gas: 4700000, gasPrice: 200000000 })
      );
    }
    // console.log(event.returnValues.index);
  }
);

flightSuretyApp.events.OracleRegistered(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) {
      console.log(error);
    } else {
      console.log(event);
    }
  }
);

flightSuretyApp.events.OracleReport(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) {
      console.log(error);
    } else {
      console.log(event);
    }
  }
);

initAccounts();
initOracles();
console.log(index_to_oracles);

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

export default app;
