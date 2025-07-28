// Bear Market Simple DCA Strategy Test (2021-2022)
// Tests Simple DCA performance during crypto bear market period

const fs = require('fs');
const path = require('path');
const { getCryptoConfig, validateTokenSymbol } = require('./crypto-config');
const { BEAR_MARKET_PERIOD } = require('./bear-market-data-fetcher');

const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');
const WEEKLY_DEPOSIT_EUR = 100;

function loadBearMarketData(tokenSymbol) {
  try {
    const cryptoConfig = getCryptoConfig(tokenSymbol);
    const tokenPricePath = path.join(DATA_DIR, `${cryptoConfig.resultsPrefix}-prices-bear-market.json`);
    
    const tokenPriceData = JSON.parse(fs.readFileSync(tokenPricePath, 'utf8'));
    
    console.log(`💰 Loaded ${tokenPriceData.length} ${cryptoConfig.displayName} bear market records (${tokenPriceData[0]?.dateString} to ${tokenPriceData[tokenPriceData.length - 1]?.dateString})`);
    
    return { tokenPriceData, cryptoConfig };
    
  } catch (error) {
    console.error(`❌ Error loading ${tokenSymbol.toUpperCase()} bear market data:`, error.message);
    throw error;
  }
}

function runBearMarketSimpleDCATest(tokenSymbol) {
  if (!validateTokenSymbol(tokenSymbol)) {
    throw new Error(`Unsupported cryptocurrency: ${tokenSymbol}`);
  }
  
  const tokenUpper = tokenSymbol.toUpperCase();
  console.log(`🐻 Starting Bear Market Simple DCA Test for ${tokenUpper} (${BEAR_MARKET_PERIOD.startDate} to ${BEAR_MARKET_PERIOD.endDate})...`);
  
  const { tokenPriceData, cryptoConfig } = loadBearMarketData(tokenSymbol);
  
  // Portfolio state
  let tokenBalance = 0;
  let totalInvested = 0;
  
  // Results tracking
  const results = [];
  const trades = [];
  
  console.log(`📅 Bear market testing period: ${tokenPriceData[0].dateString} to ${tokenPriceData[tokenPriceData.length - 1].dateString}`);
  console.log(`📊 Total bear market days: ${tokenPriceData.length}`);
  
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
      tradeAmount = WEEKLY_DEPOSIT_EUR;
      totalInvested += WEEKLY_DEPOSIT_EUR;
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
        notes: `Weekly ${tokenUpper} DCA purchase (Bear Market)`
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
      notes: action === 'BUY' ? `Weekly ${tokenUpper} DCA purchase (Bear Market)` : 'No action'
    });
  });
  
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
  const cagr = totalInvested > 0 ? (Math.pow(finalValue / totalInvested, 1/years) - 1) * 100 : 0;
  
  // Calculate bear market specific metrics
  const startPrice = tokenPriceData[0].price;
  const endPrice = finalTokenPrice;
  const marketReturn = ((endPrice - startPrice) / startPrice) * 100;
  
  // Save results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const finalResult = {
    strategy: `Simple DCA (Weekly) - ${tokenUpper} - Bear Market (2021-2022)`,
    tokenSymbol: tokenUpper,
    testPeriod: {
      start: tokenPriceData[0].dateString,
      end: tokenPriceData[tokenPriceData.length - 1].dateString,
      totalDays: results.length,
      totalYears: Math.round(years * 10) / 10,
      marketType: 'Bear Market',
      description: 'Crypto Winter 2021-2022'
    },
    finalPortfolio: {
      tokenBalance: tokenBalance,
      eurBalance: 0,
      totalValue: finalValue,
      tokenAllocation: 100,
      totalInvested: totalInvested,
      totalReturn: totalReturn,
      totalReturnPercent: totalReturnPercent,
      cagr: cagr
    },
    tradeStats: {
      totalTrades: trades.length,
      buyTrades: trades.length,
      sellTrades: 0,
      avgPurchasePrice: avgPurchasePrice,
      finalTokenPrice: finalTokenPrice,
      priceAppreciation: priceAppreciation,
      totalBuyVolume: totalInvested,
      weeklyInvestment: WEEKLY_DEPOSIT_EUR
    },
    marketMetrics: {
      startPrice: startPrice,
      endPrice: endPrice,
      marketReturn: marketReturn,
      dcastrategyvsMarket: totalReturnPercent - marketReturn
    },
    dailyResults: results,
    trades: trades
  };
  
  // Save to files
  const resultsFileName = `simple-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`;
  fs.writeFileSync(path.join(RESULTS_DIR, resultsFileName), JSON.stringify(finalResult, null, 2));
  
  // Print summary
  console.log(`\n📊 Bear Market Simple DCA Results for ${tokenUpper}:`);
  console.log(`💰 Total Invested: €${totalInvested.toFixed(2)}`);
  console.log(`💼 Final Portfolio Value: €${finalValue.toFixed(2)}`);
  console.log(`📈 Total Return: €${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`);
  console.log(`📊 CAGR: ${cagr.toFixed(2)}% per year`);
  console.log(`${cryptoConfig.displayName === 'BTC' ? '₿' : '🪙'} Final ${tokenUpper} Balance: ${tokenBalance.toFixed(cryptoConfig.decimals)} ${tokenUpper}`);
  console.log(`💶 Average Purchase Price: €${avgPurchasePrice.toFixed(2)}`);
  console.log(`📊 Final ${tokenUpper} Price: €${finalTokenPrice.toFixed(2)}`);
  console.log(`🐻 Market Return: ${marketReturn.toFixed(2)}%`);
  console.log(`🎯 Strategy vs Market: ${(totalReturnPercent - marketReturn).toFixed(2)}% outperformance`);
  console.log(`🔄 Total Purchases: ${trades.length}`);
  console.log(`📅 Bear Market Duration: ${finalResult.testPeriod.totalYears} years`);
  console.log(`💾 Results saved to: ${resultsFileName}`);
  
  return finalResult;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Usage Examples:');
    console.log('   Single token: node bear-market-simple-dca-test.js BTC');
    console.log('   Supported tokens: BTC, ETH, SOL, BNB');
    process.exit(1);
  }
  
  const tokenSymbol = args[0];
  
  try {
    runBearMarketSimpleDCATest(tokenSymbol);
  } catch (error) {
    console.error(`💥 Error running Bear Market Simple DCA test for ${tokenSymbol.toUpperCase()}:`, error.message);
    process.exit(1);
  }
}

module.exports = { runBearMarketSimpleDCATest };