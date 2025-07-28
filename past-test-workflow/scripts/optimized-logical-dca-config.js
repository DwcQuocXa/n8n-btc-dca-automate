// Optimized Logical DCA Configuration with Bull Market Optimization
// Implements trend-aware profit taking to prevent premature selling during bull markets

const { COMMON_CONFIG } = require('./crypto-config');

// Enhanced Risk Configuration with Bull Market Optimization
const OPTIMIZED_RISK_CONFIG = {
  portfolio: {
    corePortfolioPercentage: 0.9,
    satellitePoolPercentage: 0.1,
    rebalanceBand: 0.05,
    
    // Dynamic Fear & Greed targets based on market regime
    dynamicFearGreedTargets: {
      EXTREME_FEAR: { 
        range: [0, 20], 
        target: 0.85,
        bullMarketTarget: 0.90,
        description: 'Extreme Fear - Accumulate Aggressively' 
      },
      FEAR: { 
        range: [21, 30], 
        target: 0.80,
        bullMarketTarget: 0.85,
        description: 'Fear - Accumulate More' 
      },
      NEUTRAL: { 
        range: [31, 60], 
        target: 0.75,
        bullMarketTarget: 0.80,
        description: 'Neutral - Base Allocation' 
      },
      GREED: { 
        range: [61, 70], 
        target: 0.70,
        bullMarketTarget: 0.75,
        description: 'Greed - Take Some Profits' 
      },
      HIGH_GREED: { 
        range: [71, 80], 
        target: 0.65,
        bullMarketTarget: 0.70,
        description: 'High Greed - Take More Profits' 
      },
      EXTREME_GREED: { 
        range: [81, 100], 
        target: 0.60,
        bullMarketTarget: 0.75,
        description: 'Extreme Greed - Maximum Profit Taking' 
      }
    }
  },
  
  circuitBreakers: {
    maxPortfolioDecline7d: -0.20,
    maxTokenDecline24h: -0.10
  },
  
dca: {
    minTokenBalance: 0.01,
    minEurBalance: 5
  },
  
  // Enhanced Fear & Greed Rules with Trend Filters
  optimizedFearGreedRules: {
    EXTREME_FEAR: { 
      range: [0, 20], 
      percentage: 7.5, 
      description: 'Extreme Fear - Aggressive Buy',
      trendFilter: 'NONE' // Always buy on extreme fear
    },
    FEAR: { 
      range: [21, 30], 
      percentage: 4, 
      description: 'Fear - Moderate Buy',
      trendFilter: 'NONE' // Always buy on fear
    },
    NEUTRAL: { 
      range: [31, 60], 
      percentage: 1, 
      description: 'Neutral - DCA if below MA20',
      trendFilter: 'PRICE_BELOW_MA20' // Existing logic
    },
    GREED: { 
      range: [61, 70], 
      percentage: 4, 
      description: 'Greed - Small Sell',
      trendFilter: 'WEAK_TREND' // Only sell if trend weak
    },
    HIGH_GREED: { 
      range: [71, 80], 
      percentage: 7.5, // Reduced from 30%
      description: 'High Greed - Moderate Sell',
      trendFilter: 'STRONG_WEAKNESS' // Require stronger weakness
    },
    EXTREME_GREED: { 
      range: [81, 100], 
      percentage: 10, 
      description: 'Extreme Greed - Aggressive Sell',
      trendFilter: 'CONFIRMED_REVERSAL' // Only on confirmed reversal
    }
  },
  
  // Market Regime Detection Parameters
  marketRegime: {
    bullMarketThresholds: {
      priceAboveMA50: true,
      ma50AboveMA200: true,
      thirtyDayReturn: 20 // > 20% return required
    },
    bearMarketThresholds: {
      priceBelowMA50: true,
      ma50BelowMA200: true,
      thirtyDayReturn: -20 // < -20% return required
    }
  },
  
  // Trend Filter Criteria
  trendFilters: {
    WEAK_TREND: {
      // Sell on greed only if trend is weakening
      conditions: ['PRICE_BELOW_MA20', 'NEGATIVE_7DAY_RETURN']
    },
    STRONG_WEAKNESS: {
      // Sell on high greed only with stronger weakness signals
      conditions: ['PRICE_BELOW_MA50', 'RETURN_30DAY_BELOW_10PCT']
    },
    CONFIRMED_REVERSAL: {
      // Sell on extreme greed only with confirmed reversal
      conditions: ['NEGATIVE_7DAY_RETURN_GT_5PCT', 'PRICE_BELOW_MA20']
    }
  },
  
  // Trailing Stop Configuration
  trailingStop: {
    enabled: true,
    pullbackThreshold: 15, // 15% pullback from ATH to allow profit taking
    minHoldPeriod: 30 // Minimum days to hold before allowing trailing stop
  }
};

// Market Regime Detection Function
function detectMarketRegime(tokenPrice, ma50, ma200, thirtyDayReturn) {
  const config = OPTIMIZED_RISK_CONFIG.marketRegime;
  
  if (tokenPrice > ma50 && 
      ma50 > ma200 && 
      thirtyDayReturn > config.bullMarketThresholds.thirtyDayReturn) {
    return 'BULL_MARKET';
  } else if (tokenPrice < ma50 && 
             ma50 < ma200 && 
             thirtyDayReturn < config.bearMarketThresholds.thirtyDayReturn) {
    return 'BEAR_MARKET';
  } else {
    return 'NEUTRAL';
  }
}

// Enhanced Moving Average Calculation
function calculateMA(prices, period) {
  if (prices.length < period) {
    return prices.reduce((sum, item) => sum + item.price, 0) / prices.length;
  }
  
  const recentPrices = prices.slice(-period);
  return recentPrices.reduce((sum, item) => sum + item.price, 0) / period;
}

// Trend Filter Evaluation
function evaluateTrendFilter(filterType, marketData) {
  const { tokenPrice, ma20, ma50, ma200, sevenDayReturn, thirtyDayReturn } = marketData;
  const filters = OPTIMIZED_RISK_CONFIG.trendFilters[filterType];
  
  if (!filters) return false;
  
  const conditions = {
    'PRICE_BELOW_MA20': tokenPrice < ma20,
    'PRICE_BELOW_MA50': tokenPrice < ma50,
    'NEGATIVE_7DAY_RETURN': sevenDayReturn < 0,
    'NEGATIVE_7DAY_RETURN_GT_5PCT': sevenDayReturn < -5,
    'RETURN_30DAY_BELOW_10PCT': thirtyDayReturn < 10
  };
  
  // At least one condition must be true to allow selling
  return filters.conditions.some(condition => conditions[condition]);
}

// Get Dynamic Target Allocation
function getDynamicTargetAllocation(fearGreedIndex, marketRegime) {
  const targets = OPTIMIZED_RISK_CONFIG.portfolio.dynamicFearGreedTargets;
  
  for (const [key, config] of Object.entries(targets)) {
    if (fearGreedIndex >= config.range[0] && fearGreedIndex <= config.range[1]) {
      return marketRegime === 'BULL_MARKET' ? config.bullMarketTarget : config.target;
    }
  }
  
  return 0.75; // Default neutral allocation
}

// Enhanced Token-Specific Configuration
function getOptimizedTokenConfig(tokenSymbol, customTestPeriod = null) {
  const { getCryptoConfig } = require('./crypto-config');
  const cryptoConfig = getCryptoConfig(tokenSymbol);
  const testPeriod = customTestPeriod || COMMON_CONFIG.testPeriod;
  
  return {
    ...COMMON_CONFIG,
    testPeriod: testPeriod,
    crypto: cryptoConfig,
    riskConfig: {
      ...OPTIMIZED_RISK_CONFIG,
      dca: {
        minTokenBalance: cryptoConfig.minBalance,
        minEurBalance: cryptoConfig.minEurBalance
      }
    }
  };
}

module.exports = {
  OPTIMIZED_RISK_CONFIG,
  detectMarketRegime,
  calculateMA,
  evaluateTrendFilter,
  getDynamicTargetAllocation,
  getOptimizedTokenConfig
};