// Extended Logical DCA Strategy Test - 3 Years Historical Simulation
// Uses 3 years of data covering bear market, recovery, and bull market

const fs = require('fs');
const path = require('path');

// Load historical data
const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');

// Risk Configuration (same as original)
const RISK_CONFIG = {
  PORTFOLIO: {
    TARGET_BTC_ALLOCATION: 0.75,
    SATELLITE_POOL_PERCENTAGE: 0.3,
  },
  DCA: {
    MIN_BTC_BALANCE: 0.01,
    MIN_EUR_BALANCE: 5,
  },
  CIRCUIT_BREAKERS: {
    MAX_PORTFOLIO_DECLINE_7D: -0.20,
    MAX_BTC_DECLINE_24H: -0.10,
  },
  FEAR_GREED_RULES: {
    EXTREME_FEAR: { RANGE: [0, 20], PERCENTAGE: 7.5, DESCRIPTION: 'Extreme Fear - Aggressive Buy' },
    FEAR: { RANGE: [21, 30], PERCENTAGE: 4, DESCRIPTION: 'Fear - Moderate Buy' },
    NEUTRAL: { RANGE: [31, 60], PERCENTAGE: 1, DESCRIPTION: 'Neutral - DCA if below MA20' },
    GREED: { RANGE: [61, 70], PERCENTAGE: 4, DESCRIPTION: 'Greed - Small Sell' },
    HIGH_GREED: { RANGE: [71, 80], PERCENTAGE: 30, DESCRIPTION: 'High Greed - Moderate Sell' },
    EXTREME_GREED: { RANGE: [81, 100], PERCENTAGE: 10, DESCRIPTION: 'Extreme Greed - Aggressive Sell' }
  }
};

const WEEKLY_DEPOSIT_EUR = 100;

function loadExtendedHistoricalData() {
  try {
    const fearGreedPath = path.join(DATA_DIR, 'fear-greed-index-extended.json');
    const btcPricePath = path.join(DATA_DIR, 'btc-prices-yahoo-extended.json');
    
    const fearGreedData = JSON.parse(fs.readFileSync(fearGreedPath, 'utf8'));
    const btcPriceData = JSON.parse(fs.readFileSync(btcPricePath, 'utf8'));
    
    console.log(`📊 Loaded ${fearGreedData.length} Fear & Greed records (${fearGreedData[0]?.dateString} to ${fearGreedData[fearGreedData.length - 1]?.dateString})`);
    console.log(`💰 Loaded ${btcPriceData.length} BTC price records (${btcPriceData[0]?.dateString} to ${btcPriceData[btcPriceData.length - 1]?.dateString})`);
    
    return { fearGreedData, btcPriceData };
    
  } catch (error) {
    console.error('❌ Error loading extended historical data:', error.message);
    throw error;
  }
}

// Same DCA logic functions as original
function determineDCAAction(fearGreedIndex, btcPrice, ma20, portfolioValue7dAgo, btcPrice24hAgo) {
  let action = 'HOLD';
  let tradePercentage = 0;
  let notes = '';
  
  if (fearGreedIndex >= RISK_CONFIG.FEAR_GREED_RULES.EXTREME_FEAR.RANGE[0] && fearGreedIndex <= RISK_CONFIG.FEAR_GREED_RULES.EXTREME_FEAR.RANGE[1]) {
    action = 'BUY';
    tradePercentage = RISK_CONFIG.FEAR_GREED_RULES.EXTREME_FEAR.PERCENTAGE;
    notes = RISK_CONFIG.FEAR_GREED_RULES.EXTREME_FEAR.DESCRIPTION;
  } else if (fearGreedIndex >= RISK_CONFIG.FEAR_GREED_RULES.FEAR.RANGE[0] && fearGreedIndex <= RISK_CONFIG.FEAR_GREED_RULES.FEAR.RANGE[1]) {
    action = 'BUY';
    tradePercentage = RISK_CONFIG.FEAR_GREED_RULES.FEAR.PERCENTAGE;
    notes = RISK_CONFIG.FEAR_GREED_RULES.FEAR.DESCRIPTION;
  } else if (fearGreedIndex >= RISK_CONFIG.FEAR_GREED_RULES.NEUTRAL.RANGE[0] && fearGreedIndex <= RISK_CONFIG.FEAR_GREED_RULES.NEUTRAL.RANGE[1]) {
    if (btcPrice < ma20) {
      action = 'BUY';
      tradePercentage = RISK_CONFIG.FEAR_GREED_RULES.NEUTRAL.PERCENTAGE;
      notes = RISK_CONFIG.FEAR_GREED_RULES.NEUTRAL.DESCRIPTION;
    } else {
      action = 'HOLD';
      notes = 'Neutral - Hold (Price above MA20)';
    }
  } else if (fearGreedIndex >= RISK_CONFIG.FEAR_GREED_RULES.GREED.RANGE[0] && fearGreedIndex <= RISK_CONFIG.FEAR_GREED_RULES.GREED.RANGE[1]) {
    action = 'SELL';
    tradePercentage = RISK_CONFIG.FEAR_GREED_RULES.GREED.PERCENTAGE;
    notes = RISK_CONFIG.FEAR_GREED_RULES.GREED.DESCRIPTION;
  } else if (fearGreedIndex >= RISK_CONFIG.FEAR_GREED_RULES.HIGH_GREED.RANGE[0] && fearGreedIndex <= RISK_CONFIG.FEAR_GREED_RULES.HIGH_GREED.RANGE[1]) {
    action = 'SELL';
    tradePercentage = RISK_CONFIG.FEAR_GREED_RULES.HIGH_GREED.PERCENTAGE;
    notes = RISK_CONFIG.FEAR_GREED_RULES.HIGH_GREED.DESCRIPTION;
  } else if (fearGreedIndex >= RISK_CONFIG.FEAR_GREED_RULES.EXTREME_GREED.RANGE[0] && fearGreedIndex <= RISK_CONFIG.FEAR_GREED_RULES.EXTREME_GREED.RANGE[1]) {
    action = 'SELL';
    tradePercentage = RISK_CONFIG.FEAR_GREED_RULES.EXTREME_GREED.PERCENTAGE;
    notes = RISK_CONFIG.FEAR_GREED_RULES.EXTREME_GREED.DESCRIPTION;
  }
  
  return { action, tradePercentage, notes };
}

function applyCircuitBreakers(action, portfolioValue, portfolioValue7dAgo, btcPrice, btcPrice24hAgo) {
  let notes = '';
  
  const portfolioChange7d = portfolioValue7dAgo ? 
    ((portfolioValue - portfolioValue7dAgo) / portfolioValue7dAgo) : 0;
    
  const btcChange24h = btcPrice24hAgo ? 
    ((btcPrice - btcPrice24hAgo) / btcPrice24hAgo) : 0;
  
  if (portfolioChange7d < RISK_CONFIG.CIRCUIT_BREAKERS.MAX_PORTFOLIO_DECLINE_7D) {
    action = 'HOLD';
    notes += ' - Circuit Breaker: Portfolio down >20% in 7 days';
  }
  
  if (btcChange24h < RISK_CONFIG.CIRCUIT_BREAKERS.MAX_BTC_DECLINE_24H) {
    action = 'HOLD';
    notes += ' - Circuit Breaker: BTC down >10% in 24h';
  }
  
  return { action, notes, portfolioChange7d: portfolioChange7d * 100, btcChange24h: btcChange24h * 100 };
}

function analyzeMarketPhases(results) {
  console.log('\\n📊 Analyzing Performance Across Market Phases...');
  
  const phases = [];
  let currentPhase = null;
  
  for (let i = 30; i < results.length; i++) { // Start after 30 days
    const current = results[i];
    const monthAgo = results[i - 30];
    
    // Calculate 30-day BTC price change
    const priceChange = ((current.btcPrice - monthAgo.btcPrice) / monthAgo.btcPrice) * 100;
    
    let phaseType;
    if (priceChange > 15) phaseType = 'Bull Market';
    else if (priceChange < -15) phaseType = 'Bear Market';
    else phaseType = 'Sideways';
    
    if (!currentPhase || currentPhase.type !== phaseType) {
      if (currentPhase && currentPhase.days > 30) { // Only count phases longer than 30 days
        phases.push(currentPhase);
      }
      
      currentPhase = {
        type: phaseType,
        start: current.date,
        startValue: current.totalValue,
        startPrice: current.btcPrice,
        days: 1,
        trades: current.action !== 'HOLD' ? 1 : 0,
        avgFearGreed: current.fearGreedIndex
      };
    } else {
      currentPhase.days++;
      if (current.action !== 'HOLD') currentPhase.trades++;
      currentPhase.avgFearGreed = (currentPhase.avgFearGreed * (currentPhase.days - 1) + current.fearGreedIndex) / currentPhase.days;
    }
    
    if (currentPhase) {
      currentPhase.end = current.date;
      currentPhase.endValue = current.totalValue;
      currentPhase.endPrice = current.btcPrice;
      currentPhase.portfolioReturn = ((current.totalValue - currentPhase.startValue) / currentPhase.startValue) * 100;
      currentPhase.btcReturn = ((current.btcPrice - currentPhase.startPrice) / currentPhase.startPrice) * 100;
    }
  }
  
  if (currentPhase && currentPhase.days > 30) {
    phases.push(currentPhase);
  }
  
  console.log('\\n🔄 Market Phase Analysis:');
  phases.forEach((phase, index) => {
    console.log(`${index + 1}. ${phase.type} (${phase.start} to ${phase.end}, ${phase.days} days)`);
    console.log(`   Portfolio Return: ${phase.portfolioReturn.toFixed(2)}%`);
    console.log(`   BTC Return: ${phase.btcReturn.toFixed(2)}%`);
    console.log(`   Trades: ${phase.trades}`);
    console.log(`   Avg Fear/Greed: ${phase.avgFearGreed.toFixed(0)}`);
  });
  
  return phases;
}

function runExtendedLogicalDCATest() {
  console.log('🧠 Starting Extended Logical DCA Strategy Test (3 Years)...');
  
  const { fearGreedData, btcPriceData } = loadExtendedHistoricalData();
  
  // Create lookup maps
  const fearGreedMap = new Map();
  fearGreedData.forEach(item => {
    fearGreedMap.set(item.dateString, item);
  });
  
  const btcPriceMap = new Map();
  btcPriceData.forEach(item => {
    btcPriceMap.set(item.dateString, item);
  });
  
  // Portfolio state
  let eurBalance = 0;
  let btcBalance = 0;
  let totalInvested = 0;
  
  // Historical tracking
  const portfolioHistory = [];
  const btcPriceHistory = [];
  
  // Results tracking
  const results = [];
  const trades = [];
  
  // Get overlapping date range
  const btcDates = new Set(btcPriceData.map(item => item.dateString));
  const commonDates = fearGreedData
    .filter(item => btcDates.has(item.dateString))
    .map(item => item.dateString)
    .sort();
  
  console.log(`📅 Testing period: ${commonDates[0]} to ${commonDates[commonDates.length - 1]}`);
  console.log(`📊 Total days with complete data: ${commonDates.length}`);
  
  // Iterate through each day with complete data
  commonDates.forEach((dateString, dayIndex) => {
    const currentDate = new Date(dateString);
    const dayOfWeek = currentDate.getDay();
    
    // Weekly deposit on Sundays
    if (dayOfWeek === 0) {
      eurBalance += WEEKLY_DEPOSIT_EUR;
      totalInvested += WEEKLY_DEPOSIT_EUR;
    }
    
    // Get market data
    const fearGreedItem = fearGreedMap.get(dateString);
    const btcPriceItem = btcPriceMap.get(dateString);
    
    const fearGreedIndex = fearGreedItem.value;
    const btcPrice = btcPriceItem.price;
    const ma20 = btcPriceItem.ma20;
    
    // Calculate portfolio value
    const totalValue = (btcBalance * btcPrice) + eurBalance;
    const btcAllocation = totalValue > 0 ? (btcBalance * btcPrice) / totalValue : 0;
    const satellitePool = totalValue * RISK_CONFIG.PORTFOLIO.SATELLITE_POOL_PERCENTAGE;
    
    // Get historical data for circuit breakers
    const portfolioValue7dAgo = portfolioHistory.length >= 7 ? portfolioHistory[portfolioHistory.length - 7] : null;
    const btcPrice24hAgo = btcPriceHistory.length >= 1 ? btcPriceHistory[btcPriceHistory.length - 1] : null;
    
    // Determine DCA action
    let { action, tradePercentage, notes } = determineDCAAction(fearGreedIndex, btcPrice, ma20, portfolioValue7dAgo, btcPrice24hAgo);
    
    // Apply circuit breakers
    const circuitBreakerResult = applyCircuitBreakers(action, totalValue, portfolioValue7dAgo, btcPrice, btcPrice24hAgo);
    action = circuitBreakerResult.action;
    notes += circuitBreakerResult.notes;
    
    // Calculate trade size
    let tradeSizeEUR = 0;
    let tradeSizeBTC = 0;
    
    if (action === 'BUY' || action === 'SELL') {
      tradeSizeEUR = satellitePool * (tradePercentage / 100);
      
      // Minimum balance checks
      if (action === 'BUY' && eurBalance < Math.max(RISK_CONFIG.DCA.MIN_EUR_BALANCE, tradeSizeEUR)) {
        action = 'HOLD';
        notes += ' - Insufficient EUR balance';
        tradeSizeEUR = 0;
      } else if (action === 'SELL') {
        tradeSizeBTC = tradeSizeEUR / btcPrice;
        if (btcBalance < Math.max(RISK_CONFIG.DCA.MIN_BTC_BALANCE, tradeSizeBTC)) {
          action = 'HOLD';
          notes += ' - Insufficient BTC balance';
          tradeSizeEUR = 0;
          tradeSizeBTC = 0;
        }
      }
    }
    
    // Execute trade
    if (action === 'BUY' && tradeSizeEUR > 0) {
      const btcPurchased = tradeSizeEUR / btcPrice;
      eurBalance -= tradeSizeEUR;
      btcBalance += btcPurchased;
      
      trades.push({
        date: dateString,
        action: 'BUY',
        eurAmount: tradeSizeEUR,
        btcAmount: btcPurchased,
        btcPrice: btcPrice,
        fearGreedIndex: fearGreedIndex,
        notes: notes
      });
      
    } else if (action === 'SELL' && tradeSizeBTC > 0) {
      const eurReceived = tradeSizeBTC * btcPrice;
      btcBalance -= tradeSizeBTC;
      eurBalance += eurReceived;
      
      trades.push({
        date: dateString,
        action: 'SELL',
        eurAmount: eurReceived,
        btcAmount: tradeSizeBTC,
        btcPrice: btcPrice,
        fearGreedIndex: fearGreedIndex,
        notes: notes
      });
    }
    
    // Update historical tracking
    portfolioHistory.push(totalValue);
    btcPriceHistory.push(btcPrice);
    
    if (portfolioHistory.length > 7) portfolioHistory.shift();
    if (btcPriceHistory.length > 1) btcPriceHistory.shift();
    
    // Record daily result
    const finalTotalValue = (btcBalance * btcPrice) + eurBalance;
    const finalBtcAllocation = finalTotalValue > 0 ? (btcBalance * btcPrice) / finalTotalValue : 0;
    
    results.push({
      date: dateString,
      fearGreedIndex: fearGreedIndex,
      fearGreedValue: fearGreedItem.classification,
      btcPrice: btcPrice,
      ma20: ma20,
      action: action,
      tradePercentage: tradePercentage,
      tradeSizeEUR: tradeSizeEUR,
      tradeSizeBTC: tradeSizeBTC,
      btcBalance: btcBalance,
      eurBalance: eurBalance,
      totalValue: finalTotalValue,
      btcAllocation: finalBtcAllocation * 100,
      totalInvested: totalInvested,
      unrealizedPnL: finalTotalValue - totalInvested,
      unrealizedPnLPercent: totalInvested > 0 ? ((finalTotalValue - totalInvested) / totalInvested) * 100 : 0,
      portfolioChange7d: circuitBreakerResult.portfolioChange7d,
      btcChange24h: circuitBreakerResult.btcChange24h,
      notes: notes
    });
  });
  
  // Analyze market phases
  const marketPhases = analyzeMarketPhases(results);
  
  // Save results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const finalBtcPrice = btcPriceData[btcPriceData.length - 1]?.price || 0;
  const finalResult = {
    strategy: 'Extended Logical DCA (Fear & Greed) - 3 Years',
    testPeriod: {
      start: commonDates[0],
      end: commonDates[commonDates.length - 1],
      totalDays: results.length,
      totalYears: Math.round((results.length / 365) * 10) / 10
    },
    finalPortfolio: {
      btcBalance: btcBalance,
      eurBalance: eurBalance,
      totalValue: (btcBalance * finalBtcPrice) + eurBalance,
      btcAllocation: btcBalance > 0 ? ((btcBalance * finalBtcPrice) / ((btcBalance * finalBtcPrice) + eurBalance)) * 100 : 0,
      totalInvested: totalInvested,
      totalReturn: ((btcBalance * finalBtcPrice) + eurBalance) - totalInvested,
      totalReturnPercent: totalInvested > 0 ? (((((btcBalance * finalBtcPrice) + eurBalance) - totalInvested) / totalInvested) * 100) : 0
    },
    tradeStats: {
      totalTrades: trades.length,
      buyTrades: trades.filter(t => t.action === 'BUY').length,
      sellTrades: trades.filter(t => t.action === 'SELL').length,
      totalBuyVolume: trades.filter(t => t.action === 'BUY').reduce((sum, t) => sum + t.eurAmount, 0),
      totalSellVolume: trades.filter(t => t.action === 'SELL').reduce((sum, t) => sum + t.eurAmount, 0)
    },
    marketPhases: marketPhases,
    dailyResults: results,
    trades: trades
  };
  
  // Save to files
  fs.writeFileSync(path.join(RESULTS_DIR, 'logical-dca-results-extended.json'), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log('\\n📊 Extended Logical DCA Test Results (3 Years):');
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalResult.finalPortfolio.totalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${finalResult.finalPortfolio.totalReturn.toFixed(2)} (${finalResult.finalPortfolio.totalReturnPercent.toFixed(2)}%)`);
  console.log(`₿ Final BTC Balance: ${btcBalance.toFixed(8)} BTC`);
  console.log(`💶 Final EUR Balance: €${eurBalance.toFixed(2)}`);
  console.log(`📊 Final BTC Allocation: ${finalResult.finalPortfolio.btcAllocation.toFixed(1)}%`);
  console.log(`🔄 Total Trades: ${finalResult.tradeStats.totalTrades} (${finalResult.tradeStats.buyTrades} buys, ${finalResult.tradeStats.sellTrades} sells)`);
  console.log(`📅 Test Duration: ${finalResult.testPeriod.totalYears} years`);
  console.log(`💾 Results saved to: ${path.join(RESULTS_DIR, 'logical-dca-results-extended.json')}`);
  
  return finalResult;
}

// Run the test
if (require.main === module) {
  runExtendedLogicalDCATest();
}

module.exports = { runExtendedLogicalDCATest };