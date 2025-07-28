// Extended Historical Testing - Multi-Year Analysis
// Uses extended datasets to test across different market cycles

const fs = require('fs');
const path = require('path');

// Import our existing test functions
const { runLogicalDCATest } = require('./logical-dca-test.js');
const { runSimpleDCATest } = require('./simple-dca-test.js');
const { compareStrategies } = require('./compare-results.js');

const DATA_DIR = path.join(__dirname, '../data');
const RESULTS_DIR = path.join(__dirname, '../results');

function checkExtendedDataAvailability() {
  const extendedFearGreedPath = path.join(DATA_DIR, 'fear-greed-index-extended.json');
  const extendedBtcPath = path.join(DATA_DIR, 'btc-prices-extended.json');
  
  const fearGreedExists = fs.existsSync(extendedFearGreedPath);
  const btcExists = fs.existsSync(extendedBtcPath);
  
  let fearGreedData = null;
  let btcData = null;
  
  if (fearGreedExists) {
    fearGreedData = JSON.parse(fs.readFileSync(extendedFearGreedPath, 'utf8'));
  }
  
  if (btcExists) {
    btcData = JSON.parse(fs.readFileSync(extendedBtcPath, 'utf8'));
  }
  
  return {
    fearGreedExists,
    btcExists,
    fearGreedRecords: fearGreedData?.length || 0,
    btcRecords: btcData?.length || 0,
    fearGreedRange: fearGreedData ? {
      start: fearGreedData[0]?.dateString,
      end: fearGreedData[fearGreedData.length - 1]?.dateString
    } : null,
    btcRange: btcData ? {
      start: btcData[0]?.dateString,
      end: btcData[btcData.length - 1]?.dateString
    } : null
  };
}

function analyzeMarketCycles(fearGreedData, btcData) {
  console.log('\n📊 Analyzing Market Cycles in Extended Dataset...');
  
  // Create a combined dataset for analysis
  const fearGreedMap = new Map();
  fearGreedData.forEach(item => {
    fearGreedMap.set(item.dateString, item.value);
  });
  
  const btcMap = new Map();
  btcData.forEach(item => {
    btcMap.set(item.dateString, item.price);
  });
  
  // Find overlapping dates
  const commonDates = btcData
    .filter(btc => fearGreedMap.has(btc.dateString))
    .map(btc => ({
      date: btc.dateString,
      btcPrice: btc.price,
      fearGreed: fearGreedMap.get(btc.dateString)
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (commonDates.length === 0) {
    console.log('❌ No overlapping dates found between BTC and Fear & Greed data');
    return null;
  }
  
  console.log(`✅ Found ${commonDates.length} days of overlapping data`);
  console.log(`📅 Coverage: ${commonDates[0].date} to ${commonDates[commonDates.length - 1].date}`);
  
  // Identify different market phases
  const phases = identifyMarketPhases(commonDates);
  
  console.log('\\n🔄 Market Cycle Analysis:');
  phases.forEach((phase, index) => {
    console.log(`${index + 1}. ${phase.type} (${phase.start} to ${phase.end})`);
    console.log(`   Duration: ${phase.days} days`);
    console.log(`   BTC: ${phase.startPrice.toFixed(0)}€ → ${phase.endPrice.toFixed(0)}€ (${phase.priceChange > 0 ? '+' : ''}${phase.priceChange.toFixed(1)}%)`);
    console.log(`   Avg Fear/Greed: ${phase.avgFearGreed.toFixed(0)} (${getFearGreedLabel(phase.avgFearGreed)})`);
  });
  
  return { commonDates, phases };
}

function identifyMarketPhases(data) {
  const phases = [];
  let currentPhase = null;
  
  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const lookBack = 30; // 30-day periods
    
    if (i < lookBack) continue;
    
    // Calculate 30-day price change
    const priceChange = ((current.btcPrice - data[i - lookBack].btcPrice) / data[i - lookBack].btcPrice) * 100;
    
    let phaseType;
    if (priceChange > 20) phaseType = 'Bull Market';
    else if (priceChange < -20) phaseType = 'Bear Market';
    else phaseType = 'Sideways Market';
    
    if (!currentPhase || currentPhase.type !== phaseType) {
      // Start new phase
      if (currentPhase) {
        phases.push(currentPhase);
      }
      
      currentPhase = {
        type: phaseType,
        start: current.date,
        startPrice: current.btcPrice,
        startIndex: i,
        fearGreedValues: [current.fearGreed],
        days: 1
      };
    } else {
      // Continue current phase
      currentPhase.fearGreedValues.push(current.fearGreed);
      currentPhase.days++;
    }
    
    // Update end data
    currentPhase.end = current.date;
    currentPhase.endPrice = current.btcPrice;
    currentPhase.priceChange = ((current.btcPrice - currentPhase.startPrice) / currentPhase.startPrice) * 100;
    currentPhase.avgFearGreed = currentPhase.fearGreedValues.reduce((sum, val) => sum + val, 0) / currentPhase.fearGreedValues.length;
  }
  
  if (currentPhase) {
    phases.push(currentPhase);
  }
  
  return phases;
}

function getFearGreedLabel(value) {
  if (value <= 20) return 'Extreme Fear';
  if (value <= 30) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 70) return 'Greed';
  if (value <= 80) return 'High Greed';
  return 'Extreme Greed';
}

function suggestTestPeriods(phases) {
  console.log('\\n💡 Suggested Test Periods for Comprehensive Analysis:');
  console.log('=' .repeat(60));
  
  const suggestions = [];
  
  // Find good bull market period
  const bullMarkets = phases.filter(p => p.type === 'Bull Market' && p.days >= 90);
  if (bullMarkets.length > 0) {
    const longestBull = bullMarkets.reduce((max, current) => current.days > max.days ? current : max);
    suggestions.push({
      name: 'Bull Market Test',
      period: longestBull,
      reason: 'Test how strategies perform in strong uptrends'
    });
  }
  
  // Find good bear market period
  const bearMarkets = phases.filter(p => p.type === 'Bear Market' && p.days >= 90);
  if (bearMarkets.length > 0) {
    const longestBear = bearMarkets.reduce((max, current) => current.days > max.days ? current : max);
    suggestions.push({
      name: 'Bear Market Test',
      period: longestBear,
      reason: 'Test risk management and capital preservation'
    });
  }
  
  // Find sideways market
  const sidewaysMarkets = phases.filter(p => p.type === 'Sideways Market' && p.days >= 90);
  if (sidewaysMarkets.length > 0) {
    const longestSideways = sidewaysMarkets.reduce((max, current) => current.days > max.days ? current : max);
    suggestions.push({
      name: 'Sideways Market Test',
      period: longestSideways,
      reason: 'Test strategy effectiveness in ranging conditions'
    });
  }
  
  suggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.name}:`);
    console.log(`   Period: ${suggestion.period.start} to ${suggestion.period.end} (${suggestion.period.days} days)`);
    console.log(`   BTC Performance: ${suggestion.period.priceChange > 0 ? '+' : ''}${suggestion.period.priceChange.toFixed(1)}%`);
    console.log(`   Avg Sentiment: ${getFearGreedLabel(suggestion.period.avgFearGreed)}`);
    console.log(`   Why: ${suggestion.reason}`);
    console.log('');
  });
  
  return suggestions;
}

function provideKaggleDataInstructions() {
  console.log('\\n📚 RECOMMENDED: Use Kaggle for Complete Historical Analysis');
  console.log('=' .repeat(70));
  console.log('');
  console.log('To get the most comprehensive historical testing (5+ years), follow these steps:');
  console.log('');
  console.log('1. 📥 Download Bitcoin Historical Data from Kaggle:');
  console.log('   https://www.kaggle.com/datasets/mczielinski/bitcoin-historical-data');
  console.log('   - Contains daily OHLC data from 2012 to present');
  console.log('   - Free CSV download (requires Kaggle account)');
  console.log('');
  console.log('2. 📥 Download Fear & Greed Historical Data:');
  console.log('   https://www.kaggle.com/datasets/adilbhatti/bitcoin-and-fear-and-greed');
  console.log('   - Combined Bitcoin price and Fear & Greed data');
  console.log('   - Covers multiple market cycles');
  console.log('');
  console.log('3. 🔧 Convert and Use the Data:');
  console.log('   - Place CSV files in the data/ directory');
  console.log('   - Run: node convert-kaggle-data.js (script to be created)');
  console.log('   - Use converted JSON data for extended testing');
  console.log('');
  console.log('4. 🧪 Run Multi-Cycle Tests:');
  console.log('   - Test across 2018 crypto winter (bear market)');
  console.log('   - Test across 2020-2021 bull run');
  console.log('   - Test across 2022 bear market');
  console.log('   - Test across 2023-2024 recovery');
  console.log('');
  console.log('This approach will give you definitive answers about strategy effectiveness!');
  console.log('=' .repeat(70));
}

async function runExtendedAnalysis() {
  console.log('🔍 Starting Extended Historical Analysis...');
  
  const dataStatus = checkExtendedDataAvailability();
  
  console.log('\\n📊 Extended Data Status:');
  console.log(`Fear & Greed: ${dataStatus.fearGreedExists ? '✅' : '❌'} (${dataStatus.fearGreedRecords} records)`);
  console.log(`BTC Prices: ${dataStatus.btcExists ? '✅' : '❌'} (${dataStatus.btcRecords} records)`);
  
  if (dataStatus.fearGreedExists) {
    console.log(`Fear & Greed Range: ${dataStatus.fearGreedRange.start} to ${dataStatus.fearGreedRange.end}`);
  }
  
  if (dataStatus.btcExists) {
    console.log(`BTC Price Range: ${dataStatus.btcRange.start} to ${dataStatus.btcRange.end}`);
  }
  
  // If we have both datasets with good coverage, run analysis
  if (dataStatus.fearGreedExists && dataStatus.btcExists && dataStatus.btcRecords > 365) {
    console.log('\\n✅ Sufficient data available for extended analysis!');
    
    // Load the data
    const fearGreedData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'fear-greed-index-extended.json'), 'utf8'));
    const btcData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'btc-prices-extended.json'), 'utf8'));
    
    // Analyze market cycles
    const analysis = analyzeMarketCycles(fearGreedData, btcData);
    
    if (analysis) {
      // Suggest optimal test periods
      const suggestions = suggestTestPeriods(analysis.phases);
      
      console.log('\\n🎯 Ready to run extended tests with current data!');
      console.log('Note: Current data is still limited by API restrictions.');
    }
  } else {
    console.log('\\n⚠️ Insufficient BTC price data for comprehensive multi-year analysis');
    console.log(`Current coverage: ${dataStatus.btcRecords} days (need 1000+ for multi-cycle testing)`);
  }
  
  // Always provide Kaggle instructions for best results
  provideKaggleDataInstructions();
  
  return dataStatus;
}

// Create a Kaggle CSV converter script
function createKaggleConverter() {
  const converterScript = `// Kaggle CSV to JSON Converter
// Converts Kaggle Bitcoin and Fear & Greed CSV data to our JSON format

const fs = require('fs');
const path = require('path');

function convertKaggleBitcoinData() {
  console.log('🔄 Converting Kaggle Bitcoin CSV to JSON...');
  
  // Instructions for manual conversion
  console.log('');
  console.log('Place your Kaggle CSV files in the data/ directory:');
  console.log('- btc-historical-data.csv (from Bitcoin Historical Data dataset)');
  console.log('- fear-greed-data.csv (from Bitcoin & Fear Greed dataset)');
  console.log('');
  console.log('Then modify this script to parse your specific CSV format.');
  console.log('CSV parsing implementation needed based on downloaded data structure.');
}

if (require.main === module) {
  convertKaggleBitcoinData();
}`;

  fs.writeFileSync(path.join(__dirname, 'convert-kaggle-data.js'), converterScript);
  console.log('📝 Created convert-kaggle-data.js for manual CSV conversion');
}

// Main execution
if (require.main === module) {
  runExtendedAnalysis();
  createKaggleConverter();
}

module.exports = {
  runExtendedAnalysis,
  checkExtendedDataAvailability,
  analyzeMarketCycles
};