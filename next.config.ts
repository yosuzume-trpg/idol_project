import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自宅VPS（Nginx）への静的配置用。ルーティングは使わずSPA的に運用する
  output: "export",
  // 静的エクスポートではNextの画像最適化サーバーが使えないため無効化
  images: { unoptimized: true },
};

export default nextConfig;
