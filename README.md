# FlightRadar MCP Server

[![smithery badge](https://smithery.ai/badge/@Cyreslab-AI/flightradar-mcp-server)](https://smithery.ai/server/@Cyreslab-AI/flightradar-mcp-server)

A Model Context Protocol (MCP) server that provides real-time flight tracking and status information using the AviationStack API.

<a href="https://glama.ai/mcp/servers/@Cyreslab-AI/flightradar-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Cyreslab-AI/flightradar-mcp-server/badge" alt="FlightRadar Server MCP server" />
</a>

## Features

This MCP server provides six tools:

1. **get_flight_data**: Get detailed information about a specific flight by its IATA or ICAO code
2. **search_flights**: Search for flights by various criteria like airline, departure/arrival airports, and status
3. **get_flight_status**: Get a human-readable status summary for a specific flight
4. **search_airports**: Look up airport reference data (name, location, timezone) by IATA/ICAO code or by name
5. **get_airline_info**: Look up airline reference data (name, codes, fleet info) by IATA/ICAO code or by name
6. **get_future_flights**: Get future scheduled departures or arrivals for an airport on a given future date

Tools 1-3 use AviationStack's real-time `/flights` endpoint, available on the free plan. Tools 4-6 use the `/airports`, `/airlines`, and `/flightsFuture` endpoints, which **require a paid AviationStack plan (Basic or higher)** — calling them with a free-plan key returns a `function_access_restricted` error from the API.

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

### Search Airports

```
User: What airport is LHR?

Claude: LHR is London Heathrow Airport, London, United Kingdom (ICAO: EGLL, timezone: Europe/London).
```

### Get Airline Info

```
User: Which airline is BA?

Claude: BA is British Airways (ICAO: BAW, callsign: SPEEDBIRD), based in the United Kingdom.
```

### Get Future Flights

```
User: What flights are scheduled to depart JFK on 2027-03-01?

Claude: Here are scheduled departures from JFK on 2027-03-01:

1. AA100 to LHR, scheduled 2027-03-01T19:00:00
2. DL1 to CDG, scheduled 2027-03-01T20:30:00
```

## API Key Configuration

This server requires an AviationStack API key to function. You can get a free API key (100 requests/month) at [aviationstack.com](https://aviationstack.com/).

The API key should be provided as an environment variable named `AVIATIONSTACK_API_KEY` in your MCP settings configuration.

Note: the free plan only covers real-time flight lookup (`get_flight_data`, `search_flights`, `get_flight_status`). The reference-data tools (`search_airports`, `get_airline_info`, `get_future_flights`) call AviationStack endpoints that require a paid plan (Basic or higher); with a free-plan key they will return an API error (`function_access_restricted`).

## License

MIT