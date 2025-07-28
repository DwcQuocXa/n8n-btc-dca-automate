// Simple DCA Strategy Test - Historical Simulation
// Buys 100 EUR worth of BTC every Sunday regardless of market conditions

const fs = require('fs');
const path = require('path');

// Load historical data
const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');

// Test parameters
const WEEKLY_DEPOSIT_EUR = 100;

function loadHistoricalData() {
  try {
    const btcPricePath = path.join(DATA_DIR, 'btc-prices.json');
    const btcPriceData = JSON.parse(fs.readFileSync(btcPricePath, 'utf8'));
    
    console.log(`💰 Loaded ${btcPriceData.length} BTC price records`);
    
    return { btcPriceData };
    
  } catch (error) {
    console.error('❌ Error loading historical data:', error.message);
    throw error;
  }
}

function runSimpleDCATest() {
  console.log('📈 Starting Simple DCA Strategy Test...');
  
  const { btcPriceData } = loadHistoricalData();
  
  // Create lookup map for fast data access
  const btcPriceMap = new Map();
  btcPriceData.forEach(item => {
    btcPriceMap.set(item.dateString, item);
  });
  
  // Portfolio state
  let eurBalance = 0;
  let btcBalance = 0;
  let totalInvested = 0;
  
  // Results tracking
  const results = [];
  const trades = [];
  
  // Get date range from BTC data
  const startDate = new Date(btcPriceData[0].dateString);
  const endDate = new Date(btcPriceData[btcPriceData.length - 1].dateString);
  
  console.log(`📅 Testing period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  console.log(`📊 Total days: ${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))}`);
  
  // Iterate through each day
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    
    // Get market data for this day
    const btcPriceItem = btcPriceMap.get(dateString);
    
    if (!btcPriceItem) {
      // Skip days without BTC price data
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    const btcPrice = btcPriceItem.price;
    
    // Simple DCA logic: Buy every Sunday
    let action = 'HOLD';
    let tradeAmount = 0;
    
    if (dayOfWeek === 0) { // Sunday
      action = 'BUY';
      tradeAmount = WEEKLY_DEPOSIT_EUR;
      totalInvested += WEEKLY_DEPOSIT_EUR;
      
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
      eurBalance: 0, // No EUR balance in simple DCA (all goes to BTC)
      totalValue: totalValue,
      btcAllocation: btcAllocation,
      totalInvested: totalInvested,
      unrealizedPnL: totalValue - totalInvested,
      unrealizedPnLPercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      notes: action === 'BUY' ? 'Weekly DCA purchase' : 'No action'
    });
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calculate final metrics
  const finalBtcPrice = btcPriceData[btcPriceData.length - 1].price;
  const finalValue = btcBalance * finalBtcPrice;
  const totalReturn = finalValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  
  // Calculate some additional metrics
  const avgPurchasePrice = totalInvested / btcBalance;
  const priceAppreciation = ((finalBtcPrice - avgPurchasePrice) / avgPurchasePrice) * 100;
  
  // Save results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const finalResult = {
    strategy: 'Simple DCA (Weekly)',
    testPeriod: {
      start: btcPriceData[0].dateString,
      end: btcPriceData[btcPriceData.length - 1].dateString,
      totalDays: results.length
    },
    finalPortfolio: {
      btcBalance: btcBalance,
      eurBalance: 0,
      totalValue: finalValue,
      btcAllocation: 100,
      totalInvested: totalInvested,
      totalReturn: totalReturn,
      totalReturnPercent: totalReturnPercent
    },
    tradeStats: {
      totalTrades: trades.length,
      buyTrades: trades.length, // All trades are buys in simple DCA
      sellTrades: 0,
      avgPurchasePrice: avgPurchasePrice,
      finalBtcPrice: finalBtcPrice,
      priceAppreciation: priceAppreciation,
      totalBuyVolume: totalInvested
    },
    dailyResults: results,
    trades: trades
  };
  
  // Save to files
  fs.writeFileSync(path.join(RESULTS_DIR, 'simple-dca-results.json'), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log('\n📊 Simple DCA Test Results:');
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`);
  console.log(`₿ Final BTC Balance: ${btcBalance.toFixed(8)} BTC`);
  console.log(`💶 Average Purchase Price: €${avgPurchasePrice.toFixed(2)}`);
  console.log(`📊 Final BTC Price: €${finalBtcPrice.toFixed(2)}`);
  console.log(`📈 BTC Price Appreciation: ${priceAppreciation.toFixed(2)}%`);
  console.log(`🔄 Total Purchases: ${trades.length}`);
  console.log(`💾 Results saved to: ${path.join(RESULTS_DIR, 'simple-dca-results.json')}`);
  
  return finalResult;
}

// Run the test
if (require.main === module) {
  runSimpleDCATest();
}

module.exports = { runSimpleDCATest };