// 4-Year DCA Strategy Comparison Analysis (2021-2025)
// Compares Simple DCA vs Complete Logical DCA with Dual Portfolio Architecture

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../results');

function load4YearComparisonData() {
  try {
    const simpleDCAPath = path.join(RESULTS_DIR, 'simple-dca-results-4year.json');
    const logicalDCAPath = path.join(RESULTS_DIR, 'complete-logical-dca-results-4year.json');
    
    const simpleDCA = JSON.parse(fs.readFileSync(simpleDCAPath, 'utf8'));
    const logicalDCA = JSON.parse(fs.readFileSync(logicalDCAPath, 'utf8'));
    
    return { simpleDCA, logicalDCA };
    
  } catch (error) {
    console.error('❌ Error loading 4-year comparison data:', error.message);
    throw error;
  }
}

function analyzeRiskMetrics(simpleDailyResults, logicalDailyResults) {
  console.log('\n📊 Analyzing Risk Metrics (4 Years)...');
  
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
  
  const simpleDailyReturns = calculateDailyReturns(simpleDailyResults);
  const logicalDailyReturns = calculateDailyReturns(logicalDailyResults);
  
  const simpleVolatility = calculateVolatility(simpleDailyReturns);
  const logicalVolatility = calculateVolatility(logicalDailyReturns);
  
  const simpleMaxDrawdown = calculateMaxDrawdown(simpleDailyResults);
  const logicalMaxDrawdown = calculateMaxDrawdown(logicalDailyResults);
  
  return {
    simple: {
      volatility: simpleVolatility,
      maxDrawdown: simpleMaxDrawdown
    },
    logical: {
      volatility: logicalVolatility,
      maxDrawdown: logicalMaxDrawdown
    }
  };
}

function create4YearComparisonReport() {
  console.log('📈 Creating 4-Year DCA Strategy Comparison Analysis...\n');
  
  const { simpleDCA, logicalDCA } = load4YearComparisonData();
  
  // Calculate risk metrics
  const riskMetrics = analyzeRiskMetrics(simpleDCA.dailyResults, logicalDCA.dailyResults);
  
  // Calculate efficiency metrics
  const simpleEfficiency = simpleDCA.finalPortfolio.totalReturn / simpleDCA.finalPortfolio.totalInvested;
  const logicalEfficiency = logicalDCA.finalPortfolio.totalReturn / logicalDCA.finalPortfolio.totalInvested;
  
  // Calculate Sharpe ratio (simplified - using return/volatility)
  const simpleGainPerYear = simpleDCA.finalPortfolio.cagr / 100;
  const logicalGainPerYear = logicalDCA.finalPortfolio.cagr / 100;
  const simpleSharpe = simpleGainPerYear / riskMetrics.simple.volatility;
  const logicalSharpe = logicalGainPerYear / riskMetrics.logical.volatility;
  
  const comparisonReport = {
    title: '4-Year DCA Strategy Comparison Analysis (2021-2025)',
    testPeriod: {
      start: simpleDCA.testPeriod.start,
      end: simpleDCA.testPeriod.end,
      totalDays: simpleDCA.testPeriod.totalDays,
      totalYears: simpleDCA.testPeriod.totalYears
    },
    
    // PERFORMANCE COMPARISON
    performance: {
      simple: {
        strategy: 'Simple DCA (Weekly)',
        totalInvested: simpleDCA.finalPortfolio.totalInvested,
        finalValue: simpleDCA.finalPortfolio.totalValue,
        totalReturn: simpleDCA.finalPortfolio.totalReturn,
        totalReturnPercent: simpleDCA.finalPortfolio.totalReturnPercent,
        cagr: simpleDCA.finalPortfolio.cagr,
        btcAllocation: simpleDCA.finalPortfolio.btcAllocation,
        finalBtcBalance: simpleDCA.finalPortfolio.btcBalance,
        finalEurBalance: simpleDCA.finalPortfolio.eurBalance
      },
      logical: {
        strategy: 'Complete Logical DCA (Core 90% + Satellite 10%)',
        totalInvested: logicalDCA.finalPortfolio.totalInvested,
        finalValue: logicalDCA.finalPortfolio.totalValue,
        totalReturn: logicalDCA.finalPortfolio.totalReturn,
        totalReturnPercent: logicalDCA.finalPortfolio.totalReturnPercent,
        cagr: logicalDCA.finalPortfolio.cagr,
        btcAllocation: logicalDCA.finalPortfolio.btcAllocation,
        finalBtcBalance: logicalDCA.finalPortfolio.totalBtcBalance,
        finalEurBalance: logicalDCA.finalPortfolio.totalEurBalance,
        corePortfolio: {
          value: logicalDCA.finalPortfolio.coreValue,
          btcAllocation: logicalDCA.finalPortfolio.coreBtcAllocation,
          btcBalance: logicalDCA.finalPortfolio.coreBtcBalance,
          eurBalance: logicalDCA.finalPortfolio.coreEurBalance
        },
        satellitePortfolio: {
          value: logicalDCA.finalPortfolio.satelliteValue,
          btcAllocation: logicalDCA.finalPortfolio.satelliteBtcAllocation,
          btcBalance: logicalDCA.finalPortfolio.satelliteBtcBalance,
          eurBalance: logicalDCA.finalPortfolio.satelliteEurBalance
        }
      }
    },
    
    // RISK ANALYSIS
    riskAnalysis: {
      simple: {
        volatility: riskMetrics.simple.volatility,
        maxDrawdown: riskMetrics.simple.maxDrawdown,
        sharpeRatio: simpleSharpe
      },
      logical: {
        volatility: riskMetrics.logical.volatility,
        maxDrawdown: riskMetrics.logical.maxDrawdown,
        sharpeRatio: logicalSharpe
      }
    },
    
    // TRADING ACTIVITY
    tradingActivity: {
      simple: {
        totalTrades: simpleDCA.tradeStats.totalTrades,
        buyTrades: simpleDCA.tradeStats.buyTrades,
        sellTrades: simpleDCA.tradeStats.sellTrades,
        avgPurchasePrice: simpleDCA.tradeStats.avgPurchasePrice,
        totalBuyVolume: simpleDCA.tradeStats.totalBuyVolume
      },
      logical: {
        totalTrades: logicalDCA.tradeStats.totalTrades,
        buyTrades: logicalDCA.tradeStats.buyTrades,
        sellTrades: logicalDCA.tradeStats.sellTrades,
        coreRebalanceTrades: logicalDCA.tradeStats.coreRebalanceTrades,
        satelliteDcaTrades: logicalDCA.tradeStats.satelliteDcaTrades,
        totalBuyVolume: logicalDCA.tradeStats.totalBuyVolume,
        totalSellVolume: logicalDCA.tradeStats.totalSellVolume
      }
    },
    
    // KEY DIFFERENCES & INSIGHTS
    insights: {
      returnDifference: {
        absolute: logicalDCA.finalPortfolio.totalReturn - simpleDCA.finalPortfolio.totalReturn,
        percentage: logicalDCA.finalPortfolio.totalReturnPercent - simpleDCA.finalPortfolio.totalReturnPercent,
        cagrDifference: logicalDCA.finalPortfolio.cagr - simpleDCA.finalPortfolio.cagr
      },
      riskAdjustedComparison: {
        simpleRiskAdjustedReturn: simpleDCA.finalPortfolio.totalReturnPercent / (riskMetrics.simple.maxDrawdown * 100),
        logicalRiskAdjustedReturn: logicalDCA.finalPortfolio.totalReturnPercent / (riskMetrics.logical.maxDrawdown * 100)
      },
      efficiency: {
        simple: simpleEfficiency,
        logical: logicalEfficiency,
        difference: logicalEfficiency - simpleEfficiency
      }
    }
  };
  
  // Save comparison report
  const reportPath = path.join(RESULTS_DIR, '4year-strategy-comparison.json');
  fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2));
  
  // Print detailed comparison
  console.log('📊 4-YEAR DCA STRATEGY COMPARISON (2021-2025)');
  console.log('=' .repeat(60));
  
  console.log('\n💰 PERFORMANCE SUMMARY:');
  console.log(`📈 Simple DCA (Weekly):          €${simpleDCA.finalPortfolio.totalReturn.toFixed(0)} return (${simpleDCA.finalPortfolio.totalReturnPercent.toFixed(1)}% | ${simpleDCA.finalPortfolio.cagr.toFixed(1)}% CAGR)`);
  console.log(`🧠 Complete Logical DCA:        €${logicalDCA.finalPortfolio.totalReturn.toFixed(0)} return (${logicalDCA.finalPortfolio.totalReturnPercent.toFixed(1)}% | ${logicalDCA.finalPortfolio.cagr.toFixed(1)}% CAGR)`);
  console.log(`📊 Difference:                  €${comparisonReport.insights.returnDifference.absolute.toFixed(0)} (${comparisonReport.insights.returnDifference.percentage.toFixed(1)}% | ${comparisonReport.insights.returnDifference.cagrDifference.toFixed(1)}% CAGR)`);
  
  console.log('\n🏦 PORTFOLIO ALLOCATION:');
  console.log(`📈 Simple DCA BTC Allocation:   ${simpleDCA.finalPortfolio.btcAllocation.toFixed(1)}%`);
  console.log(`🧠 Logical DCA BTC Allocation:  ${logicalDCA.finalPortfolio.btcAllocation.toFixed(1)}%`);
  console.log(`   └─ Core Portfolio (90%):     ${logicalDCA.finalPortfolio.coreBtcAllocation.toFixed(1)}% BTC`);
  console.log(`   └─ Satellite Portfolio (10%): ${logicalDCA.finalPortfolio.satelliteBtcAllocation.toFixed(1)}% BTC`);
  
  console.log('\n⚖️ RISK ANALYSIS:');
  console.log(`📊 Simple DCA:                  ${(riskMetrics.simple.volatility * 100).toFixed(1)}% volatility, ${(riskMetrics.simple.maxDrawdown * 100).toFixed(1)}% max drawdown`);
  console.log(`🧠 Logical DCA:                 ${(riskMetrics.logical.volatility * 100).toFixed(1)}% volatility, ${(riskMetrics.logical.maxDrawdown * 100).toFixed(1)}% max drawdown`);
  console.log(`📈 Sharpe Ratios:               Simple: ${simpleSharpe.toFixed(2)} | Logical: ${logicalSharpe.toFixed(2)}`);
  
  console.log('\n🔄 TRADING ACTIVITY:');
  console.log(`📈 Simple DCA:                  ${simpleDCA.tradeStats.totalTrades} trades (${simpleDCA.tradeStats.buyTrades} buys, ${simpleDCA.tradeStats.sellTrades} sells)`);
  console.log(`🧠 Logical DCA:                 ${logicalDCA.tradeStats.totalTrades} trades (${logicalDCA.tradeStats.buyTrades} buys, ${logicalDCA.tradeStats.sellTrades} sells)`);
  console.log(`   └─ Core Rebalancing:         ${logicalDCA.tradeStats.coreRebalanceTrades} trades`);
  console.log(`   └─ Satellite DCA:            ${logicalDCA.tradeStats.satelliteDcaTrades} trades`);
  
  console.log('\n🎯 KEY INSIGHTS:');
  if (comparisonReport.insights.returnDifference.absolute > 0) {
    console.log(`✅ Complete Logical DCA outperformed Simple DCA by €${Math.abs(comparisonReport.insights.returnDifference.absolute).toFixed(0)}`);
  } else {
    console.log(`❌ Simple DCA outperformed Complete Logical DCA by €${Math.abs(comparisonReport.insights.returnDifference.absolute).toFixed(0)}`);
  }
  
  if (riskMetrics.logical.maxDrawdown < riskMetrics.simple.maxDrawdown) {
    console.log(`✅ Logical DCA showed lower maximum drawdown (${(riskMetrics.logical.maxDrawdown * 100).toFixed(1)}% vs ${(riskMetrics.simple.maxDrawdown * 100).toFixed(1)}%)`);
  } else {
    console.log(`❌ Simple DCA showed lower maximum drawdown (${(riskMetrics.simple.maxDrawdown * 100).toFixed(1)}% vs ${(riskMetrics.logical.maxDrawdown * 100).toFixed(1)}%)`);
  }
  
  if (logicalSharpe > simpleSharpe) {
    console.log(`✅ Logical DCA achieved better risk-adjusted returns (Sharpe: ${logicalSharpe.toFixed(2)} vs ${simpleSharpe.toFixed(2)})`);
  } else {
    console.log(`❌ Simple DCA achieved better risk-adjusted returns (Sharpe: ${simpleSharpe.toFixed(2)} vs ${logicalSharpe.toFixed(2)})`);
  }
  
  console.log(`\n💾 Comparison report saved to: ${reportPath}`);
  
  return comparisonReport;
}

// Run the comparison
if (require.main === module) {
  create4YearComparisonReport();
}

module.exports = { create4YearComparisonReport };