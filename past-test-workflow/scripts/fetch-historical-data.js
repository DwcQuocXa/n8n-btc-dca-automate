// Historical Data Fetcher for DCA Strategy Testing
// Fetches 1000 days of BTC prices and Fear & Greed Index data

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const DAYS_TO_FETCH = 1000;
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

// Calculate date range
function getDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - DAYS_TO_FETCH);
  
  return {
    start: Math.floor(startDate.getTime() / 1000),
    end: Math.floor(endDate.getTime() / 1000)
  };
}

// Fetch Fear & Greed Index historical data
async function fetchFearGreedData() {
  console.log('📊 Fetching Fear & Greed Index data...');
  
  try {
    // Alternative.me API supports historical data with limit parameter
    const url = `https://api.alternative.me/fng/?limit=${DAYS_TO_FETCH}&format=json`;
    console.log(`Fetching from: ${url}`);
    
    const data = await httpsGet(url);
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid Fear & Greed data format');
    }
    
    console.log(`✅ Fetched ${data.data.length} Fear & Greed Index records`);
    
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
    const filePath = path.join(DATA_DIR, 'fear-greed-index.json');
    fs.writeFileSync(filePath, JSON.stringify(transformedData, null, 2));
    console.log(`💾 Saved Fear & Greed data to: ${filePath}`);
    
    return transformedData;
    
  } catch (error) {
    console.error('❌ Error fetching Fear & Greed data:', error.message);
    throw error;
  }
}

// Fetch BTC price data by making multiple requests for year chunks
async function fetchBTCPriceData() {
  console.log('💰 Fetching BTC/EUR price data...');
  
  try {
    const endDate = new Date();
    const allPriceData = [];
    
    // Split into chunks of ~365 days to respect CoinGecko limits
    const CHUNK_DAYS = 350; // Leave some margin
    const numChunks = Math.ceil(DAYS_TO_FETCH / CHUNK_DAYS);
    
    console.log(`📊 Fetching ${DAYS_TO_FETCH} days in ${numChunks} chunks...`);
    
    for (let i = 0; i < numChunks; i++) {
      const chunkEndDate = new Date(endDate);
      chunkEndDate.setDate(endDate.getDate() - (i * CHUNK_DAYS));
      
      const chunkStartDate = new Date(chunkEndDate);
      const daysInThisChunk = Math.min(CHUNK_DAYS, DAYS_TO_FETCH - (i * CHUNK_DAYS));
      chunkStartDate.setDate(chunkEndDate.getDate() - daysInThisChunk);
      
      const fromTimestamp = Math.floor(chunkStartDate.getTime() / 1000);
      const toTimestamp = Math.floor(chunkEndDate.getTime() / 1000);
      
      console.log(`📦 Chunk ${i + 1}/${numChunks}: ${chunkStartDate.toISOString().split('T')[0]} to ${chunkEndDate.toISOString().split('T')[0]}`);
      
      const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from=${fromTimestamp}&to=${toTimestamp}`;
      
      try {
        const data = await httpsGet(url);
        
        if (data.error) {
          console.log(`⚠️ CoinGecko error for chunk ${i + 1}:`, data.error.status.error_message);
          continue;
        }
        
        if (data.prices && Array.isArray(data.prices)) {
          allPriceData.unshift(...data.prices); // Add to beginning (oldest first)
          console.log(`✅ Fetched ${data.prices.length} records for chunk ${i + 1}`);
        }
        
        // Rate limiting between requests
        if (i < numChunks - 1) {
          console.log('⏳ Waiting 3 seconds before next chunk...');
          await delay(3000);
        }
        
      } catch (chunkError) {
        console.log(`⚠️ Error fetching chunk ${i + 1}: ${chunkError.message}`);
      }
    }
    
    if (allPriceData.length === 0) {
      throw new Error('No BTC price data could be fetched');
    }
    
    console.log(`✅ Total fetched: ${allPriceData.length} BTC price records`);
    
    // Remove duplicates and sort by timestamp
    const uniquePrices = [];
    const seenTimestamps = new Set();
    
    allPriceData
      .sort(([a], [b]) => a - b) // Sort by timestamp
      .forEach(([timestamp, price]) => {
        if (!seenTimestamps.has(timestamp)) {
          seenTimestamps.add(timestamp);
          uniquePrices.push([timestamp, price]);
        }
      });
    
    console.log(`✅ After deduplication: ${uniquePrices.length} unique records`);
    
    // Transform data to daily format
    const transformedData = uniquePrices.map(([timestamp, price]) => {
      const date = new Date(timestamp);
      return {
        date: Math.floor(timestamp / 1000),
        dateString: date.toISOString().split('T')[0],
        price: parseFloat(price.toFixed(2))
      };
    });
    
    // Calculate 20-day moving average for each day
    const pricesWithMA = transformedData.map((item, index) => {
      if (index < 19) {
        // Not enough data for 20-day MA
        item.ma20 = item.price;
      } else {
        // Calculate 20-day moving average
        const last20Prices = transformedData
          .slice(index - 19, index + 1)
          .map(d => d.price);
        item.ma20 = parseFloat((last20Prices.reduce((sum, p) => sum + p, 0) / 20).toFixed(2));
      }
      return item;
    });
    
    // Save to file
    const filePath = path.join(DATA_DIR, 'btc-prices.json');
    fs.writeFileSync(filePath, JSON.stringify(pricesWithMA, null, 2));
    console.log(`💾 Saved BTC price data to: ${filePath}`);
    
    return pricesWithMA;
    
  } catch (error) {
    console.error('❌ Error fetching BTC price data:', error.message);
    throw error;
  }
}

// Main execution function
async function main() {
  console.log(`🚀 Starting historical data fetch for ${DAYS_TO_FETCH} days...`);
  console.log(`📁 Data will be saved to: ${DATA_DIR}`);
  
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Fetch both datasets with delays to respect rate limits
    const fearGreedData = await fetchFearGreedData();
    
    console.log('⏳ Waiting 2 seconds before next API call...');
    await delay(2000);
    
    const btcPriceData = await fetchBTCPriceData();
    
    // Verify data alignment
    console.log('\n📋 Data Summary:');
    console.log(`Fear & Greed records: ${fearGreedData.length}`);
    console.log(`BTC price records: ${btcPriceData.length}`);
    console.log(`Date range: ${fearGreedData[0]?.dateString} to ${fearGreedData[fearGreedData.length - 1]?.dateString}`);
    
    // Check for data gaps
    const fearGreedDates = new Set(fearGreedData.map(d => d.dateString));
    const btcPriceDates = new Set(btcPriceData.map(d => d.dateString));
    
    console.log(`\n🔍 Data Quality Check:`);
    console.log(`Unique Fear & Greed dates: ${fearGreedDates.size}`);
    console.log(`Unique BTC price dates: ${btcPriceDates.size}`);
    
    console.log('\n✅ Historical data fetch completed successfully!');
    console.log('📊 Ready to run DCA strategy tests');
    
  } catch (error) {
    console.error('\n❌ Failed to fetch historical data:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  fetchFearGreedData,
  fetchBTCPriceData,
  getDateRange
};