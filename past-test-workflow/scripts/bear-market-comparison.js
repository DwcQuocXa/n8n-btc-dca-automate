// Bear Market DCA Strategy Comparison Analysis (2021-2022)
// Compares Simple DCA vs Complete Logical DCA during crypto bear market period

const fs = require('fs');
const path = require('path');
const { getAllSupportedTokens, getCryptoConfig } = require('./crypto-config');
const { BEAR_MARKET_PERIOD } = require('./bear-market-data-fetcher');

const RESULTS_DIR = path.join(__dirname, '../results');

function loadBearMarketResults() {
  const supportedTokens = getAllSupportedTokens();
  const results = {};
  
  console.log('🐻 Loading bear market results for all cryptocurrencies...');
  
  supportedTokens.forEach(token => {
    try {
      const cryptoConfig = getCryptoConfig(token);
      const simpleResultsPath = path.join(RESULTS_DIR, `simple-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`);
      const logicalResultsPath = path.join(RESULTS_DIR, `complete-logical-dca-results-${cryptoConfig.resultsPrefix}-bear-market.json`);
      
      if (fs.existsSync(simpleResultsPath) && fs.existsSync(logicalResultsPath)) {
        results[token] = {
          simple: JSON.parse(fs.readFileSync(simpleResultsPath, 'utf8')),
          logical: JSON.parse(fs.readFileSync(logicalResultsPath, 'utf8')),
          config: cryptoConfig
        };
        console.log(`✅ Loaded ${token} bear market results`);
      } else {
        console.log(`⚠️ Missing bear market results for ${token}`);
      }
    } catch (error) {
      console.log(`❌ Error loading ${token} bear market results:`, error.message);
    }
  });
  
  return results;
}

function calculateBearMarketRiskMetrics(dailyResults) {
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

function createBearMarketComparison() {
  console.log('🐻 Creating Bear Market DCA Strategy Comparison...\n');
  
  const allResults = loadBearMarketResults();
  const tokens = Object.keys(allResults);
  
  if (tokens.length === 0) {
    throw new Error('No bear market results found. Please run the bear market tests first.');
  }
  
  console.log(`📊 Analyzing ${tokens.length} cryptocurrencies during bear market: ${tokens.join(', ')}`);
  
  // Process each cryptocurrency
  const processedResults = {};
  
  tokens.forEach(token => {
    const { simple, logical } = allResults[token];
    
    // Calculate risk metrics
    const simpleRisk = calculateBearMarketRiskMetrics(simple.dailyResults);
    const logicalRisk = calculateBearMarketRiskMetrics(logical.dailyResults);
    
    // Bear market specific metrics
    const simpleMarketBeat = simple.marketMetrics.dcastrategyvsMarket;
    const logicalMarketBeat = logical.marketMetrics.strategyVsMarket;
    
    processedResults[token] = {
      simple: {
        ...simple.finalPortfolio,
        volatility: simpleRisk.volatility,
        maxDrawdown: simpleRisk.maxDrawdown,
        trades: simple.tradeStats.totalTrades,
        marketReturn: simple.marketMetrics.marketReturn,
        vsMarketOutperformance: simpleMarketBeat
      },
      logical: {
        ...logical.finalPortfolio,
        volatility: logicalRisk.volatility,
        maxDrawdown: logicalRisk.maxDrawdown,
        trades: logical.tradeStats.totalTrades,
        marketReturn: logical.marketMetrics.marketReturn,
        vsMarketOutperformance: logicalMarketBeat,
        coreAllocation: ((logical.finalPortfolio.coreTokenBalance || 0) > 0) ? 
          (logical.finalPortfolio.coreTokenBalance / logical.finalPortfolio.totalTokenBalance) * 100 : 0,
        satelliteAllocation: ((logical.finalPortfolio.satelliteTokenBalance || 0) > 0) ? 
          (logical.finalPortfolio.satelliteTokenBalance / logical.finalPortfolio.totalTokenBalance) * 100 : 0
      },
      difference: {
        returnDifference: logical.finalPortfolio.totalReturn - simple.finalPortfolio.totalReturn,
        returnPercentDifference: logical.finalPortfolio.totalReturnPercent - simple.finalPortfolio.totalReturnPercent,
        cagrDifference: logical.finalPortfolio.cagr - simple.finalPortfolio.cagr,
        marketBeatDifference: logicalMarketBeat - simpleMarketBeat
      }
    };
  });
  
  // Create comprehensive bear market comparison report
  const comparisonReport = {
    title: 'Bear Market DCA Strategy Comparison (2021-2022)',
    testPeriod: {
      start: BEAR_MARKET_PERIOD.startDate,
      end: BEAR_MARKET_PERIOD.endDate,
      totalYears: BEAR_MARKET_PERIOD.years,
      marketType: 'Bear Market',
      description: 'Crypto Winter 2021-2022'
    },
    tokensAnalyzed: tokens,
    
    // Performance Rankings for Bear Market
    rankings: {
      // Best performing in bear market (least losses)
      simpleLeastLosses: tokens.sort((a, b) => processedResults[b].simple.totalReturnPercent - processedResults[a].simple.totalReturnPercent),
      logicalLeastLosses: tokens.sort((a, b) => processedResults[b].logical.totalReturnPercent - processedResults[a].logical.totalReturnPercent),
      // Best market outperformance
      simpleBestVsMarket: tokens.sort((a, b) => processedResults[b].simple.vsMarketOutperformance - processedResults[a].simple.vsMarketOutperformance),
      logicalBestVsMarket: tokens.sort((a, b) => processedResults[b].logical.vsMarketOutperformance - processedResults[a].logical.vsMarketOutperformance)
    },
    
    // Token-by-token comparison
    tokenComparisons: processedResults,
    
    // Strategy effectiveness in bear market
    strategyEffectiveness: {
      tokensWhereLogicalOutperformed: tokens.filter(token => processedResults[token].difference.returnDifference > 0),
      tokensWhereSimpleOutperformed: tokens.filter(token => processedResults[token].difference.returnDifference < 0),
      averageLogicalVsSimpleReturn: tokens.reduce((sum, token) => sum + processedResults[token].difference.returnPercentDifference, 0) / tokens.length,
      averageMarketBeatDifference: tokens.reduce((sum, token) => sum + processedResults[token].difference.marketBeatDifference, 0) / tokens.length
    }
  };
  
  // Save comprehensive report
  const reportPath = path.join(RESULTS_DIR, 'bear-market-comparison.json');
  fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2));
  
  // Print detailed comparison
  console.log('\n🐻 BEAR MARKET DCA COMPARISON (2021-2022)');
  console.log('=' .repeat(80));
  
  console.log('\n💰 BEAR MARKET PERFORMANCE BY TOKEN:');
  tokens.forEach(token => {
    const config = getCryptoConfig(token);
    const data = processedResults[token];
    
    console.log(`\n${config.displayName} (${token}):`);
    console.log(`  📈 Simple DCA:     €${data.simple.totalReturn.toFixed(0)} (${data.simple.totalReturnPercent.toFixed(1)}% | ${data.simple.cagr.toFixed(1)}% CAGR)`);
    console.log(`  🧠 Logical DCA:    €${data.logical.totalReturn.toFixed(0)} (${data.logical.totalReturnPercent.toFixed(1)}% | ${data.logical.cagr.toFixed(1)}% CAGR)`);
    console.log(`  📊 Difference:     €${data.difference.returnDifference.toFixed(0)} (${data.difference.returnPercentDifference.toFixed(1)}% | ${data.difference.cagrDifference.toFixed(1)}% CAGR)`);
    console.log(`  🐻 Market Return:  ${data.simple.marketReturn.toFixed(1)}%`);
    console.log(`  🎯 Simple vs Market: ${data.simple.vsMarketOutperformance.toFixed(1)}% ${data.simple.vsMarketOutperformance > 0 ? 'outperformance' : 'underperformance'}`);
    console.log(`  🎯 Logical vs Market: ${data.logical.vsMarketOutperformance.toFixed(1)}% ${data.logical.vsMarketOutperformance > 0 ? 'outperformance' : 'underperformance'}`);
    console.log(`  ⚖️ Risk (Simple):  ${(data.simple.volatility * 100).toFixed(1)}% vol, ${(data.simple.maxDrawdown * 100).toFixed(1)}% drawdown`);
    console.log(`  ⚖️ Risk (Logical): ${(data.logical.volatility * 100).toFixed(1)}% vol, ${(data.logical.maxDrawdown * 100).toFixed(1)}% drawdown`);
  });
  
  console.log('\n🏆 BEAR MARKET RANKINGS:');
  console.log('\n📈 Least Losses (Simple DCA):');
  comparisonReport.rankings.simpleLeastLosses.forEach((token, index) => {
    const data = processedResults[token];
    console.log(`  ${index + 1}. ${token}: ${data.simple.totalReturnPercent.toFixed(1)}% loss (vs ${data.simple.marketReturn.toFixed(1)}% market)`);
  });
  
  console.log('\n🧠 Least Losses (Logical DCA):');
  comparisonReport.rankings.logicalLeastLosses.forEach((token, index) => {
    const data = processedResults[token];
    console.log(`  ${index + 1}. ${token}: ${data.logical.totalReturnPercent.toFixed(1)}% loss (vs ${data.logical.marketReturn.toFixed(1)}% market)`);
  });
  
  console.log('\n🎯 Best Market Outperformance:');
  const bestOverallMarketBeat = tokens.map(token => ({
    token,
    simple: processedResults[token].simple.vsMarketOutperformance,
    logical: processedResults[token].logical.vsMarketOutperformance
  })).sort((a, b) => Math.max(b.simple, b.logical) - Math.max(a.simple, a.logical));
  
  bestOverallMarketBeat.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.token}: Simple ${item.simple.toFixed(1)}%, Logical ${item.logical.toFixed(1)}%`);
  });
  
  console.log('\n🎯 BEAR MARKET STRATEGY EFFECTIVENESS:');
  console.log(`✅ Tokens where Logical DCA had smaller losses: ${comparisonReport.strategyEffectiveness.tokensWhereLogicalOutperformed.join(', ') || 'None'}`);
  console.log(`❌ Tokens where Simple DCA had smaller losses: ${comparisonReport.strategyEffectiveness.tokensWhereSimpleOutperformed.join(', ') || 'None'}`);
  console.log(`📊 Average return difference: ${comparisonReport.strategyEffectiveness.averageLogicalVsSimpleReturn.toFixed(1)}% (Logical vs Simple)`);
  console.log(`📊 Average market-beating difference: ${comparisonReport.strategyEffectiveness.averageMarketBeatDifference.toFixed(1)}% (Logical vs Simple)`);
  
  console.log('\n🔍 BEAR MARKET KEY INSIGHTS:');
  
  // Find best and worst bear market performers
  const bestSimpleBear = comparisonReport.rankings.simpleLeastLosses[0];
  const worstSimpleBear = comparisonReport.rankings.simpleLeastLosses[comparisonReport.rankings.simpleLeastLosses.length - 1];
  const bestLogicalBear = comparisonReport.rankings.logicalLeastLosses[0];
  
  console.log(`🛡️ Best bear market resilience (Simple DCA): ${bestSimpleBear} with ${processedResults[bestSimpleBear].simple.totalReturnPercent.toFixed(1)}% loss`);
  console.log(`💥 Worst bear market performer (Simple DCA): ${worstSimpleBear} with ${processedResults[worstSimpleBear].simple.totalReturnPercent.toFixed(1)}% loss`);
  console.log(`🧠 Best logical DCA resilience: ${bestLogicalBear} with ${processedResults[bestLogicalBear].logical.totalReturnPercent.toFixed(1)}% loss`);
  
  // Strategy comparison insights
  const logicalWins = comparisonReport.strategyEffectiveness.tokensWhereLogicalOutperformed.length;
  const simpleWins = comparisonReport.strategyEffectiveness.tokensWhereSimpleOutperformed.length;
  
  if (logicalWins > simpleWins) {
    console.log(`🧠 Logical DCA showed better bear market protection, outperforming on ${logicalWins}/${tokens.length} tokens`);
  } else if (simpleWins > logicalWins) {
    console.log(`📈 Simple DCA was more resilient in bear market, outperforming on ${simpleWins}/${tokens.length} tokens`);
  } else {
    console.log(`⚖️ Both strategies showed equal effectiveness during bear market`);
  }
  
  // Risk management effectiveness
  const avgLogicalDrawdown = tokens.reduce((sum, token) => sum + processedResults[token].logical.maxDrawdown, 0) / tokens.length;
  const avgSimpleDrawdown = tokens.reduce((sum, token) => sum + processedResults[token].simple.maxDrawdown, 0) / tokens.length;
  
  console.log(`🛡️ Average Maximum Drawdown: Simple ${(avgSimpleDrawdown * 100).toFixed(1)}%, Logical ${(avgLogicalDrawdown * 100).toFixed(1)}%`);
  
  if (avgLogicalDrawdown < avgSimpleDrawdown) {
    console.log(`✅ Logical DCA provided better downside protection during bear market`);
  } else {
    console.log(`❌ Simple DCA showed similar or better drawdown characteristics`);
  }
  
  console.log(`\n💾 Bear market comparison saved to: ${reportPath}`);
  
  return comparisonReport;
}

// CLI execution
if (require.main === module) {
  try {
    createBearMarketComparison();
  } catch (error) {
    console.error('💥 Error creating bear market comparison:', error.message);
    process.exit(1);
  }
}

module.exports = { createBearMarketComparison };