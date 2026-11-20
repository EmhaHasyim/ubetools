import { error } from '@sveltejs/kit'
import { findTool, tools } from '#lib/tools.ts'
import type { PageLoad } from './$types'

export const prerender = true

export function entries() {
	return tools.map((tool) => ({ slug: tool.slug }))
}

export const load: PageLoad = ({ params }) => {
	const tool = findTool(params.slug)
	if (!tool) error(404, 'Tool tidak ditemukan')
	return { tool }
}
