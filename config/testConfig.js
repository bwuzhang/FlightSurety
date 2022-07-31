
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x3ec7a486e12BFBb97646904aB569B20d0709BC41",
        "0x95aA6Bdf8dD5833aB086775bFd43cD4eE3A5c3B2",
        "0xd6d5eA650131786172Ebc054aD59D8d5a65f0012",
        "0x433bfEB3177Fc3338fa4112938Df04B68D698Ac2",
        "0x7aD926330fC581Cf17Cfab7FAF68050E46d16f5B",
        "0xFB2e6418FA873ed466e08e37FAbb70d304803F0F",
        "0xcb861a442332BEB0d76cdC5C8d2783383eB3af9A",
        "0xFD987b337cCb5fd67a3bE9cb4e1c96756cED6Bb7",
        "0x0Fa67573AFE1245BEEd96FcF285b5AA2704d5D0B",
        "0xA67305084F5e3dc300f752d33D39ddad6735972F"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new();
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};