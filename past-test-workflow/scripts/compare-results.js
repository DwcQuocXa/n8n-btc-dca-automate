// Results Comparison Analysis
// Compares Logical DCA vs Simple DCA strategies

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../results');

function loadResults() {
  try {
    const logicalPath = path.join(RESULTS_DIR, 'logical-dca-results.json');
    const simplePath = path.join(RESULTS_DIR, 'simple-dca-results.json');
    
    const logicalResults = JSON.parse(fs.readFileSync(logicalPath, 'utf8'));
    const simpleResults = JSON.parse(fs.readFileSync(simplePath, 'utf8'));
    
    console.log('📊 Loaded results for comparison');
    return { logicalResults, simpleResults };
    
  } catch (error) {
    console.error('❌ Error loading results:', error.message);
    throw error;
  }
}

function calculateRiskMetrics(dailyResults) {
  const returns = [];
  
  for (let i = 1; i < dailyResults.length; i++) {
    const prevValue = dailyResults[i - 1].totalValue;
    const currValue = dailyResults[i].totalValue;
    
    if (prevValue > 0) {
      const dailyReturn = (currValue - prevValue) / prevValue;
      returns.push(dailyReturn);
    }
  }
  
  if (returns.length === 0) return { volatility: 0, maxDrawdown: 0, sharpeRatio: 0 };
  
  // Calculate volatility (annualized standard deviation)
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 365) * 100; // Annualized percentage
  
  // Calculate maximum drawdown
  let peak = dailyResults[0].totalValue;
  let maxDrawdown = 0;
  
  for (const result of dailyResults) {
    if (result.totalValue > peak) {
      peak = result.totalValue;
    }
    const drawdown = (peak - result.totalValue) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  // Calculate simple Sharpe ratio (assuming 0% risk-free rate)
  const annualizedReturn = avgReturn * 365;
  const sharpeRatio = volatility > 0 ? annualizedReturn / (volatility / 100) : 0;
  
  return {
    volatility: volatility,
    maxDrawdown: maxDrawdown * 100,
    sharpeRatio: sharpeRatio
  };
}

function calculateWinRate(trades) {
  if (trades.length === 0) return 0;
  
  let profitableTrades = 0;
  
  // For buy trades, we consider them profitable if BTC price increased afterward
  // This is a simplified calculation
  for (let i = 0; i < trades.length - 1; i++) {
    const trade = trades[i];
    const nextTrade = trades[i + 1];
    
    if (trade.action === 'BUY' && nextTrade && nextTrade.btcPrice > trade.btcPrice) {
      profitableTrades++;
    } else if (trade.action === 'SELL' && nextTrade && nextTrade.btcPrice < trade.btcPrice) {
      profitableTrades++;
    }
  }
  
  return (profitableTrades / trades.length) * 100;
}

function compareStrategies() {
  console.log('🔍 Starting Strategy Comparison Analysis...');
  
  const { logicalResults, simpleResults } = loadResults();
  
  // Calculate risk metrics for both strategies
  const logicalRisk = calculateRiskMetrics(logicalResults.dailyResults);
  const simpleRisk = calculateRiskMetrics(simpleResults.dailyResults);
  
  // Calculate additional metrics
  const logicalWinRate = calculateWinRate(logicalResults.trades);
  const simpleWinRate = 100; // Simple DCA is always "winning" in terms of accumulation
  
  // Performance comparison
  const performanceComparison = {
    logical: {
      totalReturn: logicalResults.finalPortfolio.totalReturn,
      totalReturnPercent: logicalResults.finalPortfolio.totalReturnPercent,
      finalValue: logicalResults.finalPortfolio.totalValue,
      totalInvested: logicalResults.finalPortfolio.totalInvested,
      btcBalance: logicalResults.finalPortfolio.btcBalance,
      eurBalance: logicalResults.finalPortfolio.eurBalance,
      btcAllocation: logicalResults.finalPortfolio.btcAllocation,
      totalTrades: logicalResults.tradeStats.totalTrades,
      buyTrades: logicalResults.tradeStats.buyTrades,
      sellTrades: logicalResults.tradeStats.sellTrades,
      winRate: logicalWinRate,
      ...logicalRisk
    },
    simple: {
      totalReturn: simpleResults.finalPortfolio.totalReturn,
      totalReturnPercent: simpleResults.finalPortfolio.totalReturnPercent,
      finalValue: simpleResults.finalPortfolio.totalValue,
      totalInvested: simpleResults.finalPortfolio.totalInvested,
      btcBalance: simpleResults.finalPortfolio.btcBalance,
      eurBalance: simpleResults.finalPortfolio.eurBalance,
      btcAllocation: simpleResults.finalPortfolio.btcAllocation,
      totalTrades: simpleResults.tradeStats.totalTrades,
      buyTrades: simpleResults.tradeStats.buyTrades,
      sellTrades: simpleResults.tradeStats.sellTrades,
      winRate: simpleWinRate,
      ...simpleRisk
    }
  };
  
  // Calculate differences
  const returnDifference = performanceComparison.logical.totalReturn - performanceComparison.simple.totalReturn;
  const returnPercentDifference = performanceComparison.logical.totalReturnPercent - performanceComparison.simple.totalReturnPercent;
  const riskAdjustedDifference = performanceComparison.logical.sharpeRatio - performanceComparison.simple.sharpeRatio;
  
  // Determine winner
  const logicalWins = performanceComparison.logical.totalReturn > performanceComparison.simple.totalReturn;
  const winner = logicalWins ? 'Logical DCA (Fear & Greed)' : 'Simple DCA (Weekly)';
  
  // Trade analysis for logical DCA
  const tradesByFearGreed = {};
  const tradeAnalysis = {
    fearGreedDistribution: {},
    avgTradeSize: 0,
    profitabilityByCondition: {}
  };
  
  if (logicalResults.trades.length > 0) {
    // Group trades by Fear & Greed level
    logicalResults.trades.forEach(trade => {
      const fgLevel = trade.fearGreedIndex;
      let category = 'Unknown';
      
      if (fgLevel >= 0 && fgLevel <= 20) category = 'Extreme Fear';
      else if (fgLevel >= 21 && fgLevel <= 30) category = 'Fear';
      else if (fgLevel >= 31 && fgLevel <= 60) category = 'Neutral';
      else if (fgLevel >= 61 && fgLevel <= 70) category = 'Greed';
      else if (fgLevel >= 71 && fgLevel <= 80) category = 'High Greed';
      else if (fgLevel >= 81 && fgLevel <= 100) category = 'Extreme Greed';
      
      if (!tradeAnalysis.fearGreedDistribution[category]) {
        tradeAnalysis.fearGreedDistribution[category] = { count: 0, volume: 0 };
      }
      
      tradeAnalysis.fearGreedDistribution[category].count++;
      tradeAnalysis.fearGreedDistribution[category].volume += trade.eurAmount;
    });
    
    tradeAnalysis.avgTradeSize = logicalResults.tradeStats.totalBuyVolume / logicalResults.tradeStats.buyTrades;
  }
  
  // Final comparison report
  const comparisonReport = {
    testPeriod: {
      start: logicalResults.testPeriod.start,
      end: logicalResults.testPeriod.end,
      totalDays: logicalResults.testPeriod.totalDays
    },
    winner: winner,
    performanceMetrics: performanceComparison,
    differences: {
      absoluteReturn: returnDifference,
      percentReturn: returnPercentDifference,
      riskAdjustedReturn: riskAdjustedDifference,
      volatilityDifference: performanceComparison.logical.volatility - performanceComparison.simple.volatility,
      maxDrawdownDifference: performanceComparison.logical.maxDrawdown - performanceComparison.simple.maxDrawdown
    },
    tradeAnalysis: tradeAnalysis,
    insights: generateInsights(performanceComparison, returnDifference, returnPercentDifference),
    timestamp: new Date().toISOString()
  };
  
  // Save comparison report
  fs.writeFileSync(path.join(RESULTS_DIR, 'comparison-report.json'), JSON.stringify(comparisonReport, null, 2));
  
  // Print detailed comparison
  printComparison(comparisonReport);
  
  return comparisonReport;
}

function generateInsights(performance, returnDiff, percentDiff) {
  const insights = [];
  
  // Performance insights
  if (Math.abs(percentDiff) < 1) {
    insights.push('Both strategies performed very similarly, with only minimal difference in returns.');
  } else if (returnDiff > 0) {
    insights.push(`Logical DCA outperformed Simple DCA by €${returnDiff.toFixed(2)} (${percentDiff.toFixed(2)}%).`);
  } else {
    insights.push(`Simple DCA outperformed Logical DCA by €${Math.abs(returnDiff).toFixed(2)} (${Math.abs(percentDiff).toFixed(2)}%).`);
  }
  
  // Risk insights
  if (performance.logical.volatility > performance.simple.volatility * 1.1) {
    insights.push('Logical DCA showed higher volatility, indicating more risk in the strategy.');
  } else if (performance.logical.volatility < performance.simple.volatility * 0.9) {
    insights.push('Logical DCA showed lower volatility, indicating less risk than simple DCA.');
  }
  
  // Drawdown insights
  if (performance.logical.maxDrawdown > performance.simple.maxDrawdown * 1.1) {
    insights.push('Logical DCA experienced larger maximum drawdowns, suggesting higher downside risk.');
  }
  
  // Trading activity insights
  if (performance.logical.totalTrades > 100) {
    insights.push('Logical DCA was very active with frequent trading based on market sentiment.');
  } else if (performance.logical.totalTrades < 20) {
    insights.push('Logical DCA was conservative with relatively few trades executed.');
  }
  
  // Allocation insights
  if (performance.logical.btcAllocation < 50) {
    insights.push('Logical DCA maintained a conservative BTC allocation, keeping significant EUR reserves.');
  } else if (performance.logical.btcAllocation > 90) {
    insights.push('Logical DCA achieved nearly full BTC allocation, similar to simple DCA approach.');
  }
  
  return insights;
}

function printComparison(report) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 STRATEGY COMPARISON RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n🏆 Winner: ${report.winner}`);
  console.log(`📅 Test Period: ${report.testPeriod.start} to ${report.testPeriod.end} (${report.testPeriod.totalDays} days)`);
  
  console.log('\n💰 PERFORMANCE COMPARISON:');
  console.log('─'.repeat(50));
  console.log(`                          Logical DCA  │  Simple DCA  │  Difference`);
  console.log('─'.repeat(50));
  console.log(`Total Return (EUR)        €${report.performanceMetrics.logical.totalReturn.toFixed(2).padStart(10)} │ €${report.performanceMetrics.simple.totalReturn.toFixed(2).padStart(10)} │ €${report.differences.absoluteReturn.toFixed(2)}`);
  console.log(`Total Return (%)           ${report.performanceMetrics.logical.totalReturnPercent.toFixed(2).padStart(9)}% │  ${report.performanceMetrics.simple.totalReturnPercent.toFixed(2).padStart(9)}% │  ${report.differences.percentReturn.toFixed(2)}%`);
  console.log(`Final Portfolio Value     €${report.performanceMetrics.logical.finalValue.toFixed(2).padStart(10)} │ €${report.performanceMetrics.simple.finalValue.toFixed(2).padStart(10)} │`);
  console.log(`BTC Balance (BTC)          ${report.performanceMetrics.logical.btcBalance.toFixed(8).padStart(10)} │  ${report.performanceMetrics.simple.btcBalance.toFixed(8).padStart(10)} │`);
  console.log(`EUR Balance (EUR)         €${report.performanceMetrics.logical.eurBalance.toFixed(2).padStart(10)} │ €${report.performanceMetrics.simple.eurBalance.toFixed(2).padStart(10)} │`);
  console.log(`BTC Allocation (%)         ${report.performanceMetrics.logical.btcAllocation.toFixed(1).padStart(9)}% │  ${report.performanceMetrics.simple.btcAllocation.toFixed(1).padStart(9)}% │`);
  
  console.log('\n📈 RISK METRICS:');
  console.log('─'.repeat(50));
  console.log(`Volatility (%)             ${report.performanceMetrics.logical.volatility.toFixed(2).padStart(9)}% │  ${report.performanceMetrics.simple.volatility.toFixed(2).padStart(9)}% │  ${report.differences.volatilityDifference.toFixed(2)}%`);
  console.log(`Max Drawdown (%)           ${report.performanceMetrics.logical.maxDrawdown.toFixed(2).padStart(9)}% │  ${report.performanceMetrics.simple.maxDrawdown.toFixed(2).padStart(9)}% │  ${report.differences.maxDrawdownDifference.toFixed(2)}%`);
  console.log(`Sharpe Ratio               ${report.performanceMetrics.logical.sharpeRatio.toFixed(3).padStart(10)} │  ${report.performanceMetrics.simple.sharpeRatio.toFixed(3).padStart(10)} │  ${report.differences.riskAdjustedReturn.toFixed(3)}`);
  
  console.log('\n🔄 TRADING ACTIVITY:');
  console.log('─'.repeat(50));
  console.log(`Total Trades               ${report.performanceMetrics.logical.totalTrades.toString().padStart(10)} │  ${report.performanceMetrics.simple.totalTrades.toString().padStart(10)} │`);
  console.log(`Buy Trades                 ${report.performanceMetrics.logical.buyTrades.toString().padStart(10)} │  ${report.performanceMetrics.simple.buyTrades.toString().padStart(10)} │`);
  console.log(`Sell Trades                ${report.performanceMetrics.logical.sellTrades.toString().padStart(10)} │  ${report.performanceMetrics.simple.sellTrades.toString().padStart(10)} │`);
  
  if (Object.keys(report.tradeAnalysis.fearGreedDistribution).length > 0) {
    console.log('\n😨 LOGICAL DCA - FEAR & GREED BREAKDOWN:');
    console.log('─'.repeat(40));
    Object.entries(report.tradeAnalysis.fearGreedDistribution).forEach(([level, data]) => {
      console.log(`${level.padEnd(15)}: ${data.count.toString().padStart(3)} trades (€${data.volume.toFixed(0)})`);
    });
  }
  
  console.log('\n💡 KEY INSIGHTS:');
  console.log('─'.repeat(40));
  report.insights.forEach((insight, index) => {
    console.log(`${index + 1}. ${insight}`);
  });
  
  console.log(`\n💾 Detailed report saved to: ${path.join(RESULTS_DIR, 'comparison-report.json')}`);
  console.log('='.repeat(80));
}

// Run the comparison
if (require.main === module) {
  compareStrategies();
}

module.exports = { compareStrategies };