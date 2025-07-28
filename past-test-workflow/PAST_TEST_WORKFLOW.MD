# Past Test Workflow - Historical DCA Strategy Comparison

## Overview
This project tests and compares two different DCA (Dollar Cost Averaging) strategies over the past 1000 days using real historical data:

1. **Logical DCA Strategy**: Uses Fear & Greed Index-based logic from the main workflow with weekly 100 EUR deposits
2. **Simple DCA Strategy**: Basic weekly DCA of 100 EUR every Sunday regardless of market conditions

The goal is to validate the effectiveness of the Fear & Greed-based logic against simple DCA over a significant historical period.

## Test Parameters
- **Time Period**: Last 1000 days from today (approximately 2.7 years)
- **Weekly Deposit**: 100 EUR per week for both strategies
- **Total Investment**: ~143,000 EUR (1000 days / 7 days × 100 EUR)
- **Base Currency**: EUR (matching main workflow)
- **Asset**: Bitcoin (BTC)

## Data Requirements
- Daily BTC/EUR prices for 1000 days
- Daily Fear & Greed Index values for 1000 days
- Weekly execution points (Sundays for simple DCA)

## Tasks

### Phase 1: Data Collection
- [ ] **Task 1**: Research historical data sources
  - BTC price data: CoinGecko API or similar
  - Fear & Greed Index: Alternative.me API historical data
- [ ] **Task 2**: Create data fetching script (`fetch-historical-data.js`)
  - Fetch 1000 days of BTC/EUR prices
  - Fetch 1000 days of Fear & Greed Index
  - Store data in JSON format for processing

### Phase 2: Strategy Implementation
- [ ] **Task 3**: Implement Logical DCA Test (`logical-dca-test.js`)
  - Port the Fear & Greed logic from main workflow
  - Simulate weekly 100 EUR deposits
  - Apply buy/sell decisions based on Fear & Greed Index
  - Track portfolio value, BTC holdings, EUR balance over time
- [ ] **Task 4**: Implement Simple DCA Test (`simple-dca-test.js`)
  - Buy 100 EUR worth of BTC every Sunday
  - Track portfolio value, BTC holdings over time
  - No complex logic, just consistent purchasing

### Phase 3: Analysis & Comparison
- [ ] **Task 5**: Create comparison analysis (`compare-results.js`)
  - Calculate total returns for both strategies
  - Calculate ROI, volatility, maximum drawdowns
  - Generate performance metrics and statistics
- [ ] **Task 6**: Generate results visualization
  - Create simple charts/graphs showing performance over time
  - Export results to CSV/JSON for further analysis

### Phase 4: Report Generation
- [ ] **Task 7**: Write experiment report (`experiment-report.md`)
  - Document methodology and implementation details
  - Present key findings and performance metrics
  - Compare strategy effectiveness and risk profiles
  - Provide conclusions and recommendations for workflow optimization

## File Structure
```
past-test-workflow/
├── PAST_TEST_WORKFLOW.MD           # This plan file
├── data/
│   ├── btc-prices.json            # Historical BTC prices
│   └── fear-greed-index.json      # Historical Fear & Greed data
├── scripts/
│   ├── fetch-historical-data.js   # Data collection script
│   ├── logical-dca-test.js        # Logical DCA simulation
│   ├── simple-dca-test.js         # Simple DCA simulation
│   └── compare-results.js         # Results comparison
└── results/
    ├── logical-dca-results.json   # Logical DCA results
    ├── simple-dca-results.json    # Simple DCA results
    ├── comparison-report.json     # Final comparison
    └── experiment-report.md       # Detailed experiment report
```

## Expected Outcomes
- Validate whether Fear & Greed-based logic outperforms simple DCA
- Understand the risk/reward profile of both strategies
- Identify optimal market conditions for each approach
- Provide data-driven insights for strategy refinement

## Logical DCA Strategy Details (from Main Workflow)

### Risk Configuration
- **Target BTC Allocation**: 75%
- **Satellite Pool**: 30% of portfolio for active DCA
- **Rebalance Band**: ±5%
- **Slippage Tolerance**: 1%
- **Min BTC Balance**: 0.01 BTC
- **Min EUR Balance**: 5 EUR

### Fear & Greed Index Rules
- **Extreme Fear (0-20)**: 7.5% aggressive buy
- **Fear (21-30)**: 4% moderate buy
- **Neutral (31-60)**: 1% DCA if below MA20, otherwise HOLD
- **Greed (61-70)**: 4% small sell
- **High Greed (71-80)**: 30% moderate sell
- **Extreme Greed (81-100)**: 10% aggressive sell

### Circuit Breakers
- Stop if portfolio down >20% in 7 days
- Stop if BTC down >10% in 24 hours

### Decision Logic Flow
1. **Should Execute Trade?**: `action !== "HOLD"`
2. **Should Rebalance?**: `action !== "SKIP"` (monthly only)
3. Trade size calculated as: `satellitePool * (tradePercentage / 100)`
4. Minimum balance checks before execution
5. Circuit breaker validation

### Test Adaptation Notes
- For weekly testing: Simulate 100 EUR weekly deposits
- Adapt satellite pool calculation for growing portfolio
- Use historical MA20 data for neutral zone decisions
- Track portfolio changes for circuit breaker logic
- Simplify rebalancing to focus on DCA performance

## Implementation Notes
- Keep code simple and functional (no need for complex architecture)
- Focus on accuracy of historical simulation
- Use console logging for progress tracking
- Store intermediate results for debugging
- Handle API rate limits and data availability issues gracefully
- Ensure consistent logic with main workflow implementation