# Complete n8n Crypto DCA Workflow Test Plan
## Implementing Both Daily Trading + Monthly Rebalancing (3 Years)

### Overview
After reviewing the complete `crypto-dca-workflow.json`, I discovered that our previous test only implemented **50% of the strategy** - the daily DCA trading logic. The complete workflow includes both:

1. **Daily DCA Logic** (✅ Already implemented)
2. **Monthly Rebalancing Logic** (❌ Missing - Critical component)

### What We Missed: Monthly Rebalancing Logic

#### Dynamic BTC Allocation Targets Based on Fear & Greed Index:
- **Extreme Fear (0-20)**: 85% BTC target - "Accumulate Aggressively"
- **Fear (21-30)**: 80% BTC target - "Accumulate More"  
- **Neutral (31-60)**: 75% BTC target - "Base Allocation"
- **Greed (61-70)**: 70% BTC target - "Take Some Profits"
- **High Greed (71-80)**: 65% BTC target - "Take More Profits"
- **Extreme Greed (81-100)**: 60% BTC target - "Maximum Profit Taking"

#### Rebalancing Rules:
- **Timing**: Only on 1st day of each month
- **Threshold**: ±5% from target allocation before action
- **Actions**: Buy/sell to reach target allocation
- **Safety**: Minimum balances (0.01 BTC, €5 EUR)

### Complete Workflow Architecture

```
┌─────────────────┐    ┌─────────────────┐
│  Daily Trigger  │    │ Monthly Trigger │
│   (Every Day)   │    │  (1st of Month) │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│   Fear & Greed  │◄───┤   Fear & Greed  │
│   + BTC Price   │    │   + Account     │
│   + Account     │    │                 │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│  DCA Logic      │    │ Rebalancing     │
│  Engine         │    │ Logic           │
│  (Satellite     │    │ (Target         │
│   Pool: 30%)    │    │  Allocation)    │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│   Execute       │    │   Execute       │
│   DCA Trade     │    │   Rebalance     │
│   (Fear-based)  │    │   (Target-based)│
└─────────────────┘    └─────────────────┘
```

### Implementation Plan

#### Phase 1: Analysis and Setup (30 minutes)
- [x] ~~Read complete crypto-dca-workflow.json~~
- [x] ~~Identify missing components~~
- [x] ~~Update existing report with limitation notice~~
- [ ] Create detailed technical specification

#### Phase 2: Monthly Rebalancing Implementation (2 hours)
- [ ] **2.1** Create `complete-logical-dca-test.js`
  - [ ] Implement dynamic Fear & Greed allocation targets
  - [ ] Add monthly rebalancing logic (1st day check)
  - [ ] Add rebalance threshold checking (±5%)
  - [ ] Add rebalancing trade execution
- [ ] **2.2** Modify existing daily DCA logic
  - [ ] Ensure satellite pool calculation (30% of portfolio)
  - [ ] Integrate with monthly rebalancing state
- [ ] **2.3** Create unified portfolio state management
  - [ ] Track both daily trades AND monthly rebalances
  - [ ] Maintain consistent BTC/EUR balances

#### Phase 3: Complete Testing (1 hour)
- [ ] **3.1** Run complete 3-year test
  - [ ] Test period: 2022-07-28 to 2025-07-27
  - [ ] Daily DCA trades + Monthly rebalancing
  - [ ] Generate `complete-logical-dca-results.json`
- [ ] **3.2** Update Simple DCA (no changes needed)
- [ ] **3.3** Run complete comparison analysis

#### Phase 4: Results Analysis (30 minutes)
- [ ] **4.1** Generate complete comparison report
- [ ] **4.2** Analyze impact of monthly rebalancing
- [ ] **4.3** Create final comprehensive report

### Expected Impact of Monthly Rebalancing

The monthly rebalancing could **dramatically improve** Logical DCA performance by:

1. **Profit Taking**: Reducing BTC allocation to 60-65% during extreme greed periods
2. **Accumulation**: Increasing BTC allocation to 80-85% during fear periods  
3. **Dynamic Risk Management**: Automatically adjusting exposure based on sentiment
4. **Portfolio Optimization**: Maintaining target allocations despite market volatility

### Key Implementation Details

#### Monthly Rebalancing Logic:
```javascript
// Check if first day of month
const isFirstDayOfMonth = currentDate.getDate() === 1;

if (isFirstDayOfMonth) {
  // Determine target allocation based on Fear & Greed
  const targetBtcAllocation = getTargetAllocation(fearGreedIndex);
  const currentBtcAllocation = btcValue / totalValue;
  
  // Check if rebalancing needed (±5% threshold)
  if (Math.abs(currentBtcAllocation - targetBtcAllocation) > 0.05) {
    // Execute rebalancing trade
    executeRebalanceTrade(targetBtcAllocation, currentBtcAllocation);
  }
}
```

#### Fear & Greed Target Mapping:
```javascript
const FEAR_GREED_TARGETS = {
  EXTREME_FEAR: { RANGE: [0, 20], TARGET: 0.85 },
  FEAR: { RANGE: [21, 30], TARGET: 0.80 },
  NEUTRAL: { RANGE: [31, 60], TARGET: 0.75 },
  GREED: { RANGE: [61, 70], TARGET: 0.70 },
  HIGH_GREED: { RANGE: [71, 80], TARGET: 0.65 },
  EXTREME_GREED: { RANGE: [81, 100], TARGET: 0.60 }
};
```

### File Structure for Complete Implementation

```
scripts/
├── complete-logical-dca-test.js      # New: Complete implementation
├── simple-dca-test-extended.js       # Existing: No changes
├── compare-complete-results.js       # New: Complete comparison
└── run-complete-tests.js            # New: Run all complete tests

results/
├── complete-logical-dca-results.json # New: Complete results
├── simple-dca-results-extended.json  # Existing: Same
└── complete-comparison-report.json   # New: Complete comparison

reports/
└── complete-experiment-report.md     # New: Final comprehensive report
```

### Success Criteria

1. **Complete Implementation**: Daily DCA + Monthly rebalancing working together
2. **Accurate Logic**: Exact replication of n8n workflow behavior
3. **3-Year Coverage**: Full test period with both strategies
4. **Performance Analysis**: Comparison showing impact of monthly rebalancing
5. **Documentation**: Clear explanation of complete strategy

### Next Steps

1. **Confirm Plan**: User approval to proceed with complete implementation
2. **Begin Phase 2**: Start implementing monthly rebalancing logic
3. **Test & Validate**: Ensure accuracy against original workflow
4. **Generate Results**: Complete 3-year comparison with both components

**Estimated Time**: 4 hours total for complete implementation and analysis

This complete implementation should provide a much more accurate representation of the Logical DCA strategy's true performance potential.