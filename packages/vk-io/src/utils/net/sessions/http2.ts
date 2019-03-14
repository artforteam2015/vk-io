import { connect as createConnect, constants as http2Cconstants } from 'http2';

import { Http2Response } from '../responses';
import IHttpSession, { IHttpRequestOptions } from './session';
import { writeToStream, transformToBody } from '../helpers';

const {
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_METHOD,
	HTTP2_METHOD_GET
} = http2Cconstants;

interface IHttp2SessionOptions {
	origin: string;
}

export default class Http2Session implements IHttpSession {
	origin: string;

	private session!: ReturnType<typeof createConnect>;

	constructor(options: IHttp2SessionOptions) {
		this.origin = options.origin;
	}

	connect() {
		return new Promise((resolve, reject) => {
			this.session = createConnect(this.origin);

			this.session.once('error', reject);
			this.session.once('connect', () => {
				this.session.removeListener('error', reject);

				resolve();
			});
		});
	}

	static async connect(origin: string) {
		const session = new Http2Session({
			origin
		});

		await session.connect();

		return session;
	}

	request(path: string, options: IHttpRequestOptions = {}) {
		const req = this.session.request({
			...options.headers,

			[HTTP2_HEADER_PATH]: path,
			[HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET
		});

		return new Promise((resolve, reject) => {
			req.on('error', reject);

			req.on('response', (headers) => {
				const chunks: Buffer[] = [];

				req.once('end', () => {
					const body = Buffer.concat(chunks);
				});

				req.on('data', (chunk: Buffer) => {
					chunks.push(chunk);
				});
			});

			writeToStream(req, transformToBody(options.body));
		});

		// Http2Response
	}

	async close() {
		await this.close()
	}
}
