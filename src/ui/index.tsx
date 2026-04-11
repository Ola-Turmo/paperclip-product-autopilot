// Product Autopilot Plugin — UI Entry Point
export * from './context.js';
export * from './layout.js';
export * from './components.js';
export * from './hooks.js';

import React from 'react';
import { PluginLayout } from './layout.js';

// Re-export plugin metadata
export const ProductAutopilotPlugin = {
  id: 'product-autopilot',
  name: 'Product Autopilot',
  version: '0.1.0',
};

export default function PluginUI() {
  return (
    <PluginLayout title="Product Autopilot" subtitle="Plugin is loaded">
      <p>Use the project tabs to access Product Autopilot features.</p>
    </PluginLayout>
  );
}
