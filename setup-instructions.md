# Crypto DCA Bot Setup Instructions

## 🚨 IMPORTANT DISCLAIMER
This is an automated DCA system that will execute real buys with real money. Please thoroughly test in a sandbox environment first and understand the risks involved. Cryptocurrency DCA is highly risky and you could lose all your invested capital.

## Prerequisites

1. **Binance Account** with API access
2. **Google Account** for Google Sheets logging
3. **Telegram Bot** for notifications
4. **Docker & Docker Compose** installed
5. **Basic understanding** of n8n workflows

## Step 1: Binance API Setup

1. Log into your Binance account
2. Go to API Management and create a new API key
3. **CRITICAL**: Enable only "Spot & Margin DCA" permissions
4. **SECURITY**: Restrict IP access to your server IP
5. **TESTING**: Start with Binance Testnet for testing
   - Testnet URL: `https://testnet.binance.vision/`
   - Get testnet API keys from: `https://testnet.binance.vision/`

## Step 2: Google Sheets Setup

1. Create a new Google Sheet with the ID: `1_ezPrObjvCajRD_oB3jJWx_xVTOXgTq-B5Kd_jAnrug`
   - Or create your own and update the workflow with your Sheet ID
2. Create two sheets with the exact names:
   - **Sheet 1**: "DCA Log" (ID: 0)  
   - **Sheet 2**: "Rebalancing Log" (ID: 352730297)

### DCA Log Headers (Sheet 1):
| Date | Time | Fear_Greed_Index | Action | Trade_Size_Percent | Trade_Size_EUR | Trade_Size_BTC | BTC_Price | BTC_Allocation_Percent | Total_Portfolio_Value | Order_ID | Executed_Qty | Trade_Status | Error_Message | Notes |

### Rebalancing Log Headers (Sheet 2):
| Date | Time | Fear_Greed_Index | Fear_Greed_Value | Fear_Greed_Strategy | Action | Trade_Amount | BTC_Price | Current_BTC_Allocation | Target_BTC_Allocation | Total_Portfolio_Value | Notes |

3. Share the sheet with your service account email
4. Copy the Sheet ID from the URL
5. Enable Google Sheets API in Google Cloud Console
6. Create OAuth2 credentials for n8n

## Step 3: Telegram Bot Setup

1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Get your bot token
4. Get your chat ID by messaging @userinfobot or your bot directly

## Step 4: Environment Configuration

1. Create a `.env` file in your project root
2. Add your actual credentials:

```bash
# Binance API Configuration
BINANCE_API_KEY=your_actual_binance_api_key_here
BINANCE_SECRET_KEY=your_actual_binance_secret_key_here

# Google Sheets Configuration  
GOOGLE_SHEET_ID=1_ezPrObjvCajRD_oB3jJWx_xVTOXgTq-B5Kd_jAnrug

# Telegram Configuration
TELEGRAM_CHAT_ID=your_telegram_chat_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# n8n Configuration
N8N_ENCRYPTION_KEY=your_encryption_key_here
```

## Step 5: Docker Setup

1. Start the services:
```bash
docker-compose up -d
```

2. Wait for PostgreSQL to be ready (check logs):
```bash
docker-compose logs -f postgres
```

3. Access n8n at `http://localhost:5678`

## Step 6: n8n Workflow Import

1. Log into n8n (admin/admin123 by default - change this!)
2. Go to "Workflows" → "Import from JSON"
3. Upload or paste the contents of `crypto-dca-workflow.json`
4. Set up all required credentials

### Required Credentials:

#### 1. Binance API (HTTP Header Auth)
- **Name**: Any descriptive name
- **Header Name**: `X-MBX-APIKEY`
- **Header Value**: Your Binance API Key

#### 2. Google Sheets OAuth2
- **Type**: Google Sheets OAuth2 API
- **Name**: Any descriptive name
- Follow the OAuth2 setup process in n8n
- Make sure to grant sheets read/write permissions

#### 3. Telegram Bot API
- **Type**: Telegram API  
- **Name**: Any descriptive name
- **Access Token**: Your Telegram Bot Token

## Step 7: Workflow Configuration

### Update Cron Triggers (Optional)
The workflow includes two triggers:
- **Daily DCA**: Set to your preferred time (default: daily)
- **Monthly Rebalancing**: Set to your preferred time (default: monthly)

### Verify Environment Variables
Check that these are accessible in your workflow:
- `$env.BINANCE_API_KEY`
- `$env.BINANCE_SECRET_KEY` 
- `$env.TELEGRAM_CHAT_ID`

## Step 8: Testing Protocol

### Phase 1: Infrastructure Testing
1. **Test API Connections**:
   - Run "Get Fear & Greed Index" node manually
   - Test "Get BTC Price" node
   - Verify Google Sheets connection
   - Send test Telegram message

2. **Test Environment Variables**:
   ```bash
   docker-compose exec n8n env | grep BINANCE
   ```

### Phase 2: Logic Testing (Dry Run)
1. **Disable DCA**: Comment out or disconnect the "Execute DCA on Binance" node
2. **Test DCA Logic**: Run the complete workflow to verify calculations
3. **Test Rebalancing Logic**: Verify monthly rebalancing calculations
4. **Check Logging**: Ensure Google Sheets entries are created correctly

### Phase 3: Testnet Testing
1. **Switch to Testnet**:
   - Update API URLs in workflow to use `https://testnet.binance.vision/api/`
   - Use testnet API keys
2. **Test Real Orders**: Execute small test trades
3. **Monitor for 1-2 weeks**: Validate all logic with testnet

### Phase 4: Production Testing
1. **Switch to Live API**: Update URLs and keys
2. **Start Small**: Use minimal capital ($100-500)
3. **Monitor Closely**: Watch first few trades carefully
4. **Scale Gradually**: Increase capital only after proving stability

## Step 9: Risk Management Setup

### Configure Risk Parameters
The workflow includes embedded risk configuration. Key parameters:

```javascript
RISK_CONFIG = {
  PORTFOLIO: {
    TARGET_BTC_ALLOCATION: 0.75,     // Base 75% BTC target
    REBALANCE_BAND: 0.05,            // ±5% rebalancing threshold
    SATELLITE_POOL_PERCENTAGE: 0.3,  // 30% for active DCA
  },
  DCA: {
    MAX_TRADES_PER_WEEK: 3,          // Maximum satellite trades
    SLIPPAGE_TOLERANCE: 0.01,        // 1% maximum slippage
    MIN_BTC_BALANCE: 0.01,           // Minimum BTC to maintain
    MIN_EUR_BALANCE: 100,            // Minimum EUR to maintain
  },
  CIRCUIT_BREAKERS: {
    MAX_PORTFOLIO_DECLINE_7D: -0.20, // Stop if down >20% in 7 days
    MAX_BTC_DECLINE_24H: -0.10,      // Stop if BTC down >10% in 24h
  }
}
```

### Security Checklist
- [ ] API keys have minimal required permissions
- [ ] IP restrictions enabled on Binance API
- [ ] 2FA enabled on all accounts
- [ ] `.env` file in `.gitignore`
- [ ] Backup funds not in DCA account
- [ ] Emergency stop procedure documented

## Step 10: Monitoring & Maintenance

### Daily Monitoring
- Check workflow execution logs in n8n
- Verify Google Sheets entries
- Monitor Telegram notifications
- Review portfolio allocations

### Weekly Reviews
- Analyze performance vs BTC benchmark
- Check risk parameter effectiveness
- Review error logs and system health

### Monthly Tasks
- Validate rebalancing execution
- Update risk parameters if needed
- Security audit and key rotation
- Performance optimization review

## Emergency Procedures

### Stop All DCA Immediately
1. **Pause Workflows**: Disable both cron triggers in n8n
2. **Manual Override**: Manually close any open positions if needed
3. **Secure Funds**: Move funds to cold storage if necessary

### Common Troubleshooting

#### "Signature Invalid" Error
- Check system clock synchronization
- Verify Binance secret key is correct
- Ensure query parameters are properly formatted

#### "Insufficient Balance" Error  
- Check minimum balance settings
- Verify total portfolio value calculation
- Review trade size calculations

#### Google Sheets Errors
- Check OAuth2 token refresh
- Verify sheet permissions
- Ensure correct sheet IDs

#### Telegram Notification Failures
- Verify bot token and chat ID
- Check message formatting
- Ensure bot is not blocked

## Performance Monitoring

### Key Metrics to Track
- **Total Return**: vs BTC buy-and-hold benchmark
- **Volatility**: Portfolio vs BTC volatility
- **Drawdown**: Maximum portfolio decline
- **Trade Frequency**: Actual vs expected trades
- **Execution Quality**: Slippage and fees
- **Rebalancing Effectiveness**: Allocation accuracy

### Optimization Tips
- Monitor Fear & Greed Index effectiveness
- Adjust satellite pool percentage based on performance
- Fine-tune circuit breaker thresholds
- Optimize trade timing and frequency

## Legal & Compliance

- **Tax Reporting**: Maintain detailed trade logs
- **Regulatory Compliance**: Understand local crypto DCA laws
- **Professional Advice**: Consult tax and legal professionals
- **Risk Disclosure**: Document and understand all risks

---

**Final Reminder**: This system trades real money automatically. Test thoroughly, start small, and never risk more than you can afford to lose! 