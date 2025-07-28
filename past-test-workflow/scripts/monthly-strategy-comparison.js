// Monthly Strategy Comparison Analysis
// Detailed monthly comparison between Simple DCA and Optimized Logical DCA strategies

const fs = require('fs');
const path = require('path');
const { getAllSupportedTokens, getCryptoConfig } = require('./crypto-config');

const RESULTS_DIR = path.join(__dirname, '../results');

function loadStrategyResults() {
  const supportedTokens = getAllSupportedTokens();
  const results = {};
  
  console.log('📊 Loading strategy results for monthly analysis...');
  
  supportedTokens.forEach(token => {
    try {
      const cryptoConfig = getCryptoConfig(token);
      
      // 4-year results
      const simpleResultsPath4Y = path.join(RESULTS_DIR, `simple-dca-results-${cryptoConfig.resultsPrefix}-4year.json`);
      const optimizedResultsPath4Y = path.join(RESULTS_DIR, `optimized-logical-dca-results-${cryptoConfig.resultsPrefix}-4year.json`);
      
      // Bear market results  
      const simpleResultsPathBear = path.join(RESULTS_DIR, `simple-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`);
      const optimizedResultsPathBear = path.join(RESULTS_DIR, `optimized-logical-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`);
      
      const has4YearResults = fs.existsSync(simpleResultsPath4Y) && fs.existsSync(optimizedResultsPath4Y);
      const hasBearResults = fs.existsSync(simpleResultsPathBear) && fs.existsSync(optimizedResultsPathBear);
      
      if (has4YearResults && hasBearResults) {
        results[token] = {
          fourYear: {
            simple: JSON.parse(fs.readFileSync(simpleResultsPath4Y, 'utf8')),
            optimized: JSON.parse(fs.readFileSync(optimizedResultsPath4Y, 'utf8'))
          },
          bearMarket: {
            simple: JSON.parse(fs.readFileSync(simpleResultsPathBear, 'utf8')),
            optimized: JSON.parse(fs.readFileSync(optimizedResultsPathBear, 'utf8'))
          },
          config: cryptoConfig
        };
        console.log(`✅ Loaded ${token} monthly comparison data`);
      } else {
        console.log(`⚠️ Missing complete results for ${token}`);
      }
    } catch (error) {
      console.log(`❌ Error loading ${token} results:`, error.message);
    }
  });
  
  return results;
}

function aggregateMonthlyData(dailyResults, strategy) {
  const monthlyData = {};
  
  dailyResults.forEach(dayResult => {
    const date = new Date(dayResult.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        startDate: dayResult.date,
        endDate: dayResult.date,
        startValue: dayResult.totalValue,
        endValue: dayResult.totalValue,
        startTokenPrice: dayResult.tokenPrice,
        endTokenPrice: dayResult.tokenPrice,
        startInvested: dayResult.totalInvested,
        endInvested: dayResult.totalInvested,
        startTokenAllocation: dayResult.tokenAllocation || 100,
        endTokenAllocation: dayResult.tokenAllocation || 100,
        days: 0,
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        totalInvestment: 0,
        fearGreedAvg: 0,
        fearGreedCount: 0,
        strategy: strategy,
        bullMarketDays: 0,
        bearMarketDays: 0,
        neutralDays: 0
      };
    }
    
    const monthData = monthlyData[monthKey];
    monthData.endDate = dayResult.date;
    monthData.endValue = dayResult.totalValue;
    monthData.endTokenPrice = dayResult.tokenPrice;
    monthData.endInvested = dayResult.totalInvested;
    monthData.endTokenAllocation = dayResult.tokenAllocation || 100;
    monthData.days++;
    
    // Count trades
    if (dayResult.action === 'BUY') monthData.buyTrades++;
    if (dayResult.action === 'SELL') monthData.sellTrades++;
    if (dayResult.action !== 'HOLD') monthData.totalTrades++;
    
    // Investment tracking
    const investmentIncrease = dayResult.totalInvested - (monthData.startInvested || 0);
    if (investmentIncrease > 0) {
      monthData.totalInvestment += investmentIncrease;
      monthData.startInvested = dayResult.totalInvested;
    }
    
    // Fear & Greed tracking
    if (dayResult.fearGreedIndex !== undefined) {
      monthData.fearGreedAvg = ((monthData.fearGreedAvg * monthData.fearGreedCount) + dayResult.fearGreedIndex) / (monthData.fearGreedCount + 1);
      monthData.fearGreedCount++;
    }
    
    // Market regime tracking (for optimized strategy)
    if (dayResult.marketRegime) {
      if (dayResult.marketRegime === 'BULL_MARKET') monthData.bullMarketDays++;
      else if (dayResult.marketRegime === 'BEAR_MARKET') monthData.bearMarketDays++;
      else monthData.neutralDays++;
    }
  });
  
  // Calculate monthly metrics
  Object.values(monthlyData).forEach(month => {
    month.monthlyReturn = month.startValue > 0 ? 
      ((month.endValue - month.startValue) / month.startValue) * 100 : 0;
    month.monthlyInvestmentReturn = month.startInvested > 0 ? 
      ((month.endValue - month.endInvested) / month.endInvested) * 100 : 0;
    month.tokenPriceChange = month.startTokenPrice > 0 ? 
      ((month.endTokenPrice - month.startTokenPrice) / month.startTokenPrice) * 100 : 0;
    month.allocationChange = month.endTokenAllocation - month.startTokenAllocation;
    month.fearGreedClassification = getFearGreedClassification(Math.round(month.fearGreedAvg));
  });
  
  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

function getFearGreedClassification(value) {
  if (value <= 20) return 'Extreme Fear';
  if (value <= 30) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 70) return 'Greed';
  if (value <= 80) return 'High Greed';
  return 'Extreme Greed';
}

function createMonthlyComparison() {
  console.log('🚀 Creating Monthly Strategy Comparison Analysis...\n');
  
  const allResults = loadStrategyResults();
  const tokens = Object.keys(allResults);
  
  if (tokens.length === 0) {
    throw new Error('No complete results found. Please run all tests first.');
  }
  
  console.log(`📊 Analyzing ${tokens.length} cryptocurrencies: ${tokens.join(', ')}`);
  
  const monthlyComparisons = {};
  
  tokens.forEach(token => {
    const tokenResults = allResults[token];
    const config = tokenResults.config;
    
    console.log(`\n📈 Processing monthly data for ${config.displayName}...`);
    
    monthlyComparisons[token] = {
      config: config,
      fourYear: {
        simple: aggregateMonthlyData(tokenResults.fourYear.simple.dailyResults, 'Simple DCA'),
        optimized: aggregateMonthlyData(tokenResults.fourYear.optimized.dailyResults, 'Optimized Logical DCA')
      },
      bearMarket: {
        simple: aggregateMonthlyData(tokenResults.bearMarket.simple.dailyResults, 'Simple DCA'),
        optimized: aggregateMonthlyData(tokenResults.bearMarket.optimized.dailyResults, 'Optimized Logical DCA')
      }
    };
  });
  
  // Generate comprehensive monthly comparison report
  const monthlyReport = {
    title: 'Monthly Strategy Performance Comparison',
    subtitle: 'Simple DCA vs Optimized Logical DCA - Monthly Granular Analysis',
    analysisDate: new Date().toISOString().split('T')[0],
    periods: {
      fourYear: '2021-2025 (Bull Market Dominant)',
      bearMarket: '2021-2023 (Crypto Winter + Recovery)'
    },
    tokensAnalyzed: tokens,
    monthlyData: monthlyComparisons,
    
    // Cross-token monthly insights
    insights: generateMonthlyInsights(monthlyComparisons, tokens)
  };
  
  // Save detailed report
  const reportPath = path.join(RESULTS_DIR, 'monthly-strategy-comparison.json');
  fs.writeFileSync(reportPath, JSON.stringify(monthlyReport, null, 2));
  
  // Generate and save readable monthly reports
  generateReadableMonthlyReports(monthlyComparisons, tokens);
  
  console.log(`\n💾 Monthly comparison saved to: ${reportPath}`);
  
  return monthlyReport;
}

function generateMonthlyInsights(monthlyComparisons, tokens) {
  const insights = {
    fourYear: {
      overallTrends: {},
      bestMonths: {},
      worstMonths: {},
      strategyEffectiveness: {}
    },
    bearMarket: {
      overallTrends: {},
      bestMonths: {},
      worstMonths: {},
      strategyEffectiveness: {}
    }
  };
  
  ['fourYear', 'bearMarket'].forEach(period => {
    const periodInsights = insights[period];
    
    // Analyze each token's monthly performance
    tokens.forEach(token => {
      const tokenData = monthlyComparisons[token][period];
      
      // Find best and worst months for each strategy
      const simpleBestMonth = tokenData.simple.reduce((best, month) => 
        month.monthlyReturn > best.monthlyReturn ? month : best);
      const simpleWorstMonth = tokenData.simple.reduce((worst, month) => 
        month.monthlyReturn < worst.monthlyReturn ? month : worst);
        
      const optimizedBestMonth = tokenData.optimized.reduce((best, month) => 
        month.monthlyReturn > best.monthlyReturn ? month : best);
      const optimizedWorstMonth = tokenData.optimized.reduce((worst, month) => 
        month.monthlyReturn < worst.monthlyReturn ? month : worst);
      
      periodInsights.bestMonths[token] = {
        simple: simpleBestMonth,
        optimized: optimizedBestMonth
      };
      
      periodInsights.worstMonths[token] = {
        simple: simpleWorstMonth,
        optimized: optimizedWorstMonth
      };
      
      // Calculate monthly win rate
      let optimizedWins = 0;
      let totalMonths = Math.min(tokenData.simple.length, tokenData.optimized.length);
      
      for (let i = 0; i < totalMonths; i++) {
        if (tokenData.optimized[i].monthlyReturn > tokenData.simple[i].monthlyReturn) {
          optimizedWins++;
        }
      }
      
      periodInsights.strategyEffectiveness[token] = {
        optimizedWinRate: (optimizedWins / totalMonths) * 100,
        totalMonthsCompared: totalMonths,
        optimizedWins: optimizedWins,
        simpleWins: totalMonths - optimizedWins
      };
    });
  });
  
  return insights;
}

function generateReadableMonthlyReports(monthlyComparisons, tokens) {
  tokens.forEach(token => {
    const tokenData = monthlyComparisons[token];
    const config = tokenData.config;
    
    // Generate 4-year monthly report
    let report4Y = `# ${config.displayName} (${token}) - Monthly Performance Analysis (2021-2025)\n\n`;
    report4Y += `## Strategy Comparison: Simple DCA vs Optimized Logical DCA\n\n`;
    report4Y += `| Month | Simple DCA Return | Optimized DCA Return | Difference | Token Price Change | Avg Fear/Greed | Winner |\n`;
    report4Y += `|-------|-------------------|---------------------|------------|-------------------|---------------|--------|\n`;
    
    const maxMonths = Math.max(tokenData.fourYear.simple.length, tokenData.fourYear.optimized.length);
    for (let i = 0; i < maxMonths; i++) {
      const simpleMonth = tokenData.fourYear.simple[i];
      const optimizedMonth = tokenData.fourYear.optimized[i];
      
      if (simpleMonth && optimizedMonth) {
        const difference = optimizedMonth.monthlyReturn - simpleMonth.monthlyReturn;
        const winner = difference > 0 ? '🚀 Optimized' : difference < 0 ? '📈 Simple' : '🤝 Tie';
        
        report4Y += `| ${simpleMonth.month} | ${simpleMonth.monthlyReturn.toFixed(1)}% | ${optimizedMonth.monthlyReturn.toFixed(1)}% | ${difference > 0 ? '+' : ''}${difference.toFixed(1)}% | ${optimizedMonth.tokenPriceChange.toFixed(1)}% | ${Math.round(optimizedMonth.fearGreedAvg)} (${optimizedMonth.fearGreedClassification}) | ${winner} |\n`;
      }
    }
    
    // Add summary statistics
    const simpleTotal4Y = tokenData.fourYear.simple[tokenData.fourYear.simple.length - 1];
    const optimizedTotal4Y = tokenData.fourYear.optimized[tokenData.fourYear.optimized.length - 1];
    
    report4Y += `\n## 4-Year Summary\n\n`;
    report4Y += `**Simple DCA Final Value:** €${simpleTotal4Y.endValue.toFixed(0)}\n`;
    report4Y += `**Optimized DCA Final Value:** €${optimizedTotal4Y.endValue.toFixed(0)}\n`;
    report4Y += `**Difference:** €${(optimizedTotal4Y.endValue - simpleTotal4Y.endValue).toFixed(0)} (${(((optimizedTotal4Y.endValue - simpleTotal4Y.endValue) / simpleTotal4Y.endValue) * 100).toFixed(1)}%)\n\n`;
    
    // Generate bear market monthly report
    let reportBear = `# ${config.displayName} (${token}) - Monthly Performance Analysis (Bear Market 2021-2023)\n\n`;
    reportBear += `## Strategy Comparison: Simple DCA vs Optimized Logical DCA\n\n`;
    reportBear += `| Month | Simple DCA Return | Optimized DCA Return | Difference | Token Price Change | Avg Fear/Greed | Winner |\n`;
    reportBear += `|-------|-------------------|---------------------|------------|-------------------|---------------|--------|\n`;
    
    const maxMonthsBear = Math.max(tokenData.bearMarket.simple.length, tokenData.bearMarket.optimized.length);
    for (let i = 0; i < maxMonthsBear; i++) {
      const simpleMonth = tokenData.bearMarket.simple[i];
      const optimizedMonth = tokenData.bearMarket.optimized[i];
      
      if (simpleMonth && optimizedMonth) {
        const difference = optimizedMonth.monthlyReturn - simpleMonth.monthlyReturn;
        const winner = difference > 0 ? '🚀 Optimized' : difference < 0 ? '📈 Simple' : '🤝 Tie';
        
        reportBear += `| ${simpleMonth.month} | ${simpleMonth.monthlyReturn.toFixed(1)}% | ${optimizedMonth.monthlyReturn.toFixed(1)}% | ${difference > 0 ? '+' : ''}${difference.toFixed(1)}% | ${optimizedMonth.tokenPriceChange.toFixed(1)}% | ${Math.round(optimizedMonth.fearGreedAvg)} (${optimizedMonth.fearGreedClassification}) | ${winner} |\n`;
      }
    }
    
    // Add bear market summary
    const simpleTotalBear = tokenData.bearMarket.simple[tokenData.bearMarket.simple.length - 1];
    const optimizedTotalBear = tokenData.bearMarket.optimized[tokenData.bearMarket.optimized.length - 1];
    
    reportBear += `\n## Bear Market Summary\n\n`;
    reportBear += `**Simple DCA Final Value:** €${simpleTotalBear.endValue.toFixed(0)}\n`;
    reportBear += `**Optimized DCA Final Value:** €${optimizedTotalBear.endValue.toFixed(0)}\n`;
    reportBear += `**Difference:** €${(optimizedTotalBear.endValue - simpleTotalBear.endValue).toFixed(0)} (${(((optimizedTotalBear.endValue - simpleTotalBear.endValue) / simpleTotalBear.endValue) * 100).toFixed(1)}%)\n\n`;
    
    // Save individual token reports
    fs.writeFileSync(path.join(RESULTS_DIR, `monthly-analysis-${config.resultsPrefix}-4year.md`), report4Y);
    fs.writeFileSync(path.join(RESULTS_DIR, `monthly-analysis-${config.resultsPrefix}-bear-market.md`), reportBear);
    
    console.log(`📝 Generated monthly reports for ${config.displayName}`);
  });
}

// CLI execution
if (require.main === module) {
  try {
    createMonthlyComparison();
  } catch (error) {
    console.error('💥 Error creating monthly comparison:', error.message);
    process.exit(1);
  }
}

module.exports = { createMonthlyComparison };