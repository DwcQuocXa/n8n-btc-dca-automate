# 🤖 Automated Crypto Trading System

A sophisticated, sentiment-driven Bitcoin trading system built on n8n that combines Fear & Greed Index analysis with dynamic portfolio management and comprehensive risk controls.

## 🎯 Strategy Overview

This system implements a dual-approach strategy:
- **Core Portfolio (30%)**: Dynamic BTC allocation (60-85%) based on Fear & Greed Index
- **Satellite Portfolio (30%)**: Active trading based on daily sentiment analysis

The bot executes daily trades at the configured cron schedule and performs monthly rebalancing on the 1st of each month, with comprehensive risk management and logging.

## 📁 File Structure

### Core System Files
- **`crypto-trading-workflow.json`** - Complete n8n workflow (IMPORT THIS INTO N8N)
- **`docker-compose.yml`** - Infrastructure setup (PostgreSQL + n8n)
- **`risk-management-config.js`** - Risk parameters reference
- **`risk-management-trading-logic.js`** - Trading logic reference

### Documentation
- **`setup-instructions.md`** - Complete setup guide
- **`testing-checklist.md`** - Comprehensive testing protocol
- **`system-architecture.md`** - Technical architecture overview
- **`README.md`** - This file

### Important Notes
- ✅ **`crypto-trading-workflow.json`** contains ALL the logic and configuration
- 📖 **`risk-management-*.js`** files are for reference/documentation only
- 🚫 n8n cannot import external JavaScript files - everything must be in the workflow JSON

## 🚀 Quick Start

1. **Setup Environment**:
   ```bash
   # Copy and edit environment variables
   cp .env.example .env
   # Add your actual API keys and configuration
   ```

2. **Start Infrastructure**:
   ```bash
   docker-compose up -d
   ```

3. **Import Workflow**:
   - Open n8n at `http://localhost:5678`
   - Import `crypto-trading-workflow.json`
   - Configure credentials (Binance, Google Sheets, Telegram)

4. **Test Thoroughly**:
   - Follow `testing-checklist.md` completely
   - Start with Binance testnet
   - Use minimal capital initially

## 🧠 Trading Logic

### Daily Trading - Fear & Greed Index Rules
| Index | Sentiment | Action | Satellite % | Description |
|-------|-----------|---------|-------------|-------------|
| 0-20 | Extreme Fear | BUY | 7.5% | Aggressive buying opportunity |
| 21-30 | Fear | BUY | 4% | Moderate buying opportunity |
| 31-60 | Neutral | DCA* | 1% | *Only if BTC < 20-day MA |
| 61-70 | Greed | SELL | 4% | Take some profits |
| 71-80 | High Greed | SELL | 7.5% | Market likely overvalued |
| 81-100 | Extreme Greed | SELL | 10% | Maximum profit taking |

### Monthly Rebalancing - Dynamic Target Allocation
| Index Range | Sentiment | Target BTC % | Strategy |
|-------------|-----------|--------------|----------|
| 0-20 | Extreme Fear | 85% | Accumulate Aggressively |
| 21-30 | Fear | 80% | Accumulate More |
| 31-60 | Neutral | 75% | Base Allocation |
| 61-70 | Greed | 70% | Take Some Profits |
| 71-80 | High Greed | 65% | Take More Profits |
| 81-100 | Extreme Greed | 60% | Maximum Profit Taking |

- **Rebalancing Band**: ±5% (triggers only if outside band)
- **Frequency**: First day of month only
- **Trade Type**: Limit orders with 1% slippage tolerance

## 🛡️ Risk Management

### Circuit Breakers
- Stop trading if portfolio declines >20% in 7 days
- Stop trading if BTC declines >10% in 24 hours
- Maintain minimum balances (0.01 BTC, 100 EUR)

### Position Controls
- Satellite trades limited to 30% of total portfolio
- Maximum 3 satellite trades per week
- 1% slippage tolerance on all orders
- Limit orders only (no market orders)

### Safety Features
- Rebalancing only on 1st day of month
- Multiple API timeout and retry mechanisms
- Comprehensive error handling and logging

## 📊 Monitoring & Logging

### Google Sheets Integration
Two separate sheets for comprehensive tracking:
- **Trading Log**: Daily trading activities and decisions
- **Rebalancing Log**: Monthly portfolio adjustments
- Real-time portfolio metrics and performance tracking

### Telegram Notifications
- Daily trade summaries with execution status
- Monthly rebalancing alerts
- Error notifications with detailed context
- Performance updates

## ⚡ Key Features

- **Sentiment-Driven**: Uses Fear & Greed Index for market timing
- **Dynamic Allocation**: Target BTC % adjusts with market sentiment
- **Risk-First**: Multiple circuit breakers and position limits
- **Fully Automated**: No manual intervention required
- **Comprehensive Logging**: Every action tracked and reported
- **Monthly Rebalancing**: Prevents overtrading while maintaining targets

## 🔧 Configuration

To modify risk parameters:
1. Open the workflow in n8n
2. Edit the Code nodes containing `RISK_CONFIG` objects
3. Adjust values as needed
4. Save and activate workflow

Key configurable parameters:
- Fear & Greed Index trading percentages
- Dynamic rebalancing targets
- Circuit breaker thresholds
- Minimum balance requirements
- Slippage tolerance

## ⚠️ Important Disclaimers

- **High Risk**: Automated trading with real money - you could lose everything
- **Test First**: Use Binance testnet and small amounts initially
- **Monitor Closely**: Especially during first few weeks of operation
- **Understand Risks**: Cryptocurrency trading is highly volatile and risky
- **Not Financial Advice**: This is educational/experimental software

## 📈 Performance Tracking

The system tracks:
- Total return vs BTC buy-and-hold benchmark
- Portfolio allocation changes over time
- Trade frequency and execution quality
- Fear & Greed Index correlation analysis
- Monthly rebalancing effectiveness

## 🆘 Support

1. **Setup Issues**: Follow `setup-instructions.md` step by step
2. **Testing Problems**: Use `testing-checklist.md` to validate everything
3. **Architecture Questions**: Review `system-architecture.md`
4. **Risk Parameters**: Reference `risk-management-*.js` files for documentation

## 📜 License

This project is for educational and experimental purposes. Use at your own risk.

---

**Remember: Never risk more than you can afford to lose!**

*Built with ❤️ and rigorous risk management* 