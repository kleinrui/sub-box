import "server-only";

import type { Subconverter } from "@/types";
import { nodeClientService } from "./node-client-service";
import { subconverterService } from "./subconverter-service";

class SubscriptionService {
  async generateSubscription(params: { userId: string; subconverterId?: string | null }): Promise<string> {
    const { userId, subconverterId } = params;

    // Get all node clients and their user options
    const clients = await nodeClientService.getByUserId(userId);

    // Filter enabled clients for the user and sort by order
    const enabledClients = clients.filter((client) => client.enable).sort((a, b) => a.order - b.order);

    if (enabledClients.length === 0) {
      throw new Error("No enabled nodes found");
    }

    // Get subconverter - either specified one or default one
    let subconverter: Subconverter | null = null;
    if (subconverterId) {
      subconverter = await subconverterService.get(subconverterId);
    }

    if (!subconverter) {
      const allSubconverters = await subconverterService.getAll();
      const defaultSubconverter = allSubconverters.find((s) => s.isDefault);
      if (defaultSubconverter) {
        subconverter = defaultSubconverter;
      }
    }

    if (!subconverter) {
      throw new Error("No subconverter found");
    }

    // Construct URLs
    const urls = enabledClients.map((client) => encodeURIComponent(client.url)).join("|");
    const baseUrl = `${subconverter.url}/sub?target=clash&url=${urls}`;

    // Add options if any
    const finalUrl = subconverter.options ? `${baseUrl}&${subconverter.options}` : baseUrl;

    // Fetch the subscription
    try {
      const response = await fetch(finalUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
      return await response.text();
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate subscription: ${error.message}`);
      }
      throw new Error("Failed to generate subscription: Unknown error");
    }
  }
}

export const subscriptionService = new SubscriptionService();
