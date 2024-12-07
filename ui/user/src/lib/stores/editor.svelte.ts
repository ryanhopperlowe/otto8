import type { Task } from '$lib/services/chat/types';

export interface EditorItem {
	id: string;
	name: string;
	contents: string;
	buffer: string;
	modified?: boolean;
	selected?: boolean;
	task?: Task;
}

const items = $state<EditorItem[]>([]);
export default items;
