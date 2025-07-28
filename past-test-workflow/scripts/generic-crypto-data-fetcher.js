// Generic Cryptocurrency Data Fetcher
// Fetches 4-year historical data for any supported cryptocurrency

const fs = require('fs');
const path = require('path');
const { getTokenSpecificConfig, validateTokenSymbol } = require('./crypto-config');

const DATA_DIR = path.join(__dirname, '../data');

function calculateMA20(prices, index) {
  const start = Math.max(0, index - 19);
  const slice = prices.slice(start, index + 1);
  const sum = slice.reduce((acc, item) => acc + item.price, 0);
  return sum / slice.length;
}

async function fetchCryptoHistoricalData(tokenSymbol) {
  console.log(`📊 Fetching 4-Year ${tokenSymbol.toUpperCase()} Historical Data...`);
  
  // Validate token
  if (!validateTokenSymbol(tokenSymbol)) {
    throw new Error(`Unsupported cryptocurrency: ${tokenSymbol}`);
  }
  
  const config = getTokenSpecificConfig(tokenSymbol);
  const cryptoConfig = config.crypto;
  
  // Calculate dates for 4 years
  const endDate = Math.floor(new Date(config.testPeriod.endDate).getTime() / 1000);
  const startDate = Math.floor(new Date(config.testPeriod.startDate).getTime() / 1000);
  
  console.log(`📅 ${cryptoConfig.name} (${cryptoConfig.displayName}) Date range: ${config.testPeriod.startDate} to ${config.testPeriod.endDate}`);
  console.log(`🔍 Yahoo Finance Symbol: ${cryptoConfig.symbol}`);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cryptoConfig.symbol}?period1=${startDate}&period2=${endDate}&interval=1d`;
  
  try {
    console.log(`🌐 Fetching ${cryptoConfig.name} data from Yahoo Finance...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error(`Invalid response structure from Yahoo Finance for ${cryptoConfig.name}`);
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    if (!timestamps || !quotes) {
      throw new Error(`Missing timestamp or quote data for ${cryptoConfig.name}`);
    }
    
    console.log(`📈 Processing ${timestamps.length} ${cryptoConfig.displayName} data points...`);
    
    // Process the data
    const processedData = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const date = new Date(timestamp * 1000);
      const dateString = date.toISOString().split('T')[0];
      
      // Skip weekends and invalid data
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      if (!quotes.close[i] || quotes.close[i] <= 0) continue;
      
      processedData.push({
        date: timestamp,
        dateString: dateString,
        price: Math.round(quotes.close[i] * Math.pow(10, cryptoConfig.priceDecimals)) / Math.pow(10, cryptoConfig.priceDecimals),
        high: Math.round(quotes.high[i] * Math.pow(10, cryptoConfig.priceDecimals)) / Math.pow(10, cryptoConfig.priceDecimals),
        low: Math.round(quotes.low[i] * Math.pow(10, cryptoConfig.priceDecimals)) / Math.pow(10, cryptoConfig.priceDecimals),
        open: Math.round(quotes.open[i] * Math.pow(10, cryptoConfig.priceDecimals)) / Math.pow(10, cryptoConfig.priceDecimals),
        volume: quotes.volume[i] || 0,
        ma20: 0 // Will be calculated after
      });
    }
    
    // Calculate 20-day moving averages
    console.log(`📊 Calculating 20-day moving averages for ${cryptoConfig.displayName}...`);
    for (let i = 0; i < processedData.length; i++) {
      processedData[i].ma20 = Math.round(calculateMA20(processedData, i) * Math.pow(10, cryptoConfig.priceDecimals)) / Math.pow(10, cryptoConfig.priceDecimals);
    }
    
    // Ensure directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Save to file
    const filepath = path.join(DATA_DIR, cryptoConfig.dataFileName);
    fs.writeFileSync(filepath, JSON.stringify(processedData, null, 2));
    
    console.log(`✅ Successfully saved ${processedData.length} ${cryptoConfig.displayName} price records`);
    console.log(`📅 Date range: ${processedData[0].dateString} to ${processedData[processedData.length - 1].dateString}`);
    console.log(`📁 Saved to: ${filepath}`);
    
    // Calculate total days
    const totalDays = processedData.length;
    const totalYears = Math.round((totalDays / 365) * 10) / 10;
    
    console.log(`⏱️ Total period: ${totalDays} days (${totalYears} years)`);
    
    return {
      success: true,
      tokenSymbol: tokenSymbol.toUpperCase(),
      tokenName: cryptoConfig.name,
      records: processedData.length,
      startDate: processedData[0].dateString,
      endDate: processedData[processedData.length - 1].dateString,
      totalDays: totalDays,
      totalYears: totalYears,
      filepath: filepath
    };
    
  } catch (error) {
    console.error(`❌ Error fetching ${cryptoConfig.name} data:`, error.message);
    throw error;
  }
}

// Fetch data for multiple cryptocurrencies in parallel
async function fetchMultipleCryptoData(tokenSymbols) {
  console.log(`🚀 Starting parallel data fetch for: ${tokenSymbols.join(', ')}`);
  
  const fetchPromises = tokenSymbols.map(symbol => 
    fetchCryptoHistoricalData(symbol)
      .catch(error => ({ 
        tokenSymbol: symbol.toUpperCase(), 
        error: error.message, 
        success: false 
      }))
  );
  
  const results = await Promise.all(fetchPromises);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n📊 Multi-Crypto Data Fetch Summary:`);
  console.log(`✅ Successful: ${successful.length} tokens`);
  successful.forEach(r => {
    console.log(`   └─ ${r.tokenSymbol}: ${r.records} records (${r.startDate} to ${r.endDate})`);
  });
  
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} tokens`);
    failed.forEach(r => {
      console.log(`   └─ ${r.tokenSymbol}: ${r.error}`);
    });
  }
  
  return { successful, failed, total: results.length };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Usage Examples:');
    console.log('   Single token: node generic-crypto-data-fetcher.js BTC');
    console.log('   Multiple tokens: node generic-crypto-data-fetcher.js BTC ETH SOL BNB');
    console.log('   Supported tokens: BTC, ETH, SOL, BNB');
    process.exit(1);
  }
  
  fetchMultipleCryptoData(args)
    .then(results => {
      if (results.successful.length > 0) {
        console.log('\n🎉 Data fetch completed!');
        console.log(`📊 Ready for backtesting: ${results.successful.map(r => r.tokenSymbol).join(', ')}`);
      }
      if (results.failed.length > 0) {
        console.error(`\n💥 Some fetches failed. Check the error messages above.`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Critical error in multi-crypto data fetch:', error);
      process.exit(1);
    });
}

module.exports = { 
  fetchCryptoHistoricalData, 
  fetchMultipleCryptoData 
};