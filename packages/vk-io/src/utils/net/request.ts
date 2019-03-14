import { Http1Session, Http2Session } from './sessions';

async function run() {
	const http1Session = await Http1Session.connect('https://api.vk.com');
	const http2Session = await Http2Session.connect('https://api.vk.com');

	await http1Session.request('/method/users.get');
	await http2Session.request('/method/users.get');
}

run().catch(() => {

});
