pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) private authorizedAppContracts;             // Authorized app contracts
    mapping(address => bool) private registeredAirlines;                // Register airlines 
    mapping(address => bool) private activeAirlines;                    // Registered airlines that paid 10E
    uint256 private registeredAirlinesCount = 0;                        // Total registered airlines
    
    struct airlineToRegister{
        bool requested;
        mapping(address => bool) approvedAirlines;
        uint256 approvedAirlinesCount;
    }
    mapping(address => airlineToRegister) private airlinesToRegister;           // Airline to be reigstered
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event airlineRegistrationRequested(address airlineToRegisterAddress);
    event airlineRegistrationApproved(address airlineToRegisterAddress, address airlineApproved, uint256 approvalCount);
    event airlineRegistered(address airlineToRegisterAddress);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;

        // Assume contractOwner is the first airline
        registeredAirlines[msg.sender] = true;
        registeredAirlinesCount+=1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorizedCaller()
    {
        require(authorizedAppContracts[msg.sender], "Caller is not authorized");
        _;
    }

    modifier requireRegisteredAirline()
    {
        require(registeredAirlines[tx.origin], "Caller is not a registered airline");
        _;
    }

    modifier requireAirlineToRegisterRequested(address airlineToRegisterAddress)
    {
        require(airlinesToRegister[airlineToRegisterAddress].requested, "Airline to register is not requested");
        _;
    }

    modifier requireAirlineHasNotApproved(address airlineToRegisterAddress)
    {
        require(airlinesToRegister[airlineToRegisterAddress].approvedAirlines[tx.origin] == false, "Calling airline has already approved registration");
        _;
    }

    modifier requireActiveAirline()
    {
        require(activeAirlines[tx.origin], "Airline is not active");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    function authorizeCaller(address caller)
                            public
                            requireContractOwner
    {
        authorizedAppContracts[caller] = true;
    }

    function isAirline(address airline) public returns(bool){
        return activeAirlines[airline];
    }
    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address airlineToRegisterAddress
                            )
                            external
                            requireAuthorizedCaller
    {
        if (registeredAirlinesCount < 4){
            require(activeAirlines[tx.origin], "Only registered airline can register additional airlines");
            
            // Register airline
            registeredAirlines[airlineToRegisterAddress] = true;
            registeredAirlinesCount += 1;

            // emit airlineRegistered(airlineToRegisterAddress);

        }
        else {
            require(airlinesToRegister[airlineToRegisterAddress].requested == false, "Airline already waiting to be registered");
            
            airlinesToRegister[airlineToRegisterAddress].requested = true;
            // emit airlineRegistrationRequested(airlineToRegisterAddress);
        }
    }

    function approveAirlineRegistration(
        address airlineToRegisterAddress
    )
    external
    requireAuthorizedCaller
    requireActiveAirline
    requireAirlineToRegisterRequested(airlineToRegisterAddress)
    requireAirlineHasNotApproved(airlineToRegisterAddress)
    {
        airlinesToRegister[airlineToRegisterAddress].approvedAirlines[tx.origin] = true;
        airlinesToRegister[airlineToRegisterAddress].approvedAirlinesCount += 1;

        // emit airlineRegistrationApproved(airlineToRegisterAddress, tx.origin, airlinesToRegister[airlineToRegisterAddress].approvedAirlinesCount);

        // Register airline if consensus reached
        if (airlinesToRegister[airlineToRegisterAddress].approvedAirlinesCount > registeredAirlinesCount/2)
        {
            airlinesToRegister[airlineToRegisterAddress].requested = false;
            registeredAirlines[airlineToRegisterAddress] = true;
            registeredAirlinesCount += 1;
        }
    }



   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
                            requireRegisteredAirline

    {
        require(msg.value >= 10 ether, "Fund has to be greater than 10 ether");
        activeAirlines[tx.origin] = true;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

