import http from 'node:http';

const port = Number(process.env.PORT || 8788);

const server = http.createServer(async (request, response) => {
  response.setHeader('access-control-allow-origin', request.headers.origin || '*');
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
  response.setHeader('content-type', 'application/json; charset=utf-8');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    response.end(JSON.stringify({ ok: true, aiConfigured: true, mock: true }));
    return;
  }

  let rawBody = '';
  for await (const chunk of request) rawBody += chunk;
  const body = rawBody ? JSON.parse(rawBody) : {};

  if (request.method === 'POST' && request.url === '/v1/reflection/next') {
    const isStoryPhase = body.phase === 'after_story';
    response.end(JSON.stringify({
      mode: 'ai',
      prompt: isStoryPhase
        ? {
            route: 'ask_moment',
            moduleId: 'concrete_moment',
            question: '어떤 순간이 가장 오래 남았나요?',
            lead: '마음이 멈춰 선 장면 하나만 떠올려봐요.',
            label: '마음이 멈춰 선 순간',
            placeholder: '예: 이유를 듣기 전에 통보받았다고 느낀 순간',
            extractedMoment: ''
          }
        : {
            route: 'ask_meaning',
            moduleId: 'felt_meaning',
            question: '그 서운함은 어떤 뜻으로 남았나요?',
            lead: '상대의 의도가 아니라 내게 남은 뜻을 살펴봐요.',
            label: '내게 남은 뜻',
            placeholder: '예: 내 시간은 중요하게 여겨지지 않는 느낌이었어요',
            extractedMoment: ''
          }
    }));
    return;
  }

  if (request.method === 'POST' && request.url === '/v1/reflection/map') {
    const answers = body.answers || {};
    response.end(JSON.stringify({
      mode: 'ai',
      map: {
        event: answers.story || '',
        moment: answers.moment || '',
        emotions: answers.emotions || [],
        meaning: answers.meaning || '',
        needs: answers.needs || []
      }
    }));
    return;
  }

  response.writeHead(404);
  response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Re:Mind mock AI server listening on http://127.0.0.1:${port}`);
});
