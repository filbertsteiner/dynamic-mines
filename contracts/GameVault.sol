// SPDX-License-Identifier: MIT
// FOR SECURITY RESEARCH ONLY — NOT FOR PRODUCTION USE
//
// Escrow "game vault" for the Mines demo on a testnet.
// - Anyone can deposit; each player's balance is tracked separately and a
//   player can self-withdraw up to what THEY deposited (trustless UX).
// - An `owner` (the deployer) can `sweep` funds to a main wallet to refund or
//   redistribute — the realistic "house treasury" model. Because the owner can
//   move funds, in production that owner key is exactly what Fireblocks secures.
pragma solidity ^0.8.20;

contract GameVault {
    address public owner;
    mapping(address => uint256) public balances;

    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event Swept(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed newOwner);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function deposit() external payable {
        require(msg.value > 0, "zero deposit");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        uint256 bal = balances[msg.sender];
        require(amount > 0 && amount <= bal, "invalid amount");
        // Effects before interaction (reentrancy-safe).
        balances[msg.sender] = bal - amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // Operator control: move collected funds to a main wallet / redistribute.
    function sweep(address payable to, uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "insufficient");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "sweep failed");
        emit Swept(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        owner = newOwner;
        emit OwnershipTransferred(newOwner);
    }

    receive() external payable {}
}
