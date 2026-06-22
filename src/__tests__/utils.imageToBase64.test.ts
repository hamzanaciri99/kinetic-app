// imageToBase64 uses fetch, which is available globally in RN jest env (but we mock it)
import { uriToBase64 } from '../utils/imageToBase64';

const mockArrayBuffer = (bytes: number[]): ArrayBuffer => {
  const buf = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buf);
  bytes.forEach((b, i) => {
    view[i] = b;
  });
  return buf;
};

describe('uriToBase64', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('converts a URI to base64 string', async () => {
    // "ABC" in ASCII is [65, 66, 67], base64 = "QUJD"
    const buf = mockArrayBuffer([65, 66, 67]);
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(buf),
    } as any);

    const result = await uriToBase64('file:///test.jpg');
    expect(result).toBe('QUJD');
    expect(global.fetch).toHaveBeenCalledWith('file:///test.jpg');
  });

  it('produces valid base64 for empty buffer', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    } as any);

    const result = await uriToBase64('file:///empty.jpg');
    expect(result).toBe('');
  });

  it('handles single byte', async () => {
    // 0x00 = 0 → base64 "AA=="
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer([0])),
    } as any);
    const result = await uriToBase64('file:///single.jpg');
    expect(result).toBe('AA==');
  });

  it('handles two bytes', async () => {
    // [0, 0] → "AAA="
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer([0, 0])),
    } as any);
    const result = await uriToBase64('file:///two.jpg');
    expect(result).toBe('AAA=');
  });

  it('propagates fetch errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    await expect(uriToBase64('file:///fail.jpg')).rejects.toThrow('Network error');
  });
});
