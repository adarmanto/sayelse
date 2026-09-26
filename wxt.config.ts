import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'SayElse',
    description: 'An original local-first AI writing companion for clearer, better-sounding text.',
    minimum_chrome_version: '114',
    permissions: [
      'activeTab',
      'contextMenus',
      'scripting',
      'sidePanel',
      'storage',
    ],
    host_permissions: ['http://127.0.0.1/*'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: 'Open SayElse',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
