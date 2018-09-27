#!/usr/bin/env node

const chalk = require('chalk')

const {
  getPullRequestsForTag,
  getPullRequest,
  mergeMasterIntoPullRequest,
  getBaseToHeadComparison,
} = require('../lib/github')

async function autoupdate (pr) {
  const pullRequest = await getPullRequest(pr)
  // See if the head branch (i.e. the branch the PR is on) is up-to-date with the base branch (e.g. master)
  const repo = pullRequest.head.repo.name
  const branchStatus = await getBaseToHeadComparison(repo, pullRequest.base.ref, pullRequest.head.ref)
  console.log('PR: %s', pullRequest._links.html.href)
  if (pullRequest.state !== 'open') return console.log('  – PR not open.')
  if (pullRequest.merged) return console.log('  – PR already merged.')
  // can't be merged due to merge conflicts
  if (!pullRequest.mergeable) return console.log(chalk.red('  – PR not mergeable.'))
  // needs to be updated with master
  if (branchStatus.status === 'behind' || branchStatus.status === 'diverged') {
    console.log(chalk.yellow('  – Branch is being updated.'))
    await mergeMasterIntoPullRequest(pullRequest)
  } else {
    console.log(chalk.yellow(' – Branch is up-to-date.'))
  }
}

async function run () {
  const prs = await getPullRequestsForTag('AUTOUPDATE')

  for (const pr of prs) {
    try {
      await autoupdate(pr)
    } catch (err) {
      console.error(chalk.red('Failed to autoupdate PR: ' + pr.pull_request.url))
      console.error(chalk.red(err.stack))
    }
  }
}

run().then(() => {
  process.exit(0)
}, (err) => {
  console.error(chalk.red(err.stack))
  process.exit(1)
})

