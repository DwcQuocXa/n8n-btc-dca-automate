// Extended Historical Data Fetcher - Multi-Year Bitcoin & Fear/Greed Data
// Uses multiple free APIs to get 2-3 years of data covering different market cycles

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const DAYS_TO_FETCH = 1095; // 3 years (covering multiple market cycles)
const DATA_DIR = path.join(__dirname, '../data');

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function fetchCryptoDataDownloadCSV() {
  console.log('📊 Trying CryptoDataDownload for historical BTC data...');
  
  try {
    // CryptoDataDownload provides free CSV data going back years
    const url = 'https://www.cryptodatadownload.com/cdd/Binance_BTCEUR_d.csv';
    
    // Note: This would require HTTP module for CSV parsing
    // For now, we'll document this as an alternative approach
    console.log('ℹ️ CryptoDataDownload CSV option available at:', url);
    console.log('ℹ️ This requires manual download or HTTP CSV parsing');
    
    return null;
  } catch (error) {
    console.log('⚠️ CryptoDataDownload not accessible via API');
    return null;
  }
}

async function fetchFearGreedDataExtended() {
  console.log('📊 Fetching extended Fear & Greed Index data...');
  
  try {
    // Alternative.me API - using limit=0 gets ALL historical data
    const url = 'https://api.alternative.me/fng/?limit=0&format=json';
    console.log(`Fetching from: ${url}`);
    
    const data = await httpsGet(url);
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid Fear & Greed data format');
    }
    
    console.log(`✅ Fetched ${data.data.length} Fear & Greed Index records (ALL historical data)`);
    
    // Transform and sort data (API returns newest first, we want oldest first)
    const transformedData = data.data
      .reverse()
      .map(item => ({
        date: item.timestamp,
        dateString: new Date(parseInt(item.timestamp) * 1000).toISOString().split('T')[0],
        value: parseInt(item.value),
        classification: item.value_classification
      }));
    
    // Save to file
    const filePath = path.join(DATA_DIR, 'fear-greed-index-extended.json');
    fs.writeFileSync(filePath, JSON.stringify(transformedData, null, 2));
    console.log(`💾 Saved Fear & Greed data to: ${filePath}`);
    
    return transformedData;
    
  } catch (error) {
    console.error('❌ Error fetching Fear & Greed data:', error.message);
    throw error;
  }
}

async function fetchBTCDataMultiSource() {
  console.log('💰 Fetching extended BTC/EUR price data using multiple sources...');
  
  let allPriceData = [];
  
  // Strategy 1: Try Yahoo Finance API (often has longer history)
  try {
    console.log('📈 Trying Yahoo Finance for BTC-EUR data...');
    
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (DAYS_TO_FETCH * 24 * 60 * 60);
    
    // Yahoo Finance doesn't require API key for basic data
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-EUR?period1=${startDate}&period2=${endDate}&interval=1d`;
    
    const yahooData = await httpsGet(yahooUrl);
    
    if (yahooData?.chart?.result?.[0]?.timestamp) {
      const timestamps = yahooData.chart.result[0].timestamp;
      const closes = yahooData.chart.result[0].indicators.quote[0].close;
      
      const yahooFormatted = timestamps.map((timestamp, index) => [
        timestamp * 1000, // Convert to milliseconds
        closes[index]
      ]).filter(([timestamp, price]) => price !== null);
      
      allPriceData.push(...yahooFormatted);
      console.log(`✅ Yahoo Finance: ${yahooFormatted.length} records`);
    }
  } catch (error) {
    console.log('⚠️ Yahoo Finance failed:', error.message);
  }
  
  // Strategy 2: Multiple CoinGecko requests with longer intervals
  if (allPriceData.length < DAYS_TO_FETCH * 0.8) {
    console.log('📈 Using multiple CoinGecko requests for comprehensive data...');
    
    try {
      const endDate = new Date();
      const chunkSize = 365; // Max days per request
      const numChunks = Math.ceil(DAYS_TO_FETCH / chunkSize);
      
      for (let i = 0; i < numChunks; i++) {
        const chunkEndDate = new Date(endDate);
        chunkEndDate.setDate(endDate.getDate() - (i * chunkSize));
        
        const chunkStartDate = new Date(chunkEndDate);
        const daysInChunk = Math.min(chunkSize, DAYS_TO_FETCH - (i * chunkSize));
        chunkStartDate.setDate(chunkEndDate.getDate() - daysInChunk);
        
        const fromTimestamp = Math.floor(chunkStartDate.getTime() / 1000);
        const toTimestamp = Math.floor(chunkEndDate.getTime() / 1000);
        
        console.log(`📦 CoinGecko Chunk ${i + 1}/${numChunks}: ${chunkStartDate.toISOString().split('T')[0]} to ${chunkEndDate.toISOString().split('T')[0]}`);
        
        try {
          const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from=${fromTimestamp}&to=${toTimestamp}`;
          const data = await httpsGet(url);
          
          if (data.prices && Array.isArray(data.prices)) {
            allPriceData.unshift(...data.prices);
            console.log(`✅ CoinGecko Chunk ${i + 1}: ${data.prices.length} records`);
          }
          
          // Rate limiting
          if (i < numChunks - 1) {
            console.log('⏳ Rate limiting - waiting 4 seconds...');
            await delay(4000);
          }
        } catch (chunkError) {
          console.log(`⚠️ CoinGecko Chunk ${i + 1} failed: ${chunkError.message}`);
        }
      }
    } catch (error) {
      console.log('⚠️ CoinGecko multi-request failed:', error.message);
    }
  }
  
  // Strategy 3: Try CoinMarketCap historical data endpoint
  if (allPriceData.length < DAYS_TO_FETCH * 0.5) {
    console.log('📈 Trying CoinMarketCap historical data...');
    
    try {
      // CoinMarketCap sometimes has public endpoints for historical data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - DAYS_TO_FETCH);
      
      const cmcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/historical?symbol=BTC&time_start=${startDate.toISOString()}&convert=EUR`;
      
      // Note: This usually requires an API key, but worth trying
      const cmcData = await httpsGet(cmcUrl);
      
      console.log('ℹ️ CoinMarketCap requires API key for historical data');
    } catch (error) {
      console.log('ℹ️ CoinMarketCap historical data requires paid API key');
    }
  }
  
  if (allPriceData.length === 0) {
    throw new Error('No BTC price data could be fetched from any source');
  }
  
  console.log(`✅ Total BTC price records collected: ${allPriceData.length}`);
  
  // Remove duplicates and sort by timestamp
  const uniquePrices = [];
  const seenTimestamps = new Set();
  
  allPriceData
    .sort(([a], [b]) => a - b)
    .forEach(([timestamp, price]) => {
      const dayKey = new Date(timestamp).toISOString().split('T')[0];
      if (!seenTimestamps.has(dayKey) && price !== null && price > 0) {
        seenTimestamps.add(dayKey);
        uniquePrices.push([timestamp, price]);
      }
    });
  
  console.log(`✅ After deduplication: ${uniquePrices.length} unique daily records`);
  
  // Transform to our format
  const transformedData = uniquePrices.map(([timestamp, price]) => {
    const date = new Date(timestamp);
    return {
      date: Math.floor(timestamp / 1000),
      dateString: date.toISOString().split('T')[0],
      price: parseFloat(price.toFixed(2))
    };
  });
  
  // Calculate 20-day moving average
  const pricesWithMA = transformedData.map((item, index) => {
    if (index < 19) {
      item.ma20 = item.price;
    } else {
      const last20Prices = transformedData
        .slice(index - 19, index + 1)
        .map(d => d.price);
      item.ma20 = parseFloat((last20Prices.reduce((sum, p) => sum + p, 0) / 20).toFixed(2));
    }
    return item;
  });
  
  // Save to file
  const filePath = path.join(DATA_DIR, 'btc-prices-extended.json');
  fs.writeFileSync(filePath, JSON.stringify(pricesWithMA, null, 2));
  console.log(`💾 Saved BTC price data to: ${filePath}`);
  
  return pricesWithMA;
}

// Alternative: Guide user to Kaggle datasets
function provideKaggleInstructions() {
  console.log('\n📚 ALTERNATIVE: Use Kaggle Datasets for Historical Data');
  console.log('=' .repeat(60));
  console.log('For maximum historical coverage, consider these Kaggle datasets:');
  console.log('');
  console.log('1. Bitcoin Historical Data (2012-Present):');
  console.log('   https://www.kaggle.com/datasets/mczielinski/bitcoin-historical-data');
  console.log('');
  console.log('2. Bitcoin & Fear and Greed Index:');
  console.log('   https://www.kaggle.com/datasets/adilbhatti/bitcoin-and-fear-and-greed');
  console.log('');
  console.log('3. Crypto Fear and Greed Index:');
  console.log('   https://www.kaggle.com/datasets/adelsondias/crypto-fear-and-greed-index');
  console.log('');
  console.log('Instructions:');
  console.log('1. Download CSV files from Kaggle');
  console.log('2. Place them in the data/ directory');
  console.log('3. Run a conversion script to transform to JSON format');
  console.log('4. Use the extended datasets for testing');
  console.log('');
  console.log('This approach can give you 5+ years of data covering multiple cycles!');
  console.log('=' .repeat(60));
}

async function main() {
  console.log(`🚀 Starting extended historical data fetch for ${DAYS_TO_FETCH} days (${Math.round(DAYS_TO_FETCH/365 * 10)/10} years)...`);
  console.log(`📁 Data will be saved to: ${DATA_DIR}`);
  
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Fetch Fear & Greed data (this should work well)
    const fearGreedData = await fetchFearGreedDataExtended();
    
    console.log('⏳ Waiting 3 seconds before BTC data fetch...');
    await delay(3000);
    
    // Fetch BTC price data using multiple strategies
    let btcPriceData;
    try {
      btcPriceData = await fetchBTCDataMultiSource();
    } catch (error) {
      console.error('❌ Failed to fetch sufficient BTC data via APIs');
      console.log('💡 Providing alternative data source instructions...');
      provideKaggleInstructions();
      return;
    }
    
    // Verify data coverage
    const dataStartDate = new Date(Math.min(
      new Date(fearGreedData[0]?.dateString || '9999-12-31'),
      new Date(btcPriceData[0]?.dateString || '9999-12-31')
    ));
    
    const dataEndDate = new Date(Math.max(
      new Date(fearGreedData[fearGreedData.length - 1]?.dateString || '1900-01-01'),
      new Date(btcPriceData[btcPriceData.length - 1]?.dateString || '1900-01-01')
    ));
    
    const daysCovered = Math.ceil((dataEndDate - dataStartDate) / (1000 * 60 * 60 * 24));
    
    console.log('\n📋 Extended Data Summary:');
    console.log(`Fear & Greed records: ${fearGreedData.length}`);
    console.log(`BTC price records: ${btcPriceData.length}`);
    console.log(`Date range: ${dataStartDate.toISOString().split('T')[0]} to ${dataEndDate.toISOString().split('T')[0]}`);
    console.log(`Total coverage: ${daysCovered} days (${Math.round(daysCovered/365 * 10)/10} years)`);
    
    if (daysCovered >= DAYS_TO_FETCH * 0.8) {
      console.log('\n✅ Extended historical data fetch completed successfully!');
      console.log('📊 You now have multi-year data covering different market cycles');
      console.log('🔄 Run the logical and simple DCA tests with this extended dataset');
    } else {
      console.log('\n⚠️ Data coverage is less than expected');
      console.log('💡 Consider using Kaggle datasets for maximum historical coverage');
      provideKaggleInstructions();
    }
    
  } catch (error) {
    console.error('\n❌ Failed to fetch extended historical data:', error.message);
    console.log('💡 Providing alternative approaches...');
    provideKaggleInstructions();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  fetchFearGreedDataExtended,
  fetchBTCDataMultiSource,
  provideKaggleInstructions
};