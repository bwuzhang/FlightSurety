
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const ETHER_TO_WEI = 1000000000000000000;
contract('Flight Surety Tests', async (accounts) => {

  var config;
  beforeEach('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[1];
    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: accounts[0]});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isActiveAirline.call(accounts[0]); 

    result = await config.flightSuretyData.isActiveAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(airline) becomes active after paying 10 ether', async () => {
    try {
        await config.flightSuretyData.fund({from: accounts[0], value: 10 * ETHER_TO_WEI});
    } catch (error) {
        
    }

    let result = await config.flightSuretyData.isActiveAirline.call(accounts[0]); 
    assert.equal(result, true, "Paying 10 ether will make airline active");
  });

  it('(airline) can register other airlines if active', async () => {
    // Fund #1 airline
    await config.flightSuretyData.fund({from: accounts[0], value: 10 * ETHER_TO_WEI});

    // Register #2 - #5 airline
    await config.flightSuretyApp.registerAirline(accounts[1], {from: accounts[0]});
    await config.flightSuretyApp.registerAirline(accounts[2], {from: accounts[0]});
    await config.flightSuretyApp.registerAirline(accounts[3], {from: accounts[0]});
    await config.flightSuretyApp.registerAirline(accounts[4], {from: accounts[0]});

    let result1 = await config.flightSuretyData.isRegisteredAirline.call(accounts[1]); 
    let result2 = await config.flightSuretyData.isRegisteredAirline.call(accounts[2]); 
    let result3 = await config.flightSuretyData.isRegisteredAirline.call(accounts[3]); 
    let result4 = await config.flightSuretyData.isRegisteredAirline.call(accounts[4]); 

    assert.equal(result1, true, "Active airline can register another airline #2");
    assert.equal(result2, true, "Active airline can register another airline #3");
    assert.equal(result3, true, "Active airline can register another airline #4");
    assert.equal(result4, false, "Consensus needed for the #5 airline registered");
  });

  it('(airline) can register 5th airline if consensus reached', async () => {
    // Fund #1 airline
    await config.flightSuretyData.fund({from: accounts[0], value: 10 * ETHER_TO_WEI});

    // Register #2 - #4 airline
    await config.flightSuretyApp.registerAirline(accounts[1], {from: accounts[0]});
    await config.flightSuretyApp.registerAirline(accounts[2], {from: accounts[0]});
    await config.flightSuretyApp.registerAirline(accounts[3], {from: accounts[0]});

    // Fund #2 - #4 airline 
    await config.flightSuretyData.fund({from: accounts[1], value: 10 * ETHER_TO_WEI});
    await config.flightSuretyData.fund({from: accounts[2], value: 10 * ETHER_TO_WEI});
    await config.flightSuretyData.fund({from: accounts[3], value: 10 * ETHER_TO_WEI});

    // Register #5 airline
    await config.flightSuretyApp.registerAirline(accounts[4], {from: accounts[0]});

    // Approve # airline from #2 and #3 to reach consensus: 3/4
    await config.flightSuretyData.approveAirlineRegistration(accounts[4], {from: accounts[1]});
    await config.flightSuretyData.approveAirlineRegistration(accounts[4], {from: accounts[2]});

    let result = await config.flightSuretyData.isRegisteredAirline.call(accounts[4]);
    assert.equal(result, true, "The #5 airline can be registered when consensus reached");
  });

  it('(airline) can register flight', async () => {
    // Fund #1 airline
    await config.flightSuretyData.fund({from: accounts[0], value: 10 * ETHER_TO_WEI});

    // Register flight
    await config.flightSuretyApp.registerFlight("Flight 1", 20220801, {from: accounts[0]});

    let result = await config.flightSuretyApp.isRegisteredFlight.call(accounts[0], "Flight 1", 20220801, {from: accounts[0]});
    assert.equal(result, true, "Flight should be registered.");
  });

  it('(passenger) can buy insurance for a flight', async () => {
    // Fund #1 airline
    await config.flightSuretyData.fund({from: accounts[0], value: 10 * ETHER_TO_WEI});

    // Register flight
    await config.flightSuretyApp.registerFlight("Flight 1", 20220801, {from: accounts[0]});

    // Buy insurance
    await config.flightSuretyApp.buyInsurance(accounts[0], "Flight 1", 20220801, {from: accounts[1], value: 0.5 * ETHER_TO_WEI});

    let result = await config.flightSuretyData.getInsuranceStatusCode(accounts[1], accounts[0], "Flight 1", 20220801);
    assert.equal(result, 10, "Insurnace should be active.");
  } )
});
