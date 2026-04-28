import { Request, Response, NextFunction } from 'express';
import { readOnlyGuard } from '../readOnly';

function buildReq(method: string, path: string): Request {
  return { method, path } as unknown as Request;
}

function buildRes(): { res: Response; setHeader: jest.Mock; status: jest.Mock; json: jest.Mock } {
  const setHeader = jest.fn();
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { setHeader, status, json } as unknown as Response;
  return { res, setHeader, status, json };
}

describe('readOnlyGuard middleware', () => {
  beforeEach(() => {
    delete process.env.READ_ONLY;
  });

  it('passes through all methods when READ_ONLY is unset', () => {
    const next: NextFunction = jest.fn();
    const { res, status } = buildRes();
    readOnlyGuard(buildReq('POST', '/api/users'), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('passes through all methods when READ_ONLY is "false"', () => {
    process.env.READ_ONLY = 'false';
    const next: NextFunction = jest.fn();
    const { res, status } = buildRes();
    readOnlyGuard(buildReq('POST', '/api/users'), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('passes through GET requests when READ_ONLY=true', () => {
    process.env.READ_ONLY = 'true';
    const next: NextFunction = jest.fn();
    const { res, status } = buildRes();
    readOnlyGuard(buildReq('GET', '/api/heart-failure/dashboard'), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('passes through HEAD and OPTIONS when READ_ONLY=true', () => {
    process.env.READ_ONLY = 'true';
    const nextHead: NextFunction = jest.fn();
    const { res: resHead } = buildRes();
    readOnlyGuard(buildReq('HEAD', '/api/anything'), resHead, nextHead);
    expect(nextHead).toHaveBeenCalledTimes(1);

    const nextOpts: NextFunction = jest.fn();
    const { res: resOpts } = buildRes();
    readOnlyGuard(buildReq('OPTIONS', '/api/anything'), resOpts, nextOpts);
    expect(nextOpts).toHaveBeenCalledTimes(1);
  });

  it('passes through allowed write paths even when READ_ONLY=true', () => {
    process.env.READ_ONLY = 'true';
    const next: NextFunction = jest.fn();
    const { res, status } = buildRes();
    readOnlyGuard(buildReq('POST', '/api/auth/login'), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('rejects POST with 503 + Retry-After when READ_ONLY=true', () => {
    process.env.READ_ONLY = 'true';
    const next: NextFunction = jest.fn();
    const { res, setHeader, status, json } = buildRes();
    readOnlyGuard(buildReq('POST', '/api/users'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(status).toHaveBeenCalledWith(503);
    const body = json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.code).toBe('READ_ONLY_MODE');
    expect(body.retryAfterSeconds).toBe(60);
  });

  it('rejects PUT, PATCH, DELETE when READ_ONLY=true', () => {
    process.env.READ_ONLY = 'true';
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const next: NextFunction = jest.fn();
      const { res, status } = buildRes();
      readOnlyGuard(buildReq(method, '/api/anything'), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(503);
    }
  });
});
