// Complete Logical DCA Strategy Test - 3 Years Historical Simulation
// Includes BOTH Daily DCA Trading + Monthly Rebalancing (exact n8n workflow replica)

const fs = require('fs');
const path = require('path');

// Load historical data
const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');

// Complete Risk Configuration (exact replica from n8n workflow)
const RISK_CONFIG = {
  PORTFOLIO: {
    BASE_BTC_ALLOCATION: 0.75,           // 75% BTC base target
    REBALANCE_BAND: 0.05,                // ±5% rebalancing threshold
    SATELLITE_POOL_PERCENTAGE: 0.1,      // 10% for active DCA (CORRECTED FROM 30%)
    // Dynamic allocation based on Fear & Greed Index (MONTHLY REBALANCING)
    FEAR_GREED_TARGETS: {
      EXTREME_FEAR: { RANGE: [0, 20], TARGET: 0.85, DESCRIPTION: 'Extreme Fear - Accumulate Aggressively' },
      FEAR: { RANGE: [21, 30], TARGET: 0.80, DESCRIPTION: 'Fear - Accumulate More' },
      NEUTRAL: { RANGE: [31, 60], TARGET: 0.75, DESCRIPTION: 'Neutral - Base Allocation' },
      GREED: { RANGE: [61, 70], TARGET: 0.70, DESCRIPTION: 'Greed - Take Some Profits' },
      HIGH_GREED: { RANGE: [71, 80], TARGET: 0.65, DESCRIPTION: 'High Greed - Take More Profits' },
      EXTREME_GREED: { RANGE: [81, 100], TARGET: 0.60, DESCRIPTION: 'Extreme Greed - Maximum Profit Taking' }
    }
  },
  DCA: {
    MAX_TRADES_PER_WEEK: 3,              // Maximum satellite trades per week
    SLIPPAGE_TOLERANCE: 0.01,            // 1% maximum slippage
    MIN_BTC_BALANCE: 0.01,               // Minimum BTC to maintain
    MIN_EUR_BALANCE: 5,                  // Minimum EUR to maintain
  },
  CIRCUIT_BREAKERS: {
    MAX_PORTFOLIO_DECLINE_7D: -0.20,     // Stop if portfolio down >20% in 7 days
    MAX_BTC_DECLINE_24H: -0.10,          // Stop if BTC down >10% in 24 hours
  },
  // Daily DCA Rules (DAILY TRADING)
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

function loadCompleteHistoricalData() {
  try {
    const fearGreedPath = path.join(DATA_DIR, 'fear-greed-index-extended.json');
    const btcPricePath = path.join(DATA_DIR, 'btc-prices-yahoo-extended.json');
    
    const fearGreedData = JSON.parse(fs.readFileSync(fearGreedPath, 'utf8'));
    const btcPriceData = JSON.parse(fs.readFileSync(btcPricePath, 'utf8'));
    
    console.log(`📊 Loaded ${fearGreedData.length} Fear & Greed records (${fearGreedData[0]?.dateString} to ${fearGreedData[fearGreedData.length - 1]?.dateString})`);
    console.log(`💰 Loaded ${btcPriceData.length} BTC price records (${btcPriceData[0]?.dateString} to ${btcPriceData[btcPriceData.length - 1]?.dateString})`);
    
    return { fearGreedData, btcPriceData };
    
  } catch (error) {
    console.error('❌ Error loading complete historical data:', error.message);
    throw error;
  }
}

// Daily DCA Logic (same as before)
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

// Monthly Rebalancing Logic (NEW - from n8n workflow)
function determineMonthlyRebalancing(fearGreedIndex, fearGreedValue, btcPrice, btcBalance, eurBalance) {
  const totalValue = (btcBalance * btcPrice) + eurBalance;
  const currentBtcAllocation = totalValue > 0 ? (btcBalance * btcPrice) / totalValue : 0;
  
  // Determine target allocation based on Fear & Greed Index
  let targetBtcAllocation = RISK_CONFIG.PORTFOLIO.BASE_BTC_ALLOCATION;
  let fearGreedStrategy = 'Neutral - Base Allocation';
  
  // Find the appropriate target based on fear & greed index
  for (const [key, config] of Object.entries(RISK_CONFIG.PORTFOLIO.FEAR_GREED_TARGETS)) {
    if (fearGreedIndex >= config.RANGE[0] && fearGreedIndex <= config.RANGE[1]) {
      targetBtcAllocation = config.TARGET;
      fearGreedStrategy = config.DESCRIPTION;
      break;
    }
  }
  
  const rebalanceBand = RISK_CONFIG.PORTFOLIO.REBALANCE_BAND;
  let needsRebalancing = false;
  let action = 'HOLD';
  let tradeAmount = 0;
  let notes = `Monthly Rebalancing - Fear & Greed: ${fearGreedIndex} (${fearGreedValue}) - ${fearGreedStrategy}`;
  
  // Check if rebalancing is needed based on dynamic target
  if (currentBtcAllocation > targetBtcAllocation + rebalanceBand) {
    // Too much BTC, sell some
    needsRebalancing = true;
    action = 'SELL';
    const excessBtcValue = totalValue * (currentBtcAllocation - targetBtcAllocation);
    tradeAmount = excessBtcValue / btcPrice; // BTC amount to sell
    notes += ` | Rebalancing: BTC allocation too high (${(currentBtcAllocation * 100).toFixed(1)}% vs ${(targetBtcAllocation * 100).toFixed(1)}% target)`;
  } else if (currentBtcAllocation < targetBtcAllocation - rebalanceBand) {
    // Too little BTC, buy some
    needsRebalancing = true;
    action = 'BUY';
    const neededBtcValue = totalValue * (targetBtcAllocation - currentBtcAllocation);
    tradeAmount = neededBtcValue; // EUR amount for buying
    notes += ` | Rebalancing: BTC allocation too low (${(currentBtcAllocation * 100).toFixed(1)}% vs ${(targetBtcAllocation * 100).toFixed(1)}% target)`;
  } else {
    notes += ` | Portfolio within target range (${(currentBtcAllocation * 100).toFixed(1)}% vs ${(targetBtcAllocation * 100).toFixed(1)}% target)`;
  }
  
  // Safety checks
  if (action === 'SELL' && btcBalance < RISK_CONFIG.DCA.MIN_BTC_BALANCE) {
    needsRebalancing = false;
    action = 'HOLD';
    notes += ' - Insufficient BTC for rebalancing';
  }
  
  if (action === 'BUY' && eurBalance < RISK_CONFIG.DCA.MIN_EUR_BALANCE) {
    needsRebalancing = false;
    action = 'HOLD';
    notes += ' - Insufficient EUR for rebalancing';
  }
  
  return {
    needsRebalancing,
    action,
    tradeAmount,
    currentBtcAllocation: currentBtcAllocation * 100,
    targetBtcAllocation: targetBtcAllocation * 100,
    fearGreedStrategy,
    notes
  };
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

function analyzeCompleteMarketPhases(results) {
  console.log('\\n📊 Analyzing Complete Strategy Performance Across Market Phases...');
  
  const phases = [];
  let currentPhase = null;
  
  for (let i = 30; i < results.length; i++) {
    const current = results[i];
    const monthAgo = results[i - 30];
    
    // Calculate 30-day BTC price change
    const priceChange = ((current.btcPrice - monthAgo.btcPrice) / monthAgo.btcPrice) * 100;
    
    let phaseType;
    if (priceChange > 15) phaseType = 'Bull Market';
    else if (priceChange < -15) phaseType = 'Bear Market';
    else phaseType = 'Sideways';
    
    if (!currentPhase || currentPhase.type !== phaseType) {
      if (currentPhase && currentPhase.days > 30) {
        phases.push(currentPhase);
      }
      
      currentPhase = {
        type: phaseType,
        start: current.date,
        startValue: current.totalValue,
        startPrice: current.btcPrice,
        days: 1,
        dcaTrades: current.actionType === 'DCA' ? 1 : 0,
        rebalanceTrades: current.actionType === 'REBALANCE' ? 1 : 0,
        avgFearGreed: current.fearGreedIndex
      };
    } else {
      currentPhase.days++;
      if (current.actionType === 'DCA') currentPhase.dcaTrades++;
      if (current.actionType === 'REBALANCE') currentPhase.rebalanceTrades++;
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
  
  console.log('\\n🔄 Complete Strategy Market Phase Analysis:');
  phases.forEach((phase, index) => {
    console.log(`${index + 1}. ${phase.type} (${phase.start} to ${phase.end}, ${phase.days} days)`);
    console.log(`   Portfolio Return: ${phase.portfolioReturn.toFixed(2)}%`);
    console.log(`   BTC Return: ${phase.btcReturn.toFixed(2)}%`);
    console.log(`   DCA Trades: ${phase.dcaTrades}, Rebalance Trades: ${phase.rebalanceTrades}`);
    console.log(`   Avg Fear/Greed: ${phase.avgFearGreed.toFixed(0)}`);
  });
  
  return phases;
}

function runCompleteLogicalDCATest() {
  console.log('🧠 Starting COMPLETE Logical DCA Strategy Test (Daily DCA + Monthly Rebalancing - 3 Years)...');
  
  const { fearGreedData, btcPriceData } = loadCompleteHistoricalData();
  
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
    const dayOfMonth = currentDate.getDate();
    
    // Weekly deposit on Sundays
    if (dayOfWeek === 0) {
      eurBalance += WEEKLY_DEPOSIT_EUR;
      totalInvested += WEEKLY_DEPOSIT_EUR;
    }
    
    // Get market data
    const fearGreedItem = fearGreedMap.get(dateString);
    const btcPriceItem = btcPriceMap.get(dateString);
    
    const fearGreedIndex = fearGreedItem.value;
    const fearGreedValue = fearGreedItem.classification;
    const btcPrice = btcPriceItem.price;
    const ma20 = btcPriceItem.ma20;
    
    // Calculate portfolio value
    const totalValue = (btcBalance * btcPrice) + eurBalance;
    const btcAllocation = totalValue > 0 ? (btcBalance * btcPrice) / totalValue : 0;
    const satellitePool = totalValue * RISK_CONFIG.PORTFOLIO.SATELLITE_POOL_PERCENTAGE;
    
    // Get historical data for circuit breakers
    const portfolioValue7dAgo = portfolioHistory.length >= 7 ? portfolioHistory[portfolioHistory.length - 7] : null;
    const btcPrice24hAgo = btcPriceHistory.length >= 1 ? btcPriceHistory[btcPriceHistory.length - 1] : null;
    
    let finalAction = 'HOLD';
    let actionType = 'NONE';
    let tradeAmount = 0;
    let notes = '';
    
    // MONTHLY REBALANCING LOGIC (1st priority - 1st day of month)
    if (dayOfMonth === 1) {
      console.log(`📅 Monthly rebalancing check for ${dateString}...`);
      
      const rebalanceResult = determineMonthlyRebalancing(
        fearGreedIndex, 
        fearGreedValue, 
        btcPrice, 
        btcBalance, 
        eurBalance
      );
      
      if (rebalanceResult.needsRebalancing) {
        finalAction = rebalanceResult.action;
        actionType = 'REBALANCE';
        tradeAmount = rebalanceResult.tradeAmount;
        notes = rebalanceResult.notes;
        
        console.log(`⚖️ Monthly rebalancing: ${finalAction} ${tradeAmount.toFixed(4)} (${rebalanceResult.fearGreedStrategy})`);
      } else {
        notes = rebalanceResult.notes;
      }
    }
    
    // DAILY DCA LOGIC (2nd priority - if no rebalancing)
    if (finalAction === 'HOLD' && actionType === 'NONE') {
      let { action, tradePercentage, notes: dcaNotes } = determineDCAAction(fearGreedIndex, btcPrice, ma20, portfolioValue7dAgo, btcPrice24hAgo);
      
      // Apply circuit breakers
      const circuitBreakerResult = applyCircuitBreakers(action, totalValue, portfolioValue7dAgo, btcPrice, btcPrice24hAgo);
      action = circuitBreakerResult.action;
      notes = dcaNotes + circuitBreakerResult.notes;
      
      // Calculate trade size for DCA
      if (action !== 'HOLD') {
        actionType = 'DCA';
        finalAction = action;
        
        if (action === 'BUY') {
          tradeAmount = satellitePool * (tradePercentage / 100); // EUR amount
        } else if (action === 'SELL') {
          tradeAmount = (satellitePool * (tradePercentage / 100)) / btcPrice; // BTC amount
        }
      }
    }
    
    // EXECUTE TRADES
    if (finalAction === 'BUY' && tradeAmount > 0) {
      // Check if we have enough EUR
      const eurNeeded = actionType === 'REBALANCE' ? tradeAmount : tradeAmount;
      
      if (eurBalance >= Math.max(RISK_CONFIG.DCA.MIN_EUR_BALANCE, eurNeeded)) {
        const btcPurchased = eurNeeded / btcPrice;
        eurBalance -= eurNeeded;
        btcBalance += btcPurchased;
        
        trades.push({
          date: dateString,
          type: actionType,
          action: 'BUY',
          eurAmount: eurNeeded,
          btcAmount: btcPurchased,
          btcPrice: btcPrice,
          fearGreedIndex: fearGreedIndex,
          notes: notes
        });
      } else {
        finalAction = 'HOLD';
        notes += ' - Insufficient EUR balance';
      }
      
    } else if (finalAction === 'SELL' && tradeAmount > 0) {
      // Check if we have enough BTC
      const btcNeeded = actionType === 'REBALANCE' ? tradeAmount : tradeAmount;
      
      if (btcBalance >= Math.max(RISK_CONFIG.DCA.MIN_BTC_BALANCE, btcNeeded)) {
        const eurReceived = btcNeeded * btcPrice;
        btcBalance -= btcNeeded;
        eurBalance += eurReceived;
        
        trades.push({
          date: dateString,
          type: actionType,
          action: 'SELL',
          eurAmount: eurReceived,
          btcAmount: btcNeeded,
          btcPrice: btcPrice,
          fearGreedIndex: fearGreedIndex,
          notes: notes
        });
      } else {
        finalAction = 'HOLD';
        notes += ' - Insufficient BTC balance';
      }
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
      fearGreedValue: fearGreedValue,
      btcPrice: btcPrice,
      ma20: ma20,
      action: finalAction,
      actionType: actionType,
      tradeAmount: tradeAmount,
      btcBalance: btcBalance,
      eurBalance: eurBalance,
      totalValue: finalTotalValue,
      btcAllocation: finalBtcAllocation * 100,
      totalInvested: totalInvested,
      unrealizedPnL: finalTotalValue - totalInvested,
      unrealizedPnLPercent: totalInvested > 0 ? ((finalTotalValue - totalInvested) / totalInvested) * 100 : 0,
      notes: notes
    });
  });
  
  // Analyze market phases
  const marketPhases = analyzeCompleteMarketPhases(results);
  
  // Save results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const finalBtcPrice = btcPriceData[btcPriceData.length - 1]?.price || 0;
  const finalValue = (btcBalance * finalBtcPrice) + eurBalance;
  const totalReturn = finalValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  
  // Calculate CAGR
  const years = results.length / 365;
  const cagr = totalInvested > 0 ? (Math.pow(finalValue / totalInvested, 1/years) - 1) * 100 : 0;
  
  const finalResult = {
    strategy: 'COMPLETE Logical DCA (Daily DCA + Monthly Rebalancing) - 3 Years',
    testPeriod: {
      start: commonDates[0],
      end: commonDates[commonDates.length - 1],
      totalDays: results.length,
      totalYears: Math.round(years * 10) / 10
    },
    finalPortfolio: {
      btcBalance: btcBalance,
      eurBalance: eurBalance,
      totalValue: finalValue,
      btcAllocation: btcBalance > 0 ? ((btcBalance * finalBtcPrice) / finalValue) * 100 : 0,
      totalInvested: totalInvested,
      totalReturn: totalReturn,
      totalReturnPercent: totalReturnPercent,
      cagr: cagr
    },
    tradeStats: {
      totalTrades: trades.length,
      dcaTrades: trades.filter(t => t.type === 'DCA').length,
      rebalanceTrades: trades.filter(t => t.type === 'REBALANCE').length,
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
  fs.writeFileSync(path.join(RESULTS_DIR, 'complete-logical-dca-results.json'), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log('\\n📊 COMPLETE Logical DCA Test Results (Daily DCA + Monthly Rebalancing - 3 Years):');
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`);
  console.log(`📊 CAGR: ${cagr.toFixed(2)}% per year`);
  console.log(`₿ Final BTC Balance: ${btcBalance.toFixed(8)} BTC`);
  console.log(`💶 Final EUR Balance: €${eurBalance.toFixed(2)}`);
  console.log(`📊 Final BTC Allocation: ${finalResult.finalPortfolio.btcAllocation.toFixed(1)}%`);
  console.log(`🔄 Total Trades: ${finalResult.tradeStats.totalTrades} (${finalResult.tradeStats.dcaTrades} DCA, ${finalResult.tradeStats.rebalanceTrades} Rebalancing)`);
  console.log(`📈 Buy/Sell: ${finalResult.tradeStats.buyTrades} buys, ${finalResult.tradeStats.sellTrades} sells`);
  console.log(`📅 Test Duration: ${finalResult.testPeriod.totalYears} years`);
  console.log(`💾 Results saved to: ${path.join(RESULTS_DIR, 'complete-logical-dca-results.json')}`);
  
  return finalResult;
}

// Run the complete test
if (require.main === module) {
  runCompleteLogicalDCATest();
}

module.exports = { runCompleteLogicalDCATest };