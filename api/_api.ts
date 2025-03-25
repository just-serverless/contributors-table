import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { USER_AGENT } from '../config.js'
import type { Contributor } from './_types.js'

/**
 * Fetches the list of contributors from a GitHub repository using GitHub App authentication.
 *
 * @param repo - The repository path in the format "owner/repo"
 * @param max - Maximum number of contributors to fetch (default: `100`)
 * @returns A promise that resolves to the GitHub API response containing contributors list
 * @throws Will throw an error if the GitHub API request fails
 * @example
 * ```ts
 * const contributors = await getContributorsListFromGitHub('octocat/Hello-World', 5);
 * /*
 * [
 *   {
 *     login: 'octocat',
 *     id: 123456,
 *     ...
 *   },
 *  ...
 * ]
 * ```
 */
export async function getContributorsListFromGitHub(
	repo: string,
	max = 100,
): Promise<Contributor[]> {
	const octokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID,
			installationId: process.env.GITHUB_APP_INSTALLATION_ID,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
		},
		userAgent: USER_AGENT,
	})

	const [owner, repoName] = repo.split('/')
	const allContributors: Contributor[] = []
	const perPage = 100

	let downloaded = 0
	const needToDownload = max

	for await (const { data: contributors } of octokit.paginate.iterator(
		octokit.repos.listContributors,
		{
			owner: owner,
			repo: repoName,
			per_page: Math.min(perPage, needToDownload),
		},
	)) {
		if (downloaded >= needToDownload) {
			break
		}

		const remainingToDownload = needToDownload - downloaded
		const contributorsToAdd = contributors.slice(0, remainingToDownload)
		// @ts-ignore
		allContributors.push(...contributorsToAdd)

		downloaded += contributorsToAdd.length
	}

	console.log(`Downloaded ${downloaded} contributors.`)

	return allContributors
}
