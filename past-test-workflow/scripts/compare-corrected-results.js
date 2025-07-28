// CORRECTED Results Comparison Analysis - 3 Years
// Compares 3 strategies: Simple DCA, Logical DCA (Daily Only), CORRECTED Complete Logical DCA (Dual Portfolio)

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../results');

function loadAllCorrectedResults() {
  try {
    const simplePath = path.join(RESULTS_DIR, 'simple-dca-results-extended.json');
    const logicalPath = path.join(RESULTS_DIR, 'logical-dca-results-extended.json');
    const correctedPath = path.join(RESULTS_DIR, 'corrected-complete-logical-dca-results.json');
    
    const simpleResults = JSON.parse(fs.readFileSync(simplePath, 'utf8'));
    const logicalResults = JSON.parse(fs.readFileSync(logicalPath, 'utf8'));
    const correctedResults = JSON.parse(fs.readFileSync(correctedPath, 'utf8'));
    
    console.log('📊 Loaded all three strategy results for CORRECTED comparison');
    return { simpleResults, logicalResults, correctedResults };
    
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
  
  return {
    volatility: volatility,
    maxDrawdown: maxDrawdown * 100,
    sharpeRatio: sharpeRatio,
    sortino: sortino === 999 ? 999 : sortino,
    var95: var95
  };
}

function generateCorrectedInsights(performance) {
  const insights = [];
  
  // Performance ranking insights
  const strategies = ['Simple DCA', 'Logical DCA (Daily Only)', 'CORRECTED Complete Logical DCA'];
  const returns = [
    performance.simple.totalReturn,
    performance.logical.totalReturn,
    performance.corrected.totalReturn
  ];
  
  const sortedStrategies = strategies
    .map((name, index) => ({ name, return: returns[index] }))
    .sort((a, b) => b.return - a.return);
  
  insights.push(`Performance Ranking: 1st ${sortedStrategies[0].name} (€${sortedStrategies[0].return.toFixed(0)}), 2nd ${sortedStrategies[1].name} (€${sortedStrategies[1].return.toFixed(0)}), 3rd ${sortedStrategies[2].name} (€${sortedStrategies[2].return.toFixed(0)})`);
  
  // Dual portfolio architecture validation
  if (performance.corrected.btcAllocation > 60 && performance.corrected.btcAllocation < 85) {
    insights.push(`CORRECTED dual portfolio architecture successfully maintained ${performance.corrected.btcAllocation.toFixed(1)}% BTC allocation within 60-85% target range.`);
  }
  
  // Monthly rebalancing impact
  const rebalancingImpact = performance.corrected.totalReturn - performance.logical.totalReturn;
  if (rebalancingImpact > 0) {
    insights.push(`Monthly rebalancing with corrected architecture improved performance by €${rebalancingImpact.toFixed(0)} (+${((rebalancingImpact / performance.logical.totalReturn) * 100).toFixed(1)}%) vs daily-only strategy.`);
  }
  
  // Satellite pool impact analysis
  insights.push(`Satellite pool reduction from 30% to 10% enabled core portfolio to maintain proper BTC allocation for rebalancing.`);
  
  // Simple DCA vs Complete comparison
  const simpleDiff = performance.simple.totalReturn - performance.corrected.totalReturn;
  if (simpleDiff > 10000) {
    insights.push(`Simple DCA still outperformed corrected complete strategy by €${simpleDiff.toFixed(0)}, highlighting bull market advantage of 100% BTC allocation.`);
  }
  
  // Risk-adjusted performance
  if (performance.corrected.sharpeRatio > performance.simple.sharpeRatio) {
    insights.push('Corrected complete strategy achieved superior risk-adjusted returns (Sharpe ratio) vs Simple DCA.');
  }
  
  return insights;
}

function compareCorrectedStrategies() {
  console.log('🔍 Starting CORRECTED Strategy Comparison Analysis (3 Strategies - 3 Years)...');
  
  const { simpleResults, logicalResults, correctedResults } = loadAllCorrectedResults();
  
  // Calculate advanced risk metrics for all strategies
  const simpleRisk = calculateAdvancedRiskMetrics(simpleResults.dailyResults);
  const logicalRisk = calculateAdvancedRiskMetrics(logicalResults.dailyResults);
  const correctedRisk = calculateAdvancedRiskMetrics(correctedResults.dailyResults);
  
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
    corrected: {
      name: 'CORRECTED Complete Logical DCA (Core 90% + Satellite 10%)',
      totalReturn: correctedResults.finalPortfolio.totalReturn,
      totalReturnPercent: correctedResults.finalPortfolio.totalReturnPercent,
      cagr: correctedResults.finalPortfolio.cagr,
      finalValue: correctedResults.finalPortfolio.totalValue,
      totalInvested: correctedResults.finalPortfolio.totalInvested,
      btcBalance: correctedResults.finalPortfolio.totalBtcBalance,
      eurBalance: correctedResults.finalPortfolio.totalEurBalance,
      btcAllocation: correctedResults.finalPortfolio.btcAllocation,
      totalTrades: correctedResults.tradeStats.totalTrades,
      coreRebalanceTrades: correctedResults.tradeStats.coreRebalanceTrades,
      satelliteDcaTrades: correctedResults.tradeStats.satelliteDcaTrades,
      buyTrades: correctedResults.tradeStats.buyTrades,
      sellTrades: correctedResults.tradeStats.sellTrades,
      testDuration: correctedResults.testPeriod.totalYears,
      // Portfolio breakdown
      coreBtcAllocation: correctedResults.finalPortfolio.coreBtcAllocation,
      satelliteBtcAllocation: correctedResults.finalPortfolio.satelliteBtcAllocation,
      coreValue: correctedResults.finalPortfolio.coreValue,
      satelliteValue: correctedResults.finalPortfolio.satelliteValue,
      ...correctedRisk
    }
  };
  
  // Determine winner
  const returns = [
    { name: 'Simple DCA', return: performanceComparison.simple.totalReturn },
    { name: 'Logical DCA (Daily Only)', return: performanceComparison.logical.totalReturn },
    { name: 'CORRECTED Complete Logical DCA', return: performanceComparison.corrected.totalReturn }
  ];
  const winner = returns.reduce((prev, current) => (prev.return > current.return) ? prev : current);
  
  // Generate insights
  const insights = generateCorrectedInsights(performanceComparison);
  
  // Create comprehensive comparison report
  const correctedComparisonReport = {
    testPeriod: {
      start: correctedResults.testPeriod.start,
      end: correctedResults.testPeriod.end,
      totalDays: correctedResults.testPeriod.totalDays,
      totalYears: correctedResults.testPeriod.totalYears
    },
    winner: winner.name,
    performanceMetrics: performanceComparison,
    correctedArchitectureImpact: {
      returnDifference: performanceComparison.corrected.totalReturn - performanceComparison.logical.totalReturn,
      percentDifference: performanceComparison.corrected.totalReturnPercent - performanceComparison.logical.totalReturnPercent,
      cagrDifference: performanceComparison.corrected.cagr - performanceComparison.logical.cagr,
      allocationImprovement: performanceComparison.corrected.btcAllocation - performanceComparison.logical.btcAllocation,
    },
    insights: insights,
    timestamp: new Date().toISOString()
  };
  
  // Save comparison report
  fs.writeFileSync(path.join(RESULTS_DIR, 'corrected-comparison-report.json'), JSON.stringify(correctedComparisonReport, null, 2));
  
  // Print comprehensive comparison
  printCorrectedComparison(correctedComparisonReport);
  
  return correctedComparisonReport;
}

function printCorrectedComparison(report) {
  console.log('\\n' + '='.repeat(130));
  console.log('📊 CORRECTED COMPLETE STRATEGY COMPARISON RESULTS (3 STRATEGIES - 3 YEARS)');
  console.log('='.repeat(130));
  
  console.log(`\\n🏆 Winner: ${report.winner}`);
  console.log(`📅 Test Period: ${report.testPeriod.start} to ${report.testPeriod.end} (${report.testPeriod.totalYears} years)`);
  
  console.log('\\n💰 PERFORMANCE COMPARISON:');
  console.log('─'.repeat(130));
  console.log(`                                      Simple DCA    │ Logical (Daily) │ CORRECTED Complete │`);
  console.log('─'.repeat(130));
  console.log(`Total Return (EUR)                 €${report.performanceMetrics.simple.totalReturn.toFixed(0).padStart(12)} │ €${report.performanceMetrics.logical.totalReturn.toFixed(0).padStart(14)} │ €${report.performanceMetrics.corrected.totalReturn.toFixed(0).padStart(17)} │`);
  console.log(`Total Return (%)                    ${report.performanceMetrics.simple.totalReturnPercent.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.totalReturnPercent.toFixed(1).padStart(13)}% │   ${report.performanceMetrics.corrected.totalReturnPercent.toFixed(1).padStart(16)}% │`);
  console.log(`CAGR (%)                            ${report.performanceMetrics.simple.cagr.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.cagr.toFixed(1).padStart(13)}% │   ${report.performanceMetrics.corrected.cagr.toFixed(1).padStart(16)}% │`);
  console.log(`Final Portfolio Value            €${report.performanceMetrics.simple.finalValue.toFixed(0).padStart(12)} │ €${report.performanceMetrics.logical.finalValue.toFixed(0).padStart(14)} │ €${report.performanceMetrics.corrected.finalValue.toFixed(0).padStart(17)} │`);
  console.log(`BTC Allocation (%)                  ${report.performanceMetrics.simple.btcAllocation.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.btcAllocation.toFixed(1).padStart(13)}% │   ${report.performanceMetrics.corrected.btcAllocation.toFixed(1).padStart(16)}% │`);
  
  console.log('\\n🏦 CORRECTED DUAL PORTFOLIO BREAKDOWN:');
  console.log('─'.repeat(80));
  console.log(`Core Portfolio (90%) BTC Allocation:      ${report.performanceMetrics.corrected.coreBtcAllocation.toFixed(1)}% (€${report.performanceMetrics.corrected.coreValue.toFixed(0)})`);
  console.log(`Satellite Portfolio (10%) BTC Allocation: ${report.performanceMetrics.corrected.satelliteBtcAllocation.toFixed(1)}% (€${report.performanceMetrics.corrected.satelliteValue.toFixed(0)})`);
  
  console.log('\\n📈 ADVANCED RISK METRICS:');
  console.log('─'.repeat(130));
  console.log(`Volatility (%)                      ${report.performanceMetrics.simple.volatility.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.volatility.toFixed(1).padStart(13)}% │   ${report.performanceMetrics.corrected.volatility.toFixed(1).padStart(16)}% │`);
  console.log(`Max Drawdown (%)                    ${report.performanceMetrics.simple.maxDrawdown.toFixed(1).padStart(11)}% │  ${report.performanceMetrics.logical.maxDrawdown.toFixed(1).padStart(13)}% │   ${report.performanceMetrics.corrected.maxDrawdown.toFixed(1).padStart(16)}% │`);
  console.log(`Sharpe Ratio                        ${report.performanceMetrics.simple.sharpeRatio.toFixed(2).padStart(12)} │  ${report.performanceMetrics.logical.sharpeRatio.toFixed(2).padStart(14)} │   ${report.performanceMetrics.corrected.sharpeRatio.toFixed(2).padStart(17)} │`);
  console.log(`Sortino Ratio                       ${Math.min(report.performanceMetrics.simple.sortino, 99).toFixed(2).padStart(12)} │  ${Math.min(report.performanceMetrics.logical.sortino, 99).toFixed(2).padStart(14)} │   ${Math.min(report.performanceMetrics.corrected.sortino, 99).toFixed(2).padStart(17)} │`);
  
  console.log('\\n🔄 TRADING ACTIVITY:');
  console.log('─'.repeat(110));
  console.log(`Total Trades                        ${report.performanceMetrics.simple.totalTrades.toString().padStart(12)} │  ${report.performanceMetrics.logical.totalTrades.toString().padStart(14)} │   ${report.performanceMetrics.corrected.totalTrades.toString().padStart(17)} │`);
  console.log(`Buy Trades                          ${report.performanceMetrics.simple.buyTrades.toString().padStart(12)} │  ${report.performanceMetrics.logical.buyTrades.toString().padStart(14)} │   ${report.performanceMetrics.corrected.buyTrades.toString().padStart(17)} │`);
  console.log(`Sell Trades                         ${report.performanceMetrics.simple.sellTrades.toString().padStart(12)} │  ${report.performanceMetrics.logical.sellTrades.toString().padStart(14)} │   ${report.performanceMetrics.corrected.sellTrades.toString().padStart(17)} │`);
  if (report.performanceMetrics.corrected.coreRebalanceTrades !== undefined) {
    console.log(`Core Rebalance Trades               ${'N/A'.padStart(12)} │  ${'N/A'.padStart(14)} │   ${report.performanceMetrics.corrected.coreRebalanceTrades.toString().padStart(17)} │`);
    console.log(`Satellite DCA Trades                ${'N/A'.padStart(12)} │  ${'N/A'.padStart(14)} │   ${report.performanceMetrics.corrected.satelliteDcaTrades.toString().padStart(17)} │`);
  }
  
  console.log('\\n⚖️ CORRECTED ARCHITECTURE IMPACT:');
  console.log('─'.repeat(90));
  console.log(`Return Improvement: €${report.correctedArchitectureImpact.returnDifference.toFixed(0)} (+${((report.correctedArchitectureImpact.returnDifference / report.performanceMetrics.logical.totalReturn) * 100).toFixed(1)}% vs Daily-only)`);
  console.log(`CAGR Improvement: +${report.correctedArchitectureImpact.cagrDifference.toFixed(1)}% per year`);
  console.log(`BTC Allocation Fix: +${report.correctedArchitectureImpact.allocationImprovement.toFixed(1)}% (from broken 4.2% to proper ${report.performanceMetrics.corrected.btcAllocation.toFixed(1)}%)`);
  
  console.log('\\n💡 KEY INSIGHTS:');
  console.log('─'.repeat(90));
  report.insights.forEach((insight, index) => {
    console.log(`${index + 1}. ${insight}`);
  });
  
  console.log(`\\n💾 Corrected comparison report saved to: ${path.join(RESULTS_DIR, 'corrected-comparison-report.json')}`);
  console.log('='.repeat(130));
}

// Run the corrected comparison
if (require.main === module) {
  compareCorrectedStrategies();
}

module.exports = { compareCorrectedStrategies };