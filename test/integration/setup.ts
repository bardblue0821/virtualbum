/**
 * インテグレーションテスト用セットアップ
 * Node.js 環境で fetch を使えるようにする
 */

// Node.js 18+ では native fetch が存在
// Jest の node 環境では自動的に有効になるが、念のため確認
console.log('🔧 Integration test setup loaded');
console.log(`   Node.js version: ${process.version}`);
console.log(`   fetch available: ${typeof fetch !== 'undefined'}`);

// テスト用のタイムアウトを延長
jest.setTimeout(120000);
