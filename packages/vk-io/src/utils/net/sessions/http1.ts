import { Agent, request as httpsRequest } from 'https';

import { Http1Response } from '../responses';
import { transformToBody, writeToStream } from '../helpers';
import IHttpSession, { IHttpRequestOptions } from './session';

interface IHttpsSessionOptions {
	origin: string;

	agent: Agent;
}

interface IHttpsConnectOptions {
	agent?: Agent;
}

export default class Http1Session implements IHttpSession {
	origin: string;

	private agent: Agent;

	constructor(options: IHttpsSessionOptions) {
		this.origin = options.origin;

		this.agent = options.agent;
	}

	static async connect(origin: string, options: IHttpsConnectOptions = {}) {
		const session = new Http1Session({
			origin,

			agent: options.agent || new Agent({
				keepAlive: true,
				keepAliveMsecs: 1e5
			})
		});

		return session;
	}

	async request(path: string, options: IHttpRequestOptions = {}) {
		const req = httpsRequest(this.origin + path, {
			agent: this.agent,
			method: options.method || 'GET'
		});

		// Http1Response

		writeToStream(req, transformToBody(options.body));
	}

	// eslint-disable-next-line no-empty-function
	async close() {}
}
