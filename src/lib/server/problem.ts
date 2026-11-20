import { problem } from 'elysia'

export type ProblemStatus = 400 | 404 | 429 | 502

/** RFC 9457 `application/problem+json` response with an Indonesian title and detail. */
export function apiProblem<const Status extends ProblemStatus>(
	status: Status,
	type: string,
	title: string,
	detail: string,
) {
	return problem(status, { type, title, detail })
}
