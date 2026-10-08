// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title 3GGA Test Token (3GTT)
/// @notice Controlled-environment test token for admin-owned fraud-interception
/// drills (address poisoning / fake-token vectors). NOT a real asset, holds no
/// value. Deployer receives the full initial supply for drill transfers.
contract FakeToken {
    string public name = "3GGA Test Token";
    string public symbol = "3GTT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    constructor() {
        totalSupply = 1000000 * 1e18;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "3GTT: insufficient balance");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "3GTT: allowance exceeded");
        require(balanceOf[from] >= amount, "3GTT: insufficient balance");
        unchecked {
            allowance[from][msg.sender] = allowed - amount;
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
        return true;
    }

    /// @notice Poisoning drill: emits Transfer(sender, to, 0) with NO balance
    /// movement — the exact zero-value pattern interception drills analyze.
    function emitPoisonedTransfer(address to) external {
        emit Transfer(msg.sender, to, 0);
    }
}
