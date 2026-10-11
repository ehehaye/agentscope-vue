import { resolveEndpoint, getApiMode, API_MODES } from '@/api/mapping';
import { AppStorageKeys } from '@/constants/app-state';

describe('getApiMode', () => {
  afterEach(() => localStorage.removeItem(AppStorageKeys.API_MODE));

  it('未设置时默认 direct', () => {
    expect(getApiMode()).toBe(API_MODES.DIRECT);
  });

  it('设置为 proxy 时返回 proxy', () => {
    localStorage.setItem(AppStorageKeys.API_MODE, API_MODES.PROXY);
    expect(getApiMode()).toBe(API_MODES.PROXY);
  });

  it('非法值回退 direct', () => {
    localStorage.setItem(AppStorageKeys.API_MODE, 'garbage');
    expect(getApiMode()).toBe(API_MODES.DIRECT);
  });
});

describe('resolveEndpoint', () => {
  it('解析无路径参数的端点', () => {
    expect(resolveEndpoint('health.check', { mode: 'direct' })).toEqual({ method: 'GET', path: '/health' });
  });

  it('direct 模式的 PATCH 原样返回', () => {
    expect(resolveEndpoint('credential.update', { pathParams: { credentialId: 'c1' }, mode: 'direct' })).toEqual({
      method: 'PATCH',
      path: '/credential/c1',
    });
  });

  it('proxy 模式走 PATCH→POST /update 覆盖', () => {
    expect(resolveEndpoint('credential.update', { pathParams: { credentialId: 'c1' }, mode: 'proxy' })).toEqual({
      method: 'POST',
      path: '/credential/c1/update',
    });
  });

  it('proxy 模式走 DELETE→POST /delete 覆盖', () => {
    expect(resolveEndpoint('workspace.mcp.remove', { pathParams: { mcpName: 'alpha' }, mode: 'proxy' })).toEqual({
      method: 'POST',
      path: '/workspace/mcp/alpha/delete',
    });
  });

  it('无 proxy 覆盖的端点在 proxy 模式下仍用 direct 定义', () => {
    expect(resolveEndpoint('health.check', { mode: 'proxy' })).toEqual({ method: 'GET', path: '/health' });
  });

  it('路径参数做 encodeURIComponent', () => {
    expect(resolveEndpoint('workspace.mcp.remove', { pathParams: { mcpName: 'a/b c' }, mode: 'direct' }).path).toBe(
      '/workspace/mcp/a%2Fb%20c',
    );
  });

  it('缺少路径参数时抛错', () => {
    expect(() => resolveEndpoint('workspace.mcp.remove', { pathParams: {}, mode: 'direct' })).toThrow(
      /Missing path parameter "mcpName"/,
    );
  });

  it('未知 key 抛错', () => {
    expect(() => resolveEndpoint('nope.here')).toThrow(/Unknown endpoint key/);
  });
});
