// Bear Market Complete Logical DCA Strategy Test (2021-2022)
// Tests Complete Logical DCA performance during crypto bear market period

const fs = require('fs');
const path = require('path');
const { getCryptoConfig, validateTokenSymbol, COMMON_CONFIG } = require('./crypto-config');
const { BEAR_MARKET_PERIOD } = require('./bear-market-data-fetcher');

const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');
const WEEKLY_DEPOSIT_EUR = 100;

function loadBearMarketCompleteData(tokenSymbol) {
  try {
    const cryptoConfig = getCryptoConfig(tokenSymbol);
    
    const fearGreedPath = path.join(DATA_DIR, 'fear-greed-index-extended.json');
    const tokenPricePath = path.join(DATA_DIR, `${cryptoConfig.resultsPrefix}-prices-bear-market.json`);
    
    const fearGreedData = JSON.parse(fs.readFileSync(fearGreedPath, 'utf8'));
    const tokenPriceData = JSON.parse(fs.readFileSync(tokenPricePath, 'utf8'));
    
    console.log(`📊 Loaded ${fearGreedData.length} Fear & Greed records`);
    console.log(`💰 Loaded ${tokenPriceData.length} ${cryptoConfig.displayName} bear market records`);
    
    return { fearGreedData, tokenPriceData, cryptoConfig };
    
  } catch (error) {
    console.error(`❌ Error loading ${tokenSymbol.toUpperCase()} bear market complete data:`, error.message);
    throw error;
  }
}

// Satellite Portfolio: Daily DCA Logic (operates on 10% of total portfolio)
function determineSatelliteDCAAction(fearGreedIndex, tokenPrice, ma20, satellitePoolSize, riskConfig) {
  let action = 'HOLD';
  let tradePercentage = 0;
  let notes = '';
  
  const fearGreedRules = riskConfig.fearGreedRules;
  
  if (fearGreedIndex >= fearGreedRules.EXTREME_FEAR.range[0] && fearGreedIndex <= fearGreedRules.EXTREME_FEAR.range[1]) {
    action = 'BUY';
    tradePercentage = fearGreedRules.EXTREME_FEAR.percentage;
    notes = fearGreedRules.EXTREME_FEAR.description;
  } else if (fearGreedIndex >= fearGreedRules.FEAR.range[0] && fearGreedIndex <= fearGreedRules.FEAR.range[1]) {
    action = 'BUY';
    tradePercentage = fearGreedRules.FEAR.percentage;
    notes = fearGreedRules.FEAR.description;
  } else if (fearGreedIndex >= fearGreedRules.NEUTRAL.range[0] && fearGreedIndex <= fearGreedRules.NEUTRAL.range[1]) {
    if (tokenPrice < ma20) {
      action = 'BUY';
      tradePercentage = fearGreedRules.NEUTRAL.percentage;
      notes = fearGreedRules.NEUTRAL.description;
    } else {
      action = 'HOLD';
      notes = 'Neutral - Hold (Price above MA20)';
    }
  } else if (fearGreedIndex >= fearGreedRules.GREED.range[0] && fearGreedIndex <= fearGreedRules.GREED.range[1]) {
    action = 'SELL';
    tradePercentage = fearGreedRules.GREED.percentage;
    notes = fearGreedRules.GREED.description;
  } else if (fearGreedIndex >= fearGreedRules.HIGH_GREED.range[0] && fearGreedIndex <= fearGreedRules.HIGH_GREED.range[1]) {
    action = 'SELL';
    tradePercentage = fearGreedRules.HIGH_GREED.percentage;
    notes = fearGreedRules.HIGH_GREED.description;
  } else if (fearGreedIndex >= fearGreedRules.EXTREME_GREED.range[0] && fearGreedIndex <= fearGreedRules.EXTREME_GREED.range[1]) {
    action = 'SELL';
    tradePercentage = fearGreedRules.EXTREME_GREED.percentage;
    notes = fearGreedRules.EXTREME_GREED.description;
  }
  
  const tradeAmount = satellitePoolSize * (tradePercentage / 100);
  
  return { action, tradePercentage, tradeAmount, notes };
}

// Core Portfolio: Monthly Rebalancing Logic (operates on 90% of total portfolio)
function determineCoreRebalancing(fearGreedIndex, fearGreedValue, tokenPrice, totalPortfolioValue, corePortfolioToken, corePortfolioEUR, riskConfig, tokenSymbol) {
  const portfolioConfig = riskConfig.portfolio;
  const corePortfolioValue = totalPortfolioValue * portfolioConfig.corePortfolioPercentage;
  const currentCoreTokenValue = corePortfolioToken * tokenPrice;
  const currentCoreEurValue = corePortfolioEUR;
  const currentCoreTotalValue = currentCoreTokenValue + currentCoreEurValue;
  const currentCoreTokenAllocation = currentCoreTotalValue > 0 ? currentCoreTokenValue / currentCoreTotalValue : 0;
  
  // Determine target allocation based on Fear & Greed Index
  let targetTokenAllocation = 0.75; // default
  let fearGreedStrategy = 'Neutral - Base Allocation';
  
  for (const [key, config] of Object.entries(portfolioConfig.fearGreedTargets)) {
    if (fearGreedIndex >= config.range[0] && fearGreedIndex <= config.range[1]) {
      targetTokenAllocation = config.target;
      fearGreedStrategy = config.description;
      break;
    }
  }
  
  const rebalanceBand = portfolioConfig.rebalanceBand;
  let needsRebalancing = false;
  let action = 'HOLD';
  let tradeAmount = 0;
  let notes = `Core Portfolio Rebalancing - Fear & Greed: ${fearGreedIndex} (${fearGreedValue}) - ${fearGreedStrategy}`;
  
  // Check if rebalancing is needed based on dynamic target
  if (currentCoreTokenAllocation > targetTokenAllocation + rebalanceBand) {
    // Too much token in core, sell some
    needsRebalancing = true;
    action = 'SELL';
    const targetCoreTokenValue = currentCoreTotalValue * targetTokenAllocation;
    const excessTokenValue = currentCoreTokenValue - targetCoreTokenValue;
    tradeAmount = excessTokenValue / tokenPrice; // Token amount to sell
    notes += ` | Rebalancing: Core ${tokenSymbol.toUpperCase()} allocation too high (${(currentCoreTokenAllocation * 100).toFixed(1)}% vs ${(targetTokenAllocation * 100).toFixed(1)}% target)`;
  } else if (currentCoreTokenAllocation < targetTokenAllocation - rebalanceBand) {
    // Too little token in core, buy some
    needsRebalancing = true;
    action = 'BUY';
    const targetCoreTokenValue = currentCoreTotalValue * targetTokenAllocation;
    const neededTokenValue = targetCoreTokenValue - currentCoreTokenValue;
    tradeAmount = neededTokenValue; // EUR amount for buying
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
    notes
  };
}

function runBearMarketCompleteLogicalDCATest(tokenSymbol) {
  if (!validateTokenSymbol(tokenSymbol)) {
    throw new Error(`Unsupported cryptocurrency: ${tokenSymbol}`);
  }
  
  const tokenUpper = tokenSymbol.toUpperCase();
  console.log(`🐻 Starting Bear Market Complete Logical DCA Test for ${tokenUpper} (${BEAR_MARKET_PERIOD.startDate} to ${BEAR_MARKET_PERIOD.endDate})...`);
  console.log('📋 Architecture: Core Portfolio (90%) + Satellite Portfolio (10%)');
  
  const { fearGreedData, tokenPriceData, cryptoConfig } = loadBearMarketCompleteData(tokenSymbol);
  const riskConfig = COMMON_CONFIG.riskConfig;
  
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
  
  // Results tracking
  const results = [];
  const trades = [];
  
  // Get overlapping date range for bear market period
  const tokenDates = new Set(tokenPriceData.map(item => item.dateString));
  const commonDates = fearGreedData
    .filter(item => tokenDates.has(item.dateString))
    .filter(item => {
      const itemDate = new Date(item.dateString);
      const startDate = new Date(BEAR_MARKET_PERIOD.startDate);
      const endDate = new Date(BEAR_MARKET_PERIOD.endDate);
      return itemDate >= startDate && itemDate <= endDate;
    })
    .map(item => item.dateString)
    .sort();
  
  console.log(`📅 Bear market testing period: ${commonDates[0]} to ${commonDates[commonDates.length - 1]}`);
  console.log(`📊 Total days with complete bear market data: ${commonDates.length}`);
  
  // Initialize portfolios with first weekly deposit
  satellitePortfolioEUR = WEEKLY_DEPOSIT_EUR * riskConfig.portfolio.satellitePoolPercentage;
  corePortfolioEUR = WEEKLY_DEPOSIT_EUR * riskConfig.portfolio.corePortfolioPercentage;
  totalInvested = WEEKLY_DEPOSIT_EUR;
  
  // Iterate through each day with complete data
  commonDates.forEach((dateString, dayIndex) => {
    const currentDate = new Date(dateString);
    const dayOfMonth = currentDate.getDate();
    
    // Weekly deposit (every ~5 trading days)
    if (dayIndex === 0 || daysSinceLastDeposit >= 5) {
      if (dayIndex > 0) { // Skip first day as we already initialized
        const satelliteDeposit = WEEKLY_DEPOSIT_EUR * riskConfig.portfolio.satellitePoolPercentage;
        const coreDeposit = WEEKLY_DEPOSIT_EUR * riskConfig.portfolio.corePortfolioPercentage;
        
        satellitePortfolioEUR += satelliteDeposit;
        corePortfolioEUR += coreDeposit;
        totalInvested += WEEKLY_DEPOSIT_EUR;
      }
      daysSinceLastDeposit = 0;
    } else {
      daysSinceLastDeposit++;
    }
    
    // Get market data
    const fearGreedItem = fearGreedMap.get(dateString);
    const tokenPriceItem = tokenPriceMap.get(dateString);
    
    if (!fearGreedItem || !tokenPriceItem) {
      return; // Skip if no data
    }
    
    const fearGreedIndex = fearGreedItem.value;
    const fearGreedValue = fearGreedItem.classification;
    const tokenPrice = tokenPriceItem.price;
    const ma20 = tokenPriceItem.ma20;
    
    // Calculate total portfolio values
    const satelliteValue = (satellitePortfolioToken * tokenPrice) + satellitePortfolioEUR;
    const coreValue = (corePortfolioToken * tokenPrice) + corePortfolioEUR;
    const totalValue = satelliteValue + coreValue;
    
    let finalAction = 'HOLD';
    let actionType = 'NONE';
    let tradeAmount = 0;
    let notes = '';
    
    // PRIORITY 1: CORE PORTFOLIO MONTHLY REBALANCING (1st day of month)
    if (dayOfMonth === 1) {
      const rebalanceResult = determineCoreRebalancing(
        fearGreedIndex, 
        fearGreedValue, 
        tokenPrice, 
        totalValue,
        corePortfolioToken,
        corePortfolioEUR,
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
    
    // PRIORITY 2: SATELLITE PORTFOLIO DAILY DCA (if no core rebalancing)
    if (finalAction === 'HOLD' && actionType === 'NONE') {
      const satelliteDCAResult = determineSatelliteDCAAction(fearGreedIndex, tokenPrice, ma20, satelliteValue, riskConfig);
      
      if (satelliteDCAResult.action !== 'HOLD') {
        finalAction = satelliteDCAResult.action;
        actionType = 'SATELLITE_DCA';
        tradeAmount = satelliteDCAResult.tradeAmount;
        notes = `Satellite DCA: ${satelliteDCAResult.notes}`;
      } else {
        notes = `Satellite DCA: ${satelliteDCAResult.notes}`;
      }
    }
    
    // EXECUTE TRADES
    if (finalAction === 'BUY' && tradeAmount > 0) {
      if (actionType === 'CORE_REBALANCE') {
        if (corePortfolioEUR >= Math.max(5, tradeAmount)) {
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
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ' - Insufficient core EUR balance';
        }
      } else if (actionType === 'SATELLITE_DCA') {
        if (satellitePortfolioEUR >= Math.max(0.5, tradeAmount)) {
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
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ' - Insufficient satellite EUR balance';
        }
      }
      
    } else if (finalAction === 'SELL' && tradeAmount > 0) {
      if (actionType === 'CORE_REBALANCE') {
        const minBalance = getCryptoConfig(tokenSymbol).minBalance;
        if (corePortfolioToken >= Math.max(minBalance, tradeAmount)) {
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
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ` - Insufficient core ${tokenUpper} balance`;
        }
      } else if (actionType === 'SATELLITE_DCA') {
        const tokenToSell = tradeAmount / tokenPrice;
        const minBalance = getCryptoConfig(tokenSymbol).minBalance / 10;
        if (satellitePortfolioToken >= Math.max(minBalance, tokenToSell)) {
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
            notes: notes
          });
        } else {
          finalAction = 'HOLD';
          notes += ` - Insufficient satellite ${tokenUpper} balance`;
        }
      }
    }
    
    // Recalculate final values after trades
    const finalSatelliteValue = (satellitePortfolioToken * tokenPrice) + satellitePortfolioEUR;
    const finalCoreValue = (corePortfolioToken * tokenPrice) + corePortfolioEUR;
    const finalTotalValue = finalSatelliteValue + finalCoreValue;
    const finalTotalTokenBalance = satellitePortfolioToken + corePortfolioToken;
    const finalTotalEurBalance = satellitePortfolioEUR + corePortfolioEUR;
    const finalTotalTokenAllocation = finalTotalValue > 0 ? (finalTotalTokenBalance * tokenPrice) / finalTotalValue : 0;
    
    // Record daily result
    results.push({
      date: dateString,
      fearGreedIndex: fearGreedIndex,
      fearGreedValue: fearGreedValue,
      tokenPrice: tokenPrice,
      ma20: ma20,
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
      satelliteTokenBalance: satellitePortfolioToken,
      satelliteEurBalance: satellitePortfolioEUR,
      satelliteValue: finalSatelliteValue,
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
  
  // Calculate bear market specific metrics
  const startPrice = tokenPriceData[0].price;
  const endPrice = finalTokenPrice;
  const marketReturn = ((endPrice - startPrice) / startPrice) * 100;
  
  const finalResult = {
    strategy: `Complete Logical DCA (Core 90% + Satellite 10%) - ${tokenUpper} - Bear Market (2021-2022)`,
    tokenSymbol: tokenUpper,
    testPeriod: {
      start: commonDates[0],
      end: commonDates[commonDates.length - 1],
      totalDays: results.length,
      totalYears: Math.round(years * 10) / 10,
      marketType: 'Bear Market',
      description: 'Crypto Winter 2021-2022'
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
      satelliteTokenBalance: satellitePortfolioToken,
      satelliteEurBalance: satellitePortfolioEUR,
      satelliteValue: (satellitePortfolioToken * finalTokenPrice) + satellitePortfolioEUR
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
    marketMetrics: {
      startPrice: startPrice,
      endPrice: endPrice,
      marketReturn: marketReturn,
      strategyVsMarket: totalReturnPercent - marketReturn
    },
    dailyResults: results,
    trades: trades
  };
  
  // Save to files
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const resultsFileName = `complete-logical-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`;
  fs.writeFileSync(path.join(RESULTS_DIR, resultsFileName), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log(`\n📊 Bear Market Complete Logical DCA Results for ${tokenUpper}:`);
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`);
  console.log(`📊 CAGR: ${cagr.toFixed(2)}% per year`);
  console.log(`🐻 Market Return: ${marketReturn.toFixed(2)}%`);
  console.log(`🎯 Strategy vs Market: ${(totalReturnPercent - marketReturn).toFixed(2)}% outperformance`);
  console.log('\n🏦 PORTFOLIO BREAKDOWN:');
  console.log(`📊 Total ${tokenUpper} Allocation: ${finalResult.finalPortfolio.tokenAllocation.toFixed(1)}%`);
  console.log(`🎯 Core Portfolio (90%): €${finalResult.finalPortfolio.coreValue.toFixed(0)}`);
  console.log(`🛰️ Satellite Portfolio (10%): €${finalResult.finalPortfolio.satelliteValue.toFixed(0)}`);
  console.log('\n🔄 TRADING ACTIVITY:');
  console.log(`🔄 Total Trades: ${finalResult.tradeStats.totalTrades} (${finalResult.tradeStats.coreRebalanceTrades} core, ${finalResult.tradeStats.satelliteDcaTrades} satellite)`);
  console.log(`📈 Buy/Sell: ${finalResult.tradeStats.buyTrades} buys, ${finalResult.tradeStats.sellTrades} sells`);
  console.log(`📅 Bear Market Duration: ${finalResult.testPeriod.totalYears} years`);
  console.log(`💾 Results saved to: ${resultsFileName}`);
  
  return finalResult;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Usage Examples:');
    console.log('   Single token: node bear-market-logical-dca-test.js BTC');
    console.log('   Supported tokens: BTC, ETH, SOL, BNB');
    process.exit(1);
  }
  
  const tokenSymbol = args[0];
  
  try {
    runBearMarketCompleteLogicalDCATest(tokenSymbol);
  } catch (error) {
    console.error(`💥 Error running Bear Market Logical DCA test for ${tokenSymbol.toUpperCase()}:`, error.message);
    process.exit(1);
  }
}

module.exports = { runBearMarketCompleteLogicalDCATest };