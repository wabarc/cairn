import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

const server = http.createServer(function (request, response) {
  const pathname = './test/assets/' + request.url;
  if (!fs.existsSync(pathname)) {
    response.statusCode = 404;
    response.end(`File ${pathname} not found.`);
  }

  const fileStream = fs.createReadStream(pathname);
  const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };
  const ext = path.parse(pathname).ext;

  response.writeHead(200, { 'Content-Type': mimeType[ext] || 'text/plain' });

  fileStream.pipe(response);
});

export { server };
