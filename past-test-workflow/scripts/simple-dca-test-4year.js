// Simple DCA Strategy Test - 4 Years Historical Simulation
// Buys 100 EUR worth of BTC every Sunday for 4 years (2021-2025)

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');
const WEEKLY_DEPOSIT_EUR = 100;

function load4YearHistoricalData() {
  try {
    const btcPricePath = path.join(DATA_DIR, 'btc-prices-4year.json');
    const btcPriceData = JSON.parse(fs.readFileSync(btcPricePath, 'utf8'));
    
    console.log(`💰 Loaded ${btcPriceData.length} BTC price records (${btcPriceData[0]?.dateString} to ${btcPriceData[btcPriceData.length - 1]?.dateString})`);
    
    return { btcPriceData };
    
  } catch (error) {
    console.error('❌ Error loading 4-year historical data:', error.message);
    throw error;
  }
}

function analyzeMarketPhases(results) {
  console.log('\\n📊 Analyzing Simple DCA Performance Across Market Phases (4 Years)...');
  
  const phases = [];
  let currentPhase = null;
  
  for (let i = 30; i < results.length; i++) {
    const current = results[i];
    const monthAgo = results[i - 30];
    
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
        purchases: current.action === 'BUY' ? 1 : 0
      };
    } else {
      currentPhase.days++;
      if (current.action === 'BUY') currentPhase.purchases++;
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
  
  console.log('\\n🔄 Simple DCA Market Phase Analysis (4 Years):');
  phases.forEach((phase, index) => {
    console.log(`${index + 1}. ${phase.type} (${phase.start} to ${phase.end}, ${phase.days} days)`);
    console.log(`   Portfolio Return: ${phase.portfolioReturn.toFixed(2)}%`);
    console.log(`   BTC Return: ${phase.btcReturn.toFixed(2)}%`);
    console.log(`   Purchases: ${phase.purchases}`);
  });
  
  return phases;
}

function runSimpleDCA4YearTest() {
  console.log('📈 Starting Simple DCA Strategy Test (4 Years: 2021-2025)...');
  
  const { btcPriceData } = load4YearHistoricalData();
  
  // Create lookup map
  const btcPriceMap = new Map();
  btcPriceData.forEach(item => {
    btcPriceMap.set(item.dateString, item);
  });
  
  // Portfolio state
  let btcBalance = 0;
  let totalInvested = 0;
  
  // Results tracking
  const results = [];
  const trades = [];
  
  // Get date range
  const startDate = new Date(btcPriceData[0].dateString);
  const endDate = new Date(btcPriceData[btcPriceData.length - 1].dateString);
  
  console.log(`📅 Testing period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  console.log(`📊 Total days: ${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))}`);
  
  // Simple weekly DCA: Buy every 7 trading days
  let daysSinceLastPurchase = 0;
  
  btcPriceData.forEach((btcPriceItem, index) => {
    const dateString = btcPriceItem.dateString;
    const btcPrice = btcPriceItem.price;
    
    // Simple DCA logic: Buy every 7 trading days (weekly)
    let action = 'HOLD';
    let tradeAmount = 0;
    
    if (index === 0 || daysSinceLastPurchase >= 5) { // First day or every ~5 trading days (weekly)
      action = 'BUY';
      tradeAmount = WEEKLY_DEPOSIT_EUR;
      totalInvested += WEEKLY_DEPOSIT_EUR;
      daysSinceLastPurchase = 0;
      
      // Execute purchase
      const btcPurchased = tradeAmount / btcPrice;
      btcBalance += btcPurchased;
      
      trades.push({
        date: dateString,
        action: 'BUY',
        eurAmount: tradeAmount,
        btcAmount: btcPurchased,
        btcPrice: btcPrice,
        notes: 'Weekly DCA purchase'
      });
    } else {
      daysSinceLastPurchase++;
    }
    
    // Calculate current portfolio value
    const totalValue = btcBalance * btcPrice;
    const btcAllocation = 100; // Always 100% BTC in simple DCA
    
    // Record daily result
    results.push({
      date: dateString,
      btcPrice: btcPrice,
      action: action,
      tradeAmount: tradeAmount,
      btcBalance: btcBalance,
      eurBalance: 0,
      totalValue: totalValue,
      btcAllocation: btcAllocation,
      totalInvested: totalInvested,
      unrealizedPnL: totalValue - totalInvested,
      unrealizedPnLPercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      notes: action === 'BUY' ? 'Weekly DCA purchase' : 'No action'
    });
  });
  
  // Analyze market phases
  const marketPhases = analyzeMarketPhases(results);
  
  // Calculate final metrics
  const finalBtcPrice = btcPriceData[btcPriceData.length - 1].price;
  const finalValue = btcBalance * finalBtcPrice;
  const totalReturn = finalValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  
  // Calculate additional metrics
  const avgPurchasePrice = totalInvested / btcBalance;
  const priceAppreciation = ((finalBtcPrice - avgPurchasePrice) / avgPurchasePrice) * 100;
  
  // Calculate CAGR (Compound Annual Growth Rate)
  const years = results.length / 365;
  const cagr = Math.pow(finalValue / totalInvested, 1/years) - 1;
  
  // Save results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const finalResult = {
    strategy: 'Simple DCA (Weekly) - 4 Years',
    testPeriod: {
      start: btcPriceData[0].dateString,
      end: btcPriceData[btcPriceData.length - 1].dateString,
      totalDays: results.length,
      totalYears: Math.round(years * 10) / 10
    },
    finalPortfolio: {
      btcBalance: btcBalance,
      eurBalance: 0,
      totalValue: finalValue,
      btcAllocation: 100,
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
      finalBtcPrice: finalBtcPrice,
      priceAppreciation: priceAppreciation,
      totalBuyVolume: totalInvested,
      weeklyInvestment: WEEKLY_DEPOSIT_EUR
    },
    marketPhases: marketPhases,
    dailyResults: results,
    trades: trades
  };
  
  // Save to files
  fs.writeFileSync(path.join(RESULTS_DIR, 'simple-dca-results-4year.json'), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log('\\n📊 Simple DCA Test Results (4 Years):');
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`);
  console.log(`📊 CAGR: ${(cagr * 100).toFixed(2)}% per year`);
  console.log(`₿ Final BTC Balance: ${btcBalance.toFixed(8)} BTC`);
  console.log(`💶 Average Purchase Price: €${avgPurchasePrice.toFixed(2)}`);
  console.log(`📊 Final BTC Price: €${finalBtcPrice.toFixed(2)}`);
  console.log(`📈 BTC Price Appreciation: ${priceAppreciation.toFixed(2)}%`);
  console.log(`🔄 Total Purchases: ${trades.length}`);
  console.log(`📅 Test Duration: ${finalResult.testPeriod.totalYears} years`);
  console.log(`💾 Results saved to: ${path.join(RESULTS_DIR, 'simple-dca-results-4year.json')}`);
  
  return finalResult;
}

// Run the test
if (require.main === module) {
  runSimpleDCA4YearTest();
}

module.exports = { runSimpleDCA4YearTest };