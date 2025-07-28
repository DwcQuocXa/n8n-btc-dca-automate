// Cryptocurrency Configuration for Multi-Token Backtesting
// Centralizes all token-specific parameters and settings

const CRYPTO_CONFIGS = {
  BTC: {
    symbol: 'BTC-EUR',
    name: 'Bitcoin',
    displayName: 'BTC',
    dataFileName: 'btc-prices-4year.json',
    resultsPrefix: 'btc',
    // Token-specific parameters
    minBalance: 0.01,
    minEurBalance: 5,
    // Display formatting
    decimals: 8,
    priceDecimals: 2
  },
  
  ETH: {
    symbol: 'ETH-EUR',
    name: 'Ethereum',
    displayName: 'ETH',
    dataFileName: 'eth-prices-4year.json',
    resultsPrefix: 'eth',
    // Token-specific parameters
    minBalance: 0.1,
    minEurBalance: 5,
    // Display formatting
    decimals: 6,
    priceDecimals: 2
  },
  
  SOL: {
    symbol: 'SOL-EUR',
    name: 'Solana',
    displayName: 'SOL',
    dataFileName: 'sol-prices-4year.json',
    resultsPrefix: 'sol',
    // Token-specific parameters
    minBalance: 1,
    minEurBalance: 5,
    // Display formatting
    decimals: 4,
    priceDecimals: 2
  },
  
  BNB: {
    symbol: 'BNB-EUR',
    name: 'Binance Coin',
    displayName: 'BNB',
    dataFileName: 'bnb-prices-4year.json',
    resultsPrefix: 'bnb',
    // Token-specific parameters
    minBalance: 0.5,
    minEurBalance: 5,
    // Display formatting
    decimals: 4,
    priceDecimals: 2
  }
};

// Common configuration shared across all tokens
const COMMON_CONFIG = {
  // Test period (default - can be overridden)
  testPeriod: {
    startDate: '2021-07-27',
    endDate: '2025-07-27',
    years: 4
  },
  
  // Investment parameters
  investment: {
    weeklyDepositEur: 100,
    totalInvestmentPeriodWeeks: 174, // Approximately 4 years of weekly deposits
    expectedTotalInvestment: 17400
  },
  
  // Data sources
  dataSources: {
    fearGreedFile: 'fear-greed-index-extended.json',
    priceSource: 'yahoo-finance'
  },
  
  // Risk configuration (same for all tokens)
  riskConfig: {
    portfolio: {
      corePortfolioPercentage: 0.9,     // 90% for core portfolio
      satellitePoolPercentage: 0.1,     // 10% for satellite portfolio
      rebalanceBand: 0.05,              // ±5% rebalancing threshold
      fearGreedTargets: {
        EXTREME_FEAR: { range: [0, 20], target: 0.85, description: 'Extreme Fear - Accumulate Aggressively' },
        FEAR: { range: [21, 30], target: 0.80, description: 'Fear - Accumulate More' },
        NEUTRAL: { range: [31, 60], target: 0.75, description: 'Neutral - Base Allocation' },
        GREED: { range: [61, 70], target: 0.70, description: 'Greed - Take Some Profits' },
        HIGH_GREED: { range: [71, 80], target: 0.65, description: 'High Greed - Take More Profits' },
        EXTREME_GREED: { range: [81, 100], target: 0.60, description: 'Extreme Greed - Maximum Profit Taking' }
      }
    },
    circuitBreakers: {
      maxPortfolioDecline7d: -0.20,
      maxTokenDecline24h: -0.10
    },
    fearGreedRules: {
      EXTREME_FEAR: { range: [0, 20], percentage: 7.5, description: 'Extreme Fear - Aggressive Buy' },
      FEAR: { range: [21, 30], percentage: 4, description: 'Fear - Moderate Buy' },
      NEUTRAL: { range: [31, 60], percentage: 1, description: 'Neutral - DCA if below MA20' },
      GREED: { range: [61, 70], percentage: 4, description: 'Greed - Small Sell' },
      HIGH_GREED: { range: [71, 80], percentage: 30, description: 'High Greed - Moderate Sell' },
      EXTREME_GREED: { range: [81, 100], percentage: 10, description: 'Extreme Greed - Aggressive Sell' }
    }
  },
  
  // Directory structure
  directories: {
    data: '../data',
    results: '../results',
    scripts: '.'
  }
};

// Helper functions
function getCryptoConfig(tokenSymbol) {
  const config = CRYPTO_CONFIGS[tokenSymbol.toUpperCase()];
  if (!config) {
    throw new Error(`Unsupported cryptocurrency: ${tokenSymbol}`);
  }
  return config;
}

function getAllSupportedTokens() {
  return Object.keys(CRYPTO_CONFIGS);
}

function validateTokenSymbol(tokenSymbol) {
  return CRYPTO_CONFIGS.hasOwnProperty(tokenSymbol.toUpperCase());
}

function getTokenSpecificConfig(tokenSymbol, customTestPeriod = null) {
  const cryptoConfig = getCryptoConfig(tokenSymbol);
  const testPeriod = customTestPeriod || COMMON_CONFIG.testPeriod;
  
  return {
    ...COMMON_CONFIG,
    testPeriod: testPeriod,
    crypto: cryptoConfig,
    // Merge token-specific risk parameters
    riskConfig: {
      ...COMMON_CONFIG.riskConfig,
      dca: {
        minTokenBalance: cryptoConfig.minBalance,
        minEurBalance: cryptoConfig.minEurBalance
      }
    }
  };
}

module.exports = {
  CRYPTO_CONFIGS,
  COMMON_CONFIG,
  getCryptoConfig,
  getAllSupportedTokens,
  validateTokenSymbol,
  getTokenSpecificConfig
};