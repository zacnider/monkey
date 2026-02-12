// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MonkeyVault
 * @notice Trustless vault for MONKEY AI Trading Agents platform.
 *         Manages donations, executes trades on nad.fun via BondingCurveRouter,
 *         distributes 80% of profits to donors, and buys MKEY with 20%.
 */

// ─── Interfaces ──────────────────────────────────────────────

interface IBondingCurveRouter {
    struct BuyParams {
        uint256 amountOutMin;
        address token;
        address to;
        uint256 deadline;
    }

    struct SellParams {
        uint256 amountIn;
        uint256 amountOutMin;
        address token;
        address to;
        uint256 deadline;
    }

    function buy(BuyParams calldata params) external payable returns (uint256 amountOut);
    function sell(SellParams calldata params) external returns (uint256 amountOut);
}

interface ILens {
    function getAmountOut(address token, uint256 amountIn, bool isBuy)
        external
        view
        returns (address router, uint256 amountOut);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

// ─── Contract ────────────────────────────────────────────────

contract MonkeyVault {
    // ─── Constants ───────────────────────────────────────────
    uint8 public constant MAX_AGENTS = 8;
    uint256 public constant DONOR_SHARE_BPS = 8000; // 80%
    uint256 public constant MKEY_SHARE_BPS = 2000;  // 20%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_CLAIM_AMOUNT = 0.001 ether;

    // ─── State ───────────────────────────────────────────────
    address public owner;
    address public operator;
    IBondingCurveRouter public bondingCurveRouter;
    ILens public lens;
    IERC20 public mkeyToken;

    bool private _locked;

    struct AgentInfo {
        bool isActive;
        uint256 balance;            // MON available for trading
        uint256 totalDonated;       // Total MON donated to this agent
        int256 totalPnl;            // Net realized PnL
        uint256 mkeyBalance;        // MKEY tokens held (never sold)
        uint256 totalDistributed;   // Total MON distributed to donors
        uint256 tradeCount;
    }

    struct DonorInfo {
        uint256 totalDonated;       // Total MON donated to this agent
        uint256 totalClaimed;       // Total MON claimed
        uint256 pendingEarnings;    // Unclaimed earnings
    }

    // agentId (0-7) => AgentInfo
    mapping(uint8 => AgentInfo) public agents;
    // agentId => donor address => DonorInfo
    mapping(uint8 => mapping(address => DonorInfo)) public donors;
    // agentId => list of donor addresses
    mapping(uint8 => address[]) public donorList;
    // agentId => donor address => index in donorList (for dedup check)
    mapping(uint8 => mapping(address => bool)) public isDonor;
    // agentId => token address => amount held
    mapping(uint8 => mapping(address => uint256)) public agentHoldings;
    // agentId => token address => cost basis (MON spent)
    mapping(uint8 => mapping(address => uint256)) public agentCostBasis;

    // ─── Events ──────────────────────────────────────────────
    event Donated(uint8 indexed agentId, address indexed donor, uint256 amount);
    event TradeExecuted(
        uint8 indexed agentId,
        address indexed token,
        bool isBuy,
        uint256 amountIn,
        uint256 amountOut
    );
    event ProfitDistributed(uint8 indexed agentId, uint256 donorPool, uint256 mkeyAmount);
    event EarningsClaimed(uint8 indexed agentId, address indexed donor, uint256 amount);
    event MkeyPurchased(uint8 indexed agentId, uint256 monSpent, uint256 mkeyReceived);
    event AgentActivated(uint8 indexed agentId);
    event AgentDeactivated(uint8 indexed agentId);

    // ─── Modifiers ───────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "Not operator");
        _;
    }

    modifier validAgent(uint8 agentId) {
        require(agentId < MAX_AGENTS, "Invalid agent");
        require(agents[agentId].isActive, "Agent not active");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "Reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    // ─── Constructor ─────────────────────────────────────────
    constructor(
        address _bondingCurveRouter,
        address _lens,
        address _mkeyToken,
        address _operator
    ) {
        owner = msg.sender;
        operator = _operator;
        bondingCurveRouter = IBondingCurveRouter(_bondingCurveRouter);
        lens = ILens(_lens);
        mkeyToken = IERC20(_mkeyToken);

        // Activate all 8 agents by default
        for (uint8 i = 0; i < MAX_AGENTS; i++) {
            agents[i].isActive = true;
            emit AgentActivated(i);
        }
    }

    // ─── Receive MON ─────────────────────────────────────────
    receive() external payable {}

    // ─── Donations ───────────────────────────────────────────

    /**
     * @notice Donate MON to a specific agent. Your donation determines your share of profits.
     * @param agentId The agent to donate to (0-7)
     */
    function donate(uint8 agentId) external payable validAgent(agentId) {
        require(msg.value > 0, "Zero donation");

        AgentInfo storage agent = agents[agentId];
        agent.balance += msg.value;
        agent.totalDonated += msg.value;

        DonorInfo storage donor = donors[agentId][msg.sender];
        donor.totalDonated += msg.value;

        // Track unique donors
        if (!isDonor[agentId][msg.sender]) {
            isDonor[agentId][msg.sender] = true;
            donorList[agentId].push(msg.sender);
        }

        emit Donated(agentId, msg.sender, msg.value);
    }

    // ─── Trading ─────────────────────────────────────────────

    /**
     * @notice Execute a BUY trade on nad.fun for an agent
     * @param agentId Agent executing the trade
     * @param token Token to buy
     * @param amountIn MON amount to spend
     * @param amountOutMin Minimum tokens to receive (slippage protection)
     * @param deadline Transaction deadline timestamp
     */
    function executeBuy(
        uint8 agentId,
        address token,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external onlyOperator validAgent(agentId) nonReentrant returns (uint256 amountOut) {
        AgentInfo storage agent = agents[agentId];
        require(agent.balance >= amountIn, "Insufficient agent balance");

        agent.balance -= amountIn;

        // Get the correct router from Lens
        (address router, ) = lens.getAmountOut(token, amountIn, true);

        // Measure token balance before buy (handles routers that return void)
        uint256 balBefore = IERC20(token).balanceOf(address(this));

        // Execute buy via low-level call (BCR returns void, DEX returns uint256)
        bytes memory callData = abi.encodeWithSelector(
            IBondingCurveRouter.buy.selector,
            IBondingCurveRouter.BuyParams({
                amountOutMin: amountOutMin,
                token: token,
                to: address(this),
                deadline: deadline
            })
        );
        (bool success, ) = router.call{value: amountIn}(callData);
        require(success, "Buy failed");

        // Measure actual tokens received
        amountOut = IERC20(token).balanceOf(address(this)) - balBefore;
        require(amountOut >= amountOutMin, "Slippage exceeded");

        // Track holding
        agentHoldings[agentId][token] += amountOut;
        agentCostBasis[agentId][token] += amountIn;
        agent.tradeCount++;

        emit TradeExecuted(agentId, token, true, amountIn, amountOut);
    }

    /**
     * @notice Execute a SELL trade on nad.fun for an agent
     * @param agentId Agent executing the trade
     * @param token Token to sell
     * @param amountIn Token amount to sell
     * @param amountOutMin Minimum MON to receive (slippage protection)
     * @param deadline Transaction deadline timestamp
     */
    function executeSell(
        uint8 agentId,
        address token,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external onlyOperator validAgent(agentId) nonReentrant returns (uint256 amountOut) {
        require(agentHoldings[agentId][token] >= amountIn, "Insufficient holding");

        // Get the correct router from Lens
        (address router, ) = lens.getAmountOut(token, amountIn, false);

        // Approve router to spend tokens
        IERC20(token).approve(router, amountIn);

        // Measure MON balance before sell (handles routers that return void)
        uint256 monBefore = address(this).balance;

        // Execute sell via low-level call (BCR returns void, DEX returns uint256)
        bytes memory callData = abi.encodeWithSelector(
            IBondingCurveRouter.sell.selector,
            IBondingCurveRouter.SellParams({
                amountIn: amountIn,
                amountOutMin: amountOutMin,
                token: token,
                to: address(this),
                deadline: deadline
            })
        );
        (bool success, ) = router.call(callData);
        require(success, "Sell failed");

        // Measure actual MON received
        amountOut = address(this).balance - monBefore;
        require(amountOut >= amountOutMin, "Slippage exceeded");

        // Update holding
        agentHoldings[agentId][token] -= amountIn;

        // Calculate PnL
        uint256 costBasis = agentCostBasis[agentId][token];
        uint256 proportionalCost = (costBasis * amountIn) / (agentHoldings[agentId][token] + amountIn);

        // If full sell, clear cost basis
        if (agentHoldings[agentId][token] == 0) {
            proportionalCost = costBasis;
            agentCostBasis[agentId][token] = 0;
        } else {
            agentCostBasis[agentId][token] -= proportionalCost;
        }

        AgentInfo storage agent = agents[agentId];
        int256 pnl = int256(amountOut) - int256(proportionalCost);
        agent.totalPnl += pnl;
        agent.tradeCount++;

        // Add sell proceeds back to agent balance
        agent.balance += amountOut;

        emit TradeExecuted(agentId, token, false, amountIn, amountOut);

        // If profitable, distribute
        if (pnl > 0) {
            _distributeProfitInternal(agentId, uint256(pnl));
        }
    }

    // ─── Profit Distribution ─────────────────────────────────

    /**
     * @dev Internal: distribute profit after a profitable sell
     *      80% → donor pendingEarnings (claimable)
     *      20% → buy MKEY and hold
     */
    function _distributeProfitInternal(uint8 agentId, uint256 profit) internal {
        AgentInfo storage agent = agents[agentId];

        uint256 donorPool = (profit * DONOR_SHARE_BPS) / BPS_DENOMINATOR;
        uint256 mkeyPool = profit - donorPool;

        // Distribute to donors proportionally
        if (agent.totalDonated > 0 && donorPool > 0) {
            address[] storage donorAddresses = donorList[agentId];
            for (uint256 i = 0; i < donorAddresses.length; i++) {
                address donorAddr = donorAddresses[i];
                DonorInfo storage donor = donors[agentId][donorAddr];
                if (donor.totalDonated > 0) {
                    uint256 share = (donorPool * donor.totalDonated) / agent.totalDonated;
                    if (share > 0) {
                        donor.pendingEarnings += share;
                    }
                }
            }
            agent.totalDistributed += donorPool;
        }

        // Buy MKEY with 20% if possible
        if (mkeyPool > MIN_CLAIM_AMOUNT) {
            agent.balance -= mkeyPool;
            _buyMkey(agentId, mkeyPool);
        }

        // Deduct donor pool from agent balance
        if (donorPool > 0) {
            agent.balance -= donorPool;
        }

        emit ProfitDistributed(agentId, donorPool, mkeyPool);
    }

    /**
     * @dev Internal: buy MKEY token with MON
     */
    function _buyMkey(uint8 agentId, uint256 monAmount) internal {
        address mkeyAddr = address(mkeyToken);

        // Get quote and router
        (address router, ) = lens.getAmountOut(mkeyAddr, monAmount, true);

        uint256 deadline = block.timestamp + 300;
        uint256 mkeyBefore = IERC20(mkeyAddr).balanceOf(address(this));

        bytes memory callData = abi.encodeWithSelector(
            IBondingCurveRouter.buy.selector,
            IBondingCurveRouter.BuyParams({
                amountOutMin: 0, // Accept any amount for MKEY
                token: mkeyAddr,
                to: address(this),
                deadline: deadline
            })
        );
        (bool success, ) = router.call{value: monAmount}(callData);

        if (success) {
            uint256 amountOut = IERC20(mkeyAddr).balanceOf(address(this)) - mkeyBefore;
            if (amountOut > 0) {
                agents[agentId].mkeyBalance += amountOut;
                emit MkeyPurchased(agentId, monAmount, amountOut);
            } else {
                // No tokens received, return MON
                agents[agentId].balance += monAmount;
            }
        } else {
            // If MKEY buy fails, return MON to agent balance
            agents[agentId].balance += monAmount;
        }
    }

    // ─── Claiming ────────────────────────────────────────────

    /**
     * @notice Claim your accumulated earnings from an agent
     * @param agentId The agent to claim from
     */
    function claimEarnings(uint8 agentId) external nonReentrant {
        require(agentId < MAX_AGENTS, "Invalid agent");

        DonorInfo storage donor = donors[agentId][msg.sender];
        uint256 amount = donor.pendingEarnings;
        require(amount >= MIN_CLAIM_AMOUNT, "Below minimum claim");

        donor.pendingEarnings = 0;
        donor.totalClaimed += amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit EarningsClaimed(agentId, msg.sender, amount);
    }

    /**
     * @notice Claim earnings from all agents at once
     */
    function claimAllEarnings() external nonReentrant {
        uint256 totalAmount = 0;

        for (uint8 i = 0; i < MAX_AGENTS; i++) {
            DonorInfo storage donor = donors[i][msg.sender];
            if (donor.pendingEarnings > 0) {
                totalAmount += donor.pendingEarnings;
                donor.totalClaimed += donor.pendingEarnings;
                donor.pendingEarnings = 0;
            }
        }

        require(totalAmount >= MIN_CLAIM_AMOUNT, "Below minimum claim");

        (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
        require(success, "Transfer failed");

        // Emit per-agent events
        for (uint8 i = 0; i < MAX_AGENTS; i++) {
            // Events already emitted per-agent in the loop above would be too gas expensive
            // Just emit one combined event
        }
    }

    // ─── View Functions ──────────────────────────────────────

    function getAgentInfo(uint8 agentId) external view returns (
        bool isActive,
        uint256 balance,
        uint256 totalDonated,
        int256 totalPnl,
        uint256 mkeyBalance,
        uint256 totalDistributed,
        uint256 tradeCount
    ) {
        AgentInfo storage a = agents[agentId];
        return (a.isActive, a.balance, a.totalDonated, a.totalPnl, a.mkeyBalance, a.totalDistributed, a.tradeCount);
    }

    function getDonorInfo(uint8 agentId, address donor) external view returns (
        uint256 totalDonated,
        uint256 totalClaimed,
        uint256 pendingEarnings
    ) {
        DonorInfo storage d = donors[agentId][donor];
        return (d.totalDonated, d.totalClaimed, d.pendingEarnings);
    }

    function getPendingEarnings(address donor) external view returns (uint256 total) {
        for (uint8 i = 0; i < MAX_AGENTS; i++) {
            total += donors[i][donor].pendingEarnings;
        }
    }

    function getDonorCount(uint8 agentId) external view returns (uint256) {
        return donorList[agentId].length;
    }

    function getAgentHolding(uint8 agentId, address token) external view returns (uint256 amount, uint256 costBasis) {
        return (agentHoldings[agentId][token], agentCostBasis[agentId][token]);
    }

    function getTotalMkeyHeld() external view returns (uint256 total) {
        for (uint8 i = 0; i < MAX_AGENTS; i++) {
            total += agents[i].mkeyBalance;
        }
    }

    function getPlatformStats() external view returns (
        uint256 totalBalance,
        int256 totalPnl,
        uint256 totalDonated,
        uint256 totalDistributed,
        uint256 totalMkey,
        uint256 totalTrades,
        uint8 activeAgents
    ) {
        for (uint8 i = 0; i < MAX_AGENTS; i++) {
            AgentInfo storage a = agents[i];
            totalBalance += a.balance;
            totalPnl += a.totalPnl;
            totalDonated += a.totalDonated;
            totalDistributed += a.totalDistributed;
            totalMkey += a.mkeyBalance;
            totalTrades += a.tradeCount;
            if (a.isActive) activeAgents++;
        }
    }

    // ─── Admin Functions ─────────────────────────────────────

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function setAgent(uint8 agentId, bool active) external onlyOwner {
        require(agentId < MAX_AGENTS, "Invalid agent");
        agents[agentId].isActive = active;
        if (active) emit AgentActivated(agentId);
        else emit AgentDeactivated(agentId);
    }

    function updateContracts(
        address _bondingCurveRouter,
        address _lens,
        address _mkeyToken
    ) external onlyOwner {
        if (_bondingCurveRouter != address(0)) bondingCurveRouter = IBondingCurveRouter(_bondingCurveRouter);
        if (_lens != address(0)) lens = ILens(_lens);
        if (_mkeyToken != address(0)) mkeyToken = IERC20(_mkeyToken);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    /**
     * @notice Emergency withdraw ERC20 tokens
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    /**
     * @notice Emergency withdraw native MON
     */
    function emergencyWithdrawMON(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Transfer failed");
    }
}
