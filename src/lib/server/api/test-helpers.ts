export function withCf(request: Request): Request {
	Object.defineProperty(request, 'cf', { value: { colo: 'TEST' } })
	if (!request.headers.get('cf-connecting-ip')) request.headers.set('cf-connecting-ip', '127.0.0.1')
	return request
}
