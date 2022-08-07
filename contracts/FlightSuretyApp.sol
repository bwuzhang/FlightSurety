pragma solidity ^0.4.24;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Insurance status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ACTIVE = 10;
    uint8 private constant STATUS_CODE_CASE_END = 20;

    // Flight status codees
    uint8 private constant STATUS_CODE_ON_TIME = 30;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 40;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 50;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 60;
    uint8 private constant STATUS_CODE_LATE_OTHER = 70;

    address private contractOwner; // Account used to deploy contract
    FlightSuretyData flightSuretyData;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

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
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(
            flightSuretyData.isOperational(),
            "Contract is currently not operational"
        );
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireValidFlight(
        address airline,
        string memory flight,
        uint256 timestamp
    ) {
        require(
            flights[getFlightKey(airline, flight, timestamp)].isRegistered &&
                flights[getFlightKey(airline, flight, timestamp)].statusCode ==
                STATUS_CODE_UNKNOWN,
            "Flight is not valid"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContract) public {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns (bool) {
        return flightSuretyData.isOperational(); // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address airlineToRegisterAddress) external {
        flightSuretyData.registerAirline(airlineToRegisterAddress);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(string flight, uint256 timestamp) external {
        require(
            flightSuretyData.isActiveAirline(tx.origin),
            "Airline is invalid"
        );
        bytes32 key = getFlightKey(tx.origin, flight, timestamp);
        require(
            flights[key].isRegistered == false,
            "Flight has already been registered."
        );
        flights[key].isRegistered = true;
        flights[key].airline = tx.origin;
        flights[key].statusCode = STATUS_CODE_UNKNOWN;
        flights[key].updatedTimestamp = timestamp;
    }

    function isRegisteredFlight(
        address airline,
        string flight,
        uint256 timestamp
    ) external view returns (bool) {
        return flights[getFlightKey(airline, flight, timestamp)].isRegistered;
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        flights[key].statusCode = statusCode;
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp, key);
    }

    function buyInsurance(
        address airline,
        string flight,
        uint256 timestamp
    ) external payable requireValidFlight(airline, flight, timestamp) {
        flightSuretyData.buy.value(msg.value)(airline, flight, timestamp);
    }

    function calculatePayout(
        address insuree,
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        bytes32 key = getFlightKey(airline, flight, timestamp);

        require(flights[key].isRegistered, "Flight is not registered");
        require(
            flightSuretyData.getInsuranceStatusCode(insuree, key) ==
                STATUS_CODE_ACTIVE,
            "Insurance does not exist or is not active"
        );

        if (flights[key].statusCode != STATUS_CODE_UNKNOWN) {
            if (flights[key].statusCode == STATUS_CODE_LATE_AIRLINE) {
                flightSuretyData.increaseInsureePayout(
                    insuree,
                    (3 * flightSuretyData.getInsuranceAmount(insuree, key)) / 2
                );
            }

            flightSuretyData.updateInsuranceStatusCode(
                insuree,
                key,
                STATUS_CODE_CASE_END
            );
        }
    }

    function requestPayout() external {
        flightSuretyData.pay();
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status,
        bytes32 key
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        bytes32 key
    );

    event OracleRegistered(address oracle);

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
        emit OracleRegistered(msg.sender);
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );

        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );
        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(index, airline, flight, timestamp, statusCode, key);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            oracleResponses[key].isOpen = false;
            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}

contract FlightSuretyData {
    function isOperational() external view returns (bool);

    function registerAirline(address airlineToRegisterAddress) external;

    function isActiveAirline(address airline) external returns (bool);

    function buy(
        address airline,
        string flight,
        uint256 timestamp
    ) external payable;

    function creditInsurees(address insuree, uint256 amount) external;

    function pay() external;

    function getInsuranceStatusCode(address insuree, bytes32 key)
        external
        returns (uint8);

    function updateInsuranceStatusCode(
        address insuree,
        bytes32 key,
        uint8 statusCode
    ) external;

    function resetInsureePayout(address insuree) external;

    function increaseInsureePayout(address insuree, uint256 amount) external;

    function getInsuranceAmount(address insuree, bytes32 key)
        external
        returns (uint256);
}
