# Building a Bitcoin DCA Automation Workflow with n8n

**Disclaimer: This article is about workflow automation and technical exploration. It is NOT financial advice. Do not make investment decisions based on this content.**

*How I discovered the power of n8n by automating a Fear & Greed based crypto DCA strategy*

---

## The Story: From Manual Trading to Vibe Coding

So there I was, on vacation with some free time, manually DCAing into Bitcoin like I had been for over a year. Every week: check Fear & Greed Index, decide, login to Binance, place order. Repetitive and boring.

The idea was simple: what if I could automate my Fear & Greed based trading strategy using n8n? That's when I decided to try something different - not just automate it, but do the entire project through "vibe coding" with Cursor. My first prompt was literally just:

> "I want to build a n8n workflow automate crypto trading using binance API or integration. The rule of trading is simple we will based on the fear-and-greed-index. Let's create a plan for this
> 
> https://www.binance.com/en/square/fear-and-greed-index"

My approach? I never wrote a single line of code myself. Instead, I asked Cursor to create detailed plans with tasks before any implementation. From the initial workflow design to complex backtesting scripts, everything was built through conversational coding.

The result? A complete automated DCA system built in a weekend without typing a single function.

## Enter n8n: Visual Workflow Automation

I chose n8n as my automation platform - a tool that promises visual programming without needing to be a developer. The setup was surprisingly smooth with Docker:

```yaml
# docker-compose.yml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
    volumes:
      - ./n8n_data:/home/node/.n8n
```

```bash
docker-compose up -d
```

That's it. The n8n Docker image handles everything - Node.js runtime, all dependencies, the web UI, workflow engine, and even a SQLite database for storing your workflows. No npm installs, no version conflicts, no dependency hell. Just pull the image and you're running a full workflow automation platform on port 5678.

The `./n8n_data` volume ensures your workflows persist between container restarts, and basic auth keeps your instance secure. Within minutes, I had a production-ready n8n instance running locally.

## The Technical Challenge

My goal was to build a sophisticated DCA system that:
1. Fetches the Crypto Fear & Greed Index daily
2. Analyzes market conditions using technical indicators
3. Makes intelligent buy/sell/hold decisions
4. Executes trades on Binance automatically
5. Logs everything to Google Sheets
6. Sends Telegram notifications
7. Performs monthly portfolio rebalancing

## Workflow Architecture

The final workflow consists of two main flows:

### Daily DCA Flow
```
Cron Trigger (Daily) 
  → Fetch Fear & Greed Index (API)
  → Get BTC Price (Binance API)
  → Fetch Moving Averages (20/50/200 day)
  → Get Account Balance (Binance Signed Request)
  → Enhanced DCA Logic Engine (JavaScript Node)
  → Execute Trade (Binance Order API)
  → Log to Google Sheets
  → Send Telegram Notification
```

### Monthly Rebalancing Flow
```
Cron Trigger (1st of Month)
  → Same data fetching pipeline
  → Rebalancing Logic (JavaScript Node)
  → Execute rebalancing trades
  → Separate logging and notifications
```

## The Enhanced DCA Strategy

### Market Regime Detection

The system automatically classifies market conditions:

![Market Regime Detection Table](table-market-regime-detection.md)

### Fear & Greed Based Trading Rules

![Fear & Greed Trading Rules Table](table-fear-greed-trading-rules.md)

### Trend Filter Implementation

```javascript
// Trend Filter Conditions
const TREND_FILTERS = {
  WEAK_TREND: {
    CONDITIONS: ['PRICE_BELOW_MA20', 'NEGATIVE_7DAY_RETURN']
  },
  STRONG_WEAKNESS: {
    CONDITIONS: ['PRICE_BELOW_MA50', 'RETURN_30DAY_BELOW_10PCT']
  },
  CONFIRMED_REVERSAL: {
    CONDITIONS: ['NEGATIVE_7DAY_RETURN_GT_5PCT', 'PRICE_BELOW_MA20']
  }
}
```

### Dynamic Portfolio Allocation

![Dynamic Portfolio Allocation Table](table-dynamic-portfolio-allocation.md)

## Implementation Details

### Binance API Integration

The trickiest part was implementing Binance's signed requests in n8n:

```javascript
// Generate HMAC SHA256 signature
const crypto = require('crypto');
const timestamp = Date.now();
const query = `recvWindow=5000&timestamp=${timestamp}`;
const signature = crypto.createHmac('sha256', API_SECRET)
  .update(query)
  .digest('hex');
```

### Risk Management

Built-in circuit breakers prevent disaster:
- Stop if portfolio declines >20% in 7 days
- Stop if BTC declines >10% in 24 hours
- Maintain minimum balances (0.01 BTC, 5 EUR)
- Maximum 3 trades per week
- 1% slippage tolerance on all orders

## Backtesting: Does It Actually Work?

Here's where things got interesting. I backtested two strategies:

1. **Simple DCA**: Buy €100 weekly, no matter what
2. **Logical DCA**: Fear & Greed strategy with trend filters and market regime detection

### 4-Year Performance Results (2021-2025)

![4-Year Performance Results Table](table-4year-performance-results.md)

**Key Finding: Simple DCA outperforms in bull markets**

### Bear Market Performance (2021-2023)

![Bear Market Performance Table](table-bear-market-performance.md)

**Key Finding: Logical DCA significantly reduces losses in bear markets**

### Risk Metrics Comparison

![Risk Metrics Comparison Table](table-risk-metrics-comparison.md)

### The Trade-off: Profit vs Risk Management

Looking at these results, a clear pattern emerges:

**In Bull Markets (4-year period):**
- Simple DCA wins on absolute returns
- Logical DCA sacrifices some gains for risk management
- The "cost" of risk management: ~40% less profit on average

**In Bear Markets:**
- Logical DCA shines, reducing losses by 9-11%
- Lower volatility means less stress during downturns
- Better capital preservation for future opportunities

**The Real Benefit of Logical DCA:**
- **29.4% lower maximum drawdowns** - your portfolio doesn't crater as badly
- **16.3% lower volatility** - smoother ride, less emotional stress
- **Better risk-adjusted returns** (higher Sharpe ratio)
- **Systematic approach** removes emotional decision-making

Think of it this way: Logical DCA is like having insurance. You pay a premium (lower bull market returns) for protection (better bear market performance). Whether that trade-off is worth it depends entirely on your risk tolerance and investment goals.

## n8n Technical Insights

### What Made This Possible

1. **HTTP Request Node**: Easy API integration with built-in retry logic
2. **Code Node**: JavaScript execution for complex logic
3. **Cron Node**: Reliable scheduling without external dependencies
4. **Google Sheets Node**: Native integration, no OAuth hassle
5. **Telegram Node**: Simple bot messaging

### Challenges Solved

- **API Authentication**: Code nodes handle HMAC signing
- **State Management**: Workflow static data persists between runs
- **Error Handling**: Built-in retry mechanisms and error paths
- **Data Transformation**: JavaScript nodes for complex calculations

## Beyond This Project

This experiment opened my eyes to n8n's potential:

- **Data Pipeline Automation**: ETL processes with visual feedback
- **Multi-Service Integration**: Connect APIs that don't normally talk
- **Personal Productivity**: Automate daily workflows
- **Monitoring & Alerting**: Custom notification systems

## Technical Takeaways

1. **n8n scales complexity well**: From simple HTTP requests to complex trading logic
2. **Docker deployment is production-ready**: Stable, performant, easy to maintain
3. **JavaScript nodes are powerful**: Full Node.js capabilities when needed
4. **Integration-first design**: Most services work out of the box

## Conclusion

**This is NOT financial advice.** I want to be crystal clear: the DCA method I've described might not be suitable for anyone, and I haven't even deployed it with real money yet. This entire project was a technical exploration of n8n's capabilities.

What I discovered is that n8n is an incredibly powerful tool for personal automation. Whether you're automating crypto trades, building data pipelines, or just connecting services together, n8n makes complex workflows accessible without requiring deep programming knowledge.

The real value here isn't the trading strategy - it's discovering how tools like n8n can transform repetitive tasks into automated workflows. My weekend experiment turned into a deep dive into workflow automation, and I'm excited to apply these learnings to other areas.

So please, DO NOT consider any of this as financial advice. Instead, consider it an invitation to explore what you could automate in your own life with n8n.

---

## Resources

- **n8n Documentation**: [docs.n8n.io](https://docs.n8n.io)
- **Workflow JSON**: [GitHub Repository](https://github.com/DwcQuocXa/personal-n8n)
- **Fear & Greed Index API**: [alternative.me/crypto](https://alternative.me/crypto/fear-and-greed-index/)
- **Binance API Docs**: [binance-docs.github.io](https://binance-docs.github.io/apidocs/)

---

*Remember: This is a technical exploration of n8n, not investment advice. Always do your own research and never invest more than you can afford to lose.*
