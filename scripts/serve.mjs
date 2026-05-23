import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf"
};

const args = process.argv.slice(2);
const portArg = args.find((arg) => arg.startsWith("--port="));
const rootArg = args.find((arg) => arg.startsWith("--root="));

const port = Number(portArg?.split("=")[1] ?? process.env.PORT ?? 4173);
const root = path.resolve(rootArg?.split("=")[1] ?? ".");

const resolvePath = (requestPath) => {
  const decodedPath = decodeURIComponent(requestPath.split("?")[0]);
  const sanitizedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const absolutePath = path.normalize(path.join(root, sanitizedPath));

  if (!absolutePath.startsWith(root)) {
    return null;
  }

  return absolutePath;
};

const server = http.createServer(async (req, res) => {
  const requestPath = resolvePath(req.url ?? "/");
  if (!requestPath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(requestPath);
    const filePath = stats.isDirectory() ? path.join(requestPath, "index.html") : requestPath;
    const extension = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[extension] ?? "application/octet-stream";

    res.writeHead(200, { "Content-Type": mimeType });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
