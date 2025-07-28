// Bear Market Period Data Fetcher (2021-2022)
// Fetches historical data specifically for the crypto bear market period

const fs = require('fs');
const path = require('path');
const { fetchMultipleCryptoData } = require('./generic-crypto-data-fetcher');
const { getAllSupportedTokens } = require('./crypto-config');

// Bear market test period (crypto winter 2021-2022)
const BEAR_MARKET_PERIOD = {
  startDate: '2021-07-27',  // Start from our available data
  endDate: '2022-12-31',    // End of 2022 bear market
  years: 1.4
};

async function fetchBearMarketData() {
  console.log('🐻 Fetching Bear Market Data (2021-2022)...');
  console.log(`📅 Period: ${BEAR_MARKET_PERIOD.startDate} to ${BEAR_MARKET_PERIOD.endDate}`);
  
  // Override the generic fetcher's dates by temporarily modifying the config
  const originalFetcher = require('./generic-crypto-data-fetcher');
  
  // Get all supported tokens
  const supportedTokens = getAllSupportedTokens();
  console.log(`🎯 Fetching data for: ${supportedTokens.join(', ')}`);
  
  // Create a custom version that uses bear market dates
  const { getTokenSpecificConfig } = require('./crypto-config');
  
  // Fetch data for all tokens with bear market period
  const results = await Promise.all(supportedTokens.map(async (token) => {
    try {
      const config = getTokenSpecificConfig(token, BEAR_MARKET_PERIOD);
      const cryptoConfig = config.crypto;
      
      // Calculate dates for bear market period
      const endDate = Math.floor(new Date(BEAR_MARKET_PERIOD.endDate).getTime() / 1000);
      const startDate = Math.floor(new Date(BEAR_MARKET_PERIOD.startDate).getTime() / 1000);
      
      console.log(`📊 Fetching ${token} bear market data...`);
      console.log(`📅 ${cryptoConfig.name} Date range: ${BEAR_MARKET_PERIOD.startDate} to ${BEAR_MARKET_PERIOD.endDate}`);
      
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cryptoConfig.symbol}?period1=${startDate}&period2=${endDate}&interval=1d`;
      
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
        const start = Math.max(0, i - 19);
        const slice = processedData.slice(start, i + 1);
        const sum = slice.reduce((acc, item) => acc + item.price, 0);
        processedData[i].ma20 = Math.round((sum / slice.length) * Math.pow(10, cryptoConfig.priceDecimals)) / Math.pow(10, cryptoConfig.priceDecimals);
      }
      
      // Ensure directory exists
      const DATA_DIR = path.join(__dirname, '../data');
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      // Save to bear market specific file
      const filename = `${cryptoConfig.resultsPrefix}-prices-bear-market.json`;
      const filepath = path.join(DATA_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(processedData, null, 2));
      
      console.log(`✅ Successfully saved ${processedData.length} ${cryptoConfig.displayName} bear market records`);
      console.log(`📅 Date range: ${processedData[0].dateString} to ${processedData[processedData.length - 1].dateString}`);
      console.log(`📁 Saved to: ${filepath}`);
      
      const totalDays = processedData.length;
      const totalYears = Math.round((totalDays / 365) * 10) / 10;
      
      console.log(`⏱️ Bear market period: ${totalDays} days (${totalYears} years)`);
      
      return {
        success: true,
        tokenSymbol: token,
        tokenName: cryptoConfig.name,
        records: processedData.length,
        startDate: processedData[0].dateString,
        endDate: processedData[processedData.length - 1].dateString,
        totalDays: totalDays,
        totalYears: totalYears,
        filepath: filepath
      };
      
    } catch (error) {
      console.error(`❌ Error fetching ${token} bear market data:`, error.message);
      return {
        success: false,
        tokenSymbol: token,
        error: error.message
      };
    }
  }));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n📊 Bear Market Data Fetch Summary:`);
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
  
  return { successful, failed, period: BEAR_MARKET_PERIOD };
}

// CLI execution
if (require.main === module) {
  fetchBearMarketData()
    .then(results => {
      if (results.successful.length > 0) {
        console.log('\n🎉 Bear market data fetch completed!');
        console.log(`🐻 Ready for bear market backtesting: ${results.successful.map(r => r.tokenSymbol).join(', ')}`);
        console.log(`📅 Period: ${results.period.startDate} to ${results.period.endDate}`);
      }
      if (results.failed.length > 0) {
        console.error(`\n💥 Some fetches failed. Check the error messages above.`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Critical error in bear market data fetch:', error);
      process.exit(1);
    });
}

module.exports = { 
  fetchBearMarketData,
  BEAR_MARKET_PERIOD
};