import Context from './context';

export default class GroupSubscribeContext extends Context {
	/**
	 * Constructro
	 *
	 * @param {VK}     vk
	 * @param {Object} payload
	 */
	constructor(vk, { type, object: update }) {
		super(vk);

		this.payload = update;

		this.type = 'group_subscribers';
		this.subTypes = [
			type === 'group_leave'
				? 'group_leave'
				: 'group_join'
		];
	}

	/**
	 * Checks is join user
	 *
	 * @return {boolean}
	 */
	isJoin() {
		return this.subTypes.includes('group_join');
	}

	/**
	 * Checks is leave user
	 *
	 * @return {boolean}
	 */
	isLeave() {
		return this.subTypes.includes('group_leave');
	}

	/**
	 * Checks is self leave user
	 *
	 * @return {?boolean}
	 */
	isSelfLeave() {
		if (this.isJoin()) {
			return null;
		}

		return Boolean(this.payload.self);
	}

	/**
	 * Returns the identifier user
	 *
	 * @return {number}
	 */
	getUserId() {
		return this.payload.user_id;
	}

	/**
	 * Returns the join type
	 *
	 * @return {?string}
	 */
	getJoinType() {
		if (this.isLeave()) {
			return null;
		}

		return this.payload.join_type;
	}
}
