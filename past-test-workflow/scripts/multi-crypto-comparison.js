// Multi-Cryptocurrency DCA Strategy Comparison Analysis (4 Years: 2021-2025)
// Compares Simple DCA vs Complete Logical DCA across BTC, ETH, SOL, BNB

const fs = require('fs');
const path = require('path');
const { getAllSupportedTokens, getCryptoConfig } = require('./crypto-config');

const RESULTS_DIR = path.join(__dirname, '../results');

function loadAllCryptoResults() {
  const supportedTokens = getAllSupportedTokens();
  const results = {};
  
  console.log('📊 Loading results for all cryptocurrencies...');
  
  supportedTokens.forEach(token => {
    try {
      const cryptoConfig = getCryptoConfig(token);
      const simpleResultsPath = path.join(RESULTS_DIR, `simple-dca-results-${cryptoConfig.resultsPrefix}-4year.json`);
      const logicalResultsPath = path.join(RESULTS_DIR, `complete-logical-dca-results-${cryptoConfig.resultsPrefix}-4year.json`);
      
      if (fs.existsSync(simpleResultsPath) && fs.existsSync(logicalResultsPath)) {
        results[token] = {
          simple: JSON.parse(fs.readFileSync(simpleResultsPath, 'utf8')),
          logical: JSON.parse(fs.readFileSync(logicalResultsPath, 'utf8')),
          config: cryptoConfig
        };
        console.log(`✅ Loaded ${token} results`);
      } else {
        console.log(`⚠️ Missing results for ${token}`);
      }
    } catch (error) {
      console.log(`❌ Error loading ${token} results:`, error.message);
    }
  });
  
  return results;
}

function calculateRiskMetrics(dailyResults) {
  // Calculate daily returns for volatility analysis
  function calculateDailyReturns(results) {
    const dailyReturns = [];
    for (let i = 1; i < results.length; i++) {
      const prevValue = results[i - 1].totalValue;
      const currentValue = results[i].totalValue;
      if (prevValue > 0) {
        const dailyReturn = (currentValue - prevValue) / prevValue;
        dailyReturns.push(dailyReturn);
      }
    }
    return dailyReturns;
  }
  
  // Calculate volatility (standard deviation of daily returns)
  function calculateVolatility(dailyReturns) {
    if (dailyReturns.length === 0) return 0;
    const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyReturns.length;
    return Math.sqrt(variance) * Math.sqrt(365); // Annualized
  }
  
  // Calculate maximum drawdown
  function calculateMaxDrawdown(results) {
    let maxDrawdown = 0;
    let peak = 0;
    
    for (const result of results) {
      if (result.totalValue > peak) {
        peak = result.totalValue;
      }
      const drawdown = (peak - result.totalValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    return maxDrawdown;
  }
  
  const dailyReturns = calculateDailyReturns(dailyResults);
  const volatility = calculateVolatility(dailyReturns);
  const maxDrawdown = calculateMaxDrawdown(dailyResults);
  
  return { volatility, maxDrawdown };
}

function createMultiCryptoComparison() {
  console.log('📈 Creating Multi-Cryptocurrency DCA Strategy Comparison...\n');
  
  const allResults = loadAllCryptoResults();
  const tokens = Object.keys(allResults);
  
  if (tokens.length === 0) {
    throw new Error('No cryptocurrency results found. Please run the individual tests first.');
  }
  
  console.log(`📊 Analyzing ${tokens.length} cryptocurrencies: ${tokens.join(', ')}`);
  
  // Process each cryptocurrency
  const processedResults = {};
  
  tokens.forEach(token => {
    const { simple, logical } = allResults[token];
    
    // Calculate risk metrics
    const simpleRisk = calculateRiskMetrics(simple.dailyResults);
    const logicalRisk = calculateRiskMetrics(logical.dailyResults);
    
    // Calculate Sharpe ratios (simplified)
    const simpleGainPerYear = simple.finalPortfolio.cagr / 100;
    const logicalGainPerYear = logical.finalPortfolio.cagr / 100;
    const simpleSharpe = simpleRisk.volatility > 0 ? simpleGainPerYear / simpleRisk.volatility : 0;
    const logicalSharpe = logicalRisk.volatility > 0 ? logicalGainPerYear / logicalRisk.volatility : 0;
    
    processedResults[token] = {
      simple: {
        ...simple.finalPortfolio,
        volatility: simpleRisk.volatility,
        maxDrawdown: simpleRisk.maxDrawdown,
        sharpeRatio: simpleSharpe,
        trades: simple.tradeStats.totalTrades
      },
      logical: {
        ...logical.finalPortfolio,
        volatility: logicalRisk.volatility,
        maxDrawdown: logicalRisk.maxDrawdown,
        sharpeRatio: logicalSharpe,
        trades: logical.tradeStats.totalTrades,
        coreAllocation: logical.finalPortfolio.coreTokenAllocation,
        satelliteAllocation: logical.finalPortfolio.satelliteTokenAllocation
      },
      difference: {
        returnDifference: logical.finalPortfolio.totalReturn - simple.finalPortfolio.totalReturn,
        returnPercentDifference: logical.finalPortfolio.totalReturnPercent - simple.finalPortfolio.totalReturnPercent,
        cagrDifference: logical.finalPortfolio.cagr - simple.finalPortfolio.cagr
      }
    };
  });
  
  // Create comprehensive comparison report
  const comparisonReport = {
    title: 'Multi-Cryptocurrency DCA Strategy Comparison (4 Years: 2021-2025)',
    testPeriod: {
      start: '2021-07-27',
      end: '2025-07-25',
      totalYears: 2.9
    },
    tokensAnalyzed: tokens,
    
    // Performance Rankings
    rankings: {
      simpleStrategyCagr: tokens.sort((a, b) => processedResults[b].simple.cagr - processedResults[a].simple.cagr),
      logicalStrategyCagr: tokens.sort((a, b) => processedResults[b].logical.cagr - processedResults[a].logical.cagr),
      simpleStrategyReturns: tokens.sort((a, b) => processedResults[b].simple.totalReturn - processedResults[a].simple.totalReturn),
      logicalStrategyReturns: tokens.sort((a, b) => processedResults[b].logical.totalReturn - processedResults[a].logical.totalReturn),
      bestRiskAdjusted: tokens.sort((a, b) => processedResults[b].simple.sharpeRatio - processedResults[a].simple.sharpeRatio)
    },
    
    // Token-by-token comparison
    tokenComparisons: processedResults,
    
    // Strategy effectiveness analysis
    strategyEffectiveness: {
      tokensWhereLogicalOutperformed: tokens.filter(token => processedResults[token].difference.returnDifference > 0),
      tokensWhereSimpleOutperformed: tokens.filter(token => processedResults[token].difference.returnDifference < 0),
      averageLogicalVsSimpleReturn: tokens.reduce((sum, token) => sum + processedResults[token].difference.returnPercentDifference, 0) / tokens.length
    }
  };
  
  // Save comprehensive report
  const reportPath = path.join(RESULTS_DIR, 'multi-crypto-comparison-4year.json');
  fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2));
  
  // Print detailed comparison
  console.log('\n🚀 MULTI-CRYPTOCURRENCY DCA COMPARISON (4 YEARS: 2021-2025)');
  console.log('=' .repeat(80));
  
  console.log('\n💰 PERFORMANCE SUMMARY BY TOKEN:');
  tokens.forEach(token => {
    const config = getCryptoConfig(token);
    const data = processedResults[token];
    
    console.log(`\n${config.displayName} (${token}):`);
    console.log(`  📈 Simple DCA:     €${data.simple.totalReturn.toFixed(0)} (${data.simple.totalReturnPercent.toFixed(1)}% | ${data.simple.cagr.toFixed(1)}% CAGR)`);
    console.log(`  🧠 Logical DCA:    €${data.logical.totalReturn.toFixed(0)} (${data.logical.totalReturnPercent.toFixed(1)}% | ${data.logical.cagr.toFixed(1)}% CAGR)`);
    console.log(`  📊 Difference:     €${data.difference.returnDifference.toFixed(0)} (${data.difference.returnPercentDifference.toFixed(1)}% | ${data.difference.cagrDifference.toFixed(1)}% CAGR)`);
    console.log(`  ⚖️ Risk (Simple):  ${(data.simple.volatility * 100).toFixed(1)}% vol, ${(data.simple.maxDrawdown * 100).toFixed(1)}% drawdown`);
    console.log(`  ⚖️ Risk (Logical): ${(data.logical.volatility * 100).toFixed(1)}% vol, ${(data.logical.maxDrawdown * 100).toFixed(1)}% drawdown`);
  });
  
  console.log('\n🏆 PERFORMANCE RANKINGS:');
  console.log('\n📈 Best CAGR (Simple DCA):');
  comparisonReport.rankings.simpleStrategyCagr.forEach((token, index) => {
    const data = processedResults[token];
    console.log(`  ${index + 1}. ${token}: ${data.simple.cagr.toFixed(1)}% CAGR (€${data.simple.totalReturn.toFixed(0)} return)`);
  });
  
  console.log('\n🧠 Best CAGR (Logical DCA):');
  comparisonReport.rankings.logicalStrategyCagr.forEach((token, index) => {
    const data = processedResults[token];
    console.log(`  ${index + 1}. ${token}: ${data.logical.cagr.toFixed(1)}% CAGR (€${data.logical.totalReturn.toFixed(0)} return)`);
  });
  
  console.log('\n📊 Best Risk-Adjusted Returns (Sharpe Ratio):');
  comparisonReport.rankings.bestRiskAdjusted.forEach((token, index) => {
    const data = processedResults[token];
    console.log(`  ${index + 1}. ${token}: ${data.simple.sharpeRatio.toFixed(2)} Sharpe (Simple) vs ${data.logical.sharpeRatio.toFixed(2)} (Logical)`);
  });
  
  console.log('\n🎯 STRATEGY EFFECTIVENESS:');
  console.log(`✅ Tokens where Logical DCA outperformed: ${comparisonReport.strategyEffectiveness.tokensWhereLogicalOutperformed.join(', ') || 'None'}`);
  console.log(`❌ Tokens where Simple DCA outperformed: ${comparisonReport.strategyEffectiveness.tokensWhereSimpleOutperformed.join(', ') || 'None'}`);
  console.log(`📊 Average performance difference: ${comparisonReport.strategyEffectiveness.averageLogicalVsSimpleReturn.toFixed(1)}% (Logical vs Simple)`);
  
  console.log('\n🔍 KEY INSIGHTS:');
  
  // Find best and worst performers
  const bestSimple = comparisonReport.rankings.simpleStrategyCagr[0];
  const worstSimple = comparisonReport.rankings.simpleStrategyCagr[comparisonReport.rankings.simpleStrategyCagr.length - 1];
  const bestLogical = comparisonReport.rankings.logicalStrategyCagr[0];
  
  console.log(`🚀 Best performing asset (Simple DCA): ${bestSimple} with ${processedResults[bestSimple].simple.cagr.toFixed(1)}% CAGR`);
  console.log(`🐌 Worst performing asset (Simple DCA): ${worstSimple} with ${processedResults[worstSimple].simple.cagr.toFixed(1)}% CAGR`);
  console.log(`🧠 Best logical DCA performance: ${bestLogical} with ${processedResults[bestLogical].logical.cagr.toFixed(1)}% CAGR`);
  
  // Strategy comparison insights
  const logicalWins = comparisonReport.strategyEffectiveness.tokensWhereLogicalOutperformed.length;
  const simpleWins = comparisonReport.strategyEffectiveness.tokensWhereSimpleOutperformed.length;
  
  if (simpleWins > logicalWins) {
    console.log(`📈 Simple DCA was more effective overall, outperforming on ${simpleWins}/${tokens.length} tokens`);
  } else if (logicalWins > simpleWins) {
    console.log(`🧠 Logical DCA was more effective overall, outperforming on ${logicalWins}/${tokens.length} tokens`);
  } else {
    console.log(`⚖️ Both strategies showed equal effectiveness across different tokens`);
  }
  
  console.log(`\n💾 Detailed comparison saved to: ${reportPath}`);
  
  return comparisonReport;
}

// CLI execution
if (require.main === module) {
  try {
    createMultiCryptoComparison();
  } catch (error) {
    console.error('💥 Error creating multi-crypto comparison:', error.message);
    process.exit(1);
  }
}

module.exports = { createMultiCryptoComparison };