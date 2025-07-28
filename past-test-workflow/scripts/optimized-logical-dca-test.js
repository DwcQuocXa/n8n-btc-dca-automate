// Optimized Complete Logical DCA Strategy Test with Bull Market Optimization
// Implements trend-aware profit taking to prevent premature selling during bull markets

const fs = require('fs');
const path = require('path');
const { validateTokenSymbol } = require('./crypto-config');
const { 
  OPTIMIZED_RISK_CONFIG, 
  detectMarketRegime, 
  calculateMA, 
  evaluateTrendFilter, 
  getDynamicTargetAllocation,
  getOptimizedTokenConfig 
} = require('./optimized-logical-dca-config');

const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');

function loadOptimizedHistoricalData(tokenSymbol, testPeriod = null) {
  try {
    const config = getOptimizedTokenConfig(tokenSymbol, testPeriod);
    const cryptoConfig = config.crypto;
    
    const fearGreedPath = path.join(DATA_DIR, 'fear-greed-index-extended.json');
    let tokenPricePath;
    
    // Determine which price data file to use
    if (testPeriod && testPeriod.endDate === '2022-12-31') {
      tokenPricePath = path.join(DATA_DIR, `${cryptoConfig.resultsPrefix}-prices-bear-market.json`);
    } else {
      tokenPricePath = path.join(DATA_DIR, cryptoConfig.dataFileName);
    }
    
    const fearGreedData = JSON.parse(fs.readFileSync(fearGreedPath, 'utf8'));
    const tokenPriceData = JSON.parse(fs.readFileSync(tokenPricePath, 'utf8'));
    
    console.log(`📊 Loaded ${fearGreedData.length} Fear & Greed records`);
    console.log(`💰 Loaded ${tokenPriceData.length} ${cryptoConfig.displayName} price records (optimized)`);
    
    return { fearGreedData, tokenPriceData, config };
    
  } catch (error) {
    console.error(`❌ Error loading ${tokenSymbol.toUpperCase()} optimized historical data:`, error.message);
    throw error;
  }
}

// Enhanced Satellite Portfolio DCA with Trend Filters
function determineOptimizedSatelliteDCAAction(fearGreedIndex, marketData, satellitePoolSize, riskConfig) {
  let action = 'HOLD';
  let tradePercentage = 0;
  let notes = '';
  
  const rules = riskConfig.optimizedFearGreedRules;
  const { tokenPrice, ma20 } = marketData;
  
  // Find applicable rule
  let applicableRule = null;
  for (const [key, rule] of Object.entries(rules)) {
    if (fearGreedIndex >= rule.range[0] && fearGreedIndex <= rule.range[1]) {
      applicableRule = rule;
      break;
    }
  }
  
  if (!applicableRule) {
    return { action: 'HOLD', tradePercentage: 0, tradeAmount: 0, notes: 'No applicable rule found' };
  }
  
  // Handle buying rules (no trend filter needed)
  if (applicableRule.trendFilter === 'NONE') {
    action = 'BUY';
    tradePercentage = applicableRule.percentage;
    notes = applicableRule.description;
  } else if (applicableRule.trendFilter === 'PRICE_BELOW_MA20') {
    if (tokenPrice < ma20) {
      action = 'BUY';
      tradePercentage = applicableRule.percentage;
      notes = applicableRule.description;
    } else {
      action = 'HOLD';
      notes = 'Neutral - Hold (Price above MA20)';
    }
  } 
  // Handle selling rules with trend filters
  else if (['WEAK_TREND', 'STRONG_WEAKNESS', 'CONFIRMED_REVERSAL'].includes(applicableRule.trendFilter)) {
    // Check if trend filter allows selling
    const trendAllowsSelling = evaluateTrendFilter(applicableRule.trendFilter, marketData);
    
    if (trendAllowsSelling) {
      action = 'SELL';
      tradePercentage = applicableRule.percentage;
      notes = `${applicableRule.description} + Trend Confirmation`;
    } else {
      action = 'HOLD';
      notes = `${applicableRule.description.replace('Sell', 'Hold')} - Strong Trend Continues`;
    }
  }
  
  const tradeAmount = satellitePoolSize * (tradePercentage / 100);
  
  return { action, tradePercentage, tradeAmount, notes };
}

// Enhanced Core Portfolio Rebalancing with Dynamic Targets
function determineOptimizedCoreRebalancing(
  fearGreedIndex, 
  fearGreedValue, 
  tokenPrice, 
  totalPortfolioValue, 
  corePortfolioToken, 
  corePortfolioEUR, 
  marketRegime,
  riskConfig, 
  tokenSymbol
) {
  const portfolioConfig = riskConfig.portfolio;
  const corePortfolioValue = totalPortfolioValue * portfolioConfig.corePortfolioPercentage;
  const currentCoreTokenValue = corePortfolioToken * tokenPrice;
  const currentCoreEurValue = corePortfolioEUR;
  const currentCoreTotalValue = currentCoreTokenValue + currentCoreEurValue;
  const currentCoreTokenAllocation = currentCoreTotalValue > 0 ? currentCoreTokenValue / currentCoreTotalValue : 0;
  
  // Get dynamic target allocation based on market regime
  const targetTokenAllocation = getDynamicTargetAllocation(fearGreedIndex, marketRegime);
  
  // Determine strategy description
  let fearGreedStrategy = 'Unknown';
  for (const [key, config] of Object.entries(portfolioConfig.dynamicFearGreedTargets)) {
    if (fearGreedIndex >= config.range[0] && fearGreedIndex <= config.range[1]) {
      fearGreedStrategy = config.description;
      break;
    }
  }
  
  const rebalanceBand = portfolioConfig.rebalanceBand;
  let needsRebalancing = false;
  let action = 'HOLD';
  let tradeAmount = 0;
  let notes = `Optimized Core Rebalancing - Fear & Greed: ${fearGreedIndex} (${fearGreedValue}) - ${fearGreedStrategy} - Market: ${marketRegime}`;
  
  // Check if rebalancing is needed based on dynamic target
  if (currentCoreTokenAllocation > targetTokenAllocation + rebalanceBand) {
    // Too much token in core, sell some
    needsRebalancing = true;
    action = 'SELL';
    const targetCoreTokenValue = currentCoreTotalValue * targetTokenAllocation;
    const excessTokenValue = currentCoreTokenValue - targetCoreTokenValue;
    tradeAmount = excessTokenValue / tokenPrice;
    notes += ` | Rebalancing: Core ${tokenSymbol.toUpperCase()} allocation too high (${(currentCoreTokenAllocation * 100).toFixed(1)}% vs ${(targetTokenAllocation * 100).toFixed(1)}% target)`;
  } else if (currentCoreTokenAllocation < targetTokenAllocation - rebalanceBand) {
    // Too little token in core, buy some
    needsRebalancing = true;
    action = 'BUY';
    const targetCoreTokenValue = currentCoreTotalValue * targetTokenAllocation;
    const neededTokenValue = targetCoreTokenValue - currentCoreTokenValue;
    tradeAmount = neededTokenValue;
    notes += ` | Rebalancing: Core ${tokenSymbol.toUpperCase()} allocation too low (${(currentCoreTokenAllocation * 100).toFixed(1)}% vs ${(targetTokenAllocation * 100).toFixed(1)}% target)`;
  } else {
    notes += ` | Core portfolio within target range (${(currentCoreTokenAllocation * 100).toFixed(1)}% vs ${(targetTokenAllocation * 100).toFixed(1)}% target)`;
  }
  
  return {
    needsRebalancing,
    action,
    tradeAmount,
    currentCoreTokenAllocation: currentCoreTokenAllocation * 100,
    targetTokenAllocation: targetTokenAllocation * 100,
    fearGreedStrategy,
    marketRegime,
    notes
  };
}

// Enhanced Circuit Breakers (unchanged but included for completeness)
function applyOptimizedCircuitBreakers(action, portfolioValue, portfolioValue7dAgo, tokenPrice, tokenPrice24hAgo, riskConfig, tokenSymbol) {
  let notes = '';
  
  const portfolioChange7d = portfolioValue7dAgo ? 
    ((portfolioValue - portfolioValue7dAgo) / portfolioValue7dAgo) : 0;
    
  const tokenChange24h = tokenPrice24hAgo ? 
    ((tokenPrice - tokenPrice24hAgo) / tokenPrice24hAgo) : 0;
  
  if (portfolioChange7d < riskConfig.circuitBreakers.maxPortfolioDecline7d) {
    action = 'HOLD';
    notes += ' - Circuit Breaker: Portfolio down >20% in 7 days';
  }
  
  if (tokenChange24h < riskConfig.circuitBreakers.maxTokenDecline24h) {
    action = 'HOLD';
    notes += ` - Circuit Breaker: ${tokenSymbol.toUpperCase()} down >10% in 24h`;
  }
  
  return { action, notes };
}

function runOptimizedCompleteLogicalDCATest(tokenSymbol, testPeriod = null, suffix = '') {
  // Validate token
  if (!validateTokenSymbol(tokenSymbol)) {
    throw new Error(`Unsupported cryptocurrency: ${tokenSymbol}`);
  }
  
  const tokenUpper = tokenSymbol.toUpperCase();
  const periodDesc = testPeriod ? 
    `${testPeriod.startDate} to ${testPeriod.endDate}` : 
    '2021-2025';
  
  console.log(`🚀 Starting Optimized Complete Logical DCA Test for ${tokenUpper} (${periodDesc})...`);
  console.log('📋 Architecture: Optimized Core Portfolio (90%) + Satellite Portfolio (10%) with Bull Market Optimization');
  
  const { fearGreedData, tokenPriceData, config } = loadOptimizedHistoricalData(tokenSymbol, testPeriod);
  const cryptoConfig = config.crypto;
  const riskConfig = config.riskConfig;
  const weeklyDepositEur = config.investment.weeklyDepositEur;
  
  // Create lookup maps
  const fearGreedMap = new Map();
  fearGreedData.forEach(item => {
    fearGreedMap.set(item.dateString, item);
  });
  
  const tokenPriceMap = new Map();
  tokenPriceData.forEach(item => {
    tokenPriceMap.set(item.dateString, item);
  });
  
  // Dual Portfolio State
  let corePortfolioToken = 0;
  let corePortfolioEUR = 0;
  let satellitePortfolioToken = 0;
  let satellitePortfolioEUR = 0;
  
  let totalInvested = 0;
  let daysSinceLastDeposit = 0;
  
  // Historical tracking for circuit breakers and trend analysis
  const portfolioHistory = [];
  const tokenPriceHistory = [];
  const priceHistoryForMA = [];
  
  // Enhanced tracking for optimization
  let allTimeHigh = 0;
  let consecutiveBullDays = 0;
  
  // Results tracking
  const results = [];
  const trades = [];
  
  // Get overlapping date range
  const tokenDates = new Set(tokenPriceData.map(item => item.dateString));
  let commonDates = fearGreedData
    .filter(item => tokenDates.has(item.dateString))
    .map(item => item.dateString)
    .sort();
  
  // Filter by test period if specified
  if (testPeriod) {
    const startDate = new Date(testPeriod.startDate);
    const endDate = new Date(testPeriod.endDate);
    commonDates = commonDates.filter(dateString => {
      const date = new Date(dateString);
      return date >= startDate && date <= endDate;
    });
  }
  
  console.log(`📅 Testing period: ${commonDates[0]} to ${commonDates[commonDates.length - 1]}`);
  console.log(`📊 Total days with complete data: ${commonDates.length}`);
  
  // Initialize portfolios with first weekly deposit
  satellitePortfolioEUR = weeklyDepositEur * riskConfig.portfolio.satellitePoolPercentage;
  corePortfolioEUR = weeklyDepositEur * riskConfig.portfolio.corePortfolioPercentage;
  totalInvested = weeklyDepositEur;
  
  // Iterate through each day with complete data
  commonDates.forEach((dateString, dayIndex) => {
    const currentDate = new Date(dateString);
    const dayOfMonth = currentDate.getDate();
    
    // Weekly deposit (every ~5 trading days)
    if (dayIndex === 0 || daysSinceLastDeposit >= 5) {
      if (dayIndex > 0) {
        const satelliteDeposit = weeklyDepositEur * riskConfig.portfolio.satellitePoolPercentage;
        const coreDeposit = weeklyDepositEur * riskConfig.portfolio.corePortfolioPercentage;
        
        satellitePortfolioEUR += satelliteDeposit;
        corePortfolioEUR += coreDeposit;
        totalInvested += weeklyDepositEur;
      }
      daysSinceLastDeposit = 0;
    } else {
      daysSinceLastDeposit++;
    }
    
    // Get market data
    const fearGreedItem = fearGreedMap.get(dateString);
    const tokenPriceItem = tokenPriceMap.get(dateString);
    
    if (!fearGreedItem || !tokenPriceItem) {
      return;
    }
    
    const fearGreedIndex = fearGreedItem.value;
    const fearGreedValue = fearGreedItem.classification;
    const tokenPrice = tokenPriceItem.price;
    const ma20 = tokenPriceItem.ma20;
    
    // Add to price history for moving average calculations
    priceHistoryForMA.push({ price: tokenPrice, date: dateString });
    if (priceHistoryForMA.length > 200) {
      priceHistoryForMA.shift();
    }
    
    // Calculate enhanced moving averages
    const ma50 = calculateMA(priceHistoryForMA, 50);
    const ma200 = calculateMA(priceHistoryForMA, 200);
    
    // Calculate momentum indicators
    const tokenPrice7DaysAgo = tokenPriceHistory.length >= 7 ? tokenPriceHistory[tokenPriceHistory.length - 7] : tokenPrice;
    const tokenPrice30DaysAgo = tokenPriceHistory.length >= 30 ? tokenPriceHistory[tokenPriceHistory.length - 30] : tokenPrice;
    
    const sevenDayReturn = tokenPrice7DaysAgo ? ((tokenPrice - tokenPrice7DaysAgo) / tokenPrice7DaysAgo) * 100 : 0;
    const thirtyDayReturn = tokenPrice30DaysAgo ? ((tokenPrice - tokenPrice30DaysAgo) / tokenPrice30DaysAgo) * 100 : 0;
    
    // Detect market regime
    const marketRegime = detectMarketRegime(tokenPrice, ma50, ma200, thirtyDayReturn);
    
    // Update all-time high tracking
    allTimeHigh = Math.max(allTimeHigh, tokenPrice);
    const pullbackFromATH = ((allTimeHigh - tokenPrice) / allTimeHigh) * 100;
    
    // Update consecutive bull days
    if (marketRegime === 'BULL_MARKET') {
      consecutiveBullDays++;
    } else {
      consecutiveBullDays = 0;
    }
    
    // Create market data object for trend analysis
    const marketData = {
      tokenPrice,
      ma20,
      ma50,
      ma200,
      sevenDayReturn,
      thirtyDayReturn,
      marketRegime,
      pullbackFromATH,
      consecutiveBullDays
    };
    
    // Calculate total portfolio values
    const satelliteValue = (satellitePortfolioToken * tokenPrice) + satellitePortfolioEUR;
    const coreValue = (corePortfolioToken * tokenPrice) + corePortfolioEUR;
    const totalValue = satelliteValue + coreValue;
    
    const totalTokenBalance = satellitePortfolioToken + corePortfolioToken;
    const totalEurBalance = satellitePortfolioEUR + corePortfolioEUR;
    const totalTokenAllocation = totalValue > 0 ? (totalTokenBalance * tokenPrice) / totalValue : 0;
    
    // Get historical data for circuit breakers
    const portfolioValue7dAgo = portfolioHistory.length >= 7 ? portfolioHistory[portfolioHistory.length - 7] : null;
    const tokenPrice24hAgo = tokenPriceHistory.length >= 1 ? tokenPriceHistory[tokenPriceHistory.length - 1] : null;
    
    let finalAction = 'HOLD';
    let actionType = 'NONE';
    let tradeAmount = 0;
    let notes = '';
    
    // PRIORITY 1: CORE PORTFOLIO MONTHLY REBALANCING (1st day of month)
    if (dayOfMonth === 1) {
      const rebalanceResult = determineOptimizedCoreRebalancing(
        fearGreedIndex, 
        fearGreedValue, 
        tokenPrice, 
        totalValue,
        corePortfolioToken,
        corePortfolioEUR,
        marketRegime,
        riskConfig,
        tokenUpper
      );
      
      if (rebalanceResult.needsRebalancing) {
        finalAction = rebalanceResult.action;
        actionType = 'CORE_REBALANCE';
        tradeAmount = rebalanceResult.tradeAmount;
        notes = rebalanceResult.notes;
      } else {
        notes = rebalanceResult.notes;
      }
    }
    
    // PRIORITY 2: OPTIMIZED SATELLITE PORTFOLIO DAILY DCA (if no core rebalancing)
    if (finalAction === 'HOLD' && actionType === 'NONE') {
      const satelliteDCAResult = determineOptimizedSatelliteDCAAction(fearGreedIndex, marketData, satelliteValue, riskConfig);
      
      // Apply circuit breakers
      const circuitBreakerResult = applyOptimizedCircuitBreakers(satelliteDCAResult.action, totalValue, portfolioValue7dAgo, tokenPrice, tokenPrice24hAgo, riskConfig, tokenUpper);
      
      if (circuitBreakerResult.action !== 'HOLD') {
        finalAction = circuitBreakerResult.action;
        actionType = 'SATELLITE_DCA';
        tradeAmount = satelliteDCAResult.tradeAmount;
        notes = `Optimized Satellite DCA: ${satelliteDCAResult.notes}` + circuitBreakerResult.notes;
      } else {
        notes = `Optimized Satellite DCA: ${satelliteDCAResult.notes}` + circuitBreakerResult.notes;
      }
    }
    
    // EXECUTE TRADES (same logic as original, but with optimized decision making)
    if (finalAction === 'BUY' && tradeAmount > 0) {
      if (actionType === 'CORE_REBALANCE') {
        if (corePortfolioEUR >= Math.max(riskConfig.dca.minEurBalance, tradeAmount)) {
          const tokenPurchased = tradeAmount / tokenPrice;
          corePortfolioEUR -= tradeAmount;
          corePortfolioToken += tokenPurchased;
          
          trades.push({
            date: dateString,
            type: actionType,
            action: 'BUY',
            eurAmount: tradeAmount,
            tokenAmount: tokenPurchased,
            tokenPrice: tokenPrice,
            fearGreedIndex: fearGreedIndex,
            marketRegime: marketRegime,
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ' - Insufficient core EUR balance';
        }
      } else if (actionType === 'SATELLITE_DCA') {
        if (satellitePortfolioEUR >= Math.max(riskConfig.dca.minEurBalance / 10, tradeAmount)) {
          const tokenPurchased = tradeAmount / tokenPrice;
          satellitePortfolioEUR -= tradeAmount;
          satellitePortfolioToken += tokenPurchased;
          
          trades.push({
            date: dateString,
            type: actionType,
            action: 'BUY',
            eurAmount: tradeAmount,
            tokenAmount: tokenPurchased,
            tokenPrice: tokenPrice,
            fearGreedIndex: fearGreedIndex,
            marketRegime: marketRegime,
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ' - Insufficient satellite EUR balance';
        }
      }
      
    } else if (finalAction === 'SELL' && tradeAmount > 0) {
      if (actionType === 'CORE_REBALANCE') {
        if (corePortfolioToken >= Math.max(riskConfig.dca.minTokenBalance, tradeAmount)) {
          const eurReceived = tradeAmount * tokenPrice;
          corePortfolioToken -= tradeAmount;
          corePortfolioEUR += eurReceived;
          
          trades.push({
            date: dateString,
            type: actionType,
            action: 'SELL',
            eurAmount: eurReceived,
            tokenAmount: tradeAmount,
            tokenPrice: tokenPrice,
            fearGreedIndex: fearGreedIndex,
            marketRegime: marketRegime,
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ` - Insufficient core ${tokenUpper} balance`;
        }
      } else if (actionType === 'SATELLITE_DCA') {
        const tokenToSell = tradeAmount / tokenPrice;
        if (satellitePortfolioToken >= Math.max(riskConfig.dca.minTokenBalance / 10, tokenToSell)) {
          const eurReceived = tradeAmount;
          satellitePortfolioToken -= tokenToSell;
          satellitePortfolioEUR += eurReceived;
          
          trades.push({
            date: dateString,
            type: actionType,
            action: 'SELL',
            eurAmount: eurReceived,
            tokenAmount: tokenToSell,
            tokenPrice: tokenPrice,
            fearGreedIndex: fearGreedIndex,
            marketRegime: marketRegime,
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ` - Insufficient satellite ${tokenUpper} balance`;
        }
      }
    }
    
    // Update historical tracking
    portfolioHistory.push(totalValue);
    tokenPriceHistory.push(tokenPrice);
    
    if (portfolioHistory.length > 7) portfolioHistory.shift();
    if (tokenPriceHistory.length > 30) tokenPriceHistory.shift();
    
    // Recalculate final values after trades
    const finalSatelliteValue = (satellitePortfolioToken * tokenPrice) + satellitePortfolioEUR;
    const finalCoreValue = (corePortfolioToken * tokenPrice) + corePortfolioEUR;
    const finalTotalValue = finalSatelliteValue + finalCoreValue;
    const finalTotalTokenBalance = satellitePortfolioToken + corePortfolioToken;
    const finalTotalEurBalance = satellitePortfolioEUR + corePortfolioEUR;
    const finalTotalTokenAllocation = finalTotalValue > 0 ? (finalTotalTokenBalance * tokenPrice) / finalTotalValue : 0;
    
    // Record daily result with optimization metrics
    results.push({
      date: dateString,
      fearGreedIndex: fearGreedIndex,
      fearGreedValue: fearGreedValue,
      tokenPrice: tokenPrice,
      ma20: ma20,
      ma50: ma50,
      ma200: ma200,
      sevenDayReturn: sevenDayReturn,
      thirtyDayReturn: thirtyDayReturn,
      marketRegime: marketRegime,
      pullbackFromATH: pullbackFromATH,
      action: finalAction,
      actionType: actionType,
      tradeAmount: tradeAmount,
      totalTokenBalance: finalTotalTokenBalance,
      totalEurBalance: finalTotalEurBalance,
      totalValue: finalTotalValue,
      tokenAllocation: finalTotalTokenAllocation * 100,
      coreTokenBalance: corePortfolioToken,
      coreEurBalance: corePortfolioEUR,
      coreValue: finalCoreValue,
      coreTokenAllocation: finalCoreValue > 0 ? (corePortfolioToken * tokenPrice) / finalCoreValue * 100 : 0,
      satelliteTokenBalance: satellitePortfolioToken,
      satelliteEurBalance: satellitePortfolioEUR,
      satelliteValue: finalSatelliteValue,
      satelliteTokenAllocation: finalSatelliteValue > 0 ? (satellitePortfolioToken * tokenPrice) / finalSatelliteValue * 100 : 0,
      totalInvested: totalInvested,
      unrealizedPnL: finalTotalValue - totalInvested,
      unrealizedPnLPercent: totalInvested > 0 ? ((finalTotalValue - totalInvested) / totalInvested) * 100 : 0,
      notes: notes
    });
  });
  
  // Calculate final metrics
  const finalTokenPrice = tokenPriceData[tokenPriceData.length - 1]?.price || 0;
  const finalTotalTokenBalance = satellitePortfolioToken + corePortfolioToken;
  const finalTotalEurBalance = satellitePortfolioEUR + corePortfolioEUR;
  const finalValue = (finalTotalTokenBalance * finalTokenPrice) + finalTotalEurBalance;
  const totalReturn = finalValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  
  // Calculate CAGR
  const years = results.length / 365;
  const cagr = totalInvested > 0 ? (Math.pow(finalValue / totalInvested, 1/years) - 1) * 100 : 0;
  
  // Calculate optimization-specific metrics
  const totalTrades = trades.length;
  const sellTrades = trades.filter(t => t.action === 'SELL').length;
  const bullMarketDays = results.filter(r => r.marketRegime === 'BULL_MARKET').length;
  const bearMarketDays = results.filter(r => r.marketRegime === 'BEAR_MARKET').length;
  const neutralDays = results.filter(r => r.marketRegime === 'NEUTRAL').length;
  
  const avgTokenAllocation = results.reduce((sum, r) => sum + r.tokenAllocation, 0) / results.length;
  
  const finalResult = {
    strategy: `Optimized Complete Logical DCA (Bull Market Optimized) - ${tokenUpper}${suffix ? ` - ${suffix}` : ''} - ${testPeriod ? 'Bear Market' : '4 Years'}`,
    tokenSymbol: tokenUpper,
    testPeriod: {
      start: commonDates[0],
      end: commonDates[commonDates.length - 1],
      totalDays: results.length,
      totalYears: Math.round(years * 10) / 10
    },
    finalPortfolio: {
      totalTokenBalance: finalTotalTokenBalance,
      totalEurBalance: finalTotalEurBalance,
      totalValue: finalValue,
      tokenAllocation: finalValue > 0 ? ((finalTotalTokenBalance * finalTokenPrice) / finalValue) * 100 : 0,
      totalInvested: totalInvested,
      totalReturn: totalReturn,
      totalReturnPercent: totalReturnPercent,
      cagr: cagr,
      coreTokenBalance: corePortfolioToken,
      coreEurBalance: corePortfolioEUR,
      coreValue: (corePortfolioToken * finalTokenPrice) + corePortfolioEUR,
      coreTokenAllocation: ((corePortfolioToken * finalTokenPrice) / ((corePortfolioToken * finalTokenPrice) + corePortfolioEUR)) * 100,
      satelliteTokenBalance: satellitePortfolioToken,
      satelliteEurBalance: satellitePortfolioEUR,
      satelliteValue: (satellitePortfolioToken * finalTokenPrice) + satellitePortfolioEUR,
      satelliteTokenAllocation: ((satellitePortfolioToken * finalTokenPrice) / ((satellitePortfolioToken * finalTokenPrice) + satellitePortfolioEUR)) * 100
    },
    tradeStats: {
      totalTrades: totalTrades,
      coreRebalanceTrades: trades.filter(t => t.type === 'CORE_REBALANCE').length,
      satelliteDcaTrades: trades.filter(t => t.type === 'SATELLITE_DCA').length,
      buyTrades: trades.filter(t => t.action === 'BUY').length,
      sellTrades: sellTrades,
      totalBuyVolume: trades.filter(t => t.action === 'BUY').reduce((sum, t) => sum + t.eurAmount, 0),
      totalSellVolume: trades.filter(t => t.action === 'SELL').reduce((sum, t) => sum + t.eurAmount, 0)
    },
    optimizationMetrics: {
      bullMarketDays: bullMarketDays,
      bearMarketDays: bearMarketDays,
      neutralDays: neutralDays,
      avgTokenAllocation: avgTokenAllocation,
      sellTradeReduction: `${((1 - sellTrades / totalTrades) * 100).toFixed(1)}%`,
      marketRegimeDistribution: {
        bull: `${((bullMarketDays / results.length) * 100).toFixed(1)}%`,
        bear: `${((bearMarketDays / results.length) * 100).toFixed(1)}%`,
        neutral: `${((neutralDays / results.length) * 100).toFixed(1)}%`
      }
    },
    dailyResults: results,
    trades: trades
  };
  
  // Save to files
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const periodSuffix = testPeriod ? '-bear-market' : '-4year';
  const resultsFileName = `optimized-logical-dca-results-${cryptoConfig.resultsPrefix}${periodSuffix}.json`;
  fs.writeFileSync(path.join(RESULTS_DIR, resultsFileName), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log(`\n🚀 Optimized Complete Logical DCA Results for ${tokenUpper}:`);
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`);
  console.log(`📊 CAGR: ${cagr.toFixed(2)}% per year`);
  console.log('\n🏦 OPTIMIZED PORTFOLIO BREAKDOWN:');
  console.log(`📊 Total ${tokenUpper} Allocation: ${finalResult.finalPortfolio.tokenAllocation.toFixed(1)}% (avg: ${avgTokenAllocation.toFixed(1)}%)`);
  console.log(`🎯 Core Portfolio (90%): €${finalResult.finalPortfolio.coreValue.toFixed(0)} (${finalResult.finalPortfolio.coreTokenAllocation.toFixed(1)}% ${tokenUpper})`);
  console.log(`🛰️ Satellite Portfolio (10%): €${finalResult.finalPortfolio.satelliteValue.toFixed(0)} (${finalResult.finalPortfolio.satelliteTokenAllocation.toFixed(1)}% ${tokenUpper})`);
  console.log('\n🔄 OPTIMIZED TRADING ACTIVITY:');
  console.log(`🔄 Total Trades: ${finalResult.tradeStats.totalTrades} (${finalResult.tradeStats.coreRebalanceTrades} core, ${finalResult.tradeStats.satelliteDcaTrades} satellite)`);
  console.log(`📈 Buy/Sell: ${finalResult.tradeStats.buyTrades} buys, ${finalResult.tradeStats.sellTrades} sells (${finalResult.optimizationMetrics.sellTradeReduction} sell reduction)`);
  console.log('\n📊 MARKET REGIME ANALYSIS:');
  console.log(`🚀 Bull Market Days: ${bullMarketDays} (${finalResult.optimizationMetrics.marketRegimeDistribution.bull})`);
  console.log(`🐻 Bear Market Days: ${bearMarketDays} (${finalResult.optimizationMetrics.marketRegimeDistribution.bear})`);
  console.log(`⚖️ Neutral Days: ${neutralDays} (${finalResult.optimizationMetrics.marketRegimeDistribution.neutral})`);
  console.log(`📅 Test Duration: ${finalResult.testPeriod.totalYears} years`);
  console.log(`💾 Results saved to: ${resultsFileName}`);
  
  return finalResult;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Usage Examples:');
    console.log('   Single token: node optimized-logical-dca-test.js BTC');
    console.log('   Bear market: node optimized-logical-dca-test.js BTC bear');
    console.log('   Supported tokens: BTC, ETH, SOL, BNB');
    process.exit(1);
  }
  
  const tokenSymbol = args[0];
  const isBearMarket = args[1] === 'bear';
  
  try {
    if (isBearMarket) {
      const bearMarketPeriod = {
        startDate: '2021-07-27',
        endDate: '2022-12-31',
        years: 1.4
      };
      runOptimizedCompleteLogicalDCATest(tokenSymbol, bearMarketPeriod, 'Bear Market');
    } else {
      runOptimizedCompleteLogicalDCATest(tokenSymbol);
    }
  } catch (error) {
    console.error(`💥 Error running Optimized Logical DCA test for ${tokenSymbol.toUpperCase()}:`, error.message);
    process.exit(1);
  }
}

module.exports = { runOptimizedCompleteLogicalDCATest };