import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const privateNetworkOrigins = Object.values(networkInterfaces())
  .flatMap((interfaces) => interfaces ?? [])
  .filter((network) => {
    if (network.family !== "IPv4" || network.internal) return false;
    const [first, second] = network.address.split(".").map(Number);
    return first === 10 ||
      (first === 192 && second === 168) ||
      (first === 172 && second >= 16 && second <= 31);
  })
  .map((network) => network.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: privateNetworkOrigins,
};

export default nextConfig;
