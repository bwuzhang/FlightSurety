import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];

      let counter = 0;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }

      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  fetchFlightStatus(flight, timestamp, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: timestamp,
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }

  registerFlight(flight, timestamp, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: timestamp,
    };
    self.flightSuretyApp.methods
      .registerFlight(payload.flight, payload.timestamp)
      .send(
        { from: self.owner, gas: 4700000, gasPrice: 200000000 },
        (error, result) => {
          callback(error, payload);
        }
      );
  }

  buyInsurance(airline, flight, timestamp, value, callback) {
    let self = this;
    let payload = {
      airline: airline,
      flight: flight,
      timestamp: timestamp,
    };
    self.flightSuretyApp.methods
      .buyInsurance(payload.airline, payload.flight, payload.timestamp)
      .send(
        { from: self.owner, gas: 4700000, gasPrice: 200000000, value: value },
        (error, result) => {
          callback(error, payload);
        }
      );
  }

  calculatePayment(airline, flight, timestamp, callback) {
    let self = this;
    let payload = {
      airline: airline,
      flight: flight,
      timestamp: timestamp,
    };
    self.flightSuretyApp.methods
      .calculatePayout(
        self.owner,
        payload.airline,
        payload.flight,
        payload.timestamp
      )
      .send(
        { from: self.owner, gas: 4700000, gasPrice: 200000000 },
        (error, result) => {
          callback(error, payload);
        }
      );
  }

  getPaid(callback) {
    let self = this;
    let payload = {
      insurer: self.owner,
    };
    self.flightSuretyApp.methods
      .requestPayout()
      .send(
        { from: self.owner, gas: 4700000, gasPrice: 200000000 },
        (error, result) => {
          callback(error, payload);
        }
      );
  }
}
