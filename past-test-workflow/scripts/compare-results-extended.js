// Extended Results Comparison Analysis - 3 Years
// Compares Logical DCA vs Simple DCA strategies across different market cycles

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../results');

function loadExtendedResults() {
  try {
    const logicalPath = path.join(RESULTS_DIR, 'logical-dca-results-extended.json');
    const simplePath = path.join(RESULTS_DIR, 'simple-dca-results-extended.json');
    
    const logicalResults = JSON.parse(fs.readFileSync(logicalPath, 'utf8'));
    const simpleResults = JSON.parse(fs.readFileSync(simplePath, 'utf8'));
    
    console.log('📊 Loaded extended results for comparison');
    return { logicalResults, simpleResults };
    
  } catch (error) {
    console.error('❌ Error loading extended results:', error.message);
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
  const drawdowns = [];
  
  for (const result of dailyResults) {
    if (result.totalValue > peak) {
      peak = result.totalValue;
    }
    const drawdown = (peak - result.totalValue) / peak;
    drawdowns.push(drawdown);
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  // Calculate Sharpe ratio
  const annualizedReturn = avgReturn * 365;
  const sharpeRatio = volatility > 0 ? annualizedReturn / (volatility / 100) : 0;
  
  // Calculate Sortino ratio (downside deviation)
  const downReturns = returns.filter(r => r < 0);
  if (downReturns.length > 0) {
    const downVariance = downReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downReturns.length;
    const downDeviation = Math.sqrt(downVariance * 365) * 100;
    var sortino = downDeviation > 0 ? annualizedReturn / (downDeviation / 100) : 0;
  } else {
    var sortino = Infinity;
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
    sortino: sortino === Infinity ? 999 : sortino,
    var95: var95,
    calmar: calmar
  };
}

function analyzeMarketCyclePerformance(logicalResults, simpleResults) {
  console.log('\\n🔄 Market Cycle Performance Analysis...');
  
  // Compare performance in different market phases
  const logicalPhases = logicalResults.marketPhases || [];
  const simplePhases = simpleResults.marketPhases || [];
  
  const phaseComparison = {
    bullMarkets: { logical: [], simple: [] },
    bearMarkets: { logical: [], simple: [] },
    sidewaysMarkets: { logical: [], simple: [] }
  };
  
  // Categorize logical DCA phases
  logicalPhases.forEach(phase => {
    if (phase.type === 'Bull Market') {
      phaseComparison.bullMarkets.logical.push(phase);
    } else if (phase.type === 'Bear Market') {
      phaseComparison.bearMarkets.logical.push(phase);
    } else {
      phaseComparison.sidewaysMarkets.logical.push(phase);
    }
  });
  
  // Categorize simple DCA phases
  simplePhases.forEach(phase => {
    if (phase.type === 'Bull Market') {
      phaseComparison.bullMarkets.simple.push(phase);
    } else if (phase.type === 'Bear Market') {
      phaseComparison.bearMarkets.simple.push(phase);
    } else {
      phaseComparison.sidewaysMarkets.simple.push(phase);
    }
  });
  
  return phaseComparison;
}

function generateExtendedInsights(performance, returnDiff, phaseAnalysis) {
  const insights = [];
  
  // Performance insights
  if (Math.abs(returnDiff) < 1000) {
    insights.push('Both strategies showed similar absolute returns over the 3-year period.');
  } else if (returnDiff > 0) {
    insights.push(`Logical DCA outperformed Simple DCA by €${returnDiff.toFixed(0)} over 3 years.`);
  } else {
    insights.push(`Simple DCA significantly outperformed Logical DCA by €${Math.abs(returnDiff).toFixed(0)} over 3 years.`);
  }
  
  // CAGR insights
  const logicalCAGR = performance.logical.cagr || 0;
  const simpleCAGR = performance.simple.cagr || 0;
  
  if (simpleCAGR > logicalCAGR + 5) {
    insights.push(`Simple DCA achieved a superior CAGR of ${simpleCAGR.toFixed(1)}% vs ${logicalCAGR.toFixed(1)}% for Logical DCA.`);
  }
  
  // Risk insights
  if (performance.logical.volatility > performance.simple.volatility * 1.2) {
    insights.push('Logical DCA showed significantly higher volatility, indicating more risk.');
  } else if (performance.logical.volatility < performance.simple.volatility * 0.8) {
    insights.push('Logical DCA demonstrated lower volatility, suggesting better risk management.');
  }
  
  // Drawdown insights
  if (performance.logical.maxDrawdown > performance.simple.maxDrawdown * 1.5) {
    insights.push('Logical DCA experienced much larger drawdowns, indicating higher downside risk.');
  }
  
  // Allocation insights
  if (performance.logical.btcAllocation < 20) {
    insights.push('Logical DCA was extremely conservative, holding mostly EUR and missing significant BTC gains.');
  }
  
  // Trading frequency insights
  if (performance.logical.totalTrades > 400) {
    insights.push('Logical DCA was very active with frequent trading, potentially increasing complexity and costs.');
  }
  
  // Market cycle insights
  const bullMarkets = phaseAnalysis.bullMarkets;
  if (bullMarkets.simple.length > 0 && bullMarkets.logical.length > 0) {
    const avgSimpleBullReturn = bullMarkets.simple.reduce((sum, p) => sum + p.portfolioReturn, 0) / bullMarkets.simple.length;
    const avgLogicalBullReturn = bullMarkets.logical.reduce((sum, p) => sum + p.portfolioReturn, 0) / bullMarkets.logical.length;
    
    if (avgSimpleBullReturn > avgLogicalBullReturn * 2) {
      insights.push('Simple DCA significantly outperformed in bull markets due to higher BTC allocation.');
    }
  }
  
  return insights;
}

function compareExtendedStrategies() {
  console.log('🔍 Starting Extended Strategy Comparison Analysis (3 Years)...');
  
  const { logicalResults, simpleResults } = loadExtendedResults();
  
  // Calculate advanced risk metrics
  const logicalRisk = calculateAdvancedRiskMetrics(logicalResults.dailyResults);
  const simpleRisk = calculateAdvancedRiskMetrics(simpleResults.dailyResults);
  
  // Analyze market cycle performance
  const phaseAnalysis = analyzeMarketCyclePerformance(logicalResults, simpleResults);
  
  // Enhanced performance comparison
  const performanceComparison = {
    logical: {
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
    simple: {
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
    }
  };
  
  // Calculate differences
  const returnDifference = performanceComparison.logical.totalReturn - performanceComparison.simple.totalReturn;
  const returnPercentDifference = performanceComparison.logical.totalReturnPercent - performanceComparison.simple.totalReturnPercent;
  const cagrDifference = performanceComparison.logical.cagr - performanceComparison.simple.cagr;
  
  // Determine winner
  const logicalWins = performanceComparison.logical.totalReturn > performanceComparison.simple.totalReturn;
  const winner = logicalWins ? 'Logical DCA (Fear & Greed)' : 'Simple DCA (Weekly)';
  
  // Generate insights
  const insights = generateExtendedInsights(performanceComparison, returnDifference, phaseAnalysis);
  
  // Create comprehensive comparison report
  const extendedComparisonReport = {
    testPeriod: {
      start: logicalResults.testPeriod.start,
      end: logicalResults.testPeriod.end,
      totalDays: logicalResults.testPeriod.totalDays,
      totalYears: logicalResults.testPeriod.totalYears
    },
    winner: winner,
    performanceMetrics: performanceComparison,
    differences: {
      absoluteReturn: returnDifference,
      percentReturn: returnPercentDifference,
      cagrDifference: cagrDifference,
      volatilityDifference: performanceComparison.logical.volatility - performanceComparison.simple.volatility,
      maxDrawdownDifference: performanceComparison.logical.maxDrawdown - performanceComparison.simple.maxDrawdown,
      sharpeDifference: performanceComparison.logical.sharpeRatio - performanceComparison.simple.sharpeRatio,
      sortinoDifference: performanceComparison.logical.sortino - performanceComparison.simple.sortino
    },
    marketCycleAnalysis: phaseAnalysis,
    insights: insights,
    timestamp: new Date().toISOString()
  };
  
  // Save comparison report
  fs.writeFileSync(path.join(RESULTS_DIR, 'comparison-report-extended.json'), JSON.stringify(extendedComparisonReport, null, 2));
  
  // Print comprehensive comparison
  printExtendedComparison(extendedComparisonReport);
  
  return extendedComparisonReport;
}

function printExtendedComparison(report) {
  console.log('\\n' + '='.repeat(100));
  console.log('📊 EXTENDED STRATEGY COMPARISON RESULTS (3 YEARS)');
  console.log('='.repeat(100));
  
  console.log(`\\n🏆 Winner: ${report.winner}`);
  console.log(`📅 Test Period: ${report.testPeriod.start} to ${report.testPeriod.end} (${report.testPeriod.totalYears} years)`);
  
  console.log('\\n💰 PERFORMANCE COMPARISON:');
  console.log('─'.repeat(80));
  console.log(`                          Logical DCA  │  Simple DCA  │  Difference`);
  console.log('─'.repeat(80));
  console.log(`Total Return (EUR)        €${report.performanceMetrics.logical.totalReturn.toFixed(0).padStart(10)} │ €${report.performanceMetrics.simple.totalReturn.toFixed(0).padStart(10)} │ €${report.differences.absoluteReturn.toFixed(0)}`);
  console.log(`Total Return (%)           ${report.performanceMetrics.logical.totalReturnPercent.toFixed(1).padStart(9)}% │  ${report.performanceMetrics.simple.totalReturnPercent.toFixed(1).padStart(9)}% │  ${report.differences.percentReturn.toFixed(1)}%`);
  console.log(`CAGR (%)                   ${report.performanceMetrics.logical.cagr.toFixed(1).padStart(9)}% │  ${report.performanceMetrics.simple.cagr.toFixed(1).padStart(9)}% │  ${report.differences.cagrDifference.toFixed(1)}%`);
  console.log(`Final Portfolio Value     €${report.performanceMetrics.logical.finalValue.toFixed(0).padStart(10)} │ €${report.performanceMetrics.simple.finalValue.toFixed(0).padStart(10)} │`);
  console.log(`BTC Balance (BTC)          ${report.performanceMetrics.logical.btcBalance.toFixed(8).padStart(10)} │  ${report.performanceMetrics.simple.btcBalance.toFixed(8).padStart(10)} │`);
  console.log(`EUR Balance (EUR)         €${report.performanceMetrics.logical.eurBalance.toFixed(0).padStart(10)} │ €${report.performanceMetrics.simple.eurBalance.toFixed(0).padStart(10)} │`);
  console.log(`BTC Allocation (%)         ${report.performanceMetrics.logical.btcAllocation.toFixed(1).padStart(9)}% │  ${report.performanceMetrics.simple.btcAllocation.toFixed(1).padStart(9)}% │`);
  
  console.log('\\n📈 ADVANCED RISK METRICS:');
  console.log('─'.repeat(80));
  console.log(`Volatility (%)             ${report.performanceMetrics.logical.volatility.toFixed(1).padStart(9)}% │  ${report.performanceMetrics.simple.volatility.toFixed(1).padStart(9)}% │  ${report.differences.volatilityDifference.toFixed(1)}%`);
  console.log(`Max Drawdown (%)           ${report.performanceMetrics.logical.maxDrawdown.toFixed(1).padStart(9)}% │  ${report.performanceMetrics.simple.maxDrawdown.toFixed(1).padStart(9)}% │  ${report.differences.maxDrawdownDifference.toFixed(1)}%`);
  console.log(`Sharpe Ratio               ${report.performanceMetrics.logical.sharpeRatio.toFixed(2).padStart(10)} │  ${report.performanceMetrics.simple.sharpeRatio.toFixed(2).padStart(10)} │  ${report.differences.sharpeDifference.toFixed(2)}`);
  console.log(`Sortino Ratio              ${Math.min(report.performanceMetrics.logical.sortino, 99).toFixed(2).padStart(10)} │  ${Math.min(report.performanceMetrics.simple.sortino, 99).toFixed(2).padStart(10)} │  ${report.differences.sortinoDifference.toFixed(2)}`);
  console.log(`VaR 95% (%)                ${report.performanceMetrics.logical.var95.toFixed(1).padStart(9)}% │  ${report.performanceMetrics.simple.var95.toFixed(1).padStart(9)}% │`);
  console.log(`Calmar Ratio               ${report.performanceMetrics.logical.calmar.toFixed(2).padStart(10)} │  ${report.performanceMetrics.simple.calmar.toFixed(2).padStart(10)} │`);
  
  console.log('\\n🔄 TRADING ACTIVITY:');
  console.log('─'.repeat(50));
  console.log(`Total Trades               ${report.performanceMetrics.logical.totalTrades.toString().padStart(10)} │  ${report.performanceMetrics.simple.totalTrades.toString().padStart(10)} │`);
  console.log(`Buy Trades                 ${report.performanceMetrics.logical.buyTrades.toString().padStart(10)} │  ${report.performanceMetrics.simple.buyTrades.toString().padStart(10)} │`);
  console.log(`Sell Trades                ${report.performanceMetrics.logical.sellTrades.toString().padStart(10)} │  ${report.performanceMetrics.simple.sellTrades.toString().padStart(10)} │`);
  
  console.log('\\n🔄 MARKET CYCLE PERFORMANCE:');
  console.log('─'.repeat(60));
  if (report.marketCycleAnalysis.bullMarkets.logical.length > 0) {
    const avgLogicalBull = report.marketCycleAnalysis.bullMarkets.logical.reduce((sum, p) => sum + p.portfolioReturn, 0) / report.marketCycleAnalysis.bullMarkets.logical.length;
    const avgSimpleBull = report.marketCycleAnalysis.bullMarkets.simple.reduce((sum, p) => sum + p.portfolioReturn, 0) / report.marketCycleAnalysis.bullMarkets.simple.length;
    console.log(`Bull Markets Avg Return:   ${avgLogicalBull.toFixed(1)}% │ ${avgSimpleBull.toFixed(1)}%`);
  }
  
  if (report.marketCycleAnalysis.bearMarkets.logical.length > 0) {
    const avgLogicalBear = report.marketCycleAnalysis.bearMarkets.logical.reduce((sum, p) => sum + p.portfolioReturn, 0) / report.marketCycleAnalysis.bearMarkets.logical.length;
    const avgSimpleBear = report.marketCycleAnalysis.bearMarkets.simple.reduce((sum, p) => sum + p.portfolioReturn, 0) / report.marketCycleAnalysis.bearMarkets.simple.length;
    console.log(`Bear Markets Avg Return:   ${avgLogicalBear.toFixed(1)}% │ ${avgSimpleBear.toFixed(1)}%`);
  }
  
  if (report.marketCycleAnalysis.sidewaysMarkets.logical.length > 0) {
    const avgLogicalSide = report.marketCycleAnalysis.sidewaysMarkets.logical.reduce((sum, p) => sum + p.portfolioReturn, 0) / report.marketCycleAnalysis.sidewaysMarkets.logical.length;
    const avgSimpleSide = report.marketCycleAnalysis.sidewaysMarkets.simple.reduce((sum, p) => sum + p.portfolioReturn, 0) / report.marketCycleAnalysis.sidewaysMarkets.simple.length;
    console.log(`Sideways Markets Avg Return: ${avgLogicalSide.toFixed(1)}% │ ${avgSimpleSide.toFixed(1)}%`);
  }
  
  console.log('\\n💡 KEY INSIGHTS (3-Year Analysis):');
  console.log('─'.repeat(50));
  report.insights.forEach((insight, index) => {
    console.log(`${index + 1}. ${insight}`);
  });
  
  console.log(`\\n💾 Detailed extended report saved to: ${path.join(RESULTS_DIR, 'comparison-report-extended.json')}`);
  console.log('='.repeat(100));
}

// Run the extended comparison
if (require.main === module) {
  compareExtendedStrategies();
}

module.exports = { compareExtendedStrategies };