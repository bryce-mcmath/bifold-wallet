const { execSync } = require('node:child_process')

const getSignedOffBy = () => {
  console.log('GETSIGNEDOFFBY')
  const gitUserName = execSync('git config user.name').toString('utf-8').trim()
  const gitEmail = execSync('git config user.email').toString('utf-8').trim()
  const sob = `Signed-off-by: ${gitUserName} <${gitEmail}>`
  console.log('SOB', sob)
  return sob
}

const getAddMessage = async (changeset) => {
  console.log('GETADDMESSAGE')
  const am = `docs(changeset): ${changeset.summary}\n\n${getSignedOffBy()}\n`
  return am
}

const getVersionMessage = async (releasePlan) => {
  console.log('GETVERSIONMESSAGE')
  const publishableReleases = releasePlan.releases.filter((release) => release.type !== 'none')
  const releasedVersion = publishableReleases[0].newVersion
  const vm = `chore(release): version ${releasedVersion}\n\n${getSignedOffBy()}\n`
  console.log('VM', vm)
  return vm
}

module.exports = {
  getAddMessage,
  getVersionMessage,
}