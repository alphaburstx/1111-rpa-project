import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const pages = new Map([
  ['/', ['index.html', 'text/html']],
  ['/fixture.js', ['fixture.js', 'text/javascript']],
]);

export async function startFixture(port = 0) {
  const server = createServer(async (request, response) => {
    const route = pages.get(new URL(request.url, 'http://127.0.0.1').pathname);
    if (request.method !== 'GET' || !route) {
      response.writeHead(404).end();
      return;
    }
    const [file, contentType] = route;
    try {
      const content = await readFile(new URL(`../public/${file}`, import.meta.url));
      response.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` }).end(content);
    } catch {
      response.writeHead(500).end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const fixture = await startFixture(Number(process.env.PORT ?? 4173));
  console.log(fixture.url);
}
