import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";

export type AddonsPricing = {
  fabconPrice: number;
  detergentPrice: number;
  colorSafePrice: number;
};

export const DEFAULT_ADDONS_PRICING: AddonsPricing = {
  fabconPrice: 20,
  detergentPrice: 20,
  colorSafePrice: 20,
};

const normalizePricing = (raw: unknown): AddonsPricing => {
  const item = raw as Record<string, unknown>;
  return {
    fabconPrice: Number(item.fabconPrice ?? DEFAULT_ADDONS_PRICING.fabconPrice),
    detergentPrice: Number(
      item.detergentPrice ?? DEFAULT_ADDONS_PRICING.detergentPrice,
    ),
    colorSafePrice: Number(
      item.colorSafePrice ?? DEFAULT_ADDONS_PRICING.colorSafePrice,
    ),
  };
};

const addonsPricingService = {
  get: async (): Promise<AddonsPricing> => {
    const { data } = await axiosClient.get(API_ROUTES.ADDONS_PRICING);
    const pricing = data.pricing || data.data || data;
    return normalizePricing(pricing);
  },

  update: async (payload: AddonsPricing): Promise<AddonsPricing> => {
    const { data } = await axiosClient.put(API_ROUTES.ADDONS_PRICING, payload);
    const pricing = data.pricing || data.data || data;
    return normalizePricing(pricing);
  },
};

export default addonsPricingService;
