// Complete Results Comparison Analysis - 3 Years
// Compares 3 strategies: Simple DCA, Logical DCA (Daily Only), Complete Logical DCA (Daily + Monthly Rebalancing)

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../results');

function loadAllResults() {
  try {
    const simplePath = path.join(RESULTS_DIR, 'simple-dca-results-extended.json');
    const logicalPath = path.join(RESULTS_DIR, 'logical-dca-results-extended.json');
    const completePath = path.join(RESULTS_DIR, 'complete-logical-dca-results.json');
    
    const simpleResults = JSON.parse(fs.readFileSync(simplePath, 'utf8'));
    const logicalResults = JSON.parse(fs.readFileSync(logicalPath, 'utf8'));
    const completeResults = JSON.parse(fs.readFileSync(completePath, 'utf8'));
    
    console.log('📊 Loaded all three strategy results for comparison');
    return { simpleResults, logicalResults, completeResults };
    
  } catch (error) {
    console.error('❌ Error loading results:', error.message);
    throw error;
  }
}

function calculateAdvancedRiskMetrics(dailyResults) {
  const returns = [];
  
  for (let i = 1; i < dailyResults.length; i++) {
    const prevValue = dailyResults[i - 1].totalValue;
    const currValue = dailyResults[i].totalValue;
    
    if (prevValue > 0) {
      const dailyReturn = (currValue - prevValue) / prevValue;
      returns.push(dailyReturn);
    }
  }
  
  if (returns.length === 0) return { volatility: 0, maxDrawdown: 0, sharpeRatio: 0, sortino: 0 };
  
  // Calculate volatility (annualized)
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 365) * 100;
  
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
  
  // Calculate Sharpe ratio
  const annualizedReturn = avgReturn * 365;
  const sharpeRatio = volatility > 0 ? annualizedReturn / (volatility / 100) : 0;
  
  // Calculate Sortino ratio (downside deviation)
  const downReturns = returns.filter(r => r < 0);
  let sortino = 0;
  if (downReturns.length > 0) {
    const downVariance = downReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downReturns.length;
    const downDeviation = Math.sqrt(downVariance * 365) * 100;
    sortino = downDeviation > 0 ? annualizedReturn / (downDeviation / 100) : 0;
  } else {
    sortino = 999; // No negative returns
  }
  
  // Calculate VaR (Value at Risk) at 95% confidence
  const sortedReturns = returns.sort((a, b) => a - b);
  const var95 = sortedReturns[Math.floor(returns.length * 0.05)] * 100;
  
  // Calculate Calmar ratio (return / max drawdown)
  const calmar = maxDrawdown > 0 ? (annualizedReturn * 100) / (maxDrawdown * 100) : 0;
  
  return {
    volatility: volatility,
    maxDrawdown: maxDrawdown * 100,
    sharpeRatio: sharpeRatio,
    sortino: sortino === 999 ? 999 : sortino,
    var95: var95,
    calmar: calmar
  };
}

function generateCompleteInsights(performance) {
  const insights = [];
  
  // Performance ranking insights
  const strategies = ['Simple DCA', 'Logical DCA (Daily Only)', 'Complete Logical DCA'];
  const returns = [
    performance.simple.totalReturn,
    performance.logical.totalReturn,
    performance.complete.totalReturn
  ];
  
  const sortedStrategies = strategies
    .map((name, index) => ({ name, return: returns[index] }))
    .sort((a, b) => b.return - a.return);
  
  insights.push(`Performance Ranking: 1st ${sortedStrategies[0].name} (€${sortedStrategies[0].return.toFixed(0)}), 2nd ${sortedStrategies[1].name} (€${sortedStrategies[1].return.toFixed(0)}), 3rd ${sortedStrategies[2].name} (€${sortedStrategies[2].return.toFixed(0)})`);
  
  // Monthly rebalancing impact
  const rebalancingImpact = performance.complete.totalReturn - performance.logical.totalReturn;
  if (Math.abs(rebalancingImpact) > 1000) {
    if (rebalancingImpact > 0) {
      insights.push(`Monthly rebalancing significantly improved performance by €${rebalancingImpact.toFixed(0)} compared to daily-only strategy.`);
    } else {
      insights.push(`Monthly rebalancing reduced performance by €${Math.abs(rebalancingImpact).toFixed(0)} compared to daily-only strategy.`);
    }
  } else {
    insights.push('Monthly rebalancing had minimal impact on overall performance compared to daily-only strategy.');
  }
  
  // BTC allocation insights
  if (performance.complete.btcAllocation < 10) {
    insights.push('Complete strategy remained extremely conservative with very low BTC allocation despite rebalancing mechanism.');
  } else if (performance.complete.btcAllocation > performance.logical.btcAllocation * 2) {
    insights.push('Monthly rebalancing successfully increased BTC allocation compared to daily-only strategy.');
  }
  
  // Trading activity insights
  const completeTradeRatio = performance.complete.totalTrades / performance.logical.totalTrades;
  if (completeTradeRatio > 1.2) {
    insights.push('Complete strategy had significantly more trading activity due to monthly rebalancing.');
  }
  
  // CAGR comparison
  const bestCAGR = Math.max(performance.simple.cagr, performance.logical.cagr, performance.complete.cagr);
  const worstCAGR = Math.min(performance.simple.cagr, performance.logical.cagr, performance.complete.cagr);
  const cagrSpread = bestCAGR - worstCAGR;
  
  if (cagrSpread > 20) {
    insights.push(`Large performance gap: ${cagrSpread.toFixed(1)}% CAGR difference between best and worst strategies.`);
  }
  
  // Risk insights
  if (performance.complete.volatility < performance.logical.volatility) {
    insights.push('Complete strategy achieved lower volatility than daily-only strategy through rebalancing.');
  }
  
  return insights;
}

function compareCompleteStrategies() {
  console.log('🔍 Starting Complete Strategy Comparison Analysis (3 Strategies - 3 Years)...');
  
  const { simpleResults, logicalResults, completeResults } = loadAllResults();
  
  // Calculate advanced risk metrics for all strategies
  const simpleRisk = calculateAdvancedRiskMetrics(simpleResults.dailyResults);
  const logicalRisk = calculateAdvancedRiskMetrics(logicalResults.dailyResults);
  const completeRisk = calculateAdvancedRiskMetrics(completeResults.dailyResults);
  
  // Enhanced performance comparison
  const performanceComparison = {
    simple: {
      name: 'Simple DCA (Weekly)',
      totalReturn: simpleResults.finalPortfolio.totalReturn,
      totalReturnPercent: simpleResults.finalPortfolio.totalReturnPercent,
      cagr: simpleResults.finalPortfolio.cagr,
      finalValue: simpleResults.finalPortfolio.totalValue,
      totalInvested: simpleResults.finalPortfolio.totalInvested,
      btcBalance: simpleResults.finalPortfolio.btcBalance,
      eurBalance: simpleResults.finalPortfolio.eurBalance,
      btcAllocation: simpleResults.finalPortfolio.btcAllocation,
      totalTrades: simpleResults.tradeStats.totalTrades,
      buyTrades: simpleResults.tradeStats.buyTrades,
      sellTrades: simpleResults.tradeStats.sellTrades,
      testDuration: simpleResults.testPeriod.totalYears,
      ...simpleRisk
    },
    logical: {
      name: 'Logical DCA (Daily Only)',
      totalReturn: logicalResults.finalPortfolio.totalReturn,
      totalReturnPercent: logicalResults.finalPortfolio.totalReturnPercent,
      cagr: ((Math.pow(logicalResults.finalPortfolio.totalValue / logicalResults.finalPortfolio.totalInvested, 1/logicalResults.testPeriod.totalYears) - 1) * 100),
      finalValue: logicalResults.finalPortfolio.totalValue,
      totalInvested: logicalResults.finalPortfolio.totalInvested,
      btcBalance: logicalResults.finalPortfolio.btcBalance,
      eurBalance: logicalResults.finalPortfolio.eurBalance,
      btcAllocation: logicalResults.finalPortfolio.btcAllocation,
      totalTrades: logicalResults.tradeStats.totalTrades,
      buyTrades: logicalResults.tradeStats.buyTrades,
      sellTrades: logicalResults.tradeStats.sellTrades,
      testDuration: logicalResults.testPeriod.totalYears,
      ...logicalRisk
    },
    complete: {
      name: 'Complete Logical DCA (Daily + Rebalancing)',
      totalReturn: completeResults.finalPortfolio.totalReturn,
      totalReturnPercent: completeResults.finalPortfolio.totalReturnPercent,
      cagr: completeResults.finalPortfolio.cagr,
      finalValue: completeResults.finalPortfolio.totalValue,
      totalInvested: completeResults.finalPortfolio.totalInvested,
      btcBalance: completeResults.finalPortfolio.btcBalance,
      eurBalance: completeResults.finalPortfolio.eurBalance,
      btcAllocation: completeResults.finalPortfolio.btcAllocation,
      totalTrades: completeResults.tradeStats.totalTrades,
      dcaTrades: completeResults.tradeStats.dcaTrades,
      rebalanceTrades: completeResults.tradeStats.rebalanceTrades,
      buyTrades: completeResults.tradeStats.buyTrades,
      sellTrades: completeResults.tradeStats.sellTrades,
      testDuration: completeResults.testPeriod.totalYears,
      ...completeRisk
    }
  };
  
  // Determine winner
  const returns = [
    { name: 'Simple DCA', return: performanceComparison.simple.totalReturn },
    { name: 'Logical DCA (Daily Only)', return: performanceComparison.logical.totalReturn },
    { name: 'Complete Logical DCA', return: performanceComparison.complete.totalReturn }
  ];
  const winner = returns.reduce((prev, current) => (prev.return > current.return) ? prev : current);
  
  // Generate insights
  const insights = generateCompleteInsights(performanceComparison);
  
  // Create comprehensive comparison report
  const completeComparisonReport = {
    testPeriod: {
      start: completeResults.testPeriod.start,
      end: completeResults.testPeriod.end,
      totalDays: completeResults.testPeriod.totalDays,
      totalYears: completeResults.testPeriod.totalYears
    },
    winner: winner.name,
    performanceMetrics: performanceComparison,
    monthlyRebalancingImpact: {
      returnDifference: performanceComparison.complete.totalReturn - performanceComparison.logical.totalReturn,
      percentDifference: performanceComparison.complete.totalReturnPercent - performanceComparison.logical.totalReturnPercent,
      cagrDifference: performanceComparison.complete.cagr - performanceComparison.logical.cagr,
      allocationDifference: performanceComparison.complete.btcAllocation - performanceComparison.logical.btcAllocation,
      tradesDifference: performanceComparison.complete.totalTrades - performanceComparison.logical.totalTrades
    },
    insights: insights,
    timestamp: new Date().toISOString()
  };
  
  // Save comparison report
  fs.writeFileSync(path.join(RESULTS_DIR, 'complete-comparison-report.json'), JSON.stringify(completeComparisonReport, null, 2));
  
  // Print comprehensive comparison
  printCompleteComparison(completeComparisonReport);
  
  return completeComparisonReport;
}

function printCompleteComparison(report) {
  console.log('\\n' + '='.repeat(120));
  console.log('📊 COMPLETE STRATEGY COMPARISON RESULTS (3 STRATEGIES - 3 YEARS)');
  console.log('='.repeat(120));
  
  console.log(`\\n🏆 Winner: ${report.winner}`);
  console.log(`📅 Test Period: ${report.testPeriod.start} to ${report.testPeriod.end} (${report.testPeriod.totalYears} years)`);
  
  console.log('\\n💰 PERFORMANCE COMPARISON:');
  console.log('─'.repeat(120));
  console.log(`                                    Simple DCA    │ Logical (Daily) │ Complete Logical │`);
  console.log('─'.repeat(120));
  console.log(`Total Return (EUR)               €${report.performanceMetrics.simple.totalReturn.toFixed(0).padStart(12)} │ €${report.performanceMetrics.logical.totalReturn.toFixed(0).padStart(14)} │ €${report.performanceMetrics.complete.totalReturn.toFixed(0).padStart(15)} │`);
  console.log(`Total Return (%)                  ${report.performanceMetrics.simple.totalReturnPercent.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.totalReturnPercent.toFixed(1).padStart(13)}% │  ${report.performanceMetrics.complete.totalReturnPercent.toFixed(1).padStart(14)}% │`);
  console.log(`CAGR (%)                          ${report.performanceMetrics.simple.cagr.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.cagr.toFixed(1).padStart(13)}% │  ${report.performanceMetrics.complete.cagr.toFixed(1).padStart(14)}% │`);
  console.log(`Final Portfolio Value          €${report.performanceMetrics.simple.finalValue.toFixed(0).padStart(12)} │ €${report.performanceMetrics.logical.finalValue.toFixed(0).padStart(14)} │ €${report.performanceMetrics.complete.finalValue.toFixed(0).padStart(15)} │`);
  console.log(`BTC Balance (BTC)                 ${report.performanceMetrics.simple.btcBalance.toFixed(8).padStart(12)} │  ${report.performanceMetrics.logical.btcBalance.toFixed(8).padStart(14)} │  ${report.performanceMetrics.complete.btcBalance.toFixed(8).padStart(15)} │`);
  console.log(`EUR Balance (EUR)              €${report.performanceMetrics.simple.eurBalance.toFixed(0).padStart(12)} │ €${report.performanceMetrics.logical.eurBalance.toFixed(0).padStart(14)} │ €${report.performanceMetrics.complete.eurBalance.toFixed(0).padStart(15)} │`);
  console.log(`BTC Allocation (%)                ${report.performanceMetrics.simple.btcAllocation.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.btcAllocation.toFixed(1).padStart(13)}% │  ${report.performanceMetrics.complete.btcAllocation.toFixed(1).padStart(14)}% │`);
  
  console.log('\\n📈 ADVANCED RISK METRICS:');
  console.log('─'.repeat(120));
  console.log(`Volatility (%)                    ${report.performanceMetrics.simple.volatility.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.volatility.toFixed(1).padStart(13)}% │  ${report.performanceMetrics.complete.volatility.toFixed(1).padStart(14)}% │`);
  console.log(`Max Drawdown (%)                  ${report.performanceMetrics.simple.maxDrawdown.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.maxDrawdown.toFixed(1).padStart(13)}% │  ${report.performanceMetrics.complete.maxDrawdown.toFixed(1).padStart(14)}% │`);
  console.log(`Sharpe Ratio                      ${report.performanceMetrics.simple.sharpeRatio.toFixed(2).padStart(12)} │  ${report.performanceMetrics.logical.sharpeRatio.toFixed(2).padStart(14)} │  ${report.performanceMetrics.complete.sharpeRatio.toFixed(2).padStart(15)} │`);
  console.log(`Sortino Ratio                     ${Math.min(report.performanceMetrics.simple.sortino, 99).toFixed(2).padStart(12)} │  ${Math.min(report.performanceMetrics.logical.sortino, 99).toFixed(2).padStart(14)} │  ${Math.min(report.performanceMetrics.complete.sortino, 99).toFixed(2).padStart(15)} │`);
  console.log(`VaR 95% (%)                       ${report.performanceMetrics.simple.var95.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.var95.toFixed(1).padStart(13)}% │  ${report.performanceMetrics.complete.var95.toFixed(1).padStart(14)}% │`);
  
  console.log('\\n🔄 TRADING ACTIVITY:');
  console.log('─'.repeat(100));
  console.log(`Total Trades                      ${report.performanceMetrics.simple.totalTrades.toString().padStart(12)} │  ${report.performanceMetrics.logical.totalTrades.toString().padStart(14)} │  ${report.performanceMetrics.complete.totalTrades.toString().padStart(15)} │`);
  console.log(`Buy Trades                        ${report.performanceMetrics.simple.buyTrades.toString().padStart(12)} │  ${report.performanceMetrics.logical.buyTrades.toString().padStart(14)} │  ${report.performanceMetrics.complete.buyTrades.toString().padStart(15)} │`);
  console.log(`Sell Trades                       ${report.performanceMetrics.simple.sellTrades.toString().padStart(12)} │  ${report.performanceMetrics.logical.sellTrades.toString().padStart(14)} │  ${report.performanceMetrics.complete.sellTrades.toString().padStart(15)} │`);
  if (report.performanceMetrics.complete.dcaTrades !== undefined) {
    console.log(`DCA Trades                        ${'N/A'.padStart(12)} │  ${'N/A'.padStart(14)} │  ${report.performanceMetrics.complete.dcaTrades.toString().padStart(15)} │`);
    console.log(`Rebalance Trades                  ${'N/A'.padStart(12)} │  ${'N/A'.padStart(14)} │  ${report.performanceMetrics.complete.rebalanceTrades.toString().padStart(15)} │`);
  }
  
  console.log('\\n⚖️ MONTHLY REBALANCING IMPACT:');
  console.log('─'.repeat(80));
  console.log(`Return Impact: €${report.monthlyRebalancingImpact.returnDifference.toFixed(0)} (${report.monthlyRebalancingImpact.percentDifference.toFixed(1)}% difference)`);
  console.log(`CAGR Impact: ${report.monthlyRebalancingImpact.cagrDifference.toFixed(1)}% per year`);
  console.log(`Allocation Impact: ${report.monthlyRebalancingImpact.allocationDifference.toFixed(1)}% BTC allocation difference`);
  console.log(`Trading Impact: ${report.monthlyRebalancingImpact.tradesDifference} additional trades`);
  
  console.log('\\n💡 KEY INSIGHTS:');
  console.log('─'.repeat(80));
  report.insights.forEach((insight, index) => {
    console.log(`${index + 1}. ${insight}`);
  });
  
  console.log(`\\n💾 Complete comparison report saved to: ${path.join(RESULTS_DIR, 'complete-comparison-report.json')}`);
  console.log('='.repeat(120));
}

// Run the complete comparison
if (require.main === module) {
  compareCompleteStrategies();
}

module.exports = { compareCompleteStrategies };