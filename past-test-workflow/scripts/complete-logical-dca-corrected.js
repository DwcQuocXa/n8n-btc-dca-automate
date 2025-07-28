// CORRECTED Complete Logical DCA Strategy Test - 3 Years Historical Simulation
// Implements DUAL PORTFOLIO ARCHITECTURE: Core Portfolio (90%) + Satellite Portfolio (10%)
// Core: Monthly rebalancing with 60-85% BTC targets | Satellite: Daily DCA trades

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');

// CORRECTED Risk Configuration - Dual Portfolio Architecture
const RISK_CONFIG = {
  PORTFOLIO: {
    CORE_PORTFOLIO_PERCENTAGE: 0.9,     // 90% for core portfolio (monthly rebalancing)
    SATELLITE_POOL_PERCENTAGE: 0.1,     // 10% for satellite portfolio (daily DCA)
    REBALANCE_BAND: 0.05,               // ±5% rebalancing threshold
    // CORE PORTFOLIO: Dynamic BTC allocation targets based on Fear & Greed Index
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
    MIN_BTC_BALANCE: 0.01,
    MIN_EUR_BALANCE: 5,
  },
  CIRCUIT_BREAKERS: {
    MAX_PORTFOLIO_DECLINE_7D: -0.20,
    MAX_BTC_DECLINE_24H: -0.10,
  },
  // SATELLITE PORTFOLIO: Daily DCA Rules based on Fear & Greed
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
    
    console.log(`📊 Loaded ${fearGreedData.length} Fear & Greed records`);
    console.log(`💰 Loaded ${btcPriceData.length} BTC price records`);
    
    return { fearGreedData, btcPriceData };
    
  } catch (error) {
    console.error('❌ Error loading complete historical data:', error.message);
    throw error;
  }
}

// Satellite Portfolio: Daily DCA Logic (operates on 10% of total portfolio)
function determineSatelliteDCAAction(fearGreedIndex, btcPrice, ma20, satellitePoolSize) {
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
  
  const tradeAmount = satellitePoolSize * (tradePercentage / 100);
  
  return { action, tradePercentage, tradeAmount, notes };
}

// Core Portfolio: Monthly Rebalancing Logic (operates on 90% of total portfolio)
function determineCoreRebalancing(fearGreedIndex, fearGreedValue, btcPrice, totalPortfolioValue, corePortfolioBTC, corePortfolioEUR) {
  const corePortfolioValue = totalPortfolioValue * RISK_CONFIG.PORTFOLIO.CORE_PORTFOLIO_PERCENTAGE;
  const currentCoreBtcValue = corePortfolioBTC * btcPrice;
  const currentCoreEurValue = corePortfolioEUR;
  const currentCoreTotalValue = currentCoreBtcValue + currentCoreEurValue;
  const currentCoreBtcAllocation = currentCoreTotalValue > 0 ? currentCoreBtcValue / currentCoreTotalValue : 0;
  
  // Determine target allocation based on Fear & Greed Index
  let targetBtcAllocation = 0.75; // default
  let fearGreedStrategy = 'Neutral - Base Allocation';
  
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
  let notes = `Core Portfolio Rebalancing - Fear & Greed: ${fearGreedIndex} (${fearGreedValue}) - ${fearGreedStrategy}`;
  
  // Check if rebalancing is needed based on dynamic target
  if (currentCoreBtcAllocation > targetBtcAllocation + rebalanceBand) {
    // Too much BTC in core, sell some
    needsRebalancing = true;
    action = 'SELL';
    const targetCoreBtcValue = currentCoreTotalValue * targetBtcAllocation;
    const excessBtcValue = currentCoreBtcValue - targetCoreBtcValue;
    tradeAmount = excessBtcValue / btcPrice; // BTC amount to sell
    notes += ` | Rebalancing: Core BTC allocation too high (${(currentCoreBtcAllocation * 100).toFixed(1)}% vs ${(targetBtcAllocation * 100).toFixed(1)}% target)`;
  } else if (currentCoreBtcAllocation < targetBtcAllocation - rebalanceBand) {
    // Too little BTC in core, buy some
    needsRebalancing = true;
    action = 'BUY';
    const targetCoreBtcValue = currentCoreTotalValue * targetBtcAllocation;
    const neededBtcValue = targetCoreBtcValue - currentCoreBtcValue;
    tradeAmount = neededBtcValue; // EUR amount for buying
    notes += ` | Rebalancing: Core BTC allocation too low (${(currentCoreBtcAllocation * 100).toFixed(1)}% vs ${(targetBtcAllocation * 100).toFixed(1)}% target)`;
  } else {
    notes += ` | Core portfolio within target range (${(currentCoreBtcAllocation * 100).toFixed(1)}% vs ${(targetBtcAllocation * 100).toFixed(1)}% target)`;
  }
  
  return {
    needsRebalancing,
    action,
    tradeAmount,
    currentCoreBtcAllocation: currentCoreBtcAllocation * 100,
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
  
  return { action, notes };
}

function runCorrectedCompleteLogicalDCATest() {
  console.log('🧠 Starting CORRECTED Complete Logical DCA Strategy Test (Dual Portfolio Architecture - 3 Years)...');
  console.log('📋 Architecture: Core Portfolio (90%) + Satellite Portfolio (10%)');
  
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
  
  // Dual Portfolio State
  // Core Portfolio (90%) - Monthly rebalancing
  let corePortfolioBTC = 0;
  let corePortfolioEUR = 0;
  
  // Satellite Portfolio (10%) - Daily DCA
  let satellitePortfolioBTC = 0;
  let satellitePortfolioEUR = 0;
  
  let totalInvested = 0;
  
  // Historical tracking for circuit breakers
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
  
  // Initialize portfolios with first weekly deposit
  satellitePortfolioEUR = WEEKLY_DEPOSIT_EUR * RISK_CONFIG.PORTFOLIO.SATELLITE_POOL_PERCENTAGE;
  corePortfolioEUR = WEEKLY_DEPOSIT_EUR * RISK_CONFIG.PORTFOLIO.CORE_PORTFOLIO_PERCENTAGE;
  totalInvested = WEEKLY_DEPOSIT_EUR;
  
  // Iterate through each day with complete data
  commonDates.forEach((dateString, dayIndex) => {
    const currentDate = new Date(dateString);
    const dayOfWeek = currentDate.getDay();
    const dayOfMonth = currentDate.getDate();
    
    // Weekly deposit on Sundays (split between core and satellite)
    if (dayOfWeek === 0 && dayIndex > 0) { // Skip first day as we already initialized
      const satelliteDeposit = WEEKLY_DEPOSIT_EUR * RISK_CONFIG.PORTFOLIO.SATELLITE_POOL_PERCENTAGE;
      const coreDeposit = WEEKLY_DEPOSIT_EUR * RISK_CONFIG.PORTFOLIO.CORE_PORTFOLIO_PERCENTAGE;
      
      satellitePortfolioEUR += satelliteDeposit;
      corePortfolioEUR += coreDeposit;
      totalInvested += WEEKLY_DEPOSIT_EUR;
    }
    
    // Get market data
    const fearGreedItem = fearGreedMap.get(dateString);
    const btcPriceItem = btcPriceMap.get(dateString);
    
    const fearGreedIndex = fearGreedItem.value;
    const fearGreedValue = fearGreedItem.classification;
    const btcPrice = btcPriceItem.price;
    const ma20 = btcPriceItem.ma20;
    
    // Calculate total portfolio values
    const satelliteValue = (satellitePortfolioBTC * btcPrice) + satellitePortfolioEUR;
    const coreValue = (corePortfolioBTC * btcPrice) + corePortfolioEUR;
    const totalValue = satelliteValue + coreValue;
    
    const totalBtcBalance = satellitePortfolioBTC + corePortfolioBTC;
    const totalEurBalance = satellitePortfolioEUR + corePortfolioEUR;
    const totalBtcAllocation = totalValue > 0 ? (totalBtcBalance * btcPrice) / totalValue : 0;
    
    // Get historical data for circuit breakers
    const portfolioValue7dAgo = portfolioHistory.length >= 7 ? portfolioHistory[portfolioHistory.length - 7] : null;
    const btcPrice24hAgo = btcPriceHistory.length >= 1 ? btcPriceHistory[btcPriceHistory.length - 1] : null;
    
    let finalAction = 'HOLD';
    let actionType = 'NONE';
    let tradeAmount = 0;
    let notes = '';
    
    // PRIORITY 1: CORE PORTFOLIO MONTHLY REBALANCING (1st day of month)
    if (dayOfMonth === 1) {
      console.log(`📅 Monthly core portfolio rebalancing check for ${dateString}...`);
      
      const rebalanceResult = determineCoreRebalancing(
        fearGreedIndex, 
        fearGreedValue, 
        btcPrice, 
        totalValue,
        corePortfolioBTC,
        corePortfolioEUR
      );
      
      if (rebalanceResult.needsRebalancing) {
        finalAction = rebalanceResult.action;
        actionType = 'CORE_REBALANCE';
        tradeAmount = rebalanceResult.tradeAmount;
        notes = rebalanceResult.notes;
        
        console.log(`⚖️ Core portfolio rebalancing: ${finalAction} ${tradeAmount.toFixed(4)} (${rebalanceResult.fearGreedStrategy})`);
      } else {
        notes = rebalanceResult.notes;
      }
    }
    
    // PRIORITY 2: SATELLITE PORTFOLIO DAILY DCA (if no core rebalancing)
    if (finalAction === 'HOLD' && actionType === 'NONE') {
      const satelliteDCAResult = determineSatelliteDCAAction(fearGreedIndex, btcPrice, ma20, satelliteValue);
      
      // Apply circuit breakers
      const circuitBreakerResult = applyCircuitBreakers(satelliteDCAResult.action, totalValue, portfolioValue7dAgo, btcPrice, btcPrice24hAgo);
      
      if (circuitBreakerResult.action !== 'HOLD') {
        finalAction = circuitBreakerResult.action;
        actionType = 'SATELLITE_DCA';
        tradeAmount = satelliteDCAResult.tradeAmount;
        notes = `Satellite DCA: ${satelliteDCAResult.notes}` + circuitBreakerResult.notes;
      } else {
        notes = `Satellite DCA: ${satelliteDCAResult.notes}` + circuitBreakerResult.notes;
      }
    }
    
    // EXECUTE TRADES
    if (finalAction === 'BUY' && tradeAmount > 0) {
      if (actionType === 'CORE_REBALANCE') {
        // Core portfolio rebalancing buy
        if (corePortfolioEUR >= Math.max(RISK_CONFIG.DCA.MIN_EUR_BALANCE, tradeAmount)) {
          const btcPurchased = tradeAmount / btcPrice;
          corePortfolioEUR -= tradeAmount;
          corePortfolioBTC += btcPurchased;
          
          trades.push({
            date: dateString,
            type: actionType,
            action: 'BUY',
            eurAmount: tradeAmount,
            btcAmount: btcPurchased,
            btcPrice: btcPrice,
            fearGreedIndex: fearGreedIndex,
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ' - Insufficient core EUR balance';
        }
      } else if (actionType === 'SATELLITE_DCA') {
        // Satellite portfolio DCA buy
        if (satellitePortfolioEUR >= Math.max(RISK_CONFIG.DCA.MIN_EUR_BALANCE / 10, tradeAmount)) {
          const btcPurchased = tradeAmount / btcPrice;
          satellitePortfolioEUR -= tradeAmount;
          satellitePortfolioBTC += btcPurchased;
          
          trades.push({
            date: dateString,
            type: actionType,
            action: 'BUY',
            eurAmount: tradeAmount,
            btcAmount: btcPurchased,
            btcPrice: btcPrice,
            fearGreedIndex: fearGreedIndex,
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ' - Insufficient satellite EUR balance';
        }
      }
      
    } else if (finalAction === 'SELL' && tradeAmount > 0) {
      if (actionType === 'CORE_REBALANCE') {
        // Core portfolio rebalancing sell
        if (corePortfolioBTC >= Math.max(RISK_CONFIG.DCA.MIN_BTC_BALANCE, tradeAmount)) {
          const eurReceived = tradeAmount * btcPrice;
          corePortfolioBTC -= tradeAmount;
          corePortfolioEUR += eurReceived;
          
          trades.push({
            date: dateString,
            type: actionType,
            action: 'SELL',
            eurAmount: eurReceived,
            btcAmount: tradeAmount,
            btcPrice: btcPrice,
            fearGreedIndex: fearGreedIndex,
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ' - Insufficient core BTC balance';
        }
      } else if (actionType === 'SATELLITE_DCA') {
        // Satellite portfolio DCA sell  
        const btcToSell = tradeAmount / btcPrice;
        if (satellitePortfolioBTC >= Math.max(RISK_CONFIG.DCA.MIN_BTC_BALANCE / 10, btcToSell)) {
          const eurReceived = tradeAmount;
          satellitePortfolioBTC -= btcToSell;
          satellitePortfolioEUR += eurReceived;
          
          trades.push({
            date: dateString,
            type: actionType,
            action: 'SELL',
            eurAmount: eurReceived,
            btcAmount: btcToSell,
            btcPrice: btcPrice,
            fearGreedIndex: fearGreedIndex,
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ' - Insufficient satellite BTC balance';
        }
      }
    }
    
    // Update historical tracking
    portfolioHistory.push(totalValue);
    btcPriceHistory.push(btcPrice);
    
    if (portfolioHistory.length > 7) portfolioHistory.shift();
    if (btcPriceHistory.length > 1) btcPriceHistory.shift();
    
    // Recalculate final values after trades
    const finalSatelliteValue = (satellitePortfolioBTC * btcPrice) + satellitePortfolioEUR;
    const finalCoreValue = (corePortfolioBTC * btcPrice) + corePortfolioEUR;
    const finalTotalValue = finalSatelliteValue + finalCoreValue;
    const finalTotalBtcBalance = satellitePortfolioBTC + corePortfolioBTC;
    const finalTotalEurBalance = satellitePortfolioEUR + corePortfolioEUR;
    const finalTotalBtcAllocation = finalTotalValue > 0 ? (finalTotalBtcBalance * btcPrice) / finalTotalValue : 0;
    
    // Record daily result
    results.push({
      date: dateString,
      fearGreedIndex: fearGreedIndex,
      fearGreedValue: fearGreedValue,
      btcPrice: btcPrice,
      ma20: ma20,
      action: finalAction,
      actionType: actionType,
      tradeAmount: tradeAmount,
      // Total Portfolio
      totalBtcBalance: finalTotalBtcBalance,
      totalEurBalance: finalTotalEurBalance,
      totalValue: finalTotalValue,
      btcAllocation: finalTotalBtcAllocation * 100,
      // Core Portfolio  
      coreBtcBalance: corePortfolioBTC,
      coreEurBalance: corePortfolioEUR,
      coreValue: finalCoreValue,
      coreBtcAllocation: finalCoreValue > 0 ? (corePortfolioBTC * btcPrice) / finalCoreValue * 100 : 0,
      // Satellite Portfolio
      satelliteBtcBalance: satellitePortfolioBTC,
      satelliteEurBalance: satellitePortfolioEUR,
      satelliteValue: finalSatelliteValue,
      satelliteBtcAllocation: finalSatelliteValue > 0 ? (satellitePortfolioBTC * btcPrice) / finalSatelliteValue * 100 : 0,
      // Other metrics
      totalInvested: totalInvested,
      unrealizedPnL: finalTotalValue - totalInvested,
      unrealizedPnLPercent: totalInvested > 0 ? ((finalTotalValue - totalInvested) / totalInvested) * 100 : 0,
      notes: notes
    });
  });
  
  // Calculate final metrics
  const finalBtcPrice = btcPriceData[btcPriceData.length - 1]?.price || 0;
  const finalTotalBtcBalance = satellitePortfolioBTC + corePortfolioBTC;
  const finalTotalEurBalance = satellitePortfolioEUR + corePortfolioEUR;
  const finalValue = (finalTotalBtcBalance * finalBtcPrice) + finalTotalEurBalance;
  const totalReturn = finalValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  
  // Calculate CAGR
  const years = results.length / 365;
  const cagr = totalInvested > 0 ? (Math.pow(finalValue / totalInvested, 1/years) - 1) * 100 : 0;
  
  const finalResult = {
    strategy: 'CORRECTED Complete Logical DCA (Core 90% + Satellite 10%) - 3 Years',
    testPeriod: {
      start: commonDates[0],
      end: commonDates[commonDates.length - 1],
      totalDays: results.length,
      totalYears: Math.round(years * 10) / 10
    },
    finalPortfolio: {
      // Total Portfolio
      totalBtcBalance: finalTotalBtcBalance,
      totalEurBalance: finalTotalEurBalance,
      totalValue: finalValue,
      btcAllocation: finalValue > 0 ? ((finalTotalBtcBalance * finalBtcPrice) / finalValue) * 100 : 0,
      totalInvested: totalInvested,
      totalReturn: totalReturn,
      totalReturnPercent: totalReturnPercent,
      cagr: cagr,
      // Core Portfolio (90%)
      coreBtcBalance: corePortfolioBTC,
      coreEurBalance: corePortfolioEUR,
      coreValue: (corePortfolioBTC * finalBtcPrice) + corePortfolioEUR,
      coreBtcAllocation: ((corePortfolioBTC * finalBtcPrice) / ((corePortfolioBTC * finalBtcPrice) + corePortfolioEUR)) * 100,
      // Satellite Portfolio (10%)
      satelliteBtcBalance: satellitePortfolioBTC,
      satelliteEurBalance: satellitePortfolioEUR,
      satelliteValue: (satellitePortfolioBTC * finalBtcPrice) + satellitePortfolioEUR,
      satelliteBtcAllocation: ((satellitePortfolioBTC * finalBtcPrice) / ((satellitePortfolioBTC * finalBtcPrice) + satellitePortfolioEUR)) * 100
    },
    tradeStats: {
      totalTrades: trades.length,
      coreRebalanceTrades: trades.filter(t => t.type === 'CORE_REBALANCE').length,
      satelliteDcaTrades: trades.filter(t => t.type === 'SATELLITE_DCA').length,
      buyTrades: trades.filter(t => t.action === 'BUY').length,
      sellTrades: trades.filter(t => t.action === 'SELL').length,
      totalBuyVolume: trades.filter(t => t.action === 'BUY').reduce((sum, t) => sum + t.eurAmount, 0),
      totalSellVolume: trades.filter(t => t.action === 'SELL').reduce((sum, t) => sum + t.eurAmount, 0)
    },
    dailyResults: results,
    trades: trades
  };
  
  // Save to files
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(path.join(RESULTS_DIR, 'corrected-complete-logical-dca-results.json'), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log('\\n📊 CORRECTED Complete Logical DCA Test Results (Dual Portfolio - 3 Years):');
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`);
  console.log(`📊 CAGR: ${cagr.toFixed(2)}% per year`);
  console.log('\\n🏦 PORTFOLIO BREAKDOWN:');
  console.log(`📊 Total BTC Allocation: ${finalResult.finalPortfolio.btcAllocation.toFixed(1)}%`);
  console.log(`🎯 Core Portfolio (90%): €${finalResult.finalPortfolio.coreValue.toFixed(0)} (${finalResult.finalPortfolio.coreBtcAllocation.toFixed(1)}% BTC)`);
  console.log(`🛰️ Satellite Portfolio (10%): €${finalResult.finalPortfolio.satelliteValue.toFixed(0)} (${finalResult.finalPortfolio.satelliteBtcAllocation.toFixed(1)}% BTC)`);
  console.log('\\n🔄 TRADING ACTIVITY:');
  console.log(`🔄 Total Trades: ${finalResult.tradeStats.totalTrades} (${finalResult.tradeStats.coreRebalanceTrades} core rebalancing, ${finalResult.tradeStats.satelliteDcaTrades} satellite DCA)`);
  console.log(`📈 Buy/Sell: ${finalResult.tradeStats.buyTrades} buys, ${finalResult.tradeStats.sellTrades} sells`);
  console.log(`📅 Test Duration: ${finalResult.testPeriod.totalYears} years`);
  console.log(`💾 Results saved to: corrected-complete-logical-dca-results.json`);
  
  return finalResult;
}

// Run the corrected test
if (require.main === module) {
  runCorrectedCompleteLogicalDCATest();
}

module.exports = { runCorrectedCompleteLogicalDCATest };