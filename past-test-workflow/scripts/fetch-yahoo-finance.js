// Yahoo Finance Historical Data Fetcher
// Yahoo Finance often has longer historical data available

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          console.log('Response data:', data.substring(0, 200) + '...');
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

async function fetchYahooFinanceData(symbol, years = 3) {
  console.log(`📈 Fetching ${years} years of ${symbol} data from Yahoo Finance...`);
  
  try {
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (years * 365 * 24 * 60 * 60);
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`;
    console.log(`Fetching from: ${url}`);
    
    const data = await httpGet(url);
    
    if (!data?.chart?.result?.[0]?.timestamp) {
      throw new Error('Invalid Yahoo Finance response format');
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0];
    
    if (!prices.close) {
      throw new Error('No price data found in response');
    }
    
    const formattedData = timestamps.map((timestamp, index) => {
      const date = new Date(timestamp * 1000);
      return {
        date: timestamp,
        dateString: date.toISOString().split('T')[0],
        price: parseFloat(prices.close[index]?.toFixed(2) || 0),
        high: parseFloat(prices.high[index]?.toFixed(2) || 0),
        low: parseFloat(prices.low[index]?.toFixed(2) || 0),
        open: parseFloat(prices.open[index]?.toFixed(2) || 0),
        volume: parseInt(prices.volume[index] || 0)
      };
    }).filter(item => item.price > 0);
    
    // Calculate 20-day moving average
    const dataWithMA = formattedData.map((item, index) => {
      if (index < 19) {
        item.ma20 = item.price;
      } else {
        const last20Prices = formattedData
          .slice(index - 19, index + 1)
          .map(d => d.price);
        item.ma20 = parseFloat((last20Prices.reduce((sum, p) => sum + p, 0) / 20).toFixed(2));
      }
      return item;
    });
    
    console.log(`✅ Successfully fetched ${dataWithMA.length} records`);
    console.log(`📅 Date range: ${dataWithMA[0]?.dateString} to ${dataWithMA[dataWithMA.length - 1]?.dateString}`);
    
    return dataWithMA;
    
  } catch (error) {
    console.error(`❌ Yahoo Finance fetch failed: ${error.message}`);
    throw error;
  }
}

async function fetchMultipleYahooAttempts() {
  const symbols = ['BTC-EUR', 'BTC-USD']; // Try both EUR and USD
  const years = [3, 2, 1]; // Try different time periods
  
  for (const yearRange of years) {
    for (const symbol of symbols) {
      try {
        console.log(`\\n🔄 Attempting ${symbol} for ${yearRange} years...`);
        const data = await fetchYahooFinanceData(symbol, yearRange);
        
        if (data && data.length > 300) { // At least ~1 year of data
          console.log(`✅ Success with ${symbol} (${yearRange} years): ${data.length} records`);
          
          // Convert USD to EUR if needed (approximate)
          if (symbol === 'BTC-USD') {
            console.log('ℹ️ Converting USD prices to EUR (using approximate 1.1 USD/EUR rate)');
            data.forEach(item => {
              item.price = parseFloat((item.price / 1.1).toFixed(2));
              item.high = parseFloat((item.high / 1.1).toFixed(2));
              item.low = parseFloat((item.low / 1.1).toFixed(2));
              item.open = parseFloat((item.open / 1.1).toFixed(2));
              item.ma20 = parseFloat((item.ma20 / 1.1).toFixed(2));
            });
          }
          
          return { data, symbol, years: yearRange };
        }
        
        await delay(2000); // Rate limiting
        
      } catch (error) {
        console.log(`⚠️ Failed ${symbol} (${yearRange} years): ${error.message}`);
        await delay(2000);
      }
    }
  }
  
  throw new Error('All Yahoo Finance attempts failed');
}

async function main() {
  console.log('🚀 Attempting to fetch extended BTC data from Yahoo Finance...');
  
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    const result = await fetchMultipleYahooAttempts();
    
    if (result) {
      // Save the data
      const filePath = path.join(DATA_DIR, 'btc-prices-yahoo-extended.json');
      fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2));
      
      console.log(`\\n✅ Successfully saved ${result.data.length} BTC price records!`);
      console.log(`💾 Saved to: ${filePath}`);
      console.log(`📊 Source: ${result.symbol} (${result.years} years)`);
      console.log(`📅 Coverage: ${result.data[0]?.dateString} to ${result.data[result.data.length - 1]?.dateString}`);
      
      // Now check if we can run extended tests
      const fearGreedPath = path.join(DATA_DIR, 'fear-greed-index-extended.json');
      if (fs.existsSync(fearGreedPath)) {
        console.log('\\n🎉 Both extended datasets are now available!');
        console.log('🧪 You can now run comprehensive multi-year testing');
        console.log('\\n📋 Next steps:');
        console.log('1. Modify test scripts to use *-extended.json files');
        console.log('2. Run logical-dca-test.js with extended data');
        console.log('3. Run simple-dca-test.js with extended data');
        console.log('4. Compare results across different market conditions');
      }
      
      return result.data;
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch extended data from Yahoo Finance:', error.message);
    console.log('\\n💡 Alternative approaches:');
    console.log('1. Use Kaggle datasets (most comprehensive)');
    console.log('2. Try different financial data APIs');
    console.log('3. Use the current 349-day dataset with caveats');
    
    return null;
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchYahooFinanceData, fetchMultipleYahooAttempts };