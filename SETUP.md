# Bitcoin Chart MCP Server Setup Guide

## Quick Setup

### 1. Add to Claude Code

```bash
claude mcp add bitcoin-chart node /path/to/bitcoin-chart-mcp/dist/index.js
```

Replace `/path/to/bitcoin-chart-mcp/` with the actual path to your bitcoin-chart-mcp directory.

For example:
```bash
claude mcp add bitcoin-chart node /Users/username/bitcoin-chart-mcp/dist/index.js
```

### 2. Verify Installation

List your MCP servers:
```bash
claude mcp list
```

You should see `bitcoin-chart` in the list.

### 3. Test the Server

Try asking Claude Code:
```
Show me a Bitcoin chart for the last 7 days
```

or

```
What's the current Bitcoin price?
```

## Usage Examples

### Get Current Bitcoin Price

```
What's the current Bitcoin price?
```

### Generate Charts

```
Show me a Bitcoin chart for the last 30 days as an area chart
```

```
Create a Bitcoin price chart for the last year
```

```
Generate a 24-hour Bitcoin chart
```

### Custom Chart Parameters

You can specify:
- **Timeframe**: 1h, 24h, 7d, 30d, 1y
- **Chart Type**: line, area
- **Size**: width and height in pixels
- **Currency**: usd, eur

## Available Tools

### `get_bitcoin_chart`
- Generates customizable Bitcoin price charts
- Returns SVG charts that display in Claude Code
- Shows price trends with color coding (green for gains, red for losses)

### `get_bitcoin_price`
- Gets current Bitcoin price and 24h volume
- Returns formatted text with current market data

## Available Resources

### Chart Resources
- `bitcoin://chart/svg/current` - SVG chart (7-day default)

### Price Data
- `bitcoin://price/current` - Current price JSON data

## Troubleshooting

### Common Issues

1. **"Server not found" error**
   - Check that the path to `dist/index.js` is correct
   - Ensure you ran `npm run build` to create the dist folder

2. **"Rate limiting" errors**
   - The server includes built-in rate limiting
   - Wait a few seconds between requests if you see 429 errors

3. **"No data available" in charts**
   - Check your internet connection
   - CoinGecko API might be temporarily unavailable

### Getting Help

If you encounter issues:
1. Check that Node.js 18+ is installed
2. Verify all dependencies are installed (`npm install`)
3. Ensure the build completed successfully (`npm run build`)
4. Test the server directly with `node test-server.js`

## Development

### Making Changes

1. Edit files in the `src/` directory
2. Run `npm run build` to compile TypeScript
3. Restart Claude Code or refresh the MCP connection

### Adding Features

The server is modular and extensible:
- `bitcoin-api.ts` - API integration
- `chart-generator.ts` - Chart rendering
- `index.ts` - MCP server implementation
- `types.ts` - TypeScript definitions

## API Rate Limits

The server uses the CoinGecko free API with:
- 30 calls per minute (no API key required)
- Built-in 2-second delays between requests
- Automatic retry handling

For higher usage, consider upgrading to CoinGecko's paid API and updating the API key in `bitcoin-api.ts`.

## Next Steps

Once setup is complete, you can:
1. Ask Claude Code to generate Bitcoin charts
2. Get real-time price data
3. Analyze price trends across different timeframes
4. Export charts for documentation or presentations

The charts are interactive SVG format and will display directly in Claude Code's interface.