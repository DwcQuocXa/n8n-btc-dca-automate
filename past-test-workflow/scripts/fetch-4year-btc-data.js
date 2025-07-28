// Fetch 4-Year BTC Historical Data (July 2021 - July 2025)
// Extends existing data to cover full 4-year period

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

function calculateMA20(prices, index) {
  const start = Math.max(0, index - 19);
  const slice = prices.slice(start, index + 1);
  const sum = slice.reduce((acc, item) => acc + item.price, 0);
  return sum / slice.length;
}

async function fetch4YearBTCData() {
  console.log('📊 Fetching 4-Year BTC Historical Data (July 2021 - July 2025)...');
  
  // Calculate dates for 4 years
  const endDate = Math.floor(new Date('2025-07-27').getTime() / 1000);
  const startDate = Math.floor(new Date('2021-07-27').getTime() / 1000); // 4 years back
  
  console.log(`📅 Date range: ${new Date(startDate * 1000).toISOString().split('T')[0]} to ${new Date(endDate * 1000).toISOString().split('T')[0]}`);
  
  const symbol = 'BTC-EUR';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`;
  
  try {
    console.log('🌐 Fetching data from Yahoo Finance...');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error('Invalid response structure from Yahoo Finance');
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    if (!timestamps || !quotes) {
      throw new Error('Missing timestamp or quote data');
    }
    
    console.log(`📈 Processing ${timestamps.length} data points...`);
    
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
        price: Math.round(quotes.close[i] * 100) / 100,
        high: Math.round(quotes.high[i] * 100) / 100,
        low: Math.round(quotes.low[i] * 100) / 100,
        open: Math.round(quotes.open[i] * 100) / 100,
        volume: quotes.volume[i] || 0,
        ma20: 0 // Will be calculated after
      });
    }
    
    // Calculate 20-day moving averages
    console.log('📊 Calculating 20-day moving averages...');
    for (let i = 0; i < processedData.length; i++) {
      processedData[i].ma20 = Math.round(calculateMA20(processedData, i) * 100) / 100;
    }
    
    // Ensure directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Save to file
    const filename = 'btc-prices-4year.json';
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(processedData, null, 2));
    
    console.log(`✅ Successfully saved ${processedData.length} BTC price records`);
    console.log(`📅 Date range: ${processedData[0].dateString} to ${processedData[processedData.length - 1].dateString}`);
    console.log(`📁 Saved to: ${filepath}`);
    
    // Calculate total days
    const totalDays = processedData.length;
    const totalYears = Math.round((totalDays / 365) * 10) / 10;
    
    console.log(`⏱️ Total period: ${totalDays} days (${totalYears} years)`);
    
    return {
      success: true,
      records: processedData.length,
      startDate: processedData[0].dateString,
      endDate: processedData[processedData.length - 1].dateString,
      totalDays: totalDays,
      totalYears: totalYears
    };
    
  } catch (error) {
    console.error('❌ Error fetching BTC data:', error.message);
    throw error;
  }
}

// Run the fetch
if (require.main === module) {
  fetch4YearBTCData()
    .then(result => {
      console.log('\\n🎉 4-Year BTC data fetch completed successfully!');
      console.log(`📊 Ready for 4-year backtesting: ${result.startDate} to ${result.endDate}`);
    })
    .catch(error => {
      console.error('💥 Failed to fetch 4-year BTC data:', error);
      process.exit(1);
    });
}

module.exports = { fetch4YearBTCData };