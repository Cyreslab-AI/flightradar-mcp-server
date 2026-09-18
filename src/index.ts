#!/usr/bin/env node

/**
 * FlightRadar MCP Server
 *
 * This server provides real-time flight tracking and status information
 * using the AviationStack API. It implements tools for:
 * - Getting flight data by flight number
 * - Searching for flights by various criteria
 * - Checking flight status
 */

import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import {
  Server,
  ProtocolError,
  ProtocolErrorCode,
} from "@modelcontextprotocol/server";
import axios, { AxiosInstance } from "axios";

// API key should be provided as an environment variable
const API_KEY = process.env.AVIATIONSTACK_API_KEY;

/**
 * JSON Schema describing the structured flight detail object produced by
 * buildFlightDetail() — used as the outputSchema for both get_flight_data
 * and get_flight_status, since both tools expose the same shape of data.
 */
const FLIGHT_DETAIL_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    flight: {
      type: "object",
      description: "Flight identifiers",
      properties: {
        number: { type: ["string", "null"] },
        iata: { type: ["string", "null"] },
        icao: { type: ["string", "null"] },
      },
    },
    airline: {
      type: "object",
      description: "Operating airline",
      properties: {
        name: { type: ["string", "null"] },
        iata: { type: ["string", "null"] },
        icao: { type: ["string", "null"] },
      },
    },
    departure: {
      type: "object",
      description: "Departure airport and timing information",
      properties: {
        airport: { type: ["string", "null"] },
        iata: { type: ["string", "null"] },
        icao: { type: ["string", "null"] },
        terminal: { type: ["string", "null"] },
        gate: { type: ["string", "null"] },
        scheduled: { type: ["string", "null"] },
        estimated: { type: ["string", "null"] },
        actual: { type: ["string", "null"] },
      },
    },
    arrival: {
      type: "object",
      description: "Arrival airport and timing information",
      properties: {
        airport: { type: ["string", "null"] },
        iata: { type: ["string", "null"] },
        icao: { type: ["string", "null"] },
        terminal: { type: ["string", "null"] },
        gate: { type: ["string", "null"] },
        scheduled: { type: ["string", "null"] },
        estimated: { type: ["string", "null"] },
        actual: { type: ["string", "null"] },
      },
    },
    status: {
      type: ["string", "null"],
      description:
        "Flight status (e.g., 'scheduled', 'active', 'landed', 'cancelled')",
    },
    aircraft: {
      type: ["object", "null"],
      description: "Aircraft details as returned by AviationStack, when available",
      properties: {
        registration: { type: ["string", "null"] },
        iata: { type: ["string", "null"] },
        icao: { type: ["string", "null"] },
        icao24: { type: ["string", "null"] },
      },
    },
    live: {
      type: ["object", "null"],
      description:
        "Live tracking data as returned by AviationStack, when available",
      properties: {
        updated: { type: ["string", "null"] },
        latitude: { type: ["number", "null"] },
        longitude: { type: ["number", "null"] },
        altitude: { type: ["number", "null"] },
        direction: { type: ["number", "null"] },
        speed_horizontal: { type: ["number", "null"] },
        speed_vertical: { type: ["number", "null"] },
        is_ground: { type: ["boolean", "null"] },
      },
    },
  },
  required: ["flight", "airline", "departure", "arrival", "status"],
} as const;

/**
 * JSON Schema describing the structured output of search_flights.
 */
const SEARCH_FLIGHTS_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    total_results: {
      type: "number",
      description: "Total number of matching flights reported by the API",
    },
    flights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flight_number: { type: ["string", "null"] },
          flight_iata: { type: ["string", "null"] },
          airline: { type: ["string", "null"] },
          departure: {
            type: "object",
            properties: {
              airport: { type: ["string", "null"] },
              iata: { type: ["string", "null"] },
              scheduled: { type: ["string", "null"] },
            },
          },
          arrival: {
            type: "object",
            properties: {
              airport: { type: ["string", "null"] },
              iata: { type: ["string", "null"] },
              scheduled: { type: ["string", "null"] },
            },
          },
          status: { type: ["string", "null"] },
        },
      },
    },
  },
  required: ["total_results", "flights"],
} as const;

/**
 * FlightRadar MCP Server implementation
 */
class FlightRadarServer {
  private server: Server;
  private axiosInstance: AxiosInstance;

  constructor() {
    // Initialize the MCP server
    this.server = new Server(
      {
        name: "flightradar-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Check if API key is provided
    if (!API_KEY) {
      console.error(
        "Warning: AVIATIONSTACK_API_KEY environment variable is not set",
      );
      console.error("The server will start but API calls will fail");
    }

    // Initialize Axios instance for API calls
    this.axiosInstance = axios.create({
      baseURL: "http://api.aviationstack.com/v1",
      params: {
        access_key: API_KEY,
      },
    });

    // Set up tool handlers
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Set up handlers for the MCP tools
   */
  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler("tools/list", async (): Promise<any> => ({
      tools: [
        {
          name: "get_flight_data",
          description:
            "Get real-time data for a specific flight by flight number",
          inputSchema: {
            type: "object",
            properties: {
              flight_iata: {
                type: "string",
                description: "IATA flight code (e.g., 'BA123')",
              },
              flight_icao: {
                type: "string",
                description: "ICAO flight code (e.g., 'BAW123')",
              },
            },
            oneOf: [
              { required: ["flight_iata"] },
              { required: ["flight_icao"] },
            ],
          },
          annotations: { readOnlyHint: true, openWorldHint: true },
          outputSchema: FLIGHT_DETAIL_OUTPUT_SCHEMA,
        },
        {
          name: "search_flights",
          description: "Search for flights by various criteria",
          inputSchema: {
            type: "object",
            properties: {
              airline_iata: {
                type: "string",
                description:
                  "IATA airline code (e.g., 'BA' for British Airways)",
              },
              airline_icao: {
                type: "string",
                description:
                  "ICAO airline code (e.g., 'BAW' for British Airways)",
              },
              dep_iata: {
                type: "string",
                description: "IATA code of departure airport (e.g., 'LHR')",
              },
              arr_iata: {
                type: "string",
                description: "IATA code of arrival airport (e.g., 'JFK')",
              },
              flight_status: {
                type: "string",
                description:
                  "Flight status (e.g., 'scheduled', 'active', 'landed', 'cancelled')",
                enum: [
                  "scheduled",
                  "active",
                  "landed",
                  "cancelled",
                  "incident",
                  "diverted",
                ],
              },
              limit: {
                type: "number",
                description:
                  "Maximum number of results to return (default: 10, max: 100)",
                minimum: 1,
                maximum: 100,
              },
            },
          },
          annotations: { readOnlyHint: true, openWorldHint: true },
          outputSchema: SEARCH_FLIGHTS_OUTPUT_SCHEMA,
        },
        {
          name: "get_flight_status",
          description: "Get the current status of a flight by flight number",
          inputSchema: {
            type: "object",
            properties: {
              flight_iata: {
                type: "string",
                description: "IATA flight code (e.g., 'BA123')",
              },
              flight_icao: {
                type: "string",
                description: "ICAO flight code (e.g., 'BAW123')",
              },
            },
            oneOf: [
              { required: ["flight_iata"] },
              { required: ["flight_icao"] },
            ],
          },
          annotations: { readOnlyHint: true, openWorldHint: true },
          outputSchema: FLIGHT_DETAIL_OUTPUT_SCHEMA,
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(
      "tools/call",
      async (request): Promise<any> => {
        // Check if API key is available
        if (!API_KEY) {
          return {
            content: [
              {
                type: "text",
                text: "Error: AviationStack API key is not configured. Please set the AVIATIONSTACK_API_KEY environment variable.",
              },
            ],
            isError: true,
          };
        }

        try {
          switch (request.params.name) {
            case "get_flight_data":
              return await this.handleGetFlightData(request.params.arguments);
            case "search_flights":
              return await this.handleSearchFlights(request.params.arguments);
            case "get_flight_status":
              return await this.handleGetFlightStatus(request.params.arguments);
            default:
              throw new ProtocolError(
                ProtocolErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`,
              );
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            return {
              content: [
                {
                  type: "text",
                  text: `API Error: ${error.response?.data?.error?.message || error.message}`,
                },
              ],
              isError: true,
            };
          }
          throw error;
        }
      },
    );
  }

  /**
   * Handle the get_flight_data tool
   */
  private async handleGetFlightData(args: any) {
    const params: Record<string, any> = {};

    if (args.flight_iata) {
      params.flight_iata = args.flight_iata;
    } else if (args.flight_icao) {
      params.flight_icao = args.flight_icao;
    } else {
      throw new ProtocolError(
        ProtocolErrorCode.InvalidParams,
        "Either flight_iata or flight_icao must be provided",
      );
    }

    const response = await this.axiosInstance.get("/flights", { params });

    if (!response.data.data || response.data.data.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No flight data found for the specified flight number.",
          },
        ],
      };
    }

    // Format the flight data for better readability
    const flightData = response.data.data[0];
    const formattedData = this.buildFlightDetail(flightData);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(formattedData, null, 2),
        },
      ],
      structuredContent: formattedData,
    };
  }

  /**
   * Build the structured flight detail object shared by get_flight_data and
   * get_flight_status, from a single raw AviationStack flight record.
   */
  private buildFlightDetail(flightData: any) {
    return {
      flight: {
        number: flightData.flight.number,
        iata: flightData.flight.iata,
        icao: flightData.flight.icao,
      },
      airline: {
        name: flightData.airline.name,
        iata: flightData.airline.iata,
        icao: flightData.airline.icao,
      },
      departure: {
        airport: flightData.departure.airport,
        iata: flightData.departure.iata,
        icao: flightData.departure.icao,
        terminal: flightData.departure.terminal,
        gate: flightData.departure.gate,
        scheduled: flightData.departure.scheduled,
        estimated: flightData.departure.estimated,
        actual: flightData.departure.actual,
      },
      arrival: {
        airport: flightData.arrival.airport,
        iata: flightData.arrival.iata,
        icao: flightData.arrival.icao,
        terminal: flightData.arrival.terminal,
        gate: flightData.arrival.gate,
        scheduled: flightData.arrival.scheduled,
        estimated: flightData.arrival.estimated,
        actual: flightData.arrival.actual,
      },
      status: flightData.flight_status,
      aircraft: flightData.aircraft,
      live: flightData.live,
    };
  }

  /**
   * Handle the search_flights tool
   */
  private async handleSearchFlights(args: any) {
    const params: Record<string, any> = {};

    // Add all provided search parameters
    if (args.airline_iata) params.airline_iata = args.airline_iata;
    if (args.airline_icao) params.airline_icao = args.airline_icao;
    if (args.dep_iata) params.dep_iata = args.dep_iata;
    if (args.arr_iata) params.arr_iata = args.arr_iata;
    if (args.flight_status) params.flight_status = args.flight_status;

    // Set limit with default and maximum values
    params.limit = Math.min(args.limit || 10, 100);

    const response = await this.axiosInstance.get("/flights", { params });

    if (!response.data.data || response.data.data.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No flights found matching the search criteria.",
          },
        ],
      };
    }

    // Format the flight list for better readability
    const flights = response.data.data.map((flight: any) => ({
      flight_number: flight.flight.number,
      flight_iata: flight.flight.iata,
      airline: flight.airline.name,
      departure: {
        airport: flight.departure.airport,
        iata: flight.departure.iata,
        scheduled: flight.departure.scheduled,
      },
      arrival: {
        airport: flight.arrival.airport,
        iata: flight.arrival.iata,
        scheduled: flight.arrival.scheduled,
      },
      status: flight.flight_status,
    }));

    const formattedResult = {
      total_results: response.data.pagination.total,
      flights: flights,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(formattedResult, null, 2),
        },
      ],
      structuredContent: formattedResult,
    };
  }

  /**
   * Handle the get_flight_status tool
   */
  private async handleGetFlightStatus(args: any) {
    const params: Record<string, any> = {};

    if (args.flight_iata) {
      params.flight_iata = args.flight_iata;
    } else if (args.flight_icao) {
      params.flight_icao = args.flight_icao;
    } else {
      throw new ProtocolError(
        ProtocolErrorCode.InvalidParams,
        "Either flight_iata or flight_icao must be provided",
      );
    }

    const response = await this.axiosInstance.get("/flights", { params });

    if (!response.data.data || response.data.data.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No flight status found for the specified flight number.",
          },
        ],
      };
    }

    const flight = response.data.data[0];

    // Build the same structured flight detail get_flight_data exposes, so
    // get_flight_status also returns real machine-parseable data alongside
    // its human-readable summary below.
    const structuredData = this.buildFlightDetail(flight);

    // Create a human-readable status summary
    let statusSummary = `Flight ${flight.flight.iata} (${flight.airline.name}) is currently ${flight.flight_status}.`;

    // Add departure information
    if (flight.departure) {
      statusSummary += `\n\nDeparture: ${flight.departure.airport} (${flight.departure.iata})`;

      if (flight.departure.terminal) {
        statusSummary += `, Terminal ${flight.departure.terminal}`;
      }

      if (flight.departure.gate) {
        statusSummary += `, Gate ${flight.departure.gate}`;
      }

      if (flight.departure.scheduled) {
        statusSummary += `\nScheduled: ${new Date(flight.departure.scheduled).toLocaleString()}`;
      }

      if (flight.departure.estimated) {
        statusSummary += `\nEstimated: ${new Date(flight.departure.estimated).toLocaleString()}`;
      }

      if (flight.departure.actual) {
        statusSummary += `\nActual: ${new Date(flight.departure.actual).toLocaleString()}`;
      }

      if (flight.departure.delay) {
        statusSummary += `\nDelay: ${flight.departure.delay} minutes`;
      }
    }

    // Add arrival information
    if (flight.arrival) {
      statusSummary += `\n\nArrival: ${flight.arrival.airport} (${flight.arrival.iata})`;

      if (flight.arrival.terminal) {
        statusSummary += `, Terminal ${flight.arrival.terminal}`;
      }

      if (flight.arrival.gate) {
        statusSummary += `, Gate ${flight.arrival.gate}`;
      }

      if (flight.arrival.scheduled) {
        statusSummary += `\nScheduled: ${new Date(flight.arrival.scheduled).toLocaleString()}`;
      }

      if (flight.arrival.estimated) {
        statusSummary += `\nEstimated: ${new Date(flight.arrival.estimated).toLocaleString()}`;
      }

      if (flight.arrival.actual) {
        statusSummary += `\nActual: ${new Date(flight.arrival.actual).toLocaleString()}`;
      }

      if (flight.arrival.delay) {
        statusSummary += `\nDelay: ${flight.arrival.delay} minutes`;
      }
    }

    // Add live tracking data if available
    if (flight.live) {
      statusSummary += `\n\nLive Tracking:`;
      statusSummary += `\nAltitude: ${flight.live.altitude} feet`;
      statusSummary += `\nSpeed: ${flight.live.speed_horizontal} knots`;
      statusSummary += `\nHeading: ${flight.live.heading} degrees`;
      statusSummary += `\nLatitude: ${flight.live.latitude}`;
      statusSummary += `\nLongitude: ${flight.live.longitude}`;
    }

    return {
      content: [
        {
          type: "text",
          text: statusSummary,
        },
      ],
      structuredContent: structuredData,
    };
  }

  /**
   * Start the server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("FlightRadar MCP server running on stdio");
  }
}

// Create and start the server
const server = new FlightRadarServer();
server.run().catch(console.error);
