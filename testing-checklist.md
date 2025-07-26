# Crypto DCA Bot Testing Checklist

## ⚠️ CRITICAL: Test Everything Before Going Live!

This checklist ensures your DCA bot works correctly and safely before risking real money.

## Phase 1: Infrastructure Testing

### ✅ Docker & n8n Setup
- [ ] Docker containers start successfully (`docker-compose up -d`)
- [ ] PostgreSQL database is accessible and healthy
- [ ] n8n web interface loads at http://localhost:5678
- [ ] Workflow imports from `crypto-dca-workflow.json` without errors
- [ ] All required credentials are configured and validated

### ✅ API Connectivity Testing
- [ ] **Fear & Greed Index API**: Manually test "Get Fear & Greed Index" node
- [ ] **Binance API**: Test "Get BTC Price" and "Get BTC 20-Day MA" nodes
- [ ] **Binance Account Data**: Test authenticated account data retrieval
- [ ] **Google Sheets API**: Verify both DCA Log and Rebalancing Log sheets
- [ ] **Telegram Bot**: Send test message and verify receipt
- [ ] All API timeouts (10 seconds) and retry mechanisms (3 attempts) work

### ✅ Environment Variables Validation
- [ ] `BINANCE_API_KEY` is accessible in workflow
- [ ] `BINANCE_SECRET_KEY` is accessible in workflow
- [ ] `TELEGRAM_CHAT_ID` is accessible in workflow
- [ ] All environment variables are properly secured (not in logs)
- [ ] Test environment variable access: `docker-compose exec n8n env | grep BINANCE`

## Phase 2: Logic Testing (Dry Run)

### ✅ Daily DCA Logic - Fear & Greed Index Scenarios
**Disable "Execute Trade on Binance" node and test each scenario:**

**Extreme Fear (0-20)**:
- [ ] Triggers 7.5% satellite pool buy order
- [ ] Calculates correct trade size in USDT
- [ ] Generates proper limit price with 1% slippage
- [ ] Logs decision with "Extreme Fear - Aggressive Buy" description

**Fear (21-30)**:
- [ ] Triggers 4% satellite pool buy order
- [ ] Proper trade size and price calculations
- [ ] Logs "Fear - Moderate Buy" rationale

**Neutral (31-60)**:
- [ ] Only triggers 1% buy if BTC price < 20-day MA
- [ ] Holds if BTC price >= 20-day MA
- [ ] Logs "Neutral - DCA if below MA20" or "Neutral - Hold (Price above MA20)"

**Greed (61-70)**:
- [ ] Triggers 4% satellite pool sell order
- [ ] Calculates trade size in BTC
- [ ] Logs "Greed - Small Sell" decision

**High Greed (71-80)**:
- [ ] Triggers 7.5% satellite pool sell order
- [ ] Proper sell calculations
- [ ] Logs "High Greed - Moderate Sell"

**Extreme Greed (81-100)**:
- [ ] Triggers 10% satellite pool sell order
- [ ] Maximum sell size calculations
- [ ] Logs "Extreme Greed - Aggressive Sell"

### ✅ Monthly Rebalancing Logic
**Test rebalancing logic with different scenarios:**

**Timing Validation**:
- [ ] Rebalancing only executes on 1st day of month
- [ ] Skips rebalancing on days 2-31 with proper logging
- [ ] Logs skip message: "Rebalancing skipped - not first day of month"

**Dynamic Target Allocation Testing**:
- [ ] **Extreme Fear (0-20)**: Sets 85% BTC target
- [ ] **Fear (21-30)**: Sets 80% BTC target  
- [ ] **Neutral (31-60)**: Sets 75% BTC target
- [ ] **Greed (61-70)**: Sets 70% BTC target
- [ ] **High Greed (71-80)**: Sets 65% BTC target
- [ ] **Extreme Greed (81-100)**: Sets 60% BTC target

**Rebalancing Band Logic**:
- [ ] No action when allocation within ±5% of target
- [ ] Triggers sell when BTC allocation > target + 5%
- [ ] Triggers buy when BTC allocation < target - 5%
- [ ] Calculates correct trade amounts for rebalancing

### ✅ Risk Management Testing - Circuit Breakers
**Test all safety mechanisms:**

**Portfolio Protection**:
- [ ] DCA stops if portfolio declines >20% in 7 days
- [ ] Circuit breaker message logged properly
- [ ] System preserves existing positions

**Volatility Protection**:
- [ ] DCA stops if BTC declines >10% in 24 hours
- [ ] Proper circuit breaker activation and logging

**Minimum Balance Protection**:
- [ ] Buy orders rejected if USDT < 100 or insufficient for trade
- [ ] Sell orders rejected if BTC < 0.01 or insufficient for trade
- [ ] Proper insufficient balance logging

**Trade Frequency Limits**:
- [ ] Maximum 3 satellite trades per week enforcement
- [ ] Rebalancing limited to once per month
- [ ] Frequency limit logging and enforcement

### ✅ Data Processing Validation
- [ ] **BTC Price**: Parses correctly from Binance API response
- [ ] **20-Day MA**: Calculation is accurate (sum of 20 closes ÷ 20)
- [ ] **Portfolio Balance**: Correctly sums (BTC × price) + USDT
- [ ] **BTC Allocation**: Accurate percentage calculation
- [ ] **Satellite Pool**: Correctly calculates 30% of total portfolio
- [ ] **Timestamp**: Proper ISO string formatting

## Phase 3: Integration Testing

### ✅ Complete Workflow Execution
- [ ] **Daily Trigger**: Fires at configured time
- [ ] **Monthly Trigger**: Fires at configured time
- [ ] All nodes execute in correct sequence without errors
- [ ] Both DCA and rebalancing logic execute in parallel
- [ ] Workflow completes within reasonable time (< 60 seconds)
- [ ] Error handling works for failed API calls with proper retries

### ✅ Google Sheets Logging Validation

**DCA Log (Sheet ID: 0)**:
- [ ] Creates new row for each DCA decision
- [ ] All columns populated: Date, Time, Fear_Greed_Index, Action, Trade_Size_Percent, Trade_Size_USDT, Trade_Size_BTC, BTC_Price, BTC_Allocation_Percent, Total_Portfolio_Value, Order_ID, Executed_Qty, Trade_Status, Error_Message, Notes
- [ ] HOLD decisions logged properly
- [ ] Trade execution results logged with order details
- [ ] Error scenarios logged with proper error messages

**Rebalancing Log (Sheet ID: 352730297)**:
- [ ] Creates entries only on rebalancing execution
- [ ] All columns populated: Date, Time, Fear_Greed_Index, Fear_Greed_Value, Fear_Greed_Strategy, Action, Trade_Amount, BTC_Price, Current_BTC_Allocation, Target_BTC_Allocation, Total_Portfolio_Value, Notes
- [ ] Skip messages logged when not 1st day of month
- [ ] Dynamic strategy descriptions logged correctly

### ✅ Telegram Notifications Testing

**Daily DCA Notifications**:
- [ ] HOLD decisions send properly formatted messages
- [ ] Trade execution results include all relevant data
- [ ] Error notifications include detailed context and troubleshooting info
- [ ] Message formatting displays correctly with emojis and markdown

**Monthly Rebalancing Notifications**:
- [ ] Rebalancing alerts include Fear & Greed strategy explanation
- [ ] Current vs target allocation clearly displayed
- [ ] Skip notifications sent when not rebalancing day

**Error Handling Notifications**:
- [ ] API failures trigger immediate error alerts
- [ ] Trade execution failures send detailed error information
- [ ] System errors include enough context for troubleshooting

## Phase 4: Binance Testnet Testing

### ✅ Testnet Environment Setup
- [ ] Testnet API keys obtained from https://testnet.binance.vision/
- [ ] Workflow API URLs updated to `https://testnet.binance.vision/api/`
- [ ] Test USDT and BTC balances received in testnet account
- [ ] Account permissions verified (spot DCA enabled)

### ✅ Signature Generation Testing
- [ ] HMAC SHA256 signatures generate correctly
- [ ] Query string formatting matches Binance requirements
- [ ] Timestamps are fresh and within acceptable window
- [ ] `recvWindow` parameter set appropriately (5000ms)

### ✅ Order Execution Testing

**Buy Orders**:
- [ ] Limit orders place correctly on testnet
- [ ] Buy price = market price × (1 + 1% slippage)
- [ ] Quantity calculated correctly (USDT amount ÷ limit price)
- [ ] Order parameters include all required fields

**Sell Orders**:
- [ ] Sell limit orders execute properly
- [ ] Sell price = market price × (1 - 1% slippage)
- [ ] Quantity in BTC calculated correctly
- [ ] Order fills and updates balance correctly

**Order Status Tracking**:
- [ ] Order IDs captured and logged
- [ ] Executed quantities recorded accurately
- [ ] Order status updates properly tracked
- [ ] Failed orders handled gracefully with error logging

### ✅ Portfolio Balance Updates
- [ ] Balance queries return current testnet balances
- [ ] Balance updates after trade execution
- [ ] Portfolio value calculations remain accurate
- [ ] Allocation percentages update correctly

## Phase 5: Security & Authentication Testing

### ✅ API Security Validation
- [ ] Binance API keys have only "Spot & Margin DCA" permissions
- [ ] IP restrictions properly configured and tested
- [ ] 2FA enabled on Binance account
- [ ] API key not exposed in any logs or error messages
- [ ] Secret key properly secured in environment variables

### ✅ Data Security
- [ ] `.env` file excluded from version control (`.gitignore`)
- [ ] Google Sheets permissions limited to necessary access
- [ ] Telegram bot token secured properly
- [ ] n8n encryption key properly configured
- [ ] No sensitive data in workflow execution logs

### ✅ Authentication Flow Testing
- [ ] Google Sheets OAuth2 token refresh works automatically
- [ ] Telegram bot authentication persistent
- [ ] Binance API signature validation passes consistently
- [ ] All credentials properly stored in n8n credential management

## Phase 6: Performance & Reliability Testing

### ✅ System Performance
- [ ] Workflow execution completes within 60 seconds
- [ ] Memory usage remains stable across multiple executions
- [ ] CPU usage appropriate for system resources
- [ ] Database queries perform efficiently
- [ ] No memory leaks detected over 24-hour period

### ✅ Error Recovery Testing
- [ ] System recovers from temporary API failures
- [ ] Retry logic works correctly (3 attempts with delays)
- [ ] Graceful degradation when external services unavailable
- [ ] Workflow state preserved across errors
- [ ] Error notifications trigger immediately and accurately

### ✅ Load Testing
- [ ] System handles concurrent trigger executions
- [ ] Database connections managed properly
- [ ] API rate limits respected and handled
- [ ] No service degradation under normal load

## Phase 7: End-to-End Production Testing

### ✅ Pre-Production Validation
- [ ] All testnet testing completed successfully
- [ ] Risk parameters reviewed and approved
- [ ] Emergency procedures documented and tested
- [ ] Monitoring systems configured and operational
- [ ] Team notifications and escalation procedures tested

### ✅ Small Capital Live Testing
- [ ] **Switch to Live Binance API**: Update URLs to `https://api.binance.com/api/`
- [ ] **Minimal Capital**: Start with $100-500 maximum
- [ ] **Continuous Monitoring**: Watch first 48 hours constantly
- [ ] **Manual Validation**: Verify every trade and calculation manually
- [ ] **Performance Tracking**: Log and analyze every execution

### ✅ Live System Validation
- [ ] First trade executes correctly with real money
- [ ] Portfolio calculations remain accurate with live data
- [ ] Risk controls function properly in live environment
- [ ] Logging and notifications work with real trades
- [ ] Emergency stop procedures tested and verified

## Critical Red Flags - Stop Immediately If:

🚨 **System Issues**:
- API signatures failing repeatedly or inconsistently
- Unexpected trade sizes or calculation errors
- Circuit breakers not activating when they should
- Data inconsistencies between sources
- Memory leaks or performance degradation

🚨 **Financial Issues**:
- Portfolio declining faster than BTC benchmark
- Excessive DCA frequency beyond limits
- Trades executing outside acceptable slippage
- Balance calculations not matching exchange
- Unauthorized or unexpected trades

🚨 **Security Issues**:
- API key exposure in logs or errors
- Unauthorized access attempts or alerts
- Authentication failures or credential issues
- Database access errors or security warnings
- External service compromise indicators

## Emergency Procedures

### Immediate DCA Halt
1. **Disable Triggers**: Turn off both daily and monthly cron triggers in n8n
2. **Manual Position Review**: Check all open positions manually
3. **Secure Funds**: Consider moving funds to cold storage if necessary
4. **Document Issues**: Record all problems for analysis
5. **Team Notification**: Alert all stakeholders immediately

### System Recovery Protocol
1. **Identify Root Cause**: Analyze logs and error messages
2. **Fix Underlying Issues**: Address technical problems
3. **Re-test Thoroughly**: Run through all relevant test phases
4. **Gradual Re-enabling**: Start with testnet before returning to live
5. **Enhanced Monitoring**: Increase surveillance for first 24-48 hours

---

**Testing Mantra**: "If it hasn't been tested, assume it's broken. If it has been tested once, test it again."

**Remember**: No amount of testing can guarantee profit, but thorough testing can prevent catastrophic losses!

---

**Final Validation**: Before going live, ensure every checkbox above is ✅ and you understand exactly what each component does and why it's necessary.