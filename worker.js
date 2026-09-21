const VIDEO_EXT = /\.(mp4|webm|mov)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!VIDEO_EXT.test(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const rangeHeader = request.headers.get("Range");

    const fullResponse = await env.ASSETS.fetch(new Request(url, { headers: {} }));
    if (!fullResponse.ok) {
      return fullResponse;
    }

    const buffer = await fullResponse.arrayBuffer();
    const size = buffer.byteLength;

    const headers = new Headers(fullResponse.headers);
    headers.set("Accept-Ranges", "bytes");

    if (!rangeHeader) {
      headers.set("Content-Length", String(size));
      return new Response(buffer, { status: 200, headers });
    }

    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (!match) {
      return new Response(buffer, { status: 200, headers });
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : size - 1;
    end = Math.min(end, size - 1);

    if (isNaN(start) || start > end || start >= size) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }

    const slice = buffer.slice(start, end + 1);
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(slice.byteLength));

    return new Response(slice, { status: 206, headers });
  },
};
