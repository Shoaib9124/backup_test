// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    address public admin;

    // Mapping to track whether an address has voted
    mapping(address => bool) public hasVoted;

    struct Poll {
        string question;
        string[] options;
        mapping(uint => uint) votes; // Mapping to store votes for each option
        mapping(string => bool) usedQrCodes; // Mapping to track used QR codes
    }

    Poll[] public polls;

    // Event to log when a vote is cast
    event Voted(address indexed voter, uint256 pollIndex, uint256 optionIndex, string qrCode);

    constructor() {
        admin = msg.sender;
    }

    // Create a new poll
    function createPoll(string memory _question, string[] memory _options) public {
        require(msg.sender == admin, "Only the admin can create polls.");
        Poll storage newPoll = polls.push();
        newPoll.question = _question;
        for (uint i = 0; i < _options.length; i++) {
            newPoll.options.push(_options[i]);
        }
    }

    // Function to get the count of polls
    function pollsCount() public view returns (uint) {
        return polls.length;
    }

    // Get poll options for a specific poll index
    function getPollOptions(uint _pollIndex) public view returns (string[] memory) {
        return polls[_pollIndex].options;
    }

    // Vote in a poll
    function vote(uint256 pollIndex, uint256 optionIndex, string memory qrCode) public {
        // Ensure that the sender hasn't already voted
        require(!hasVoted[msg.sender], "You have already voted");

        // Ensure the poll exists and the optionIndex is valid
        require(pollIndex < polls.length, "Invalid poll index");
        Poll storage poll = polls[pollIndex];
        require(optionIndex < poll.options.length, "Invalid option index");

        // Ensure the QR code hasn't been used before
        require(!poll.usedQrCodes[qrCode], "This QR code has already been used");

        // Process the vote (increment the vote count for the selected option)
        poll.votes[optionIndex]++;

        // Mark the sender as having voted
        hasVoted[msg.sender] = true;

        // Mark the QR code as used
        poll.usedQrCodes[qrCode] = true;

        // Emit the vote event with QR code
        emit Voted(msg.sender, pollIndex, optionIndex, qrCode);
    }

    // Get poll results
    function getResults(uint _pollIndex) public view returns (uint[] memory) {
        require(_pollIndex < polls.length, "Poll does not exist.");
        Poll storage poll = polls[_pollIndex];
        uint[] memory results = new uint[](poll.options.length);
        for (uint i = 0; i < poll.options.length; i++) {
            results[i] = poll.votes[i];
        }
        return results;
    }
}
