/**
 * エラーハンドリング統一エクスポート
 */

// 構造化されたエラーハンドリング
export { 
  AppError, 
  translateFirebaseError, 
  handleError, 
  ErrorHelpers,
  type ToastContext 
} from './ErrorHandler';

// シンプルなエラー翻訳（後方互換）
export { translateError } from '../errors';
