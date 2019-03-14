import { URLSearchParams } from 'url';
import { Readable, Writable, Duplex } from 'stream';

export type ReadableStream = Readable | Duplex;
export type WritableStream = Writable | Duplex;

export function transformToBody(body: any) {
	if (!body) {
		return null;
	}

	if (typeof body !== 'object' || body instanceof URLSearchParams) {
		return Buffer.from(String(body));
	}

	return body;
}

export function writeToStream(writeable: WritableStream, body: ReadableStream | Buffer | null) {
	if (body === null) {
		writeable.end();

		return;
	}

	if (Buffer.isBuffer(body)) {
		writeable.end(body);

		return;
	}

	body.pipe(writeable);
}
