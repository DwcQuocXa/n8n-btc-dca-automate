// Optimization Comparison Analysis
// Compares Original Logical DCA vs Optimized Logical DCA vs Simple DCA

const fs = require('fs');
const path = require('path');
const { getAllSupportedTokens, getCryptoConfig } = require('./crypto-config');

const RESULTS_DIR = path.join(__dirname, '../results');

function loadAllStrategyResults() {
  const supportedTokens = getAllSupportedTokens();
  const results = {};
  
  console.log('📊 Loading results for all strategies and cryptocurrencies...');
  
  supportedTokens.forEach(token => {
    try {
      const cryptoConfig = getCryptoConfig(token);
      
      // 4-year results
      const simpleResultsPath4Y = path.join(RESULTS_DIR, `simple-dca-results-${cryptoConfig.resultsPrefix}-4year.json`);
      const logicalResultsPath4Y = path.join(RESULTS_DIR, `complete-logical-dca-results-${cryptoConfig.resultsPrefix}-4year.json`);
      const optimizedResultsPath4Y = path.join(RESULTS_DIR, `optimized-logical-dca-results-${cryptoConfig.resultsPrefix}-4year.json`);
      
      // Bear market results
      const simpleResultsPathBear = path.join(RESULTS_DIR, `simple-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`);
      const logicalResultsPathBear = path.join(RESULTS_DIR, `complete-logical-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`);
      const optimizedResultsPathBear = path.join(RESULTS_DIR, `optimized-logical-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`);
      
      const has4YearResults = fs.existsSync(simpleResultsPath4Y) && fs.existsSync(logicalResultsPath4Y) && fs.existsSync(optimizedResultsPath4Y);
      const hasBearResults = fs.existsSync(simpleResultsPathBear) && fs.existsSync(logicalResultsPathBear) && fs.existsSync(optimizedResultsPathBear);
      
      if (has4YearResults && hasBearResults) {
        results[token] = {
          fourYear: {
            simple: JSON.parse(fs.readFileSync(simpleResultsPath4Y, 'utf8')),
            logical: JSON.parse(fs.readFileSync(logicalResultsPath4Y, 'utf8')),
            optimized: JSON.parse(fs.readFileSync(optimizedResultsPath4Y, 'utf8'))
          },
          bearMarket: {
            simple: JSON.parse(fs.readFileSync(simpleResultsPathBear, 'utf8')),
            logical: JSON.parse(fs.readFileSync(logicalResultsPathBear, 'utf8')),
            optimized: JSON.parse(fs.readFileSync(optimizedResultsPathBear, 'utf8'))
          },
          config: cryptoConfig
        };
        console.log(`✅ Loaded complete ${token} results`);
      } else {
        console.log(`⚠️ Missing complete results for ${token}`);
      }
    } catch (error) {
      console.log(`❌ Error loading ${token} results:`, error.message);
    }
  });
  
  return results;
}

function calculateRiskMetrics(dailyResults) {
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
  
  function calculateVolatility(dailyReturns) {
    if (dailyReturns.length === 0) return 0;
    const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyReturns.length;
    return Math.sqrt(variance) * Math.sqrt(365);
  }
  
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

function createOptimizationComparison() {
  console.log('🚀 Creating Optimization Comparison Analysis...\n');
  
  const allResults = loadAllStrategyResults();
  const tokens = Object.keys(allResults);
  
  if (tokens.length === 0) {
    throw new Error('No complete results found. Please run all tests first.');
  }
  
  console.log(`📊 Analyzing ${tokens.length} cryptocurrencies: ${tokens.join(', ')}`);
  
  // Process each cryptocurrency for both periods
  const processedResults = {};
  
  tokens.forEach(token => {
    const tokenResults = allResults[token];
    
    processedResults[token] = {
      fourYear: {},
      bearMarket: {}
    };
    
    // Process 4-year results
    ['fourYear', 'bearMarket'].forEach(period => {
      const periodResults = tokenResults[period];
      const periodData = processedResults[token][period];
      
      // Calculate risk metrics
      const simpleRisk = calculateRiskMetrics(periodResults.simple.dailyResults);
      const logicalRisk = calculateRiskMetrics(periodResults.logical.dailyResults);
      const optimizedRisk = calculateRiskMetrics(periodResults.optimized.dailyResults);
      
      // Calculate Sharpe ratios
      const simpleGainPerYear = periodResults.simple.finalPortfolio.cagr / 100;
      const logicalGainPerYear = periodResults.logical.finalPortfolio.cagr / 100;
      const optimizedGainPerYear = periodResults.optimized.finalPortfolio.cagr / 100;
      
      const simpleSharpe = simpleRisk.volatility > 0 ? simpleGainPerYear / simpleRisk.volatility : 0;
      const logicalSharpe = logicalRisk.volatility > 0 ? logicalGainPerYear / logicalRisk.volatility : 0;
      const optimizedSharpe = optimizedRisk.volatility > 0 ? optimizedGainPerYear / optimizedRisk.volatility : 0;
      
      // Store processed data
      periodData.simple = {
        ...periodResults.simple.finalPortfolio,
        volatility: simpleRisk.volatility,
        maxDrawdown: simpleRisk.maxDrawdown,
        sharpeRatio: simpleSharpe,
        trades: periodResults.simple.tradeStats.totalTrades,
        sellTrades: periodResults.simple.tradeStats.sellTrades || 0
      };
      
      periodData.logical = {
        ...periodResults.logical.finalPortfolio,
        volatility: logicalRisk.volatility,
        maxDrawdown: logicalRisk.maxDrawdown,
        sharpeRatio: logicalSharpe,
        trades: periodResults.logical.tradeStats.totalTrades,
        sellTrades: periodResults.logical.tradeStats.sellTrades,
        avgTokenAllocation: periodResults.logical.dailyResults.reduce((sum, r) => sum + r.tokenAllocation, 0) / periodResults.logical.dailyResults.length
      };
      
      periodData.optimized = {
        ...periodResults.optimized.finalPortfolio,
        volatility: optimizedRisk.volatility,
        maxDrawdown: optimizedRisk.maxDrawdown,
        sharpeRatio: optimizedSharpe,
        trades: periodResults.optimized.tradeStats.totalTrades,
        sellTrades: periodResults.optimized.tradeStats.sellTrades,
        avgTokenAllocation: periodResults.optimized.optimizationMetrics.avgTokenAllocation,
        bullMarketDays: periodResults.optimized.optimizationMetrics.bullMarketDays,
        bearMarketDays: periodResults.optimized.optimizationMetrics.bearMarketDays
      };
      
      // Calculate improvements
      periodData.improvements = {
        optimizedVsLogical: {
          returnImprovement: periodData.optimized.totalReturn - periodData.logical.totalReturn,
          returnPercentImprovement: periodData.optimized.totalReturnPercent - periodData.logical.totalReturnPercent,
          cagrImprovement: periodData.optimized.cagr - periodData.logical.cagr,
          tradeReduction: periodData.logical.trades - periodData.optimized.trades,
          sellTradeReduction: periodData.logical.sellTrades - periodData.optimized.sellTrades,
          allocationImprovement: periodData.optimized.avgTokenAllocation - periodData.logical.avgTokenAllocation
        },
        optimizedVsSimple: {
          returnDifference: periodData.optimized.totalReturn - periodData.simple.totalReturn,
          returnPercentDifference: periodData.optimized.totalReturnPercent - periodData.simple.totalReturnPercent,
          cagrDifference: periodData.optimized.cagr - periodData.simple.cagr,
          riskAdjustedImprovement: periodData.optimized.sharpeRatio - periodData.simple.sharpeRatio,
          drawdownImprovement: periodData.simple.maxDrawdown - periodData.optimized.maxDrawdown
        }
      };
    });
  });
  
  // Create comprehensive comparison report
  const comparisonReport = {
    title: 'DCA Strategy Optimization Comparison Analysis',
    subtitle: 'Simple DCA vs Original Logical DCA vs Optimized Logical DCA',
    testPeriods: {
      fourYear: '2021-2025 (Bull Market Dominant)',
      bearMarket: '2021-2022 (Crypto Winter)'
    },
    tokensAnalyzed: tokens,
    
    // Performance rankings
    rankings: {
      fourYearReturns: {
        simple: tokens.sort((a, b) => processedResults[b].fourYear.simple.totalReturn - processedResults[a].fourYear.simple.totalReturn),
        logical: tokens.sort((a, b) => processedResults[b].fourYear.logical.totalReturn - processedResults[a].fourYear.logical.totalReturn),
        optimized: tokens.sort((a, b) => processedResults[b].fourYear.optimized.totalReturn - processedResults[a].fourYear.optimized.totalReturn)
      },
      bearMarketResilience: {
        simple: tokens.sort((a, b) => processedResults[b].bearMarket.simple.totalReturnPercent - processedResults[a].bearMarket.simple.totalReturnPercent),
        logical: tokens.sort((a, b) => processedResults[b].bearMarket.logical.totalReturnPercent - processedResults[a].bearMarket.logical.totalReturnPercent),
        optimized: tokens.sort((a, b) => processedResults[b].bearMarket.optimized.totalReturnPercent - processedResults[a].bearMarket.optimized.totalReturnPercent)
      }
    },
    
    // Token-by-token comparison
    tokenComparisons: processedResults,
    
    // Strategy effectiveness analysis
    optimizationEffectiveness: {
      fourYear: {
        tokensWhereOptimizedBeatLogical: tokens.filter(token => processedResults[token].fourYear.improvements.optimizedVsLogical.returnImprovement > 0),
        tokensWhereOptimizedBeatSimple: tokens.filter(token => processedResults[token].fourYear.improvements.optimizedVsSimple.returnDifference > 0),
        avgOptimizationGain: tokens.reduce((sum, token) => sum + processedResults[token].fourYear.improvements.optimizedVsLogical.returnPercentImprovement, 0) / tokens.length,
        avgTradingReduction: tokens.reduce((sum, token) => sum + processedResults[token].fourYear.improvements.optimizedVsLogical.sellTradeReduction, 0) / tokens.length
      },
      bearMarket: {
        tokensWhereOptimizedBeatLogical: tokens.filter(token => processedResults[token].bearMarket.improvements.optimizedVsLogical.returnImprovement > 0),
        tokensWhereOptimizedBeatSimple: tokens.filter(token => processedResults[token].bearMarket.improvements.optimizedVsSimple.returnDifference > 0),
        avgOptimizationGain: tokens.reduce((sum, token) => sum + processedResults[token].bearMarket.improvements.optimizedVsLogical.returnPercentImprovement, 0) / tokens.length,
        avgTradingReduction: tokens.reduce((sum, token) => sum + processedResults[token].bearMarket.improvements.optimizedVsLogical.sellTradeReduction, 0) / tokens.length
      }
    }
  };
  
  // Save comprehensive report
  const reportPath = path.join(RESULTS_DIR, 'optimization-comparison-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2));
  
  // Print detailed comparison
  console.log('\n🚀 DCA STRATEGY OPTIMIZATION COMPARISON');
  console.log('=' .repeat(80));
  
  console.log('\n📊 4-YEAR PERIOD PERFORMANCE (2021-2025):');
  tokens.forEach(token => {
    const config = getCryptoConfig(token);
    const data = processedResults[token].fourYear;
    
    console.log(`\n${config.displayName} (${token}):`);
    console.log(`  📈 Simple DCA:     €${data.simple.totalReturn.toFixed(0)} (${data.simple.totalReturnPercent.toFixed(1)}% | ${data.simple.cagr.toFixed(1)}% CAGR)`);
    console.log(`  🧠 Logical DCA:    €${data.logical.totalReturn.toFixed(0)} (${data.logical.totalReturnPercent.toFixed(1)}% | ${data.logical.cagr.toFixed(1)}% CAGR)`);
    console.log(`  🚀 Optimized DCA:  €${data.optimized.totalReturn.toFixed(0)} (${data.optimized.totalReturnPercent.toFixed(1)}% | ${data.optimized.cagr.toFixed(1)}% CAGR)`);
    console.log(`  📊 Optimization Gain: €${data.improvements.optimizedVsLogical.returnImprovement.toFixed(0)} (+${data.improvements.optimizedVsLogical.returnPercentImprovement.toFixed(1)}%)`);
    console.log(`  🎯 Avg Allocation: Simple 100%, Logical ${data.logical.avgTokenAllocation.toFixed(1)}%, Optimized ${data.optimized.avgTokenAllocation.toFixed(1)}%`);
    console.log(`  🔄 Trading: Logical ${data.logical.trades}→Optimized ${data.optimized.trades} (${data.improvements.optimizedVsLogical.sellTradeReduction} fewer sells)`);
  });
  
  console.log('\n🐻 BEAR MARKET PERIOD PERFORMANCE (2021-2022):');
  tokens.forEach(token => {
    const config = getCryptoConfig(token);
    const data = processedResults[token].bearMarket;
    
    console.log(`\n${config.displayName} (${token}):`);
    console.log(`  📈 Simple DCA:     €${data.simple.totalReturn.toFixed(0)} (${data.simple.totalReturnPercent.toFixed(1)}%)`);
    console.log(`  🧠 Logical DCA:    €${data.logical.totalReturn.toFixed(0)} (${data.logical.totalReturnPercent.toFixed(1)}%)`);
    console.log(`  🚀 Optimized DCA:  €${data.optimized.totalReturn.toFixed(0)} (${data.optimized.totalReturnPercent.toFixed(1)}%)`);
    console.log(`  📊 Optimization Gain: €${data.improvements.optimizedVsLogical.returnImprovement.toFixed(0)} (+${data.improvements.optimizedVsLogical.returnPercentImprovement.toFixed(1)}%)`);
    console.log(`  🛡️ Risk: Optimized ${(data.optimized.maxDrawdown * 100).toFixed(1)}% vs Simple ${(data.simple.maxDrawdown * 100).toFixed(1)}% max drawdown`);
  });
  
  console.log('\n🏆 OPTIMIZATION EFFECTIVENESS SUMMARY:');
  
  console.log('\n📈 4-Year Period (Bull Market Dominant):');
  const fourYearOpt = comparisonReport.optimizationEffectiveness.fourYear;
  console.log(`✅ Optimized beat Logical DCA: ${fourYearOpt.tokensWhereOptimizedBeatLogical.join(', ') || 'None'}`);
  console.log(`❌ Optimized beat Simple DCA: ${fourYearOpt.tokensWhereOptimizedBeatSimple.join(', ') || 'None'}`);
  console.log(`📊 Average optimization gain: ${fourYearOpt.avgOptimizationGain.toFixed(1)}% vs Logical DCA`);
  console.log(`🔄 Average sell trade reduction: ${fourYearOpt.avgTradingReduction.toFixed(0)} trades`);
  
  console.log('\n🐻 Bear Market Period:');
  const bearMarketOpt = comparisonReport.optimizationEffectiveness.bearMarket;
  console.log(`✅ Optimized beat Logical DCA: ${bearMarketOpt.tokensWhereOptimizedBeatLogical.join(', ') || 'None'}`);
  console.log(`✅ Optimized beat Simple DCA: ${bearMarketOpt.tokensWhereOptimizedBeatSimple.join(', ') || 'None'}`);
  console.log(`📊 Average optimization gain: ${bearMarketOpt.avgOptimizationGain.toFixed(1)}% vs Logical DCA`);
  console.log(`🔄 Average sell trade reduction: ${bearMarketOpt.avgTradingReduction.toFixed(0)} trades`);
  
  console.log('\n🔍 KEY INSIGHTS:');
  
  // Calculate overall statistics
  const fourYearOptSuccess = fourYearOpt.tokensWhereOptimizedBeatLogical.length;
  const bearMarketOptSuccess = bearMarketOpt.tokensWhereOptimizedBeatLogical.length;
  
  console.log(`🚀 Bull Market Optimization: ${fourYearOptSuccess}/${tokens.length} tokens improved vs Logical DCA`);
  console.log(`🐻 Bear Market Optimization: ${bearMarketOptSuccess}/${tokens.length} tokens improved vs Logical DCA`);
  
  // Find best optimization gains
  const bestBullOptimization = tokens.reduce((best, token) => {
    const gain = processedResults[token].fourYear.improvements.optimizedVsLogical.returnPercentImprovement;
    return gain > best.gain ? { token, gain } : best;
  }, { token: '', gain: -Infinity });
  
  const bestBearOptimization = tokens.reduce((best, token) => {
    const gain = processedResults[token].bearMarket.improvements.optimizedVsLogical.returnPercentImprovement;
    return gain > best.gain ? { token, gain } : best;
  }, { token: '', gain: -Infinity });
  
  console.log(`🏆 Best bull market optimization: ${bestBullOptimization.token} (+${bestBullOptimization.gain.toFixed(1)}%)`);
  console.log(`🛡️ Best bear market optimization: ${bestBearOptimization.token} (+${bestBearOptimization.gain.toFixed(1)}%)`);
  
  // Gap closure analysis
  const avgGapClosureVsSimple = tokens.reduce((sum, token) => {
    const originalGap = processedResults[token].fourYear.simple.totalReturnPercent - processedResults[token].fourYear.logical.totalReturnPercent;
    const optimizedGap = processedResults[token].fourYear.simple.totalReturnPercent - processedResults[token].fourYear.optimized.totalReturnPercent;
    const gapClosure = ((originalGap - optimizedGap) / originalGap) * 100;
    return sum + gapClosure;
  }, 0) / tokens.length;
  
  console.log(`📊 Average gap closure vs Simple DCA: ${avgGapClosureVsSimple.toFixed(1)}%`);
  
  console.log(`\n💾 Detailed comparison saved to: ${reportPath}`);
  
  return comparisonReport;
}

// CLI execution
if (require.main === module) {
  try {
    createOptimizationComparison();
  } catch (error) {
    console.error('💥 Error creating optimization comparison:', error.message);
    process.exit(1);
  }
}

module.exports = { createOptimizationComparison };