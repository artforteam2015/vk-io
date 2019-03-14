import { ReadableStream } from '../helpers';

export interface IHttpHeaders {
	[header: string]: number | string | string[] | undefined;
}

export interface IHttpRequestOptions {
	// Default GET
	method?: 'GET' | 'POST' | string;
	headers?: IHttpHeaders;
	body?: ReadableStream | Buffer | null;
}

export default interface IHttpSession {
	origin: string;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	request(path: string, options?: IHttpRequestOptions): Promise<any>;

	close(): Promise<void>;
}
