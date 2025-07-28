// Generic Simple DCA Strategy Test - 4 Years Historical Simulation
// Parameterized version that works with any supported cryptocurrency

const fs = require('fs');
const path = require('path');
const { getTokenSpecificConfig, validateTokenSymbol } = require('./crypto-config');

const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');

function loadCryptoHistoricalData(tokenSymbol) {
  try {
    const config = getTokenSpecificConfig(tokenSymbol);
    const cryptoConfig = config.crypto;
    const tokenPricePath = path.join(DATA_DIR, cryptoConfig.dataFileName);
    
    const tokenPriceData = JSON.parse(fs.readFileSync(tokenPricePath, 'utf8'));
    
    console.log(`💰 Loaded ${tokenPriceData.length} ${cryptoConfig.displayName} price records (${tokenPriceData[0]?.dateString} to ${tokenPriceData[tokenPriceData.length - 1]?.dateString})`);
    
    return { tokenPriceData, config };
    
  } catch (error) {
    console.error(`❌ Error loading ${tokenSymbol.toUpperCase()} historical data:`, error.message);
    throw error;
  }
}

function analyzeMarketPhases(results, tokenSymbol) {
  console.log(`\n📊 Analyzing Simple DCA Performance Across Market Phases for ${tokenSymbol.toUpperCase()} (4 Years)...`);
  
  const phases = [];
  let currentPhase = null;
  
  for (let i = 30; i < results.length; i++) {
    const current = results[i];
    const monthAgo = results[i - 30];
    
    const priceChange = ((current.tokenPrice - monthAgo.tokenPrice) / monthAgo.tokenPrice) * 100;
    
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
        startPrice: current.tokenPrice,
        days: 1,
        purchases: current.action === 'BUY' ? 1 : 0
      };
    } else {
      currentPhase.days++;
      if (current.action === 'BUY') currentPhase.purchases++;
    }
    
    if (currentPhase) {
      currentPhase.end = current.date;
      currentPhase.endValue = current.totalValue;
      currentPhase.endPrice = current.tokenPrice;
      currentPhase.portfolioReturn = ((current.totalValue - currentPhase.startValue) / currentPhase.startValue) * 100;
      currentPhase.tokenReturn = ((current.tokenPrice - currentPhase.startPrice) / currentPhase.startPrice) * 100;
    }
  }
  
  if (currentPhase && currentPhase.days > 30) {
    phases.push(currentPhase);
  }
  
  console.log(`\n🔄 Simple DCA Market Phase Analysis for ${tokenSymbol.toUpperCase()} (4 Years):`);
  phases.forEach((phase, index) => {
    console.log(`${index + 1}. ${phase.type} (${phase.start} to ${phase.end}, ${phase.days} days)`);
    console.log(`   Portfolio Return: ${phase.portfolioReturn.toFixed(2)}%`);
    console.log(`   ${tokenSymbol.toUpperCase()} Return: ${phase.tokenReturn.toFixed(2)}%`);
    console.log(`   Purchases: ${phase.purchases}`);
  });
  
  return phases;
}

function runGenericSimpleDCATest(tokenSymbol) {
  // Validate token
  if (!validateTokenSymbol(tokenSymbol)) {
    throw new Error(`Unsupported cryptocurrency: ${tokenSymbol}`);
  }
  
  const tokenUpper = tokenSymbol.toUpperCase();
  console.log(`📈 Starting Simple DCA Strategy Test for ${tokenUpper} (4 Years: 2021-2025)...`);
  
  const { tokenPriceData, config } = loadCryptoHistoricalData(tokenSymbol);
  const cryptoConfig = config.crypto;
  const weeklyDepositEur = config.investment.weeklyDepositEur;
  
  // Create lookup map
  const tokenPriceMap = new Map();
  tokenPriceData.forEach(item => {
    tokenPriceMap.set(item.dateString, item);
  });
  
  // Portfolio state
  let tokenBalance = 0;
  let totalInvested = 0;
  
  // Results tracking
  const results = [];
  const trades = [];
  
  // Get date range
  const startDate = new Date(tokenPriceData[0].dateString);
  const endDate = new Date(tokenPriceData[tokenPriceData.length - 1].dateString);
  
  console.log(`📅 Testing period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  console.log(`📊 Total days: ${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))}`);
  
  // Simple weekly DCA: Buy every ~5 trading days
  let daysSinceLastPurchase = 0;
  
  tokenPriceData.forEach((tokenPriceItem, index) => {
    const dateString = tokenPriceItem.dateString;
    const tokenPrice = tokenPriceItem.price;
    
    // Simple DCA logic: Buy every ~5 trading days (weekly)
    let action = 'HOLD';
    let tradeAmount = 0;
    
    if (index === 0 || daysSinceLastPurchase >= 5) { // First day or every ~5 trading days (weekly)
      action = 'BUY';
      tradeAmount = weeklyDepositEur;
      totalInvested += weeklyDepositEur;
      daysSinceLastPurchase = 0;
      
      // Execute purchase
      const tokenPurchased = tradeAmount / tokenPrice;
      tokenBalance += tokenPurchased;
      
      trades.push({
        date: dateString,
        action: 'BUY',
        eurAmount: tradeAmount,
        tokenAmount: tokenPurchased,
        tokenPrice: tokenPrice,
        notes: `Weekly ${tokenUpper} DCA purchase`
      });
    } else {
      daysSinceLastPurchase++;
    }
    
    // Calculate current portfolio value
    const totalValue = tokenBalance * tokenPrice;
    const tokenAllocation = 100; // Always 100% token in simple DCA
    
    // Record daily result
    results.push({
      date: dateString,
      tokenPrice: tokenPrice,
      action: action,
      tradeAmount: tradeAmount,
      tokenBalance: tokenBalance,
      eurBalance: 0,
      totalValue: totalValue,
      tokenAllocation: tokenAllocation,
      totalInvested: totalInvested,
      unrealizedPnL: totalValue - totalInvested,
      unrealizedPnLPercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      notes: action === 'BUY' ? `Weekly ${tokenUpper} DCA purchase` : 'No action'
    });
  });
  
  // Analyze market phases
  const marketPhases = analyzeMarketPhases(results, tokenUpper);
  
  // Calculate final metrics
  const finalTokenPrice = tokenPriceData[tokenPriceData.length - 1].price;
  const finalValue = tokenBalance * finalTokenPrice;
  const totalReturn = finalValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  
  // Calculate additional metrics
  const avgPurchasePrice = totalInvested / tokenBalance;
  const priceAppreciation = ((finalTokenPrice - avgPurchasePrice) / avgPurchasePrice) * 100;
  
  // Calculate CAGR (Compound Annual Growth Rate)
  const years = results.length / 365;
  const cagr = Math.pow(finalValue / totalInvested, 1/years) - 1;
  
  // Save results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const finalResult = {
    strategy: `Simple DCA (Weekly) - ${tokenUpper} - 4 Years`,
    tokenSymbol: tokenUpper,
    testPeriod: {
      start: tokenPriceData[0].dateString,
      end: tokenPriceData[tokenPriceData.length - 1].dateString,
      totalDays: results.length,
      totalYears: Math.round(years * 10) / 10
    },
    finalPortfolio: {
      tokenBalance: tokenBalance,
      eurBalance: 0,
      totalValue: finalValue,
      tokenAllocation: 100,
      totalInvested: totalInvested,
      totalReturn: totalReturn,
      totalReturnPercent: totalReturnPercent,
      cagr: cagr * 100 // Convert to percentage
    },
    tradeStats: {
      totalTrades: trades.length,
      buyTrades: trades.length,
      sellTrades: 0,
      avgPurchasePrice: avgPurchasePrice,
      finalTokenPrice: finalTokenPrice,
      priceAppreciation: priceAppreciation,
      totalBuyVolume: totalInvested,
      weeklyInvestment: weeklyDepositEur
    },
    marketPhases: marketPhases,
    dailyResults: results,
    trades: trades
  };
  
  // Save to files
  const resultsFileName = `simple-dca-results-${cryptoConfig.resultsPrefix}-4year.json`;
  fs.writeFileSync(path.join(RESULTS_DIR, resultsFileName), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log(`\n📊 Simple DCA Test Results for ${tokenUpper} (4 Years):`);
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`);
  console.log(`📊 CAGR: ${(cagr * 100).toFixed(2)}% per year`);
  console.log(`${cryptoConfig.displayName === 'BTC' ? '₿' : '🪙'} Final ${tokenUpper} Balance: ${tokenBalance.toFixed(cryptoConfig.decimals)} ${tokenUpper}`);
  console.log(`💶 Average Purchase Price: €${avgPurchasePrice.toFixed(2)}`);
  console.log(`📊 Final ${tokenUpper} Price: €${finalTokenPrice.toFixed(2)}`);
  console.log(`📈 ${tokenUpper} Price Appreciation: ${priceAppreciation.toFixed(2)}%`);
  console.log(`🔄 Total Purchases: ${trades.length}`);
  console.log(`📅 Test Duration: ${finalResult.testPeriod.totalYears} years`);
  console.log(`💾 Results saved to: ${resultsFileName}`);
  
  return finalResult;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Usage Examples:');
    console.log('   Single token: node generic-simple-dca-test.js BTC');
    console.log('   Supported tokens: BTC, ETH, SOL, BNB');
    process.exit(1);
  }
  
  const tokenSymbol = args[0];
  
  try {
    runGenericSimpleDCATest(tokenSymbol);
  } catch (error) {
    console.error(`💥 Error running Simple DCA test for ${tokenSymbol.toUpperCase()}:`, error.message);
    process.exit(1);
  }
}

module.exports = { runGenericSimpleDCATest };