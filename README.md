# Bitcoin Chart MCP Server

An MCP (Model Context Protocol) server that provides real-time Bitcoin price charts and market data using the CoinGecko API.

## Features

- **Real-time Bitcoin Price Data**: Fetches current Bitcoin prices from CoinGecko API
- **Historical Charts**: Generate charts for multiple timeframes (1h, 24h, 7d, 30d, 1y)
- **Multiple Chart Types**: Line charts and area charts
- **Multiple Formats**: PNG and SVG output formats
- **Currency Support**: USD and EUR pricing
- **Rate Limiting**: Built-in rate limiting to respect API limits

## Installation

1. **Clone or create the project directory:**
   ```bash
   mkdir bitcoin-chart-mcp
   cd bitcoin-chart-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Usage with Claude Code

### 1. Add the MCP Server to Claude Code

```bash
claude mcp add bitcoin-chart node /path/to/bitcoin-chart-mcp/dist/index.js
```

### 2. Available Tools

#### `get_bitcoin_chart`
Generate customizable Bitcoin price charts.

**Parameters:**
- `timeframe`: '1h' | '24h' | '7d' | '30d' | '1y' (default: '7d')
- `chartType`: 'line' | 'area' (default: 'line')
- `format`: 'png' | 'svg' (default: 'svg')
- `width`: number (default: 800)
- `height`: number (default: 400)
- `currency`: 'usd' | 'eur' (default: 'usd')

**Example usage:**
```
Show me a Bitcoin chart for the last 30 days as an area chart
```

#### `get_bitcoin_price`
Get current Bitcoin price and market data.

**Parameters:**
- `currency`: 'usd' | 'eur' (default: 'usd')

**Example usage:**
```
What's the current Bitcoin price?
```

### 3. Available Resources

#### Chart Resources
- `bitcoin://chart/current` - PNG chart (7-day default)
- `bitcoin://chart/svg/current` - SVG chart (7-day default)

#### Price Data
- `bitcoin://price/current` - Current price JSON data

## API Reference

### BitcoinAPI Class

Handles all communication with the CoinGecko API:

- `getCurrentPrice(currency)` - Get current Bitcoin price
- `getHistoricalData(days, currency, interval)` - Get historical price data
- `getMarketChart(timeframe, currency)` - Get market chart data

### ChartGenerator Class

Generates chart visualizations:

- `generateChart(data, config)` - Generate PNG chart
- `generateSVGChart(data, config)` - Generate SVG chart

## Configuration

The server includes built-in configuration for:

- **Rate Limiting**: 2-second delay between API requests
- **Chart Defaults**: 800x400px, 7-day timeframe
- **Currency Support**: USD and EUR
- **Timeframe Options**: 1h, 24h, 7d, 30d, 1y

## Examples

### Basic Usage

```typescript
// Get current price
const price = await bitcoinAPI.getCurrentPrice('usd');

// Generate 7-day chart
const chartData = await bitcoinAPI.getMarketChart('7d');
const chart = await chartGenerator.generateSVGChart(chartData, {
  timeframe: '7d',
  chartType: 'line'
});
```

### Advanced Chart Configuration

```typescript
const config = {
  timeframe: '30d',
  chartType: 'area',
  width: 1200,
  height: 600,
  currency: 'eur'
};

const data = await bitcoinAPI.getMarketChart(config.timeframe, config.currency);
const chart = await chartGenerator.generateChart(data, config);
```

## Development

### Scripts

- `npm run build` - Build the TypeScript project
- `npm start` - Start the MCP server
- `npm run dev` - Development mode with watch
- `npm run clean` - Clean build directory

### Project Structure

```
bitcoin-chart-mcp/
├── src/
│   ├── index.ts          # Main MCP server
│   ├── bitcoin-api.ts    # CoinGecko API client
│   ├── chart-generator.ts # Chart generation
│   └── types.ts          # TypeScript types
├── dist/                 # Built JavaScript files
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**: The server includes built-in rate limiting. If you encounter 429 errors, the built-in delays should handle this automatically.

2. **Canvas Dependencies**: If you encounter issues with the `canvas` package, you may need to install additional system dependencies:
   - **macOS**: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
   - **Ubuntu**: `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

3. **Memory Usage**: Large charts or frequent requests may consume memory. Consider implementing caching for production use.

### Error Handling

The server includes comprehensive error handling for:
- API request failures
- Invalid parameters
- Chart generation errors
- Network timeouts

## License

MIT License - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review the CoinGecko API documentation
- Open an issue in the project repository