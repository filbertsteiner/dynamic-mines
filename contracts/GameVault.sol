// SPDX-License-Identifier: MIT
// FOR SECURITY RESEARCH ONLY — NOT FOR PRODUCTION USE
//
// Escrow "game vault" for the Mines demo on a testnet.
//
// The point of this contract: it holds player deposits that stay FULLY
// WITHDRAWABLE by the player, while separately tracking house revenue that has
// been "realized" (lost by players in the game). The owner (operator) can sweep
// ONLY the realized revenue to a treasury — the contract makes it impossible to
// sweep funds that are still owed to players.
//
//   contract balance = totalLiabilities (owed to players) + surplus (revenue)
//
// - deposit()          player funds in; fully withdrawable; increases liabilities
// - withdraw()         player takes their withdrawable balance back
// - realizeRevenue()   owner records game losses: moves funds from a player's
//                      withdrawable balance into sweepable surplus
// - sweep()            owner moves ONLY surplus (realized revenue) to a treasury
//                      (e.g. a Fireblocks-secured wallet). Player funds can't be touched.
pragma solidity ^0.8.20;

contract GameVault {
    address public owner;
    mapping(address => uint256) public balances; // withdrawable, per player
    uint256 public totalLiabilities; // sum of all balances (owed to players)

    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event RevenueRealized(address indexed player, uint256 amount);
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
        totalLiabilities += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        uint256 bal = balances[msg.sender];
        require(amount > 0 && amount <= bal, "invalid amount");
        balances[msg.sender] = bal - amount;
        totalLiabilities -= amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // Player cash-out that SETTLES game losses: the caller forfeits
    // `forfeitAmount` (funds they lost in the game) into house revenue and
    // withdraws the rest. This keeps on-chain accounting honest — lost funds
    // become sweepable surplus instead of staying wrongly owed to the player.
    function cashOut(uint256 forfeitAmount) external {
        uint256 bal = balances[msg.sender];
        require(forfeitAmount <= bal, "forfeit exceeds balance");
        uint256 payout = bal - forfeitAmount;
        balances[msg.sender] = 0;
        totalLiabilities -= bal; // whole balance leaves liabilities
        // `forfeitAmount` stays in the contract as surplus (realized revenue).
        if (payout > 0) {
            (bool ok, ) = payable(msg.sender).call{value: payout}("");
            require(ok, "payout failed");
        }
        emit Withdrawn(msg.sender, payout);
        if (forfeitAmount > 0) emit RevenueRealized(msg.sender, forfeitAmount);
    }

    // Player settles their OWN spend in real time: as credits are used in the
    // game, this moves `amount` out of the caller's withdrawable balance into
    // house revenue (surplus). No withdrawal required — revenue is recognized as
    // it's earned. Safe because a player can only reduce their own balance.
    function settle(uint256 amount) external {
        require(amount <= balances[msg.sender], "exceeds balance");
        balances[msg.sender] -= amount;
        totalLiabilities -= amount;
        emit RevenueRealized(msg.sender, amount);
    }

    // Owner records house revenue: the `amount` a player lost in the game moves
    // out of their withdrawable balance. The ETH stays in the contract, now as
    // surplus (revenue) rather than a liability.
    function realizeRevenue(address player, uint256 amount) external onlyOwner {
        require(amount <= balances[player], "exceeds player balance");
        balances[player] -= amount;
        totalLiabilities -= amount;
        emit RevenueRealized(player, amount);
    }

    // Funds in the contract that are NOT owed to any player = realized revenue.
    function surplus() public view returns (uint256) {
        return address(this).balance - totalLiabilities;
    }

    // Owner sweeps ONLY realized revenue to a treasury. Player funds are locked:
    // this reverts if `amount` would dip into money still owed to players.
    function sweep(address payable to, uint256 amount) external onlyOwner {
        require(amount <= surplus(), "exceeds realized revenue");
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
