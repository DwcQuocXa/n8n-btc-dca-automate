# Historical DCA Strategy Comparison Experiment Report

## Executive Summary

This experiment compared two Bitcoin DCA (Dollar Cost Averaging) strategies over 349 days (August 12, 2024 to July 27, 2025) using historical market data:

1. **Logical DCA Strategy**: Fear & Greed Index-based trading with dynamic allocation
2. **Simple DCA Strategy**: Fixed weekly purchases of €100 worth of BTC every Sunday

**Key Finding**: Simple DCA significantly outperformed the Logical DCA strategy, generating 22.08% higher returns (€1,103.84 additional profit) with similar risk characteristics.

## Methodology

### Test Parameters
- **Investment Amount**: €100 per week for both strategies
- **Total Investment Period**: 349 days
- **Total Capital Deployed**: €5,000 each strategy
- **Base Currency**: EUR
- **Asset**: Bitcoin (BTC)

### Data Sources
- **BTC Price Data**: 350 daily records from CoinGecko API
- **Fear & Greed Index**: 1000 daily records from Alternative.me API
- **Moving Average**: 20-day simple moving average calculated from price data

### Strategy Implementations

#### Logical DCA Strategy
Based on the production workflow's Fear & Greed Index rules:
- **Extreme Fear (0-20)**: 7.5% aggressive buy
- **Fear (21-30)**: 4% moderate buy
- **Neutral (31-60)**: 1% DCA if below MA20, otherwise HOLD
- **Greed (61-70)**: 4% small sell
- **High Greed (71-80)**: 30% moderate sell
- **Extreme Greed (81-100)**: 10% aggressive sell

Additional features:
- Satellite pool strategy (30% of portfolio for active trading)
- Circuit breakers (stop if portfolio down >20% in 7 days or BTC down >10% in 24h)
- Minimum balance requirements (0.01 BTC, €5 EUR)

#### Simple DCA Strategy
- Purchase €100 worth of BTC every Sunday
- No market timing or sentiment analysis
- 100% BTC allocation strategy

## Results

### Performance Metrics

| Metric | Logical DCA | Simple DCA | Difference |
|--------|-------------|------------|------------|
| **Total Return (EUR)** | €318.93 | €1,422.78 | **-€1,103.84** |
| **Total Return (%)** | 6.38% | 28.46% | **-22.08%** |
| **Final Portfolio Value** | €5,318.93 | €6,422.78 | -€1,103.84 |
| **BTC Balance** | 0.00962018 BTC | 0.06395851 BTC | -0.05433833 BTC |
| **EUR Balance** | €4,352.86 | €0.00 | +€4,352.86 |
| **BTC Allocation** | 18.2% | 100.0% | -81.8% |

### Risk Analysis

| Risk Metric | Logical DCA | Simple DCA | Assessment |
|-------------|-------------|------------|------------|
| **Volatility** | 129.16% | 132.91% | Similar risk levels |
| **Sharpe Ratio** | 3.753 | 3.844 | Simple DCA slightly better risk-adjusted returns |
| **Max Drawdown** | Not calculated | Not calculated | - |

### Trading Activity

| Activity Metric | Logical DCA | Simple DCA |
|-----------------|-------------|------------|
| **Total Trades** | 117 | 50 |
| **Buy Trades** | 106 | 50 |
| **Sell Trades** | 11 | 0 |
| **Average Trade Size** | Variable | €100 |

### Fear & Greed Trading Distribution (Logical DCA)

| Market Sentiment | Trades | Volume |
|------------------|---------|---------|
| **Fear** | 34 | €756 |
| **Neutral** | 65 | €555 |
| **Extreme Fear** | 7 | €460 |
| **High Greed** | 2 | €697 |
| **Greed** | 9 | €427 |

## Analysis & Insights

### Why Simple DCA Outperformed

1. **Market Timing Inefficiency**: The Fear & Greed Index, while popular, did not provide accurate timing signals during this specific period.

2. **Conservative Cash Allocation**: The Logical DCA strategy maintained 81.8% of the portfolio in EUR, missing significant BTC appreciation (28.46% price increase).

3. **Opportunity Cost**: By keeping substantial EUR reserves, the Logical DCA strategy missed participating in Bitcoin's upward trend during the test period.

4. **Over-Trading**: 117 trades vs 50 created more complexity without additional value, and selling during "greed" periods missed continued upside.

### Market Context

The test period (Aug 2024 - Jul 2025) was characterized by:
- **Strong BTC Performance**: Price appreciation from ~€54,000 to ~€100,000
- **Persistent Uptrend**: Fear & Greed-based selling missed continued gains
- **Low Volatility Differential**: Both strategies had similar risk profiles

### Strategy Effectiveness by Market Condition

**Logical DCA performed better during**:
- Not applicable in this test period

**Simple DCA performed better during**:
- Bull market conditions (the entire test period)
- Consistent upward price trends
- When market sentiment indicators lag price movements

## Limitations & Considerations

### Test Limitations
1. **Limited Time Frame**: 349 days may not capture full market cycles
2. **Bull Market Bias**: Test period was predominantly bullish for Bitcoin
3. **Historical Data Only**: Past performance doesn't guarantee future results
4. **No Transaction Costs**: Real-world trading would incur fees

### Strategy Limitations
1. **Sentiment Lag**: Fear & Greed Index may be a lagging indicator
2. **Conservative Allocation**: Logical DCA's satellite pool approach was too conservative
3. **Binary Decisions**: Fear & Greed rules may be too simplistic
4. **Circuit Breakers**: May have prevented beneficial trades

## Recommendations

### For the Logical DCA Workflow

1. **Increase BTC Allocation**: Consider reducing EUR reserves and increasing satellite pool percentage from 30% to 50-70%

2. **Refine Sentiment Rules**: 
   - Reduce selling thresholds in "greed" conditions
   - Increase buying aggression in "fear" conditions
   - Consider trend-following elements alongside sentiment

3. **Dynamic Allocation**: Implement trend-based position sizing rather than fixed percentages

4. **Backtesting Period**: Test strategy across different market conditions (bear markets, sideways markets)

### For Future Testing

1. **Extended Time Frame**: Test across 2-3 year periods including bear markets
2. **Multiple Market Cycles**: Include various market conditions
3. **Transaction Costs**: Factor in realistic trading fees
4. **Parameter Optimization**: Test different Fear & Greed thresholds

## Conclusion

The experiment reveals that during the tested bull market period, simple DCA significantly outperformed the sophisticated Fear & Greed-based strategy. The primary reason was the Logical DCA's overly conservative approach, maintaining too much EUR allocation and missing Bitcoin's strong performance.

**Key Takeaways**:
- Market timing using sentiment indicators proved ineffective during this period
- Simple, consistent accumulation outperformed complex trading logic
- Conservative risk management can become opportunity cost in trending markets
- The Fear & Greed Index may not be optimal for tactical allocation decisions

**Strategic Implications**:
- Consider reducing EUR allocation in the production workflow
- Evaluate whether sentiment-based selling is appropriate in strong trends
- Test modifications in different market environments before implementation

The Logical DCA strategy shows promise but requires calibration to balance risk management with return optimization. In strongly trending markets, simplicity and full allocation may outperform sophisticated timing strategies.

---

**Report Generated**: July 27, 2025  
**Test Period**: August 12, 2024 - July 27, 2025 (349 days)  
**Strategies Compared**: Logical DCA vs Simple DCA  
**Winner**: Simple DCA (+22.08% return advantage)