
var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');
const ETHER_TO_WEI = 1000000000000000000;
// Watch contract events
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ACTIVE = 10;
const STATUS_CODE_CASE_END = 20;
const STATUS_CODE_ON_TIME = 30;
const STATUS_CODE_LATE_AIRLINE = 40;
const STATUS_CODE_LATE_WEATHER = 50;
const STATUS_CODE_LATE_TECHNICAL = 60;
const STATUS_CODE_LATE_OTHER = 70;

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);


  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {
    // Fund #1 airline
    await config.flightSuretyData.fund({from: accounts[0], value: 10 * ETHER_TO_WEI});

    // Register flight
    await config.flightSuretyApp.registerFlight("Flight 1", 20220801, {from: accounts[0]});
    // ARRANGE
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);
    await config.flightSuretyApp.registerFlight(flight, timestamp, {from: accounts[0]});

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(accounts[0], flight, timestamp);
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
      for(let idx=0;idx<3;idx++) {

        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], accounts[0], flight, timestamp, STATUS_CODE_ON_TIME, { from: accounts[a] });
          console.log('\nAccepted', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }
        catch(e) {
          // Enable this when debugging
          //  console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }

      }
    }


  });


 
});
