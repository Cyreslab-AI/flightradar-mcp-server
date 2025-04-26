# FlightRadar MCP Server

[![smithery badge](https://smithery.ai/badge/@Cyreslab-AI/flightradar-mcp-server)](https://smithery.ai/server/@Cyreslab-AI/flightradar-mcp-server)

A Model Context Protocol (MCP) server that provides real-time flight tracking and status information using the AviationStack API.

<a href="https://glama.ai/mcp/servers/@Cyreslab-AI/flightradar-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Cyreslab-AI/flightradar-mcp-server/badge" alt="FlightRadar Server MCP server" />
</a>

## Features

This MCP server provides three main tools:

1. **get_flight_data**: Get detailed information about a specific flight by its IATA or ICAO code
2. **search_flights**: Search for flights by various criteria like airline, departure/arrival airports, and status
3. **get_flight_status**: Get a human-readable status summary for a specific flight

## Installation

### Installing via Smithery

To install flightradar-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@Cyreslab-AI/flightradar-mcp-server):

```bash
npx -y @smithery/cli install @Cyreslab-AI/flightradar-mcp-server --client claude
```

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- An AviationStack API key (get one at [aviationstack.com](https://aviationstack.com/))

### Setup

1. Clone this repository:

   ```bash
   git clone https://github.com/Cyreslab-AI/flightradar-mcp-server.git
   cd flightradar-mcp-server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the server:

   ```bash
   npm run build
   ```

4. Configure the server in your MCP settings file:

   For Claude VSCode extension, add to `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`:

   ```json
   {
     "mcpServers": {
       "flightradar": {
         "command": "node",
         "args": ["/path/to/flightradar-mcp-server/build/index.js"],
         "env": {
           "AVIATIONSTACK_API_KEY": "YOUR_API_KEY_HERE"
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

   For Claude desktop app, add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or similar path on other platforms.

## Usage Examples

Once the server is configured, you can use it with Claude to get flight information:

### Get Flight Status

```
User: What's the status of flight BA855?

Claude: Flight BA855 (British Airways) is currently landed.

Departure: Prague Vaclav Havel Airport (PRG), Terminal 1, Gate B5
Scheduled: 3/25/2025, 11:50:00 AM
Estimated: 3/25/2025, 11:50:00 AM

Arrival: Heathrow (LHR), Terminal 3
Scheduled: 3/25/2025, 1:10:00 PM
```

### Search Flights

```
User: Find British Airways flights

Claude: I found 3212 British Airways flights. Here are the first 3:

1. BA5719: Tucson (TUS) to Dallas/Fort Worth (DFW)
   Status: scheduled
   Departure: 3/25/2025, 5:00:00 AM

2. BA6096: Prague (PRG) to Helsinki (HEL)
   Status: scheduled
   Departure: 3/25/2025, 11:40:00 AM

3. BA855: Prague (PRG) to London Heathrow (LHR)
   Status: landed
   Departure: 3/25/2025, 10:50:00 AM
```

### Get Flight Details

```
User: Get detailed information about flight BA855

Claude: Here are the details for flight BA855:

Flight: BA855 (BAW855)
Airline: British Airways
Aircraft: Airbus A320 (Registration: G-EUUH)

Departure:
- Airport: Prague Vaclav Havel Airport (PRG/LKPR)
- Terminal: 1, Gate: B5
- Scheduled: 3/25/2025, 10:50:00 AM

Arrival:
- Airport: London Heathrow (LHR/EGLL)
- Terminal: 3
- Scheduled: 3/25/2025, 12:10:00 PM

Status: landed
```

## API Key Configuration

This server requires an AviationStack API key to function. You can get a free API key (100 requests/month) at [aviationstack.com](https://aviationstack.com/).

The API key should be provided as an environment variable named `AVIATIONSTACK_API_KEY` in your MCP settings configuration.

## License

MIT