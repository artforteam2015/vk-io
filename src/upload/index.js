import fetch from 'node-fetch';

import { URL } from 'url';
import { inspect } from 'util';
import { randomBytes } from 'crypto';
import { createReadStream } from 'fs';
import { request as HTTPSRequest } from 'https';

import {
	PhotoAttachment,
	AudioAttachment,
	VideoAttachment,
	DocumentAttachment
} from '../structures/attachments';

import UploadError from '../errors/upload';
import MultipartStream from './multipart-stream';
import { isStream, copyParams } from './helpers';
import { defaultExtensions } from '../util/constants';

/* TODO: After remove */
import charlesProxy from '../../../cover/agent';
import FormDataNPM from '../../../cover/node_modules/form-data';

const isLink = /^https?:\/\//i;

export default class Upload {
	/**
	 * Constructor
	 *
	 * @param {VK} vk
	 */
	constructor(vk) {
		this.vk = vk;
	}

	/**
	 * Uploading photos to an album
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<Array>}
	 */
	async photoAlbum(params) {
		const photos = await this.conduct({
			field: 'file',
			params,

			getServer: this.vk.api.photos.getUploadServer,
			serverParams: ['album_id', 'group_id'],

			saveFiles: this.vk.api.photos.save,
			saveParams: ['album_id', 'group_id', 'latitude', 'longitude', 'caption'],

			maxFiles: 5,
			attachmentType: 'photo'
		});

		return photos.map(photo => (
			new PhotoAttachment(photo, this.vk)
		));
	}

	/**
	 * Uploading photos to the wall
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<PhotoAttachment>}
	 */
	async wallPhoto(params) {
		const [photo] = await this.conduct({
			field: 'photo',
			params,

			getServer: this.vk.api.photos.getWallUploadServer,
			serverParams: ['group_id'],

			saveFiles: this.vk.api.photos.saveWallPhoto,
			saveParams: ['user_id', 'group_id', 'latitude', 'longitude', 'caption'],

			maxFiles: 1,
			attachmentType: 'photo'
		});

		return new PhotoAttachment(photo, this.vk);
	}

	/**
	 * Uploading the main photo of a user or community
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<Object>}
	 */
	ownerPhoto(params) {
		return this.conduct({
			field: 'photo',
			params,

			getServer: this.vk.api.photos.getOwnerPhotoUploadServer,
			serverParams: ['owner_id'],

			saveFiles: this.vk.api.photos.saveOwnerPhoto,

			maxFiles: 1,
			attachmentType: 'photo'
		});

		// {
		// 	photo_hash: 'c8d43da5e1281b7aed6bb8f0c4f3ad69',
		// 	photo_src: 'https://pp.userapi.com/c836429/v836429114/673f6/5VJB8GXtK88.jpg',
		// 	photo_src_big: 'https://pp.userapi.com/c836429/v836429114/673f7/7fGvrJ1wOx0.jpg',
		// 	photo_src_small: 'https://pp.userapi.com/c836429/v836429114/673f5/l5d1ASgyuxk.jpg',
		// 	saved: 1,
		// 	post_id: 3331
		// }
	}

	/**
	 * Uploading a photo to a private message
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<PhotoAttachment>}
	 */
	async messagePhoto(params) {
		const [photo] = await this.conduct({
			field: 'photo',
			params,

			getServer: this.vk.api.photos.getMessagesUploadServer,
			serverParams: ['peer_id'],

			saveFiles: this.vk.api.photos.saveMessagesPhoto,

			maxFiles: 1,
			attachmentType: 'photo'
		});

		return new PhotoAttachment(photo, this.vk);
	}

	/**
	 * Uploading the main photo for a chat
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<Object>}
	 */
	chatPhoto(params) {
		return this.conduct({
			field: 'file',
			params,

			getServer: this.vk.api.photos.getChatUploadServer,
			serverParams: ['chat_id', 'crop_x', 'crop_y', 'crop_width'],

			saveFiles: file => (
				this.vk.api.messages.setChatPhoto({ file })
			),

			maxFiles: 1,
			attachmentType: 'photo'
		});

		// {
		// 	message_id: 3745390,
		// 	chat: {
		// 		id: 152,
		// 		type: 'chat',
		// 		title: '<Titile name>',
		// 		admin_id: 335447860,
		// 		users: [335447860,
		// 			140192020,
		// 			153711615,
		// 			314650825,
		// 			218747758,
		// 			155944103,
		// 			159737827,
		// 			64299368,
		// 			157534541,
		// 			153608064,
		// 			335540121,
		// 			349609849,
		// 			344184938,
		// 			341178526,
		// 			198210835,
		// 			135446999,
		// 			163850606,
		// 			123640861,
		// 			316216798,
		// 			359118107,
		// 			241235369,
		// 			160213445,
		// 			126624591,
		// 			390221395,
		// 			195624402,
		// 			94955334,
		// 			167302501,
		// 			17516523,
		// 			294583792,
		// 			294869767,
		// 			114281676,
		// 			137762280,
		// 			406076540,
		// 			410605840,
		// 			395646590,
		// 			421554042,
		// 			331599090,
		// 			342269712
		// 		],
		// 		photo_50: 'https://pp.userapi.com/c837624/v837624114/5d495/gLgv-JrVmkk.jpg',
		// 		photo_100: 'https://pp.userapi.com/c837624/v837624114/5d494/VNp61I1yuCk.jpg',
		// 		photo_200: 'https://pp.userapi.com/c837624/v837624114/5d492/lAoc_fAai2Q.jpg'
		// 	}
		// }
	}

	/**
	 * Uploading the main photo for a chat
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<PhotoAttachment>}
	 */
	async marketPhoto(params) {
		const [photo] = await this.conduct({
			field: 'file',
			params,

			getServer: this.vk.api.photos.getMarketUploadServer,
			serverParams: ['group_id', 'main_photo', 'crop_x', 'crop_y', 'crop_width'],

			saveFiles: this.vk.api.photos.saveMarketPhoto,
			saveParams: ['group_id'],

			maxFiles: 1,
			attachmentType: 'photo'
		});

		return new PhotoAttachment(photo, this.vk);
	}

	/**
	 * Uploads a photo for the selection of goods
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<Array>}
	 */
	async marketAlbumPhoto(params) {
		const photos = await this.conduct({
			field: 'file',
			params,

			getServer: this.vk.api.photos.getMarketAlbumUploadServer,
			serverParams: ['group_id'],

			saveFiles: this.vk.api.photos.saveMarketAlbumPhoto,
			saveParams: ['group_id'],

			maxFiles: 1,
			attachmentType: 'photo'
		});

		return photos.map(photo => (
			new PhotoAttachment(photo, this.vk)
		));
	}

	/**
	 * Uploads audio
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<AudioAttachment>}
	 */
	async audio(params) {
		const audio = await this.conduct({
			field: 'file',
			params,

			getServer: this.vk.api.audio.getUploadServer,

			saveFiles: this.vk.api.audio.save,
			saveParams: ['artist', 'title'],

			maxFiles: 1,
			attachmentType: 'audio'
		});

		return new AudioAttachment(audio, this.vk);
	}

	/**
	 * Uploads video
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<VideoAttachment>}
	 */
	async video(params) {
		/* FIXME: 400 Bad Request */
		const save = await this.vk.api.video.save(copyParams(params, [
			'name',
			'description',
			'is_private',
			'wallpost',
			'link',
			'group_id',
			'album_id',
			'privacy_view',
			'privacy_comment',
			'no_comments',
			'repeat'
		]));

		save.id = save.video_id;

		if ('link' in params) {
			const response = await fetch(save.upload_url);

			await response.json();

			return new VideoAttachment(save, this.vk);
		}

		if (!Array.isArray(params.source)) {
			params.source = [params.source];
		}

		const formData = await this.buildPayload({
			maxFiles: 1,
			field: 'video_file',
			attachmentType: 'video',
			sources: params.source
		});

		// const video = await this.upload(save.upload_url, formData);

		const {
			protocol,
			search,
			port,
			hostname,
			pathname
		} = new URL(save.upload_url);

		const request = HTTPSRequest({
			protocol: 'https:',
			port,
			host: hostname,
			path: pathname + search,


			agent: charlesProxy,
			method: 'POST',
			headers: {
				'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
			}
		}, (response) => {
			response.setEncoding('utf8');

			let body = '';

			response.on('data', (chunk) => {
				body += String(chunk);
			});

			response.on('end', () => {
				/* TODO: Remove after */
				// eslint-disable-next-line
				console.log(body);
			});
		});

		// request.removeHeader('transfer-encoding');

		formData.pipe(request);

		const video = {};

		return new VideoAttachment({ ...save, ...video }, this.vk);
	}

	/**
	 * Uploads doc
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<DocumentAttachment>}
	 */
	async doc(params) {
		const [document] = await this.conduct({
			field: 'file',
			params,

			getServer: this.vk.api.docs.getUploadServer,
			serverParams: ['type', 'group_id'],

			saveFiles: this.vk.api.docs.save,
			saveParams: ['title', 'tags'],

			maxFiles: 1,
			attachmentType: 'doc'
		});

		return new DocumentAttachment(document, this.vk);
	}

	/**
	 * Uploads wall doc
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<DocumentAttachment>}
	 */
	async wallDoc(params) {
		const [document] = await this.conduct({
			field: 'file',
			params,

			getServer: this.vk.api.docs.getWallUploadServer,
			serverParams: ['type', 'group_id'],

			saveFiles: this.vk.api.docs.save,
			saveParams: ['title', 'tags'],

			maxFiles: 1,
			attachmentType: 'doc'
		});

		return new DocumentAttachment(document, this.vk);
	}

	/**
	 * Uploads message doc
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<DocumentAttachment>}
	 */
	async messageDoc(params) {
		const [document] = await this.conduct({
			field: 'file',
			params,

			getServer: this.vk.api.docs.getMessagesUploadServer,
			serverParams: ['type', 'peer_id'],

			saveFiles: this.vk.api.docs.save,
			saveParams: ['title', 'tags'],

			maxFiles: 1,
			attachmentType: 'doc'
		});

		return new DocumentAttachment(document, this.vk);
	}

	/**
	 * Uploads audio message
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<DocumentAttachment>}
	 */
	voice(params) {
		params.type = 'audio_message';

		return this.messageDoc(params);

		// [{
		// 	id: 450654090,
		// 	owner_id: 195624402,
		// 	title: 'file0.dat',
		// 	size: 6893689,
		// 	ext: 'ogg',
		// 	url: 'https://vk.com/doc195624402_450654090?hash=4885f0597af540ea3c&dl=GE4TKNRSGQ2DAMQ:1505453671:d23a533d7c485e7426&api=1&no_preview=1',
		// 	date: 1505453671,
		// 	type: 5,
		// 	preview: {
		// 		audio_msg: {
		// 			duration: 243,
		// 			waveform: [5,
		// 				6,
		// 				5,
		// 				5,
		// 				4,
		// 				3,
		// 				4,
		// 				2,
		// 				4,
		// 				3,
		// 				4,
		// 				4,
		// 				3,
		// 				2,
		// 				1,
		// 				1,
		// 				2,
		// 				3,
		// 				4,
		// 				4,
		// 				6,
		// 				8,
		// 				13,
		// 				13,
		// 				11,
		// 				6,
		// 				5,
		// 				4,
		// 				3,
		// 				3,
		// 				1,
		// 				2,
		// 				1,
		// 				2,
		// 				1,
		// 				4,
		// 				8,
		// 				10,
		// 				12,
		// 				10,
		// 				13,
		// 				12,
		// 				14,
		// 				16,
		// 				16,
		// 				17,
		// 				11,
		// 				9,
		// 				8,
		// 				9,
		// 				10,
		// 				10,
		// 				7,
		// 				1,
		// 				3,
		// 				1,
		// 				2,
		// 				5,
		// 				8,
		// 				10,
		// 				10,
		// 				11,
		// 				13,
		// 				14,
		// 				18,
		// 				19,
		// 				20,
		// 				22,
		// 				20,
		// 				22,
		// 				24,
		// 				25,
		// 				27,
		// 				25,
		// 				21,
		// 				20,
		// 				18,
		// 				15,
		// 				12,
		// 				6,
		// 				3,
		// 				4,
		// 				6,
		// 				10,
		// 				13,
		// 				10,
		// 				9,
		// 				8,
		// 				5,
		// 				3,
		// 				2,
		// 				3,
		// 				8,
		// 				11,
		// 				10,
		// 				2,
		// 				2,
		// 				9,
		// 				12,
		// 				19,
		// 				...23 more items
		// 			],
		// 			link_ogg: 'https://cs540101.userapi.com/c807320/u195624402/audio/440482857b.ogg',
		// 			link_mp3: 'https://cs540101.userapi.com/c807320/u195624402/audio/440482857b.mp3'
		// 		}
		// 	}
		// }]
	}

	/**
	 * Uploads graffiti
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<DocumentAttachment>}
	 */
	graffiti(params) {
		/* FIXME: One of the parameters specified was missing or invalid: file is undefined */
		params.type = 'graffiti';

		return this.doc(params);
	}

	/**
	 * Uploads community cover
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<Object>}
	 */
	groupCover(params) {
		return this.conduct({
			field: 'photo',
			params,

			getServer: this.vk.api.photos.getOwnerCoverPhotoUploadServer,
			serverParams: ['group_id', 'crop_x', 'crop_y', 'crop_x2', 'crop_y2'],

			saveFiles: this.vk.api.photos.saveOwnerCoverPhoto,

			maxFiles: 1,
			attachmentType: 'photo'
		});

		// {
		// 	images: [
		// 		{
		// 			url: 'https://cs7056.userapi.com/c639526/v639526192/46404/r-1Nhr-Dktc.jpg',
		// 			width: 200,
		// 			height: 50
		// 		},
		// 		{
		// 			url: 'https://cs7056.userapi.com/c639526/v639526192/46403/oDB9tAgtUrQ.jpg',
		// 			width: 400,
		// 			height: 101
		// 		},
		// 		{
		// 			url: 'https://cs7056.userapi.com/c639526/v639526192/46400/gLwCTmDEPXY.jpg',
		// 			width: 795,
		// 			height: 200
		// 		},
		// 		{
		// 			url: 'https://cs7056.userapi.com/c639526/v639526192/46402/w2ucyq8zwF8.jpg',
		// 			width: 1080,
		// 			height: 272
		// 		},
		// 		{
		// 			url: 'https://cs7056.userapi.com/c639526/v639526192/46401/YTmN89yMaU0.jpg',
		// 			width: 1590,
		// 			height: 400
		// 		}
		// 	]
		// }
	}

	/**
	 * Uploads photo stories
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<Object>}
	 */
	async storiesPhoto(params) {
		throw new Error('Not yet');
	}

	/**
	 * Uploads video stories
	 *
	 * @param {Object} params
	 *
	 * @return {Promise<Object>}
	 */
	async storiesVideo(params) {
		throw new Error('Not yet');
	}

	/**
	 * Behavior for the upload method
	 *
	 * @param {Object} conduct
	 * @property [field]          Field name
	 * @property [params]         Upload params
	 *
	 * @property [getServer]      Get server functions
	 * @property [serverParams]   Copies server params
	 *
	 * @property [saveFiles]      Save files functions
	 * @property [saveParams]     Copies save params
	 *
	 * @property [maxFiles]       Max uploaded files for one request
	 * @property [attachmentType] Attachment type
	 *
	 * @return {Promise<Object>}
	 */
	async conduct({
		field,
		params,

		getServer,
		serverParams = [],

		saveFiles,
		saveParams = [],

		maxFiles = 1,
		attachmentType
	}) {
		if (!Array.isArray(params.source)) {
			params.source = [params.source];
		}

		if (params.source.length > maxFiles) {
			throw new Error('The number of files uploaded has exceeded');
		}

		if ('uploadUrl' in params) {
			getServer = () => ({
				upload_url: params.uploadUrl
			});
		}

		const [{ upload_url: url }, formData] = await Promise.all([
			getServer(copyParams(params, serverParams)),
			this.buildPayload({
				field,
				maxFiles,
				attachmentType,
				sources: params.source
			})
		]);

		const uploaded = await this.upload(url, formData, params);

		if (typeof uploaded !== 'object') {
			return await saveFiles(uploaded);
		}

		return await saveFiles({
			...copyParams(params, saveParams),
			...uploaded
		});
	}

	/**
	 * Building form data
	 *
	 * @param {Object} payload
	 *
	 * @return {Promise}
	 */
	async buildPayload({
		field,
		sources,
		maxFiles,
		attachmentType
	}) {
		const boundary = randomBytes(30).toString('hex');
		const formData = new MultipartStream(boundary);

		// const formData = new FormDataNPM();

		const isMultipart = maxFiles > 1;

		const tasks = sources
			.map((source) => {
				if (typeof source === 'object' && 'value' in source) {
					return source;
				}

				return { value: source };
			})
			.map(async ({ value, filename, contentType = null }, i) => {
				if (typeof value === 'string') {
					if (isLink.test(value)) {
						const response = await fetch(value);

						value = response.body;
					} else {
						value = createReadStream(value);
					}
				}

				if (!filename) {
					filename = `file${i}.${defaultExtensions[attachmentType] || 'dat'}`;
				}

				if (isStream(value) || Buffer.isBuffer(value)) {
					const name = isMultipart
						? field + (i + 1)
						: field;

					const headers = {};

					if (contentType !== null) {
						headers['Content-Type'] = contentType;
					}

					return formData.append(name, value, { filename, headers });
				}

				throw new Error('Unsupported source type');
			});

		await Promise.all(tasks);

		return formData;
	}

	/**
	 * Upload form data
	 *
	 * @param {URL|string}      url
	 * @param {MultipartStream} formData
	 * @param {Object}          options
	 *
	 * @return {Promise<Object>}
	 */
	async upload(url, formData, { timeout } = {}) {
		const { agent, uploadTimeout } = this.vk.options;

		let response = await fetch(url, {
			// agent,
			agent: charlesProxy,
			compress: false,
			method: 'POST',
			timeout: timeout || uploadTimeout,
			headers: {
				'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
			},
			body: formData
		});

		if (response.status !== 200) {
			throw new Error(response.statusText);
		}

		response = await response.json();

		if ('response' in response) {
			return response.response;
		}

		return response;
	}

	/**
	 * Custom inspect object
	 *
	 * @param {?number} depth
	 * @param {Object}  options
	 *
	 * @return {string}
	 */
	[inspect.custom](depth, options) {
		const { name } = this.constructor;

		return `${options.stylize(name, 'special')} {}`;
	}
}
