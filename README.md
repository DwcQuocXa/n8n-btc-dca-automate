# 🤖 Automated Crypto DCA System

A sophisticated, sentiment-driven Bitcoin DCA system built on n8n that combines Fear & Greed Index analysis with **bull market intelligence**, dynamic portfolio management, and comprehensive risk controls.

## 🎯 Strategy Overview

This system implements a dual-approach strategy with **bull market intelligence**:
- **Core Portfolio (70%)**: Dynamic BTC allocation (60-90%) based on Fear & Greed Index + Market Regime
- **Satellite Portfolio (30%)**: Active DCA with trend-aware profit taking

The bot executes daily trades at the configured cron schedule and performs monthly rebalancing on the 1st of each month, with **market regime detection** and comprehensive risk management.

## 📁 File Structure

### Core System Files
- **`crypto-dca-workflow-optimized.json`** - Enhanced n8n workflow (IMPORT THIS INTO N8N) 🚀
- **`crypto-dca-workflow.json`** - Original workflow (legacy)
- **`docker-compose.yml`** - Infrastructure setup (PostgreSQL + n8n)
- **`BULL_MARKET_OPTIMIZATION_PLAN.md`** - Enhancement strategy documentation
- **`OPTIMIZED_WORKFLOW_IMPLEMENTATION.md`** - Implementation details

### Documentation
- **`setup-instructions.md`** - Complete setup guide
- **`testing-checklist.md`** - Comprehensive testing protocol
- **`system-architecture.md`** - Technical architecture overview
- **`README.md`** - This file

### Important Notes
- ✅ **`crypto-dca-workflow-optimized.json`** contains ALL the enhanced logic and configuration
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

3. **Import Enhanced Workflow**:
   - Open n8n at `http://localhost:5678`
   - Import `crypto-dca-workflow-optimized.json` (RECOMMENDED)
   - Configure credentials (Binance, Google Sheets, Telegram)

4. **Test Thoroughly**:
   - Follow `testing-checklist.md` completely
   - Start with Binance testnet
   - Use minimal capital initially

## 🧠 Enhanced DCA Logic with Bull Market Intelligence

### 🎯 Market Regime Detection
The system now automatically detects market conditions:

| Regime | Criteria | Strategy Impact |
|--------|----------|-----------------|
| 🚀 **Bull Market** | Price > MA50, MA50 > MA200, 30D return > 20% | Higher allocations, trend-aware selling |
| 🐻 **Bear Market** | Price < MA50, MA50 < MA200, 30D return < -20% | Standard allocations, aggressive buying |
| ⚖️ **Neutral** | Mixed signals | Base allocations, balanced approach |

### 📈 Enhanced Daily DCA - Fear & Greed with Trend Filters
| Index | Sentiment | Action | Satellite % | **Bull Market Enhancement** |
|-------|-----------|---------|-------------|----------------------------|
| 0-20 | Extreme Fear | BUY | 7.5% | ✅ Always buy (no filter) |
| 21-30 | Fear | BUY | 4% | ✅ Always buy (no filter) |
| 31-60 | Neutral | DCA* | 1% | *Only if BTC < 20-day MA |
| 61-70 | Greed | SELL** | 4% | **Only if trend weakening** 🛡️ |
| 71-80 | High Greed | SELL** | 7.5% | **Only if strong weakness** 🛡️ |
| 81-100 | Extreme Greed | SELL** | 10% | **Only if confirmed reversal** 🛡️ |

#### 🛡️ **NEW: Trend Filter Protection**
- **Weak Trend**: Sell only if price < MA20 OR negative 7-day return
- **Strong Weakness**: Sell only if price < MA50 AND 30-day return < 10%
- **Confirmed Reversal**: Sell only if negative 7-day return > 5% AND price < MA20

### 🎯 Enhanced Monthly Rebalancing - Bull Market Aware Allocation
| Index Range | Sentiment | **Standard Target** | **🚀 Bull Market Target** | Strategy |
|-------------|-----------|-------------------|-------------------------|----------|
| 0-20 | Extreme Fear | 85% | **90%** | Accumulate Aggressively |
| 21-30 | Fear | 80% | **85%** | Accumulate More |
| 31-60 | Neutral | 75% | **80%** | Base Allocation |
| 61-70 | Greed | 70% | **75%** | Take Some Profits |
| 71-80 | High Greed | 65% | **70%** | Take More Profits |
| 81-100 | Extreme Greed | 60% | **75%** | Maximum Profit Taking |

### 📊 **NEW: Enhanced Metrics Tracking**
- **Market Regime Status** (Bull/Bear/Neutral)
- **7-Day & 30-Day BTC Returns**
- **All-Time High Tracking** with pullback analysis
- **MA20, MA50, MA200** positioning
- **Consecutive Bull Market Days**
- **Version Tracking** (2.0)

## 🛡️ Risk Management

### Circuit Breakers
- Stop DCA if portfolio declines >20% in 7 days
- Stop DCA if BTC declines >10% in 24 hours
- Maintain minimum balances (0.01 BTC, 5 EUR)

### Position Controls
- Satellite trades limited to 30% of total portfolio
- Maximum 3 satellite trades per week
- 1% slippage tolerance on all orders
- Limit orders only (no market orders)

### **🚀 NEW: Bull Market Safety Features**
- **Trend Filter Protection**: Prevents selling during strong uptrends
- **Market Regime Awareness**: Adjusts allocation targets dynamically
- **Pullback Analysis**: Tracks distance from all-time highs
- **Momentum Indicators**: 7D/30D return analysis

## 📊 Enhanced Monitoring & Logging

### Google Sheets Integration
Two separate sheets with **enhanced tracking**:
- **DCA Log**: Daily activities with market regime and version tracking
- **Rebalancing Log**: Monthly adjustments with bull market targets
- **NEW Fields**: Market_Regime, 7D/30D returns, Version tracking

### 🚀 Enhanced Telegram Notifications
- **Market regime indicators**: 🚀 Bull, 🐻 Bear, ⚖️ Neutral
- **Trend analysis**: 7D/30D return percentages
- **Enhancement status**: Version tracking and feature notes
- **Smart profit-taking alerts**: When trend filters activate

## ⚡ Key Features

- **🚀 Bull Market Intelligence**: Trend-aware selling prevents premature profit-taking
- **📈 Market Regime Detection**: Automatic bull/bear/neutral identification
- **🎯 Dynamic Allocation**: Targets adjust based on sentiment AND market regime
- **🛡️ Trend Filter Protection**: Multi-layered selling conditions
- **📊 Enhanced Metrics**: 7D/30D returns, ATH tracking, momentum analysis
- **🔄 Sentiment-Driven**: Uses Fear & Greed Index for market timing
- **⚖️ Risk-First**: Multiple circuit breakers and position limits
- **🤖 Fully Automated**: No manual intervention required
- **📝 Comprehensive Logging**: Every action tracked with enhanced metrics

## 🔧 Configuration

To modify enhancement parameters:
1. Open the **enhanced workflow** in n8n
2. Edit the Code nodes containing `OPTIMIZED_RISK_CONFIG` objects
3. Adjust bull market thresholds, trend filters, or allocation targets
4. Save and activate workflow

Key configurable parameters:
- **Bull market detection thresholds** (MA positioning, 30D returns)
- **Trend filter criteria** (weak trend, strong weakness, confirmed reversal)
- **Dynamic allocation targets** (standard vs bull market)
- Fear & Greed Index DCA percentages
- Circuit breaker thresholds

## 📈 **Enhanced Performance Tracking**

The enhanced system tracks:
- **Market regime performance** (Bull vs Bear vs Neutral periods)
- **Trend filter effectiveness** (Profit preservation during uptrends)
- **Dynamic allocation impact** (Bull market vs standard targets)
- Total return vs BTC buy-and-hold benchmark
- Trade frequency and execution quality
- Fear & Greed Index correlation analysis
- **7D/30D momentum analysis**

## 🆕 Enhancement Changelog (v2.0)

### Major Enhancements
- ✅ **Market Regime Detection**: Automatic bull/bear/neutral identification
- ✅ **Trend Filter Protection**: Prevents selling during strong uptrends
- ✅ **Dynamic Bull Market Targets**: Higher BTC allocations during bull markets
- ✅ **Enhanced Metrics**: 7D/30D returns, ATH tracking, momentum analysis
- ✅ **Smart Notifications**: Market regime indicators and trend analysis
- ✅ **Version Tracking**: Enhancement version logging

### Performance Improvements
- 🚀 **Reduced Premature Selling**: Trend filters preserve gains during uptrends
- 📈 **Higher Bull Market Exposure**: 5-15% higher BTC targets in bull markets
- 🎯 **Better Market Timing**: Multi-timeframe technical analysis
- 📊 **Enhanced Monitoring**: Real-time regime and momentum tracking

## ⚠️ Important Disclaimers

- **High Risk**: Automated DCA with real money - you could lose everything
- **Test First**: Use Binance testnet and small amounts initially
- **Monitor Closely**: Especially during first few weeks of operation
- **Bull Market Risks**: Higher allocations = higher volatility exposure
- **Understand Enhancements**: Review trend filters and market regime logic
- **Not Financial Advice**: This is educational/experimental software

## 🆘 Support

1. **Setup Issues**: Follow `setup-instructions.md` step by step
2. **Testing Problems**: Use `testing-checklist.md` to validate everything
3. **Architecture Questions**: Review `system-architecture.md`
4. **Enhancement Details**: Check `BULL_MARKET_OPTIMIZATION_PLAN.md`
5. **Implementation Guide**: Review `OPTIMIZED_WORKFLOW_IMPLEMENTATION.md`

## 📜 License

This project is for educational and experimental purposes. Use at your own risk.

---

**🚀 ENHANCED FOR BULL MARKETS - Remember: Never risk more than you can afford to lose!**

*Built with ❤️, rigorous risk management, and bull market intelligence* 